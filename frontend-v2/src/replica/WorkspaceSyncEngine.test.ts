import { describe, expect, it, vi } from "vitest";
import type { TreeLoadDto } from "@flydeck/shared/v2";

import { V2ApiClient, V2ApiError } from "../api/V2ApiClient";
import {
  MemoryWorkspaceReplicaStorage,
  WorkspaceReplica,
} from "./WorkspaceReplica";
import { WorkspaceSyncEngine } from "./WorkspaceSyncEngine";
import { WorkspaceSyncStatusStore } from "./WorkspaceSyncStatusStore";

const scope = {
  userId: "00000000-0000-4000-8000-000000000001",
  workspaceId: "00000000-0000-4000-8000-000000000002",
};
const nodeId = "00000000-0000-4000-8000-000000000003";

describe("WorkspaceSyncEngine", () => {
  it("dispatches a queued command once and acknowledges it", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const before = tree("Before", 0, 1);
    const after = tree("After", 1, 2);
    await replica.replaceTree(scope, before);
    const renameDataNode = vi.fn().mockResolvedValue({
      node: after.document.nodes[0],
      treeRevision: 2,
    });
    const api = {
      renameDataNode,
      loadDataTree: vi.fn().mockResolvedValue(after),
    } as unknown as V2ApiClient;
    const status = new WorkspaceSyncStatusStore(false);
    const engine = new WorkspaceSyncEngine(replica, api, status, false);

    await engine.submit(scope, {
      type: "rename-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000004",
        label: "After",
        expectedRevision: 0,
      },
    });
    await expect(engine.flush(scope)).resolves.toBe(true);

    expect(renameDataNode).toHaveBeenCalledOnce();
    expect((await replica.load(scope))?.outbox).toEqual([]);
    expect((await replica.load(scope))?.tree).toEqual(after);
    expect(status.getSnapshot()).toEqual({ state: "idle" });
  });

  it("keeps an optimistic command queued when transport is offline", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    await replica.replaceTree(scope, tree("Before", 0, 1));
    const status = new WorkspaceSyncStatusStore(false);
    const api = new V2ApiClient(
      "/flydeck/api/v2",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
      status,
    );
    const engine = new WorkspaceSyncEngine(replica, api, status, false);

    const optimistic = await engine.submit(scope, {
      type: "rename-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000006",
        label: "Offline",
        expectedRevision: 0,
      },
    });

    expect(optimistic.tree?.document.nodes[0].label).toBe("Offline");
    await expect(engine.flush(scope)).resolves.toBe(false);

    const cached = await replica.load(scope);
    expect(cached?.tree?.document.nodes[0].label).toBe("Offline");
    expect(cached?.outbox[0]).toMatchObject({ attempts: 1 });
    expect(status.getSnapshot()).toEqual({
      state: "offline",
      reason: "Failed to fetch",
    });
  });

  it("returns the durable optimistic record without waiting for transport", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    await replica.replaceTree(scope, tree("Before", 0, 1));
    let confirmRename!: (value: {
      node: ReturnType<typeof tree>["document"]["nodes"][number];
      treeRevision: number;
    }) => void;
    const renameResponse = new Promise<{
      node: ReturnType<typeof tree>["document"]["nodes"][number];
      treeRevision: number;
    }>((resolve) => {
      confirmRename = resolve;
    });
    const after = tree("After", 1, 2);
    const api = {
      renameDataNode: vi.fn().mockReturnValue(renameResponse),
      loadDataTree: vi.fn().mockResolvedValue(after),
    } as unknown as V2ApiClient;
    const engine = new WorkspaceSyncEngine(
      replica,
      api,
      new WorkspaceSyncStatusStore(false),
      false,
    );

    const optimistic = await engine.submit(scope, {
      type: "rename-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000007",
        label: "After",
        expectedRevision: 0,
      },
    });

    expect(optimistic.tree?.document.nodes[0].label).toBe("After");
    expect(optimistic.outbox).toHaveLength(1);

    const draining = engine.flush(scope);
    confirmRename({ node: after.document.nodes[0], treeRevision: 2 });
    await expect(draining).resolves.toBe(true);
  });

  it("waits for one quiet second before dispatching cached writes", async () => {
    vi.useFakeTimers();
    try {
      const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
      const before = tree("Before", 0, 1);
      const after = tree("After", 1, 2);
      await replica.replaceTree(scope, before);
      const renameDataNode = vi.fn().mockResolvedValue({
        node: after.document.nodes[0],
        treeRevision: 2,
      });
      const api = {
        renameDataNode,
        loadDataTree: vi.fn().mockResolvedValue(after),
      } as unknown as V2ApiClient;
      const engine = new WorkspaceSyncEngine(
        replica,
        api,
        new WorkspaceSyncStatusStore(false),
        false,
        1_000,
      );

      await engine.submit(scope, {
        type: "rename-node",
        nodeId,
        input: {
          requestId: "00000000-0000-4000-8000-000000000013",
          label: "After",
          expectedRevision: 0,
        },
      });
      await vi.advanceTimersByTimeAsync(999);
      expect(renameDataNode).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(renameDataNode).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("replays rapid moves with consecutive optimistic revisions", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const before = tree("Before", 0, 1);
    const after = tree("Before", 2, 3);
    await replica.replaceTree(scope, before);
    const moveDataNode = vi.fn().mockResolvedValue({
      node: after.document.nodes[0],
      treeRevision: 3,
    });
    const api = {
      moveDataNode,
      loadDataTree: vi.fn().mockResolvedValue(after),
    } as unknown as V2ApiClient;
    const engine = new WorkspaceSyncEngine(
      replica,
      api,
      new WorkspaceSyncStatusStore(false),
      false,
    );

    await Promise.all([
      engine.submit(scope, {
        type: "move-node",
        nodeId,
        input: {
          requestId: "00000000-0000-4000-8000-000000000014",
          afterNodeId: null,
          expectedTreeRevision: 1,
        },
      }),
      engine.submit(scope, {
        type: "move-node",
        nodeId,
        input: {
          requestId: "00000000-0000-4000-8000-000000000015",
          afterNodeId: null,
          expectedTreeRevision: 1,
        },
      }),
    ]);
    await expect(engine.flush(scope)).resolves.toBe(true);

    expect(moveDataNode.mock.calls.map(([, , input]) => (
      input.expectedTreeRevision
    ))).toEqual([1, 2]);
    expect((await replica.load(scope))?.outbox).toEqual([]);
  });

  it("hydrates requested content through the replica and deduplicates it", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    await replica.replaceTree(scope, tree("Before", 0, 1));
    const content = {
      nodeId,
      format: "markdown" as const,
      content: "Cached description",
      revision: 2,
    };
    const readDataContent = vi.fn().mockResolvedValue(content);
    const api = { readDataContent } as unknown as V2ApiClient;
    const engine = new WorkspaceSyncEngine(
      replica,
      api,
      new WorkspaceSyncStatusStore(false),
      false,
    );

    await engine.ensureContents(scope, [nodeId, nodeId]);
    await engine.ensureContents(scope, [nodeId]);

    expect(readDataContent).toHaveBeenCalledOnce();
    expect((await replica.load(scope))?.contents[nodeId]).toEqual(content);
  });

  it("discards a stale selection conflict and continues later writes", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const before = tree("Before", 0, 1);
    const after = tree("After", 1, 2);
    after.selection = {
      revision: 4,
      selectedPath: [nodeId],
      pageSizes: { __tree_root__: 10 },
    };
    await replica.replaceTree(scope, before);
    await replica.enqueue(scope, {
      type: "set-selection",
      input: {
        requestId: "00000000-0000-4000-8000-000000000008",
        selectedPath: [nodeId],
        pageSizes: { __tree_root__: 10 },
        expectedRevision: 0,
      },
    });
    await replica.enqueue(scope, {
      type: "rename-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000009",
        label: "After",
        expectedRevision: 0,
      },
    });
    await replica.recordAttempt(
      scope,
      "00000000-0000-4000-8000-000000000008",
    );
    const renameDataNode = vi.fn().mockResolvedValue({
      node: after.document.nodes[0],
      treeRevision: 2,
    });
    const api = {
      setDataSelection: vi.fn().mockRejectedValue(new V2ApiError({
        error: "REVISION_CONFLICT",
        message: "Selection was changed by another request",
        requestId: "request-1",
        currentRevision: 4,
      })),
      renameDataNode,
      loadDataTree: vi.fn().mockResolvedValue(after),
    } as unknown as V2ApiClient;
    const status = new WorkspaceSyncStatusStore(false);
    const engine = new WorkspaceSyncEngine(replica, api, status, false);

    await expect(engine.flush(scope)).resolves.toBe(true);

    expect(renameDataNode).toHaveBeenCalledOnce();
    expect((await replica.load(scope))?.outbox).toEqual([]);
    expect((await replica.load(scope))?.tree).toEqual(after);
    expect(status.getSnapshot()).toEqual({ state: "idle" });
    expect(status.getActivitySnapshot()).toEqual({ message: "queue saved" });
  });

  it("discards the client replica after a permanently rejected command", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const stale = tree("Stale", 0, 1);
    const confirmed = tree("Server", 2, 3);
    await replica.replaceTree(scope, stale);
    await replica.enqueue(scope, {
      type: "delete-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000012",
        expectedTreeRevision: 1,
      },
    });
    const api = {
      deleteDataNode: vi.fn().mockRejectedValue(new V2ApiError({
        error: "FORBIDDEN",
        message: "System directories cannot be changed",
        requestId: "request-3",
      })),
      loadDataTree: vi.fn().mockResolvedValue(confirmed),
    } as unknown as V2ApiClient;
    const status = new WorkspaceSyncStatusStore(false);
    const engine = new WorkspaceSyncEngine(
      replica,
      api,
      status,
      false,
    );

    await expect(engine.flush(scope)).resolves.toBe(true);

    expect(await replica.load(scope)).toMatchObject({
      tree: confirmed,
      contents: {},
      outbox: [],
    });
    expect(status.getSnapshot()).toEqual({ state: "idle" });
  });

  it("reconciles the replica without reloading after a tree revision conflict", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const stale = tree("Stale", 0, 1);
    const confirmed = tree("Server", 2, 3);
    await replica.replaceTree(scope, stale);
    await replica.putContent(scope, {
      nodeId,
      format: "markdown",
      content: "Local only",
      revision: 1,
    });
    await replica.enqueue(scope, {
      type: "move-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000010",
        afterNodeId: null,
        expectedTreeRevision: 1,
      },
    });
    await replica.enqueue(scope, {
      type: "rename-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000011",
        label: "Never dispatched",
        expectedRevision: 1,
      },
    });
    const renameDataNode = vi.fn();
    const api = {
      moveDataNode: vi.fn().mockRejectedValue(new V2ApiError({
        error: "REVISION_CONFLICT",
        message: "The tree was changed in another browser : please reload",
        requestId: "request-2",
        currentRevision: 3,
      })),
      renameDataNode,
      loadDataTree: vi.fn().mockResolvedValue(confirmed),
    } as unknown as V2ApiClient;
    const status = new WorkspaceSyncStatusStore(false);
    const engine = new WorkspaceSyncEngine(
      replica,
      api,
      status,
      false,
    );

    await expect(engine.flush(scope)).resolves.toBe(true);

    expect(renameDataNode).not.toHaveBeenCalled();
    expect(await replica.load(scope)).toMatchObject({
      tree: confirmed,
      contents: {},
      outbox: [],
    });
    expect(status.getSnapshot()).toEqual({ state: "idle" });
  });
});

function tree(
  label: string,
  nodeRevision: number,
  treeRevision: number,
): TreeLoadDto {
  return {
    document: {
      id: "00000000-0000-4000-8000-000000000005",
      workspaceId: scope.workspaceId,
      kind: "data" as const,
      revision: treeRevision,
      nodes: [{
        id: nodeId,
        parentId: null,
        kind: "data-file",
        label,
        localId: label.toLocaleLowerCase(),
        position: 0,
        revision: nodeRevision,
        capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
      }],
    },
    semanticState: { revision: 0, enabledNodeIds: [], nodeRevisions: { [nodeId]: 0 } },
    selection: { revision: 0, selectedPath: [], pageSizes: {} },
  };
}
