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

  constructor(
    private readonly replica: WorkspaceReplica,
    private readonly api: V2ApiClient,
    private readonly status: WorkspaceSyncStatusStore,
    listensToBrowser = true,
  ) {
    if (listensToBrowser && typeof window !== "undefined") {
      window.addEventListener("online", () => {
        for (const scope of this.scopes.values()) void this.flush(scope);
      });
    }
  }

  register(scope: WorkspaceReplicaScope) {
    this.scopes.set(scopeKey(scope), scope);
    if (typeof navigator === "undefined" || navigator.onLine) {
      void this.flush(scope);
    }
  }

  retryRegistered() {
    for (const scope of this.scopes.values()) void this.flush(scope);
  }

  async submit(scope: WorkspaceReplicaScope, command: WorkspaceDataCommand) {
    const key = scopeKey(scope);
    this.scopes.set(key, scope);
    const optimistic = await this.replica.enqueue(scope, command);
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
    if (!record?.outbox.length) return true;

    while (record.outbox.length > 0) {
      this.status.setStatus({ state: "syncing", pending: record.outbox.length });
      const entry = record.outbox[0];
      await this.replica.recordAttempt(scope, entry.id);
      try {
        await this.dispatch(scope, entry.command);
        await this.replica.acknowledge(scope, entry.id);
      } catch (error) {
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

    try {
      const confirmed = await this.api.loadDataTree(scope.workspaceId);
      await this.replica.replaceTree(scope, confirmed);
    } catch {
      return false;
    }
    this.status.markOnline();
    return true;
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

export const workspaceSyncEngine = new WorkspaceSyncEngine(
  workspaceReplica,
  v2Api,
  workspaceSyncStatusStore,
);

function scopeKey(scope: WorkspaceReplicaScope) {
  return `${scope.userId}:${scope.workspaceId}`;
}
