import { describe, expect, it } from "vitest";
import type { TreeLoadDto } from "@flydeck/shared/v2";

import {
  MemoryWorkspaceReplicaStorage,
  WorkspaceReplica,
  upgradeWorkspaceReplicaRecord,
  workspaceReplicaSchemaVersion,
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
      schemaVersion: 3,
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

    await replica.acknowledge(firstScope, command.input.requestId);
    expect((await replica.load(firstScope))?.outbox).toEqual([]);
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
});

function outboxEntry(id: string) {
  return {
    id,
    createdAt: "2026-08-11T12:00:00.000Z",
    attempts: 0,
    command: {
      type: "set-selection" as const,
      input: {
        requestId: "00000000-0000-4000-8000-000000000005",
        selectedPath: [],
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
    selection: { revision: 0, selectedPath: [] },
  };
}
