import { afterAll, describe, expect, it } from "vitest";

import { createDatabase } from "./database.js";
import { runMigrations } from "./migrations.js";
import { CronService } from "../cron/CronService.js";
import { TreeService } from "../tree/TreeService.js";
import { JobStore } from "../jobs/JobStore.js";

const databaseUrl = process.env.FLYDECK_V2_TEST_DATABASE_URL;
const integration = describe.runIf(Boolean(databaseUrl));
const database = databaseUrl
  ? createDatabase({
      port: 5100,
      basePath: "/flydeck",
      databaseUrl,
      databaseSsl: false,
      backupDirectory: "/tmp/flydeck-backend-v2-integration-backups",
      backupRetention: 7,
      trustProxy: false,
      schedulerIntervalMs: 5_000,
      relaySyncIntervalMs: 5_000,
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
          'agent_jobs',
          'agent_job_runs',
          'cron_timers',
          'legacy_imports'
        )
      ORDER BY table_name
    `);
    expect(result.rows.map(({ name }) => name)).toEqual([
      "agent_job_runs",
      "agent_jobs",
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
      localId: "first",
      expectedTreeRevision: 0,
    });
    const repeated = await trees.createNode(workspaceId, userId, {
      requestId: "00000000-0000-4000-8000-000000000111",
      nodeId: "00000000-0000-4000-8000-000000000211",
      parentId: null,
      afterNodeId: null,
      kind: "data-file",
      label: "Ignored duplicate",
      localId: "ignored",
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
      localId: "second",
      expectedTreeRevision: 1,
    });
    const moved = await trees.moveNode(workspaceId, second.node.id, null, 2);
    expect(moved.node.position).toBe(0);
    const renamed = await trees.renameNode(workspaceId, first.node.id, "Renamed", 0);
    expect(renamed.treeRevision).toBe(4);
    const identified = await trees.updateLocalId(
      workspaceId,
      first.node.id,
      "renamed",
      1,
    );
    expect(identified.node.localId).toBe("renamed");
    await expect(trees.updateLocalId(
      workspaceId,
      first.node.id,
      "second",
      2,
    )).rejects.toMatchObject({ status: 400, code: "INVALID_REQUEST" });
    await trees.updateContent(workspaceId, first.node.id, "# Content\n", 0);
    await trees.setEnabled(workspaceId, userId, first.node.id, false, 1);
    await trees.setEnabled(workspaceId, userId, second.node.id, false, 1);
    await trees.setSelection(workspaceId, userId, {
      requestId: "00000000-0000-4000-8000-000000000114",
      selectedPath: [first.node.id],
      pageSizes: { __tree_root__: 10, [first.node.id]: 4 },
      expectedRevision: 0,
    });
    await trees.setSelection(workspaceId, userId, {
      requestId: "00000000-0000-4000-8000-000000000115",
      selectedPath: [second.node.id],
      pageSizes: { __tree_root__: 15, [first.node.id]: 7 },
      expectedRevision: 1,
    });
    const loaded = await trees.load(workspaceId, userId, "data");
    expect(loaded.document.nodes.map(({ label }) => label).sort()).toEqual([
      "Renamed", "Second", "_system", "_trash",
    ]);
    expect(loaded.semanticState.enabledNodeIds).toEqual([]);
    expect(loaded.semanticState.nodeRevisions[first.node.id]).toBe(2);
    expect(loaded.selection.selectedPath).toEqual([second.node.id]);
    expect(loaded.selection.pageSizes).toEqual({
      __tree_root__: 15,
      [first.node.id]: 7,
    });
    expect(loaded.selection.revision).toBe(2);
    const reparented = await trees.reparentNode(
      workspaceId,
      first.node.id,
      second.node.id,
      loaded.document.revision,
    );
    expect(reparented.node.parentId).toBe(second.node.id);
    await expect(trees.reparentNode(
      workspaceId,
      second.node.id,
      first.node.id,
      loaded.document.revision + 1,
    )).rejects.toMatchObject({ status: 400, code: "INVALID_REQUEST" });
    await trees.deleteNode(workspaceId, second.node.id, loaded.document.revision + 1);

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

  it("creates idempotent dated job runs and enforces one active run", async () => {
    await runMigrations(database!);
    await database!.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
    await database!.query("DELETE FROM users WHERE id = $1", [userId]);
    await database!.query(
      "INSERT INTO users (id, display_name) VALUES ($1, 'Job User')",
      [userId],
    );
    await database!.query(`
      INSERT INTO workspaces (id, name, filesystem_root)
      VALUES ($1, 'Job Workspace', '/tmp/flydeck-job-integration')
    `, [workspaceId]);
    await database!.query(
      "INSERT INTO trees (id, workspace_id, kind) VALUES ($1, $2, 'data')",
      [treeId, workspaceId],
    );
    const systemId = "00000000-0000-4000-8000-000000000301";
    const agntId = "00000000-0000-4000-8000-000000000302";
    const jobsId = "00000000-0000-4000-8000-000000000303";
    const memoRootId = "00000000-0000-4000-8000-000000000304";
    const jobId = "00000000-0000-4000-8000-000000000305";
    const memoId = "00000000-0000-4000-8000-000000000306";
    const dataId = "00000000-0000-4000-8000-000000000307";
    const childId = "00000000-0000-4000-8000-000000000311";
    await database!.query(`
      INSERT INTO tree_nodes (
        id, tree_id, parent_id, kind, label, local_id, position,
        content_editable, list_editable
      ) VALUES
        ($1, $8, NULL, 'system-directory', '_system', '_system', 0, false, true),
        ($2, $8, $1, 'system-directory', 'Agnt', 'agnt', 0, false, true),
        ($3, $8, $2, 'system-directory', 'Jobs', 'jobs', 0, false, true),
        ($4, $8, $2, 'system-directory', 'Memo', 'memo', 1, false, true),
        ($5, $8, $3, 'agent-job', 'Daily', 'daily', 0, true, false),
        ($6, $8, $4, 'agent-memo', 'Rules', 'rules', 0, true, true),
        ($7, $8, NULL, 'data-file', 'Source', 'source', 1, true, true)
    `, [systemId, agntId, jobsId, memoRootId, jobId, memoId, dataId, treeId]);
    await database!.query(`
      INSERT INTO node_contents (node_id, format, content) VALUES
        ($1, 'text', ''), ($2, 'text', ''), ($3, 'text', ''),
        ($4, 'text', ''), ($5, 'text', ''),
        ($6, 'text', 'Always be concise.'), ($7, 'text', '42')
    `, [systemId, agntId, jobsId, memoRootId, jobId, memoId, dataId]);

    const store = new JobStore(database!);
    const initialSnapshot = await store.getSnapshot(workspaceId, jobId);
    expect(initialSnapshot.configured).toBe(false);
    expect((await database!.query<{ count: string }>(`
      SELECT count(*) FROM agent_jobs WHERE job_id = $1
    `, [jobId])).rows[0]?.count).toBe("0");
    await database!.query(`
      INSERT INTO tree_nodes (
        id, tree_id, parent_id, kind, label, local_id, position,
        content_editable, list_editable
      ) VALUES ($1, $2, $3, 'agent-job', 'Child', 'child', 0, true, true)
    `, [childId, treeId, jobId]);
    await expect(store.getSnapshot(workspaceId, jobId)).rejects.toMatchObject({
      status: 404,
    });
    await database!.query("DELETE FROM tree_nodes WHERE id = $1", [childId]);
    await store.updateConfig(workspaceId, jobId, {
      requestId: "00000000-0000-4000-8000-000000000308",
      expectedRevision: 0,
      memoryNodeIds: [memoId],
      memory: "# Rules\n\nAlways be concise.",
      dataSourceNodeIds: [dataId],
      dataSources: "|- Source\n|-|- Current source content",
      prompt: "Answer",
      modelTier: "ECON",
      effort: "FAST",
      schedule: null,
    });
    expect((await store.getSnapshot(workspaceId, jobId)).configured).toBe(true);
    const requestId = "00000000-0000-4000-8000-000000000309";
    const first = await store.createRun(
      workspaceId, jobId, requestId, "manual", "Europe/Berlin",
    );
    const repeated = await store.createRun(
      workspaceId, jobId, requestId, "manual", "Europe/Berlin",
    );

    expect(first.created).toBe(true);
    expect(repeated.created).toBe(false);
    expect(repeated.execution.run.id).toBe(first.execution.run.id);
    const snapshot = await database!.query<{
      memory_snapshot: Array<{ content: string }>;
      effective_input: string;
    }>(`
      SELECT memory_snapshot, effective_input
      FROM agent_job_runs WHERE id = $1
    `, [first.execution.run.id]);
    expect(snapshot.rows[0]?.memory_snapshot).toEqual([{
      content: "# Rules\n\nAlways be concise.",
    }]);
    expect(snapshot.rows[0]?.effective_input).toContain("# Rules\n\nAlways be concise.");
    expect(first.execution.memory).toBe(
      "# Rules\n\nAlways be concise.\n\n|- Source\n|-|- Current source content",
    );
    expect(first.execution.userInput).toBe("Answer");
    await expect(store.createRun(
      workspaceId,
      jobId,
      "00000000-0000-4000-8000-000000000310",
      "manual",
      "Europe/Berlin",
    )).rejects.toMatchObject({ status: 409 });
    const structure = await database!.query<{ parent_kind: string; run_kind: string }>(`
      SELECT parent.kind AS parent_kind, run.kind AS run_kind
      FROM tree_nodes run JOIN tree_nodes parent ON parent.id = run.parent_id
      WHERE run.id = $1
    `, [first.execution.run.nodeId]);
    expect(structure.rows[0]).toEqual({
      parent_kind: "agent-run-date",
      run_kind: "agent-job-run",
    });
  });
});
