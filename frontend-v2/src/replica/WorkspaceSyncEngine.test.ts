import { describe, expect, it, vi } from "vitest";

import { V2ApiClient } from "../api/V2ApiClient";
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
});

function tree(label: string, nodeRevision: number, treeRevision: number) {
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
        position: 0,
        revision: nodeRevision,
        capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
      }],
    },
    semanticState: { revision: 0, enabledNodeIds: [], nodeRevisions: { [nodeId]: 0 } },
    selection: { revision: 0, selectedPath: [] },
  };
}
