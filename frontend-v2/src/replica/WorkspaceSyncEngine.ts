import { V2ApiError, v2Api, type V2ApiClient } from "../api/V2ApiClient";
import {
  WorkspaceReplica,
  workspaceReplica,
  type WorkspaceDataCommand,
  type WorkspaceReplicaScope,
} from "./WorkspaceReplica";
import {
  WorkspaceSyncStatusStore,
  workspaceSyncStatusStore,
} from "./WorkspaceSyncStatusStore";
import {
  dataImageDraftRepository,
  type DataImageDraftRepository,
} from "./DataImageDraftStore";

export class WorkspaceSyncEngine {
  private readonly active = new Map<string, Promise<boolean>>();
  private readonly scopes = new Map<string, WorkspaceReplicaScope>();
  private readonly desiredContents = new Map<string, Set<string>>();
  private readonly hydratedContents = new Set<string>();
  private readonly contentHydration = new Map<string, Promise<boolean>>();
  private readonly scheduledFlushes = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly replica: WorkspaceReplica,
    private readonly api: V2ApiClient,
    private readonly status: WorkspaceSyncStatusStore,
    listensToBrowser = true,
    private readonly writeDelayMs = 5_000,
    private readonly imageDrafts: DataImageDraftRepository = dataImageDraftRepository,
  ) {
    if (listensToBrowser && typeof window !== "undefined") {
      window.addEventListener("online", () => this.retryRegistered());
    }
  }

  register(scope: WorkspaceReplicaScope) {
    requestPersistentWorkspaceStorage();
    const key = scopeKey(scope);
    const registered = this.scopes.has(key);
    this.scopes.set(key, scope);
    void this.replica.load(scope).catch(() => undefined);
    if (registered) return;
    if (typeof navigator === "undefined" || navigator.onLine) {
      void this.flush(scope);
    }
  }

  retryRegistered() {
    for (const scope of this.scopes.values()) {
      void this.flush(scope);
      void this.hydrateDesiredContents(scope);
    }
  }

  async retryBlocked(scope: WorkspaceReplicaScope, commandId: string) {
    await this.replica.retryBlocked(scope, commandId);
    return this.flush(scope);
  }

  async resetToServer(scope: WorkspaceReplicaScope) {
    const key = scopeKey(scope);
    const scheduled = this.scheduledFlushes.get(key);
    if (scheduled) {
      clearTimeout(scheduled);
      this.scheduledFlushes.delete(key);
    }
    const running = this.active.get(key);
    if (running) await running.catch(() => false);

    const confirmed = await this.api.loadDataTree(scope.workspaceId);
    await this.replica.resetToServer(scope, confirmed);
    await this.imageDrafts.deleteWorkspace?.(scope.workspaceId);
    this.invalidateHydratedContents(scope);
    this.status.setPendingCount(key, 0);
    this.status.markOnline();
    return true;
  }

  ensureContents(scope: WorkspaceReplicaScope, nodeIds: readonly string[]) {
    const key = scopeKey(scope);
    const desired = this.desiredContents.get(key) ?? new Set<string>();
    for (const nodeId of nodeIds) desired.add(nodeId);
    this.desiredContents.set(key, desired);
    return this.hydrateDesiredContents(scope);
  }

  async submit(
    scope: WorkspaceReplicaScope,
    command: WorkspaceDataCommand,
    userCommandId = command.input.requestId,
  ) {
    const key = scopeKey(scope);
    this.scopes.set(key, scope);
    const optimistic = await this.replica.enqueue(
      scope,
      command,
      undefined,
      userCommandId,
    );
    if (command.type !== "set-selection") {
      this.status.markCommandCached(userCommandId);
    }
    this.status.setPendingCount(key, optimistic.outbox.length);
    this.scheduleFlush(scope, (error) => {
      this.status.markError(
        error instanceof Error ? error.message : "Workspace synchronization failed",
        optimistic.outbox.length,
      );
    });
    return optimistic;
  }

  flush(scope: WorkspaceReplicaScope): Promise<boolean> {
    const key = scopeKey(scope);
    const scheduled = this.scheduledFlushes.get(key);
    if (scheduled) {
      clearTimeout(scheduled);
      this.scheduledFlushes.delete(key);
    }
    const running = this.active.get(key);
    if (running) {
      return this.replica.load(scope).then((requestedWhileOutboxEmpty) => {
        const externalRefreshRequested = !requestedWhileOutboxEmpty?.outbox.length;
        return running.then(async (succeeded) => {
          if (!succeeded) return false;
          const pending = (await this.replica.load(scope))?.outbox.length ?? 0;
          // An SSE event can arrive while a sync is active without adding an
          // outbox command. Preserve that request as a trailing server refresh.
          return pending > 0 || externalRefreshRequested ? this.flush(scope) : true;
        });
      });
    }
    const operation = this.flushCommands(scope).finally(() => {
      this.active.delete(key);
    });
    this.active.set(key, operation);
    return operation;
  }

  private async flushCommands(scope: WorkspaceReplicaScope) {
    let record = await this.replica.load(scope);
    const key = scopeKey(scope);
    this.status.setPendingCount(key, record?.outbox.length ?? 0);
    if (!record?.outbox.length) return this.refreshTree(scope);
    if (!record.confirmedTree) {
      if (!await this.recoverServerCheckpoint(scope)) return false;
      record = await this.replica.load(scope);
      if (!record) return false;
    }
    const recoveringQueue = record.outbox.some(({ attempts }) => attempts > 0);
    const conflictsByCommand = new Map<string, number>();

    while (record.outbox.length > 0) {
      this.status.setStatus({ state: "syncing", pending: record.outbox.length });
      const entry = record.outbox[0];
      if (entry.blocked) {
        this.status.markError(entry.blocked.message, record.outbox.length);
        return false;
      }
      await this.replica.recordAttempt(scope, entry.id);
      try {
        const result = await this.dispatch(scope, entry.command);
        if (entry.command.type === "upload-image") {
          await this.imageDrafts.delete(scope.workspaceId, entry.command.nodeId);
        }
        await this.replica.confirm(scope, entry.id, result);
        if (entry.command.type !== "set-selection") {
          this.status.markCommandSaved(
            entry.userCommandId ?? entry.id,
            !recoveringQueue,
          );
        }
      } catch (error) {
        if (isRevisionConflict(error)) {
          const conflicts = (conflictsByCommand.get(entry.id) ?? 0) + 1;
          conflictsByCommand.set(entry.id, conflicts);
          if (conflicts <= 2) {
            if (await this.recoverServerCheckpoint(scope)) {
              record = await this.replica.load(scope);
              if (!record) return false;
              this.status.setPendingCount(key, record.outbox.length);
              continue;
            }
            const pending = (await this.replica.load(scope))?.outbox.length ?? 0;
            this.status.setPendingCount(key, pending);
            this.status.markError("Server checkpoint could not be loaded", pending);
            return false;
          }
          await this.replica.markBlocked(
            scope,
            entry.id,
            "REVISION_CONFLICT",
            error instanceof V2ApiError ? error.message : "Revision conflict",
          );
        }
        if (isPermanentlyRejectedCommand(error)) {
          await this.replica.markBlocked(
            scope,
            entry.id,
            error instanceof V2ApiError ? error.response.error : "REJECTED",
            error instanceof V2ApiError ? error.message : "Command was rejected",
          );
          const pending = (await this.replica.load(scope))?.outbox.length ?? 0;
          this.status.setPendingCount(key, pending);
          this.status.markError(
            error instanceof V2ApiError ? error.message : "Command was rejected",
            pending,
          );
          return false;
        }
        if (error instanceof V2ApiError) {
          const pending = (await this.replica.load(scope))?.outbox.length ?? 0;
          this.status.setPendingCount(key, pending);
          this.status.markError(error.message, pending);
        }
        return false;
      }
      record = await this.replica.load(scope);
      if (!record) return false;
      this.status.setPendingCount(key, record.outbox.length);
    }

    this.status.markOnline();
    if (recoveringQueue) this.status.markQueueSaved();
    return true;
  }

  private async refreshTree(scope: WorkspaceReplicaScope) {
    try {
      const confirmed = await this.api.loadDataTree(scope.workspaceId);
      await this.replica.rebaseFromServer(scope, confirmed);
      this.invalidateHydratedContents(scope);
      await this.hydrateDesiredContents(scope);
      const pending = (await this.replica.load(scope))?.outbox.length ?? 0;
      this.status.setPendingCount(scopeKey(scope), pending);
      this.status.markOnline();
      return true;
    } catch {
      return false;
    }
  }

  private async recoverServerCheckpoint(scope: WorkspaceReplicaScope) {
    try {
      const [confirmed, record] = await Promise.all([
        this.api.loadDataTree(scope.workspaceId),
        this.replica.load(scope),
      ]);
      const confirmedNodeIds = new Set(confirmed.document.nodes.map(({ id }) => id));
      const contentNodeIds = [...new Set(record?.outbox.flatMap(({ command }) => (
        command.type === "update-content" && confirmedNodeIds.has(command.nodeId)
          ? [command.nodeId]
          : []
      )) ?? [])];
      const contents = await Promise.all(contentNodeIds.map(
        (nodeId) => this.api.readDataContent(scope.workspaceId, nodeId),
      ));
      await this.replica.rebaseFromServer(scope, confirmed, contents);
      return true;
    } catch {
      return false;
    }
  }

  private scheduleFlush(
    scope: WorkspaceReplicaScope,
    onError: (error: unknown) => void,
  ) {
    const key = scopeKey(scope);
    const scheduled = this.scheduledFlushes.get(key);
    if (scheduled) clearTimeout(scheduled);
    const timeout = setTimeout(() => {
      this.scheduledFlushes.delete(key);
      void this.flush(scope).catch(onError);
    }, this.writeDelayMs);
    this.scheduledFlushes.set(key, timeout);
  }

  private async hydrateDesiredContents(scope: WorkspaceReplicaScope) {
    const desired = this.desiredContents.get(scopeKey(scope));
    if (!desired?.size) return true;
    const results = await Promise.all(
      [...desired].map((nodeId) => this.hydrateContent(scope, nodeId)),
    );
    return results.every(Boolean);
  }

  private hydrateContent(scope: WorkspaceReplicaScope, nodeId: string) {
    const key = `${scopeKey(scope)}:${nodeId}`;
    if (this.hydratedContents.has(key)) return Promise.resolve(true);
    const running = this.contentHydration.get(key);
    if (running) return running;
    const operation = this.api.readDataContent(scope.workspaceId, nodeId)
      .then(async (content) => {
        await this.replica.putContent(scope, content);
        this.hydratedContents.add(key);
        return true;
      })
      .catch(() => false)
      .finally(() => this.contentHydration.delete(key));
    this.contentHydration.set(key, operation);
    return operation;
  }

  private invalidateHydratedContents(scope: WorkspaceReplicaScope) {
    const prefix = `${scopeKey(scope)}:`;
    for (const key of this.hydratedContents) {
      if (key.startsWith(prefix)) this.hydratedContents.delete(key);
    }
  }

  private async dispatch(
    scope: WorkspaceReplicaScope,
    command: WorkspaceDataCommand,
  ) {
    const workspaceId = scope.workspaceId;
    switch (command.type) {
      case "create-node": {
        return this.api.createDataNode(workspaceId, command.input);
      }
      case "rename-node": {
        return this.api.renameDataNode(
          workspaceId, command.nodeId, command.input,
        );
      }
      case "update-local-id": {
        return this.api.updateDataNodeLocalId(
          workspaceId, command.nodeId, command.input,
        );
      }
      case "move-node": {
        return this.api.moveDataNode(
          workspaceId, command.nodeId, command.input,
        );
      }
      case "reparent-node": {
        return this.api.reparentDataNode(
          workspaceId, command.nodeId, command.input,
        );
      }
      case "delete-node":
        return this.api.deleteDataNode(workspaceId, command.nodeId, command.input);
      case "set-node-enabled":
        return this.api.setDataNodeEnabled(
          workspaceId, command.nodeId, command.input,
        );
      case "set-node-sharing":
        return this.api.setDataNodeSharing(
          workspaceId, command.nodeId, command.input,
        );
      case "set-selection":
        return this.api.setDataSelection(workspaceId, command.input);
      case "upload-image": {
        const draft = await this.imageDrafts.read(workspaceId, command.nodeId);
        if (!draft) {
          return {
            nodeId: command.nodeId,
            mimeType: command.input.mimeType,
            originalName: command.input.fileName,
            byteSize: 0,
            updatedAt: new Date().toISOString(),
          };
        }
        return this.api.uploadDataImage(
          workspaceId,
          command.nodeId,
          draft.blob,
          command.input.fileName,
        );
      }
      case "update-content": {
        return this.api.updateDataContent(
          workspaceId, command.nodeId, command.input,
        );
      }
    }
  }
}

function isRevisionConflict(error: unknown) {
  return error instanceof V2ApiError
    && error.response.error === "REVISION_CONFLICT";
}

function isPermanentlyRejectedCommand(error: unknown) {
  return error instanceof V2ApiError
    && ["FORBIDDEN", "INVALID_REQUEST", "NOT_FOUND"].includes(
      error.response.error,
    );
}

export const workspaceSyncEngine = new WorkspaceSyncEngine(
  workspaceReplica,
  v2Api,
  workspaceSyncStatusStore,
);

function scopeKey(scope: WorkspaceReplicaScope) {
  return `${scope.userId}:${scope.workspaceId}`;
}

let persistentStorageRequested = false;

function requestPersistentWorkspaceStorage() {
  if (persistentStorageRequested || typeof navigator === "undefined") return;
  persistentStorageRequested = true;
  void navigator.storage?.persist?.().catch(() => false);
}
