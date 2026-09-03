import { randomUUID } from "node:crypto";
import {
  jobConfigDtoSchema,
  jobRunDtoSchema,
  jobSnapshotDtoSchema,
  type JobConfigDto,
  type JobRunDto,
  type JobRunStatus,
  type JobTrigger,
  type UpdateJobConfigRequest,
} from "@flydeck/shared/v2";
import type { Database, Queryable } from "../db/database.js";
import { HttpError } from "../http/HttpError.js";

type JobRow = {
  job_id: string;
  revision: string | number;
  memory_node_ids: string[];
  memory: string;
  data_source_node_ids: string[];
  data_sources: string;
  prompt: string;
  model_tier: JobConfigDto["modelTier"];
  effort: JobConfigDto["effort"];
  schedule_due_at: Date | null;
  schedule_time_zone: string | null;
  schedule_enabled: boolean;
};

type RunRow = {
  id: string;
  job_id: string;
  node_id: string;
  date_node_id: string;
  status: JobRunStatus;
  trigger: JobTrigger;
  output: string;
  error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type JobExecution = {
  run: JobRunDto;
  workingDirectory: string;
  memory: string;
  userInput: string;
  modelTier: JobConfigDto["modelTier"];
  effort: JobConfigDto["effort"];
};

export class JobStore {
  constructor(private readonly database: Database) {}

  async getSnapshot(workspaceId: string, jobId: string) {
    await this.ensureJob(workspaceId, jobId, false);
    const [config, runs] = await Promise.all([
      this.readConfig(jobId, false),
      this.database.query<RunRow>(`
        SELECT id, job_id, node_id, date_node_id, status, trigger,
               output, error, created_at, updated_at
        FROM agent_job_runs WHERE job_id = $1
        ORDER BY created_at DESC, id DESC LIMIT 1
      `, [jobId]),
    ]);
    const latestRun = runs.rows[0] ? mapRun(runs.rows[0]) : null;
    return jobSnapshotDtoSchema.parse({
      configured: Boolean(config),
      config: config ?? defaultConfig(jobId),
      activeRun: latestRun && isActive(latestRun.status) ? latestRun : null,
      latestRun,
    });
  }

  async updateConfig(
    workspaceId: string,
    jobId: string,
    input: UpdateJobConfigRequest,
  ) {
    await this.ensureJob(workspaceId, jobId, false);
    assertUnique(input.memoryNodeIds, "Memory selection contains duplicate items");
    assertUnique(input.dataSourceNodeIds, "Datasource selection contains duplicate items");
    if (input.schedule) assertTimeZone(input.schedule.timeZone);
    await this.assertReferences(workspaceId, input.dataSourceNodeIds);
    const result = await this.database.query<JobRow>(`
      WITH updated AS (
        UPDATE agent_jobs SET
          memory_node_ids = '{}'::uuid[], data_source_node_ids = $1::uuid[],
          memory = $2, data_sources = $3, prompt = $4,
          model_tier = $5, effort = $6,
          schedule_due_at = $7, schedule_time_zone = $8,
          schedule_enabled = $9, schedule_claimed_at = NULL,
          revision = agent_jobs.revision + 1, updated_at = now()
        WHERE job_id = $10 AND revision = $11
        RETURNING agent_jobs.*
      ), inserted AS (
        INSERT INTO agent_jobs (
          job_id, revision, memory_node_ids, data_source_node_ids,
          memory, data_sources, prompt,
          model_tier, effort, schedule_due_at, schedule_time_zone,
          schedule_enabled, schedule_claimed_at
        )
        SELECT $10, 1, '{}'::uuid[], $1::uuid[], $2, $3, $4, $5, $6,
               $7, $8, $9, NULL
        WHERE $11 = 0 AND NOT EXISTS (SELECT 1 FROM updated)
        ON CONFLICT (job_id) DO NOTHING
        RETURNING agent_jobs.*
      )
      SELECT * FROM updated
      UNION ALL
      SELECT * FROM inserted
    `, [
      input.dataSourceNodeIds,
      input.memory,
      input.dataSources,
      input.prompt,
      input.modelTier,
      input.effort,
      input.schedule?.dueAt ?? null,
      input.schedule?.timeZone ?? null,
      input.schedule?.enabled ?? false,
      jobId,
      input.expectedRevision,
    ]);
    if (!result.rows[0]) {
      throw new HttpError(409, "REVISION_CONFLICT", "Job configuration changed on another client");
    }
    return mapConfig(result.rows[0]);
  }

  async createRun(
    workspaceId: string,
    jobId: string,
    requestId: string,
    trigger: JobTrigger,
    requestedTimeZone = "UTC",
  ): Promise<{ execution: JobExecution; created: boolean }> {
    await this.ensureJob(workspaceId, jobId, true);
    const config = await this.readConfig(jobId);
    if (!config.prompt.trim()) {
      throw new HttpError(400, "INVALID_REQUEST", "The job prompt is empty");
    }
    const resolved = await this.resolveInput(
      workspaceId,
      config.memory,
      config.dataSourceNodeIds,
      config.dataSources,
      config.prompt,
    );
    const workingDirectory = await this.workspaceRoot(workspaceId);
    const existing = await this.database.query<RunRow>(`
      SELECT id, job_id, node_id, date_node_id, status, trigger,
             output, error, created_at, updated_at
      FROM agent_job_runs WHERE request_id = $1
    `, [requestId]);
    if (existing.rows[0]) {
      return {
        execution: {
          run: mapRun(existing.rows[0]), workingDirectory,
          memory: resolved.memory, userInput: resolved.userInput,
          modelTier: config.modelTier, effort: config.effort,
        },
        created: false,
      };
    }

    const runId = randomUUID();
    const runNodeId = randomUUID();
    const now = new Date();
    const local = localDateTime(
      now,
      trigger === "scheduled"
        ? config.schedule?.timeZone ?? requestedTimeZone
        : requestedTimeZone,
    );
    const created = await this.database.transaction(async (client) => {
      const tree = await lockJobTree(client, workspaceId, jobId);
      const repeated = await client.query<RunRow>(`
        SELECT id, job_id, node_id, date_node_id, status, trigger,
               output, error, created_at, updated_at
        FROM agent_job_runs WHERE request_id = $1
      `, [requestId]);
      if (repeated.rows[0]) return { row: repeated.rows[0], inserted: false };
      const active = await client.query<{ id: string }>(`
        SELECT id FROM agent_job_runs
        WHERE job_id = $1 AND status IN ('queued', 'running')
      `, [jobId]);
      if (active.rows[0]) {
        throw new HttpError(409, "REVISION_CONFLICT", "A run is already active for this job");
      }
      let dateNode = await client.query<{ id: string }>(`
        SELECT id FROM tree_nodes
        WHERE tree_id = $1 AND parent_id = $2
          AND kind = 'agent-run-date' AND local_id = $3
      `, [tree.id, jobId, local.date]);
      if (!dateNode.rows[0]) {
        await client.query(`
          UPDATE tree_nodes SET position = position + 1, updated_at = now()
          WHERE tree_id = $1 AND parent_id = $2
        `, [tree.id, jobId]);
        dateNode = await client.query<{ id: string }>(`
          INSERT INTO tree_nodes (
            id, tree_id, parent_id, kind, label, local_id, position,
            content_editable, list_editable
          ) VALUES ($1, $2, $3, 'agent-run-date', $4, $4, 0, false, false)
          RETURNING id
        `, [randomUUID(), tree.id, jobId, local.date]);
        await client.query(`
          INSERT INTO node_contents (node_id, format, content)
          VALUES ($1, 'json', '{}')
        `, [dateNode.rows[0].id]);
      }
      await client.query(`
        UPDATE tree_nodes SET position = position + 1, updated_at = now()
        WHERE tree_id = $1 AND parent_id = $2
      `, [tree.id, dateNode.rows[0].id]);
      await client.query(`
        INSERT INTO tree_nodes (
          id, tree_id, parent_id, kind, label, local_id, position,
          content_editable, list_editable
        ) VALUES ($1, $2, $3, 'agent-job-run', $4, $5, 0, false, false)
      `, [
        runNodeId,
        tree.id,
        dateNode.rows[0].id,
        `${local.time} · queued`,
        `run-${local.compactTime}-${runId.slice(0, 8)}`,
      ]);
      await client.query(`
        INSERT INTO node_contents (node_id, format, content)
        VALUES ($1, 'text', '')
      `, [runNodeId]);
      const inserted = await client.query<RunRow>(`
        INSERT INTO agent_job_runs (
          id, job_id, node_id, date_node_id, request_id, status, trigger,
          memory_snapshot, data_source_snapshot, prompt_snapshot,
          effective_input, model_tier, effort
        ) VALUES (
          $1, $2, $3, $4, $5, 'queued', $6,
          $7::jsonb, $8::jsonb, $9, $10, $11, $12
        ) RETURNING id, job_id, node_id, date_node_id, status, trigger,
                    output, error, created_at, updated_at
      `, [
        runId,
        jobId,
        runNodeId,
        dateNode.rows[0].id,
        requestId,
        trigger,
        JSON.stringify(resolved.memorySnapshot),
        JSON.stringify(resolved.dataSourceSnapshot),
        config.prompt,
        resolved.effectiveInput,
        config.modelTier,
        config.effort,
      ]);
      await client.query(`
        UPDATE trees SET revision = revision + 1, updated_at = now() WHERE id = $1
      `, [tree.id]);
      return { row: inserted.rows[0], inserted: true };
    });
    return {
      execution: {
        run: mapRun(created.row), workingDirectory,
        memory: resolved.memory, userInput: resolved.userInput,
        modelTier: config.modelTier, effort: config.effort,
      },
      created: created.inserted,
    };
  }

  async setRunning(runId: string) {
    const result = await this.database.query(`
      UPDATE agent_job_runs SET status = 'running', updated_at = now()
      WHERE id = $1 AND status = 'queued' RETURNING id
    `, [runId]);
    if (!result.rows[0]) return false;
    await this.updateRunNode(runId, "running", undefined, false);
    return true;
  }

  async setOutput(runId: string, output: string) {
    const result = await this.database.query(`
      UPDATE agent_job_runs SET output = $2, updated_at = now()
      WHERE id = $1 AND status = 'running' RETURNING id
    `, [runId, output]);
    return Boolean(result.rows[0]);
  }

  async finishRun(
    runId: string,
    status: Exclude<JobRunStatus, "queued" | "running">,
    output: string,
    error: string | null,
  ) {
    const result = await this.database.query(`
      UPDATE agent_job_runs
      SET status = $2, output = $3, error = $4, updated_at = now()
      WHERE id = $1 AND status IN ('queued', 'running') RETURNING id
    `, [runId, status, output, error]);
    if (!result.rows[0]) return false;
    const content = error
      ? [output.trim(), `Error: ${error}`].filter(Boolean).join("\n\n")
      : output;
    await this.updateRunNode(runId, status, content, true);
    return true;
  }

  async cancelRun(workspaceId: string, jobId: string, runId: string) {
    await this.ensureJob(workspaceId, jobId, true);
    const result = await this.database.query<{ output: string }>(`
      UPDATE agent_job_runs
      SET status = 'cancelled', error = NULL, updated_at = now()
      WHERE id = $1 AND job_id = $2 AND status IN ('queued', 'running')
      RETURNING output
    `, [runId, jobId]);
    if (!result.rows[0]) {
      const found = await this.database.query(`
        SELECT id FROM agent_job_runs WHERE id = $1 AND job_id = $2
      `, [runId, jobId]);
      if (!found.rows[0]) throw new HttpError(404, "NOT_FOUND", "Job run was not found");
      return false;
    }
    await this.updateRunNode(runId, "cancelled", result.rows[0].output, true);
    return true;
  }

  async markInterrupted() {
    const active = await this.database.query<{ id: string; output: string }>(`
      UPDATE agent_job_runs
      SET status = 'interrupted', error = 'Backend restarted while the job was running',
          updated_at = now()
      WHERE status IN ('queued', 'running') RETURNING id, output
    `);
    for (const run of active.rows) {
      await this.updateRunNode(run.id, "interrupted", run.output, true);
    }
  }

  async claimDueJobs(limit = 20) {
    return this.database.transaction(async (client) => {
      const result = await client.query<{ job_id: string }>(`
        SELECT job_id FROM agent_jobs
        WHERE schedule_enabled = true AND schedule_claimed_at IS NULL
          AND schedule_due_at <= now()
          AND NOT EXISTS (
            SELECT 1 FROM tree_nodes child
            WHERE child.parent_id = agent_jobs.job_id
              AND child.kind IN ('agent-job', 'agent-job-group')
          )
        ORDER BY schedule_due_at, job_id
        FOR UPDATE SKIP LOCKED LIMIT $1
      `, [limit]);
      if (result.rows.length) {
        await client.query(`
          UPDATE agent_jobs
          SET schedule_enabled = false, schedule_claimed_at = now(),
              revision = revision + 1, updated_at = now()
          WHERE job_id = ANY($1::uuid[])
        `, [result.rows.map(({ job_id }) => job_id)]);
      }
      return result.rows.map(({ job_id }) => job_id);
    });
  }

  async workspaceIdForJob(jobId: string) {
    const result = await this.database.query<{ workspace_id: string }>(`
      SELECT trees.workspace_id
      FROM tree_nodes JOIN trees ON trees.id = tree_nodes.tree_id
      JOIN agent_jobs ON agent_jobs.job_id = tree_nodes.id
      WHERE tree_nodes.id = $1
        AND tree_nodes.kind IN ('agent-job', 'agent-job-group')
        AND NOT EXISTS (
          SELECT 1 FROM tree_nodes child WHERE child.parent_id = tree_nodes.id
            AND child.kind IN ('agent-job', 'agent-job-group')
        )
    `, [jobId]);
    if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Job was not found");
    return result.rows[0].workspace_id;
  }

  private async ensureJob(workspaceId: string, jobId: string, configured = true) {
    const result = await this.database.query<{ id: string }>(`
      WITH RECURSIVE ancestry AS (
        SELECT id, parent_id, kind FROM tree_nodes WHERE id = $1
        UNION ALL
        SELECT parent.id, parent.parent_id, parent.kind
        FROM tree_nodes parent JOIN ancestry child ON child.parent_id = parent.id
      )
      SELECT tree_nodes.id
      FROM tree_nodes JOIN trees ON trees.id = tree_nodes.tree_id
      LEFT JOIN agent_jobs ON agent_jobs.job_id = tree_nodes.id
      WHERE tree_nodes.id = $1 AND trees.workspace_id = $2
        AND tree_nodes.kind IN ('agent-job', 'agent-job-group')
        AND ($3::boolean = false OR agent_jobs.job_id IS NOT NULL)
        AND NOT EXISTS (
          SELECT 1 FROM tree_nodes child WHERE child.parent_id = tree_nodes.id
            AND child.kind IN ('agent-job', 'agent-job-group')
        )
        AND NOT EXISTS (SELECT 1 FROM ancestry WHERE kind = 'trash-directory')
    `, [jobId, workspaceId, configured]);
    if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Job was not found");
  }

  private async readConfig(jobId: string): Promise<JobConfigDto>;
  private async readConfig(jobId: string, required: false): Promise<JobConfigDto | null>;
  private async readConfig(jobId: string, required = true): Promise<JobConfigDto | null> {
    const result = await this.database.query<JobRow>(`
      SELECT * FROM agent_jobs WHERE job_id = $1
    `, [jobId]);
    if (!result.rows[0]) {
      if (required) throw new HttpError(404, "NOT_FOUND", "Job was not found");
      return null;
    }
    return mapConfig(result.rows[0]);
  }

  private async workspaceRoot(workspaceId: string) {
    const result = await this.database.query<{ filesystem_root: string }>(`
      SELECT filesystem_root FROM workspaces WHERE id = $1
    `, [workspaceId]);
    if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Workspace was not found");
    return result.rows[0].filesystem_root;
  }

  private async assertReferences(
    workspaceId: string,
    dataSourceIds: readonly string[],
  ) {
    if (!dataSourceIds.length) return;
    const result = await this.database.query<{ id: string; kind: string; in_trash: boolean }>(`
      WITH RECURSIVE ancestors AS (
        SELECT n.id AS source_id, n.id, n.parent_id, n.kind
        FROM tree_nodes n JOIN trees t ON t.id = n.tree_id
        WHERE t.workspace_id = $1 AND n.id = ANY($2::uuid[])
        UNION ALL
        SELECT a.source_id, parent.id, parent.parent_id, parent.kind
        FROM tree_nodes parent JOIN ancestors a ON a.parent_id = parent.id
      )
      SELECT source.id, source.kind,
             bool_or(ancestors.kind = 'trash-directory') AS in_trash
      FROM tree_nodes source
      JOIN trees ON trees.id = source.tree_id
      JOIN ancestors ON ancestors.source_id = source.id
      WHERE trees.workspace_id = $1 AND source.id = ANY($2::uuid[])
      GROUP BY source.id, source.kind
    `, [workspaceId, dataSourceIds]);
    const byId = new Map(result.rows.map((row) => [row.id, row]));
    for (const id of dataSourceIds) {
      const row = byId.get(id);
      if (!row || row.in_trash) {
        throw new HttpError(400, "INVALID_REQUEST", `Datasource ${id} is not a DATA item`);
      }
    }
  }

  private async resolveInput(
    workspaceId: string,
    memory: string,
    dataSourceIds: readonly string[],
    dataSources: string,
    prompt: string,
  ) {
    await this.assertReferences(workspaceId, dataSourceIds);
    const ids = [...dataSourceIds];
    const result = ids.length ? await this.database.query<{
      id: string; label: string; content: string;
    }>(`
      SELECT n.id, n.label, c.content
      FROM tree_nodes n JOIN trees t ON t.id = n.tree_id
      JOIN node_contents c ON c.node_id = n.id
      WHERE t.workspace_id = $1 AND n.id = ANY($2::uuid[])
    `, [workspaceId, ids]) : { rows: [] };
    const byId = new Map(result.rows.map((row) => [row.id, row]));
    const memorySnapshot = memory ? [{ content: memory }] : [];
    const dataSourceSnapshot = dataSourceIds.map((id) => requiredContent(byId, id));
    const systemMessage = [memory.trim(), dataSources.trim()]
      .filter(Boolean)
      .join("\n\n");
    const userInput = prompt;
    return {
      memory: systemMessage,
      userInput,
      effectiveInput: [systemMessage, userInput].filter(Boolean).join("\n\n---\n\n"),
      memorySnapshot,
      dataSourceSnapshot,
    };
  }

  private async updateRunNode(
    runId: string,
    status: JobRunStatus,
    output: string | undefined,
    editable: boolean,
  ) {
    await this.database.transaction(async (client) => {
      const run = await client.query<{
        node_id: string; created_at: Date; tree_id: string; label: string;
      }>(`
        SELECT r.node_id, r.created_at, n.tree_id, n.label
        FROM agent_job_runs r JOIN tree_nodes n ON n.id = r.node_id
        WHERE r.id = $1 FOR UPDATE
      `, [runId]);
      if (!run.rows[0]) return;
      const time = run.rows[0].label.split(" · ")[0]
        || run.rows[0].created_at.toISOString().slice(11, 16);
      await client.query(`
        UPDATE tree_nodes
        SET label = $2, content_editable = $3,
            revision = revision + 1, updated_at = now()
        WHERE id = $1
      `, [run.rows[0].node_id, `${time} · ${status}`, editable]);
      if (output !== undefined) {
        await client.query(`
          UPDATE node_contents
          SET content = $2, revision = revision + 1, updated_at = now()
          WHERE node_id = $1
        `, [run.rows[0].node_id, output]);
      }
      await client.query(`
        UPDATE trees SET revision = revision + 1, updated_at = now() WHERE id = $1
      `, [run.rows[0].tree_id]);
    });
  }
}

async function lockJobTree(client: Queryable, workspaceId: string, jobId: string) {
  const result = await client.query<{ id: string }>(`
    SELECT trees.id FROM trees
    JOIN tree_nodes ON tree_nodes.tree_id = trees.id
    JOIN agent_jobs ON agent_jobs.job_id = tree_nodes.id
    WHERE trees.workspace_id = $1 AND trees.kind = 'data'
      AND tree_nodes.id = $2
      AND tree_nodes.kind IN ('agent-job', 'agent-job-group')
      AND NOT EXISTS (
        SELECT 1 FROM tree_nodes child WHERE child.parent_id = tree_nodes.id
          AND child.kind IN ('agent-job', 'agent-job-group')
      )
    FOR UPDATE OF trees
  `, [workspaceId, jobId]);
  if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Job was not found");
  return result.rows[0];
}

function mapConfig(row: JobRow): JobConfigDto {
  return jobConfigDtoSchema.parse({
    jobId: row.job_id,
    revision: Number(row.revision),
    memoryNodeIds: row.memory_node_ids,
    memory: row.memory,
    dataSourceNodeIds: row.data_source_node_ids,
    dataSources: row.data_sources,
    prompt: row.prompt,
    modelTier: row.model_tier,
    effort: row.effort,
    schedule: row.schedule_due_at && row.schedule_time_zone ? {
      dueAt: row.schedule_due_at.toISOString(),
      timeZone: row.schedule_time_zone,
      enabled: row.schedule_enabled,
    } : null,
  });
}

function defaultConfig(jobId: string): JobConfigDto {
  return jobConfigDtoSchema.parse({
    jobId,
    revision: 0,
    memoryNodeIds: [],
    memory: "",
    dataSourceNodeIds: [],
    dataSources: "",
    prompt: "",
    modelTier: "ECON",
    effort: "FAST",
    schedule: null,
  });
}

function mapRun(row: RunRow): JobRunDto {
  return jobRunDtoSchema.parse({
    id: row.id,
    jobId: row.job_id,
    nodeId: row.node_id,
    dateNodeId: row.date_node_id,
    status: row.status,
    trigger: row.trigger,
    output: row.output,
    error: row.error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  });
}

function requiredContent(
  byId: Map<string, { id: string; label: string; content: string }>,
  id: string,
) {
  const value = byId.get(id);
  if (!value) throw new HttpError(400, "INVALID_REQUEST", `Referenced item ${id} has no content`);
  return value;
}

function assertUnique(values: readonly string[], message: string) {
  if (new Set(values).size !== values.length) {
    throw new HttpError(400, "INVALID_REQUEST", message);
  }
}

function assertTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch {
    throw new HttpError(400, "INVALID_REQUEST", "Schedule timezone is invalid");
  }
}

function localDateTime(date: Date, timeZone: string) {
  assertTimeZone(timeZone);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    compactTime: `${parts.hour}${parts.minute}${parts.second}`,
  };
}

function isActive(status: JobRunStatus) {
  return status === "queued" || status === "running";
}
