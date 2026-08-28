import { describe, expect, it, vi } from "vitest";
import type { TreeLoadDto } from "@flydeck/shared/v2";

import {
  MemoryWorkspaceReplicaStorage,
  WorkspaceReplica,
  upgradeWorkspaceReplicaRecord,
  workspaceReplicaSchemaVersion,
  type WorkspaceOutboxEntry,
  type WorkspaceReplicaRecord,
} from "./WorkspaceReplica";

const firstScope = { userId: "user-a", workspaceId: "workspace-a" };
const secondScope = { userId: "user-a", workspaceId: "workspace-b" };

describe("MemoryWorkspaceReplicaStorage", () => {
  it("upgrades cached V1 tree nodes with sibling-local IDs", () => {
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const legacyNode = {
      id: "00000000-0000-4000-8000-000000000006",
      parentId: null,
      kind: "data-file",
      label: "Cached Entry",
      position: 0,
      revision: 0,
      capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
    };
    (tree.document.nodes as unknown[]).push(legacyNode);
    const legacy = {
      schemaVersion: 1,
      tree,
      contents: {},
      outbox: [],
      lastServerSyncAt: null,
    };

    expect(upgradeWorkspaceReplicaRecord(legacy)).toMatchObject({
      schemaVersion: workspaceReplicaSchemaVersion,
      tree: { document: { nodes: [{ localId: "cached-entry" }] } },
    });
  });

  it("upgrades cached V2 selection state and queued writes with page sizes", () => {
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    delete (tree.selection as Partial<typeof tree.selection>).pageSizes;
    const queued = outboxEntry("legacy");
    if (queued.command.type === "set-selection") {
      delete (queued.command.input as Partial<typeof queued.command.input>).pageSizes;
    }

    expect(upgradeWorkspaceReplicaRecord({
      schemaVersion: 2,
      tree,
      contents: {},
      outbox: [queued],
      lastServerSyncAt: null,
    })).toMatchObject({
      schemaVersion: workspaceReplicaSchemaVersion,
      tree: { selection: { pageSizes: {} } },
      outbox: [{ command: { input: { pageSizes: {} } } }],
    });
  });

  it("upgrades V3 records to separate confirmed state from local projections", () => {
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const idle = upgradeWorkspaceReplicaRecord({
      schemaVersion: 3,
      tree,
      contents: {},
      outbox: [],
      lastServerSyncAt: null,
    }) as WorkspaceReplicaRecord;
    const pending = upgradeWorkspaceReplicaRecord({
      schemaVersion: 3,
      tree,
      contents: {},
      outbox: [outboxEntry("pending")],
      lastServerSyncAt: null,
    }) as WorkspaceReplicaRecord;

    expect(idle.confirmedTree).toEqual(tree);
    expect(idle.confirmedContents).toEqual({});
    expect(pending.confirmedTree).toBeNull();
    expect(pending.tree).toEqual(tree);
    expect(pending.outbox).toHaveLength(1);
  });

  it("isolates replicas by user and workspace", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();

    await storage.transact(firstScope, (current) => ({
      ...current,
      lastServerSyncAt: "2026-08-11T12:00:00.000Z",
    }));

    expect((await storage.read(firstScope))?.lastServerSyncAt)
      .toBe("2026-08-11T12:00:00.000Z");
    expect(await storage.read(secondScope)).toBeNull();
  });

  it("serializes concurrent transactions without losing an update", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();

    await Promise.all([
      storage.transact(firstScope, (current) => {
        return {
          ...current,
          outbox: [...current.outbox, outboxEntry("one")],
        };
      }),
      storage.transact(firstScope, (current) => ({
        ...current,
        outbox: [...current.outbox, outboxEntry("two")],
      })),
    ]);

    expect((await storage.read(firstScope))?.outbox.map(({ id }) => id))
      .toEqual(["one", "two"]);
  });

  it("returns copies instead of mutable persisted references", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const record = await storage.transact(firstScope, (current) => current);

    (record.outbox as unknown[]).push(outboxEntry("outside"));

    expect((await storage.read(firstScope))?.outbox).toEqual([]);
    expect(record.schemaVersion).toBe(workspaceReplicaSchemaVersion);
  });

  it("rejects records that do not satisfy the persistence schema", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();

    await expect(storage.transact(firstScope, (current) => ({
      ...current,
      schemaVersion: 999,
    } as unknown as WorkspaceReplicaRecord))).rejects.toThrow(
      "Invalid workspace replica record",
    );
    expect(await storage.read(firstScope)).toBeNull();
  });

  it("stores confirmed server trees without crossing workspace boundaries", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const replica = new WorkspaceReplica(
      storage,
      () => new Date("2026-08-11T12:00:00.000Z"),
    );
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const scope = {
      userId: "00000000-0000-4000-8000-000000000001",
      workspaceId: tree.document.workspaceId,
    };

    await replica.replaceTree(scope, tree);

    expect((await replica.load(scope))?.tree).toEqual(tree);
    expect((await replica.load(scope))?.lastServerSyncAt)
      .toBe("2026-08-11T12:00:00.000Z");
    expect(() => replica.replaceTree(
      { ...scope, workspaceId: "00000000-0000-4000-8000-000000000003" },
      tree,
    )).toThrow("another workspace");
  });

  it("hydrates one observable snapshot and publishes transactions", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const replica = new WorkspaceReplica(storage);
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const scope = { ...firstScope, workspaceId: tree.document.workspaceId };
    const listener = vi.fn();
    const unsubscribe = replica.subscribe(scope, listener);

    await replica.load(scope);
    await replica.replaceTree(scope, tree);

    expect(replica.getSnapshot(scope)?.tree).toEqual(tree);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("persists an equivalent confirmed tree without replacing the visible tree", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const replica = new WorkspaceReplica(storage);
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const scope = { ...firstScope, workspaceId: tree.document.workspaceId };
    tree.document.nodes.push({
      id: "00000000-0000-4000-8000-000000000006",
      parentId: null,
      kind: "data-file",
      label: "One",
      localId: "one",
      position: 0,
      revision: 1,
      updatedAt: "2026-08-11T12:00:00.000Z",
      capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
    });
    await replica.replaceTree(scope, tree);
    const visibleTree = replica.getSnapshot(scope)?.tree;
    const confirmed = {
      ...tree,
      document: {
        ...tree.document,
        nodes: tree.document.nodes.map((node) => ({
          ...node,
          updatedAt: "2026-08-11T12:01:00.000Z",
        })),
      },
    };

    await replica.replaceTree(scope, confirmed);

    expect(replica.getSnapshot(scope)?.tree).toBe(visibleTree);
    expect((await storage.read(scope))?.tree).toEqual(confirmed);
  });

  it("publishes a confirmed tree when its visible structure differs", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const replica = new WorkspaceReplica(storage);
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const scope = { ...firstScope, workspaceId: tree.document.workspaceId };
    tree.document.nodes.push({
      id: "00000000-0000-4000-8000-000000000006",
      parentId: null,
      kind: "data-file",
      label: "Optimistic",
      localId: "one",
      position: 0,
      revision: 1,
      capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
    });
    await replica.replaceTree(scope, tree);
    const visibleTree = replica.getSnapshot(scope)?.tree;
    const confirmed = {
      ...tree,
      document: {
        ...tree.document,
        nodes: tree.document.nodes.map((node) => ({
          ...node,
          label: "Confirmed",
        })),
      },
    };

    await replica.replaceTree(scope, confirmed);

    expect(replica.getSnapshot(scope)?.tree).not.toBe(visibleTree);
    expect(replica.getSnapshot(scope)?.tree?.document.nodes[0].label)
      .toBe("Confirmed");
  });

  it("does not replace newer optimistic state with a late server tree", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const replica = new WorkspaceReplica(storage);
    const serverTree = emptyTree("00000000-0000-4000-8000-000000000002");
    const scope = { ...firstScope, workspaceId: serverTree.document.workspaceId };
    const nodeId = "00000000-0000-4000-8000-000000000006";
    serverTree.document.nodes.push({
      id: nodeId,
      parentId: null,
      kind: "data-file",
      label: "Server",
      localId: "server",
      position: 0,
      revision: 0,
      capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
    });
    await replica.replaceTree(scope, serverTree);
    await replica.enqueue(scope, {
      type: "rename-node",
      nodeId,
      input: {
        requestId: "00000000-0000-4000-8000-000000000007",
        label: "Local",
        expectedRevision: 0,
      },
    });

    await replica.rebaseFromServer(scope, serverTree);

    const pending = await replica.load(scope);
    expect(pending?.tree?.document.nodes[0].label).toBe("Local");
    expect(pending?.outbox).toHaveLength(1);

    await replica.confirm(scope, pending!.outbox[0].id, {
      node: {
        ...serverTree.document.nodes[0],
        label: "Local",
        revision: 1,
      },
      treeRevision: 2,
    });
    expect((await replica.load(scope))?.tree?.document.nodes[0].label).toBe("Local");
    expect((await replica.load(scope))?.outbox).toEqual([]);
  });

  it("durably deduplicates, counts, and acknowledges queued commands", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const replica = new WorkspaceReplica(storage);
    const command = outboxEntry("queued").command;

    await replica.enqueue(firstScope, command, "2026-08-11T12:00:00.000Z");
    await replica.enqueue(firstScope, command, "2026-08-11T13:00:00.000Z");
    await replica.recordAttempt(firstScope, command.input.requestId);

    expect((await replica.load(firstScope))?.outbox).toEqual([{
      id: command.input.requestId,
      createdAt: "2026-08-11T12:00:00.000Z",
      attempts: 1,
      userCommandId: command.input.requestId,
      command,
    }]);

    await replica.confirm(firstScope, command.input.requestId, {
      revision: 1,
      selectedPath: [],
      pageSizes: { __tree_root__: 10 },
    });
    expect((await replica.load(firstScope))?.outbox).toEqual([]);
  });

  it("retains blocked commands for retry and exports the complete repair state", async () => {
    const replica = new WorkspaceReplica(
      new MemoryWorkspaceReplicaStorage(),
      () => new Date("2026-08-11T12:00:00.000Z"),
    );
    const command = outboxEntry("blocked").command;
    await replica.enqueue(firstScope, command);
    await replica.markBlocked(
      firstScope,
      command.input.requestId,
      "INVALID_REQUEST",
      "Repair me",
    );

    const exported = JSON.parse(await replica.exportRecord(firstScope));
    expect(exported).toMatchObject({
      exportedAt: "2026-08-11T12:00:00.000Z",
      scope: firstScope,
      record: {
        schemaVersion: workspaceReplicaSchemaVersion,
        outbox: [{ blocked: { code: "INVALID_REQUEST", message: "Repair me" } }],
      },
    });

    await replica.retryBlocked(firstScope, command.input.requestId);
    expect((await replica.load(firstScope))?.outbox[0].blocked).toBeUndefined();
  });

  it("updates the cached projection in the same transaction as the outbox", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const replica = new WorkspaceReplica(storage);
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const replicaScope = { ...firstScope, workspaceId: tree.document.workspaceId };
    tree.document.nodes.push({
      id: "00000000-0000-4000-8000-000000000006",
      parentId: null,
      kind: "data-file",
      label: "Before",
      localId: "before",
      position: 0,
      revision: 0,
      capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
    });
    await replica.replaceTree(replicaScope, tree);

    await replica.enqueue(replicaScope, {
      type: "rename-node",
      nodeId: tree.document.nodes[0].id,
      input: {
        requestId: "00000000-0000-4000-8000-000000000007",
        label: "Offline",
        expectedRevision: 0,
      },
    });

    const cached = await replica.load(replicaScope);
    expect(cached?.tree?.document.nodes[0]).toMatchObject({
      label: "Offline",
      revision: 1,
    });
    expect(cached?.outbox).toHaveLength(1);
  });

  it("updates server-backed page sizes optimistically with selection revision", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const replicaScope = { ...firstScope, workspaceId: tree.document.workspaceId };
    await replica.replaceTree(replicaScope, tree);

    const cached = await replica.enqueue(replicaScope, outboxEntry("sizes").command);

    expect(cached.tree?.selection).toEqual({
      revision: 1,
      selectedPath: [],
      pageSizes: { __tree_root__: 10 },
    });
  });

  it("updates a sibling-local ID optimistically", async () => {
    const storage = new MemoryWorkspaceReplicaStorage();
    const replica = new WorkspaceReplica(storage);
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const replicaScope = { ...firstScope, workspaceId: tree.document.workspaceId };
    tree.document.nodes.push({
      id: "00000000-0000-4000-8000-000000000006",
      parentId: null,
      kind: "data-file",
      label: "Entry",
      localId: "entry",
      position: 0,
      revision: 0,
      capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
    });
    await replica.replaceTree(replicaScope, tree);

    const cached = await replica.enqueue(replicaScope, {
      type: "update-local-id",
      nodeId: tree.document.nodes[0].id,
      input: {
        requestId: "00000000-0000-4000-8000-000000000008",
        localId: "short-id",
        expectedRevision: 0,
      },
    });

    expect(cached.tree?.document.nodes[0]).toMatchObject({
      localId: "short-id",
      revision: 1,
    });
  });

  it("unshares ancestors and descendants when sharing a child", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const tree = sharingTree();
    const replicaScope = { ...firstScope, workspaceId: tree.document.workspaceId };
    await replica.replaceTree(replicaScope, tree);

    const cached = await replica.enqueue(replicaScope, {
      type: "set-node-sharing",
      nodeId: tree.document.nodes[1].id,
      input: {
        requestId: "00000000-0000-4000-8000-000000000009",
        shared: true,
        shareName: "Child public",
        expectedRevision: 3,
      },
    });

    expect(cached.tree?.document.nodes).toMatchObject([
      { shared: false, shareName: "Parent public", revision: 3 },
      { shared: true, shareName: "Child public", revision: 4 },
      { shared: false, shareName: "Grandchild public", revision: 5 },
    ]);
  });

  it("unshares every shared descendant when sharing a parent", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const tree = sharingTree();
    const replicaScope = { ...firstScope, workspaceId: tree.document.workspaceId };
    tree.document.nodes[0].shared = false;
    tree.document.nodes[1].shared = true;
    await replica.replaceTree(replicaScope, tree);

    const cached = await replica.enqueue(replicaScope, {
      type: "set-node-sharing",
      nodeId: tree.document.nodes[0].id,
      input: {
        requestId: "00000000-0000-4000-8000-000000000010",
        shared: true,
        shareName: "New parent public",
        expectedRevision: 2,
      },
    });

    expect(cached.tree?.document.nodes).toMatchObject([
      { shared: true, shareName: "New parent public", revision: 3 },
      { shared: false, shareName: "Child public", revision: 4 },
      { shared: false, shareName: "Grandchild public", revision: 5 },
    ]);
  });

  it("rebases rapid tree commands atomically against the optimistic revision", async () => {
    const replica = new WorkspaceReplica(new MemoryWorkspaceReplicaStorage());
    const tree = emptyTree("00000000-0000-4000-8000-000000000002");
    const replicaScope = { ...firstScope, workspaceId: tree.document.workspaceId };
    tree.document.nodes.push(
      {
        id: "00000000-0000-4000-8000-000000000006",
        parentId: null,
        kind: "data-file",
        label: "One",
        localId: "one",
        position: 0,
        revision: 0,
        capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
      },
      {
        id: "00000000-0000-4000-8000-000000000007",
        parentId: null,
        kind: "data-file",
        label: "Two",
        localId: "two",
        position: 1,
        revision: 0,
        capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
      },
    );
    await replica.replaceTree(replicaScope, tree);

    await replica.enqueue(replicaScope, {
      type: "move-node",
      nodeId: tree.document.nodes[0].id,
      input: {
        requestId: "00000000-0000-4000-8000-000000000008",
        afterNodeId: tree.document.nodes[1].id,
        expectedTreeRevision: 0,
      },
    });
    const cached = await replica.enqueue(replicaScope, {
      type: "move-node",
      nodeId: tree.document.nodes[0].id,
      input: {
        requestId: "00000000-0000-4000-8000-000000000009",
        afterNodeId: null,
        expectedTreeRevision: 0,
      },
    });

    expect(cached.outbox.map(({ command }) => command.input)).toMatchObject([
      { expectedTreeRevision: 1 },
      { expectedTreeRevision: 2 },
    ]);
    expect(cached.tree?.document.revision).toBe(3);
  });
});

