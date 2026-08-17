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

export class WorkspaceSyncEngine {
  private readonly active = new Map<string, Promise<boolean>>();
  private readonly scopes = new Map<string, WorkspaceReplicaScope>();
  private readonly desiredContents = new Map<string, Set<string>>();
  private readonly hydratedContents = new Set<string>();
  private readonly contentHydration = new Map<string, Promise<boolean>>();

  constructor(
    private readonly replica: WorkspaceReplica,
    private readonly api: V2ApiClient,
    private readonly status: WorkspaceSyncStatusStore,
    listensToBrowser = true,
    private readonly reloadPage: () => void = () => {
      if (typeof window !== "undefined") window.location.reload();
    },
  ) {
    if (listensToBrowser && typeof window !== "undefined") {
      window.addEventListener("online", () => this.retryRegistered());
    }
  }

  register(scope: WorkspaceReplicaScope) {
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
    void this.flush(scope).catch((error) => {
      this.status.markError(
        error instanceof Error ? error.message : "Workspace synchronization failed",
        optimistic.outbox.length,
      );
    });
    return optimistic;
  }

  flush(scope: WorkspaceReplicaScope) {
    const key = scopeKey(scope);
    const running = this.active.get(key);
    if (running) return running;
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
    const recoveringQueue = record.outbox.some(({ attempts }) => attempts > 0);

    while (record.outbox.length > 0) {
      this.status.setStatus({ state: "syncing", pending: record.outbox.length });
      const entry = record.outbox[0];
      await this.replica.recordAttempt(scope, entry.id);
      try {
        await this.dispatch(scope, entry.command);
        await this.replica.acknowledge(scope, entry.id);
        if (entry.command.type !== "set-selection") {
          this.status.markCommandSaved(
            entry.userCommandId ?? entry.id,
            !recoveringQueue,
          );
        }
      } catch (error) {
        if (isDiscardableSelectionConflict(error, entry.command)) {
          await this.replica.acknowledge(scope, entry.id);
          record = await this.replica.load(scope);
          if (!record) return false;
          this.status.setPendingCount(key, record.outbox.length);
          continue;
        }
        if (isRevisionConflict(error)) {
          try {
            const confirmed = await this.api.loadDataTree(scope.workspaceId);
            await this.replica.resetToServerTree(scope, confirmed);
            this.status.setPendingCount(key, 0);
            this.status.markOnline();
            this.reloadPage();
            return true;
          } catch {
            return false;
          }
        }
        if (isPermanentlyRejectedCommand(error)) {
          try {
            const confirmed = await this.api.loadDataTree(scope.workspaceId);
            await this.replica.resetToServerTree(scope, confirmed);
            this.status.setPendingCount(key, 0);
            this.status.markOnline();
            this.reloadPage();
            return true;
          } catch {
            return false;
          }
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

    if (!await this.refreshTree(scope)) return false;
    if (recoveringQueue) this.status.markQueueSaved();
    return true;
  }

  private async refreshTree(scope: WorkspaceReplicaScope) {
    try {
      const confirmed = await this.api.loadDataTree(scope.workspaceId);
      await this.replica.replaceTree(scope, confirmed);
      this.invalidateHydratedContents(scope);
      await this.hydrateDesiredContents(scope);
      this.status.markOnline();
      return true;
    } catch {
      return false;
    }
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
        const result = await this.api.createDataNode(workspaceId, command.input);
        await this.replica.putNode(scope, result.node, result.treeRevision);
        return;
      }
      case "rename-node": {
        const result = await this.api.renameDataNode(
          workspaceId, command.nodeId, command.input,
        );
        await this.replica.putNode(scope, result.node, result.treeRevision);
        return;
      }
      case "update-local-id": {
        const result = await this.api.updateDataNodeLocalId(
          workspaceId, command.nodeId, command.input,
        );
        await this.replica.putNode(scope, result.node, result.treeRevision);
        return;
      }
      case "move-node": {
        const result = await this.api.moveDataNode(
          workspaceId, command.nodeId, command.input,
        );
        await this.replica.putNode(scope, result.node, result.treeRevision);
        return;
      }
      case "reparent-node": {
        const result = await this.api.reparentDataNode(
          workspaceId, command.nodeId, command.input,
        );
        await this.replica.putNode(scope, result.node, result.treeRevision);
        return;
      }
      case "delete-node":
        await this.api.deleteDataNode(workspaceId, command.nodeId, command.input);
        return;
      case "set-node-enabled":
        await this.api.setDataNodeEnabled(
          workspaceId, command.nodeId, command.input,
        );
        return;
      case "set-selection":
        await this.api.setDataSelection(workspaceId, command.input);
        return;
      case "update-content": {
        const content = await this.api.updateDataContent(
          workspaceId, command.nodeId, command.input,
        );
        await this.replica.putContent(scope, content);
      }
    }
  }
}

function isDiscardableSelectionConflict(
  error: unknown,
  command: WorkspaceDataCommand,
) {
  return command.type === "set-selection"
    && error instanceof V2ApiError
    && error.response.error === "REVISION_CONFLICT";
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
