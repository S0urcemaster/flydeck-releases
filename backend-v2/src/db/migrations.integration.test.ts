import { afterAll, describe, expect, it } from "vitest";

import { createDatabase } from "./database.js";
import { runMigrations } from "./migrations.js";
import { CronService } from "../cron/CronService.js";
import { TreeService } from "../tree/TreeService.js";

const databaseUrl = process.env.FLYDECK_V2_TEST_DATABASE_URL;
const integration = describe.runIf(Boolean(databaseUrl));
const database = databaseUrl
  ? createDatabase({
      port: 5100,
      basePath: "/flydeck",
      databaseUrl,
      databaseSsl: false,
      trustProxy: false,
      schedulerIntervalMs: 5_000,
      loginRequired: true,
      authSecureCookie: false,
      sessionTtlDays: 30,
      frontendBasePath: "/v2",
    })
  : null;
const userId = "00000000-0000-4000-8000-000000000101";
const workspaceId = "00000000-0000-4000-8000-000000000102";
const treeId = "00000000-0000-4000-8000-000000000103";

integration("PostgreSQL migrations", () => {
  afterAll(async () => {
    await database?.end();
  });

  it("applies idempotently to a dedicated test database", async () => {
    await runMigrations(database!);
    await runMigrations(database!);

    const result = await database!.query<{ name: string }>(`
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'users',
          'workspaces',
          'trees',
          'tree_nodes',
          'cron_timers',
          'legacy_imports'
        )
      ORDER BY table_name
    `);
    expect(result.rows.map(({ name }) => name)).toEqual([
      "cron_timers",
      "legacy_imports",
      "tree_nodes",
      "trees",
      "users",
      "workspaces",
    ]);
  });

  it("persists DATA commands and CRON lifecycle with revisions", async () => {
    await runMigrations(database!);
    await database!.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
    await database!.query("DELETE FROM users WHERE id = $1", [userId]);
    await database!.query(
      "INSERT INTO users (id, display_name) VALUES ($1, 'Integration User')",
      [userId],
    );
    await database!.query(`
      INSERT INTO workspaces (id, name, filesystem_root)
      VALUES ($1, 'Integration Workspace', '/tmp/flydeck-integration-workspace')
    `, [workspaceId]);
    await database!.query(`
      INSERT INTO workspace_memberships (workspace_id, user_id, role)
      VALUES ($1, $2, 'owner')
    `, [workspaceId, userId]);
    await database!.query(
      "INSERT INTO trees (id, workspace_id, kind) VALUES ($1, $2, 'data')",
      [treeId, workspaceId],
    );

    const trees = new TreeService(database!);
    const first = await trees.createNode(workspaceId, userId, {
      requestId: "00000000-0000-4000-8000-000000000111",
      nodeId: "00000000-0000-4000-8000-000000000211",
      parentId: null,
      afterNodeId: null,
      kind: "data-file",
      label: "First",
      expectedTreeRevision: 0,
    });
    const repeated = await trees.createNode(workspaceId, userId, {
      requestId: "00000000-0000-4000-8000-000000000111",
      nodeId: "00000000-0000-4000-8000-000000000211",
      parentId: null,
      afterNodeId: null,
      kind: "data-file",
      label: "Ignored duplicate",
      expectedTreeRevision: 0,
    });
    expect(repeated).toEqual(first);
    expect(await trees.getContent(workspaceId, first.node.id)).toMatchObject({
      nodeId: first.node.id,
      content: "",
      revision: 0,
    });
    const second = await trees.createNode(workspaceId, userId, {
      requestId: "00000000-0000-4000-8000-000000000112",
      nodeId: "00000000-0000-4000-8000-000000000212",
      parentId: null,
      afterNodeId: first.node.id,
      kind: "data-file",
      label: "Second",
      expectedTreeRevision: 1,
    });
    const moved = await trees.moveNode(workspaceId, second.node.id, null, 2);
    expect(moved.node.position).toBe(0);
    const renamed = await trees.renameNode(workspaceId, first.node.id, "Renamed", 0);
    expect(renamed.treeRevision).toBe(4);
    await trees.updateContent(workspaceId, first.node.id, "# Content\n", 0);
    await trees.setEnabled(workspaceId, userId, first.node.id, false, 1);
    await trees.setEnabled(workspaceId, userId, second.node.id, false, 1);
    await trees.setSelection(workspaceId, userId, {
      requestId: "00000000-0000-4000-8000-000000000114",
      selectedPath: [first.node.id], expectedRevision: 0,
    });
    await trees.setSelection(workspaceId, userId, {
      requestId: "00000000-0000-4000-8000-000000000115",
      selectedPath: [second.node.id], expectedRevision: 1,
    });
    const loaded = await trees.load(workspaceId, userId, "data");
    expect(loaded.document.nodes.map(({ label }) => label).sort()).toEqual([
      "Renamed", "Second",
    ]);
    expect(loaded.semanticState.enabledNodeIds).toEqual([]);
    expect(loaded.semanticState.nodeRevisions[first.node.id]).toBe(2);
    expect(loaded.selection.selectedPath).toEqual([second.node.id]);
    expect(loaded.selection.revision).toBe(2);
    const reparented = await trees.reparentNode(
      workspaceId,
      first.node.id,
      second.node.id,
      4,
    );
    expect(reparented.node.parentId).toBe(second.node.id);
    await expect(trees.reparentNode(
      workspaceId,
      second.node.id,
      first.node.id,
      5,
    )).rejects.toMatchObject({ status: 400, code: "INVALID_REQUEST" });
    await trees.deleteNode(workspaceId, second.node.id, 5);

    const cron = new CronService(database!);
    const timer = await cron.create(workspaceId, userId, {
      requestId: "00000000-0000-4000-8000-000000000113",
      title: "Report",
      dueAt: "2099-08-06T08:00:00.000Z",
    });
    expect((await cron.list(workspaceId))).toHaveLength(1);
    const updated = await cron.updateDueAt(workspaceId, timer.id, {
      dueAt: "2099-08-07T08:00:00.000Z", expectedRevision: 0,
    });
    expect(updated.revision).toBe(1);
    await cron.remove(workspaceId, timer.id, 1);
    expect(await cron.list(workspaceId)).toEqual([]);
  });
});