function outboxEntry(id: string): WorkspaceOutboxEntry {
  return {
    id,
    createdAt: "2026-08-11T12:00:00.000Z",
    attempts: 0,
    command: {
      type: "set-selection" as const,
      input: {
        requestId: "00000000-0000-4000-8000-000000000005",
        selectedPath: [],
        pageSizes: { __tree_root__: 10 },
        expectedRevision: 0,
      },
    },
  };
}

function emptyTree(workspaceId: string): TreeLoadDto {
  return {
    document: {
      id: "00000000-0000-4000-8000-000000000004",
      workspaceId,
      kind: "data" as const,
      revision: 1,
      nodes: [],
    },
    semanticState: { revision: 0, enabledNodeIds: [], nodeRevisions: {} },
    selection: { revision: 0, selectedPath: [], pageSizes: {} },
  };
}

function sharingTree(): TreeLoadDto {
  const tree = emptyTree("00000000-0000-4000-8000-000000000002");
  const capabilities = {
    contentEditable: true,
    listEditable: true,
    listItemLimit: null,
  };
  tree.document.nodes.push(
    {
      id: "00000000-0000-4000-8000-000000000006",
      parentId: null,
      kind: "data-file",
      label: "Parent",
      localId: "parent",
      position: 0,
      revision: 2,
      shared: true,
      shareName: "Parent public",
      capabilities,
    },
    {
      id: "00000000-0000-4000-8000-000000000007",
      parentId: "00000000-0000-4000-8000-000000000006",
      kind: "data-file",
      label: "Child",
      localId: "child",
      position: 0,
      revision: 3,
      shared: false,
      shareName: "Child public",
      capabilities,
    },
    {
      id: "00000000-0000-4000-8000-000000000008",
      parentId: "00000000-0000-4000-8000-000000000007",
      kind: "data-file",
      label: "Grandchild",
      localId: "grandchild",
      position: 0,
      revision: 4,
      shared: true,
      shareName: "Grandchild public",
      capabilities,
    },
  );
  return tree;
}
