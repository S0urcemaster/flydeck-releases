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

  it("runs a requested follow-up sync after an active mutation", async () => {
    vi.useFakeTimers();
    try {
      const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
      const before = tree("Before", 0, 1);
      const afterFirst = tree("First", 1, 2);
      const afterSecond = tree("Second", 2, 3);
      await replica.replaceTree(scope, before);
      let resolveFirst!: (value: {
        node: TreeLoadDto["document"]["nodes"][number];
        treeRevision: number;
      }) => void;
      const firstResponse = new Promise<{
        node: TreeLoadDto["document"]["nodes"][number];
        treeRevision: number;
      }>((resolve) => {
        resolveFirst = resolve;
      });
      let announceMutation!: () => void;
      const mutationStarted = new Promise<void>((resolve) => {
        announceMutation = resolve;
      });
      const api = {
        renameDataNode: vi.fn()
          .mockImplementationOnce(() => {
            announceMutation();
            return firstResponse;
          })
          .mockResolvedValueOnce({
            node: afterSecond.document.nodes[0],
            treeRevision: 3,
          }),
      } as unknown as V2ApiClient;
      const status = new WorkspaceSyncStatusStore(false);
      const engine = new WorkspaceSyncEngine(replica, api, status, false);

      await engine.submit(scope, {
        type: "rename-node",
        nodeId,
        input: {
          requestId: "00000000-0000-4000-8000-000000000004",
          label: "First",
          expectedRevision: 0,
        },
      });
      const flushing = engine.flush(scope);
      await mutationStarted;
      await engine.submit(scope, {
        type: "rename-node",
        nodeId,
        input: {
          requestId: "00000000-0000-4000-8000-000000000005",
          label: "Second",
          expectedRevision: 1,
        },
      });
      const followUp = engine.flush(scope);
      resolveFirst({ node: afterFirst.document.nodes[0], treeRevision: 2 });

      await expect(flushing).resolves.toBe(true);
      await expect(followUp).resolves.toBe(true);
      const cached = await replica.load(scope);
      expect(cached?.tree?.document.nodes[0].label).toBe("Second");
      expect(cached?.outbox).toEqual([]);
      expect(api.renameDataNode).toHaveBeenCalledTimes(2);
      expect(status.getPendingCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
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

  it("recovers after the server committed but the local acknowledgement was lost", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const firstReplica = new WorkspaceReplica(storage);
    const before = tree("Before", 0, 1);
    const after = tree("After", 1, 2);
    await firstReplica.replaceTree(scope, before);
    await firstReplica.enqueue(scope, {
      type: "rename-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000018",
        label: "After",
        expectedRevision: 0,
      },
    });
    await firstReplica.recordAttempt(
      scope,
      "00000000-0000-4000-8000-000000000018",
    );

    const reloadedReplica = new WorkspaceReplica(storage);
    const renameDataNode = vi.fn().mockResolvedValue({
      node: after.document.nodes[0],
      treeRevision: 2,
    });
    const engine = new WorkspaceSyncEngine(
      reloadedReplica,
      { renameDataNode } as unknown as V2ApiClient,
      new WorkspaceSyncStatusStore(false),
      false,
    );

    await expect(engine.flush(scope)).resolves.toBe(true);

    expect(renameDataNode.mock.calls[0]?.[2].requestId)
      .toBe("00000000-0000-4000-8000-000000000018");
    const recovered = await reloadedReplica.load(scope);
    expect(recovered?.tree?.document.nodes[0].label).toBe("After");
    expect(recovered?.outbox).toEqual([]);
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

  it("waits for five quiet seconds after the latest cached write", async () => {
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
      await vi.advanceTimersByTimeAsync(4_000);
      await engine.submit(scope, {
        type: "rename-node",
        nodeId,
        input: {
          requestId: "00000000-0000-4000-8000-000000000016",
          label: "After again",
          expectedRevision: 0,
        },
      });
      await vi.advanceTimersByTimeAsync(4_999);
      expect(renameDataNode).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(renameDataNode).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uploads a cached image only after its new node reaches the server", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const before = tree("Before", 0, 1);
    const newNodeId = "00000000-0000-4000-8000-000000000017";
    const createdNode = {
      ...before.document.nodes[0],
      id: newNodeId,
      label: "New post",
      localId: "new-post",
      revision: 0,
    };
    const after = {
      ...before,
      document: {
        ...before.document,
        revision: 2,
        nodes: [...before.document.nodes, createdNode],
      },
    };
    await replica.replaceTree(scope, before);
    const calls: string[] = [];
    const api = {
      createDataNode: vi.fn().mockImplementation(async () => {
        calls.push("create");
        return { node: createdNode, treeRevision: 2 };
      }),
      uploadDataImage: vi.fn().mockImplementation(async () => {
        calls.push("upload");
        return {
          nodeId: newNodeId,
          mimeType: "image/jpeg",
          originalName: "photo.jpg",
          byteSize: 5,
          updatedAt: "2026-08-28T20:00:00.000Z",
        };
      }),
      loadDataTree: vi.fn().mockResolvedValue(after),
    } as unknown as V2ApiClient;
    const imageDrafts = {
      read: vi.fn().mockResolvedValue({
        blob: new Blob(["photo"], { type: "image/jpeg" }),
        fileName: "photo.jpg",
      }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const engine = new WorkspaceSyncEngine(
      replica,
      api,
      new WorkspaceSyncStatusStore(false),
      false,
      5_000,
      imageDrafts,
    );

    await engine.submit(scope, {
      type: "create-node",
      input: {
        requestId: "00000000-0000-4000-8000-000000000018",
        nodeId: newNodeId,
        parentId: null,
        afterNodeId: nodeId,
        kind: "data-file",
        label: "New post",
        localId: "new-post",
        expectedTreeRevision: 1,
      },
    });
    await engine.submit(scope, {
      type: "upload-image",
      nodeId: newNodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000019",
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
      },
    });

    await expect(engine.flush(scope)).resolves.toBe(true);

    expect(calls).toEqual(["create", "upload"]);
    expect(imageDrafts.delete).toHaveBeenCalledWith(scope.workspaceId, newNodeId);
    expect((await replica.load(scope))?.outbox).toEqual([]);
  });

  it("replays rapid moves with consecutive optimistic revisions", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const before = tree("Before", 0, 1);
    const after = tree("Before", 2, 3);
    await replica.replaceTree(scope, before);
    const moveDataNode = vi.fn()
      .mockResolvedValueOnce({
        node: { ...after.document.nodes[0], revision: 1 },
        treeRevision: 2,
      })
      .mockResolvedValueOnce({
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

  it("keeps the optimistic tree visible when the server confirms a move", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const before = tree("First", 0, 1);
    const secondNodeId = "00000000-0000-4000-8000-000000000006";
    before.document.nodes.push({
      ...before.document.nodes[0],
      id: secondNodeId,
      label: "Second",
      localId: "second",
      position: 1,
    });
    const after: TreeLoadDto = {
      ...before,
      document: {
        ...before.document,
        revision: 2,
        nodes: before.document.nodes.map((node) => node.id === nodeId
          ? { ...node, position: 1, revision: 1, updatedAt: "2026-08-24T12:00:00.000Z" }
          : { ...node, position: 0, updatedAt: "2026-08-24T12:00:00.000Z" }),
      },
    };
    await replica.replaceTree(scope, before);
    const api = {
      moveDataNode: vi.fn().mockResolvedValue({
        node: after.document.nodes[0],
        treeRevision: 2,
      }),
      loadDataTree: vi.fn().mockResolvedValue(after),
    } as unknown as V2ApiClient;
    const engine = new WorkspaceSyncEngine(
      replica,
      api,
      new WorkspaceSyncStatusStore(false),
      false,
    );

    await engine.submit(scope, {
      type: "move-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000016",
        afterNodeId: secondNodeId,
        expectedTreeRevision: 1,
      },
    });
    const optimisticTree = replica.getSnapshot(scope)?.tree;
    await expect(engine.flush(scope)).resolves.toBe(true);

    expect(replica.getSnapshot(scope)?.tree).toBe(optimisticTree);
    const positions = (nodes: TreeLoadDto["document"]["nodes"]) => nodes.map((node) => ({
      id: node.id,
      position: node.position,
      revision: node.revision,
    }));
    expect(positions(replica.getSnapshot(scope)?.tree?.document.nodes ?? []))
      .toEqual(positions(after.document.nodes));
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

  it("rebases a stale selection without discarding the local intent", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const before = tree("Before", 0, 1);
    const checkpoint = tree("Before", 0, 1);
    checkpoint.selection = {
      revision: 4,
      selectedPath: [],
      pageSizes: {},
    };
    const after = tree("After", 1, 2);
    after.selection = {
      revision: 5,
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
      setDataSelection: vi.fn()
        .mockRejectedValueOnce(new V2ApiError({
          error: "REVISION_CONFLICT",
          message: "Selection was changed by another request",
          requestId: "request-1",
          currentRevision: 4,
        }))
        .mockResolvedValueOnce(after.selection),
      renameDataNode,
      loadDataTree: vi.fn().mockResolvedValue(checkpoint),
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

  it("keeps local work when the server permanently rejects a command", async () => {
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

    await expect(engine.flush(scope)).resolves.toBe(false);

    expect(await replica.load(scope)).toMatchObject({
      tree: stale,
      outbox: [{
        blocked: {
          code: "FORBIDDEN",
          message: "System directories cannot be changed",
        },
      }],
    });
    expect(status.getSnapshot()).toEqual({
      state: "error",
      reason: "System directories cannot be changed",
      pending: 1,
    });
  });

  it("rebases pending content on the current server revision", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const before = tree("Before", 0, 1);
    await replica.replaceTree(scope, before);
    await replica.putContent(scope, {
      nodeId,
      format: "markdown",
      content: "Before",
      revision: 0,
    });
    await replica.enqueue(scope, {
      type: "update-content",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000017",
        content: "Local",
        expectedRevision: 0,
      },
    });
    const updateDataContent = vi.fn()
      .mockRejectedValueOnce(new V2ApiError({
        error: "REVISION_CONFLICT",
        message: "Content was changed by another request",
        requestId: "request-content",
        currentRevision: 2,
      }))
      .mockResolvedValueOnce({
        nodeId,
        format: "markdown",
        content: "Local",
        revision: 3,
      });
    const api = {
      updateDataContent,
      loadDataTree: vi.fn().mockResolvedValue(before),
      readDataContent: vi.fn().mockResolvedValue({
        nodeId,
        format: "markdown",
        content: "Server",
        revision: 2,
      }),
    } as unknown as V2ApiClient;
    const engine = new WorkspaceSyncEngine(
      replica,
      api,
      new WorkspaceSyncStatusStore(false),
      false,
    );

    await expect(engine.flush(scope)).resolves.toBe(true);

    expect(updateDataContent.mock.calls.map(([, , input]) => (
      input.expectedRevision
    ))).toEqual([0, 2]);
    const cached = await replica.load(scope);
    expect(cached?.contents[nodeId]).toMatchObject({
      content: "Local",
      revision: 3,
    });
    expect(cached?.confirmedContents[nodeId]).toMatchObject({
      content: "Local",
      revision: 3,
    });
    expect(cached?.outbox).toEqual([]);
  });

  it("rebases queued local work after a tree revision conflict", async () => {
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
    const moved = {
      node: { ...confirmed.document.nodes[0], revision: 3 },
      treeRevision: 4,
    };
    const renamed = {
      node: { ...moved.node, label: "Never dispatched", revision: 4 },
      treeRevision: 5,
    };
    const renameDataNode = vi.fn().mockResolvedValue(renamed);
    const api = {
      moveDataNode: vi.fn()
        .mockRejectedValueOnce(new V2ApiError({
          error: "REVISION_CONFLICT",
          message: "The tree was changed in another browser : please reload",
          requestId: "request-2",
          currentRevision: 3,
        }))
        .mockResolvedValueOnce(moved),
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

    expect(renameDataNode).toHaveBeenCalledOnce();
    const cached = await replica.load(scope);
    expect(cached?.tree?.document.nodes[0]).toMatchObject({
      label: "Never dispatched",
      revision: 4,
    });
    expect(cached?.contents[nodeId]?.content).toBe("Local only");
    expect(cached?.outbox).toEqual([]);
    expect(status.getSnapshot()).toEqual({ state: "idle" });
  });

  it("keeps a revision conflict pending when checkpoint recovery is offline", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    await replica.replaceTree(scope, tree("Before", 0, 1));
    await replica.enqueue(scope, {
      type: "rename-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000019",
        label: "Local",
        expectedRevision: 0,
      },
    });
    const api = {
      renameDataNode: vi.fn().mockRejectedValue(new V2ApiError({
        error: "REVISION_CONFLICT",
        message: "Node revision changed",
        requestId: "request-revision",
        currentRevision: 2,
      })),
      loadDataTree: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    } as unknown as V2ApiClient;
    const engine = new WorkspaceSyncEngine(
      replica,
      api,
      new WorkspaceSyncStatusStore(false),
      false,
    );

    await expect(engine.flush(scope)).resolves.toBe(false);

    const cached = await replica.load(scope);
    expect(cached?.tree?.document.nodes[0].label).toBe("Local");
    expect(cached?.outbox).toHaveLength(1);
    expect(cached?.outbox[0].blocked).toBeUndefined();
  });

  it("resets a blocked client replica and image drafts to the server state", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const local = tree("Local", 0, 1);
    const server = tree("Server", 4, 7);
    await replica.replaceTree(scope, local);
    await replica.putContent(scope, {
      nodeId,
      format: "markdown",
      content: "Local only",
      revision: 0,
    });
    const commandId = "00000000-0000-4000-8000-000000000020";
    await replica.enqueue(scope, {
      type: "set-selection",
      input: {
        requestId: commandId,
        selectedPath: ["00000000-0000-4000-8000-000000000099"],
        pageSizes: {},
        expectedRevision: 0,
      },
    });
    await replica.markBlocked(
      scope,
      commandId,
      "INVALID_REQUEST",
      "Selected path is not a valid tree path",
    );
    const deleteWorkspace = vi.fn().mockResolvedValue(undefined);
    const engine = new WorkspaceSyncEngine(
      replica,
      { loadDataTree: vi.fn().mockResolvedValue(server) } as unknown as V2ApiClient,
      new WorkspaceSyncStatusStore(false),
      false,
      5_000,
      {
        read: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(undefined),
        deleteWorkspace,
      },
    );

    await expect(engine.resetToServer(scope)).resolves.toBe(true);

    expect(await replica.load(scope)).toMatchObject({
      confirmedTree: server,
      tree: server,
      confirmedContents: {},
      contents: {},
      outbox: [],
    });
    expect(deleteWorkspace).toHaveBeenCalledWith(scope.workspaceId);
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
