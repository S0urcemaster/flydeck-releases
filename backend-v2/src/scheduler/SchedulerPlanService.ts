import { randomUUID } from "node:crypto";
import {
  scheduleOccurrences, schedulerPlanDtoSchema, schedulerSnapshotDtoSchema,
  type UpdateSchedulerPlanRequest,
} from "@flydeck/shared/v2";
import type { Database } from "../db/database.js";
import { HttpError } from "../http/HttpError.js";

type Row = {
  id: string; workspace_id: string; revision: string | number;
  node_id: string; label: string;
  comment: string;
  comments: string[];
  start_at: Date; end_at: Date; stops: Date[]; repetitions: number;
  time_zone: string; enabled: boolean; next_due_at: Date; occurrence: number;
  last_fired_at: Date | null; fired_count: number;
  notify_with_ntfy: boolean;
};

type SchedulerNotifier = {
  sendTimer(
    message: string,
    deliveryAt?: Date,
    sequenceId?: string,
    title?: string,
  ): Promise<void>;
};

export class SchedulerPlanService {
  constructor(
    private readonly database: Database,
    private readonly notifier?: SchedulerNotifier,
  ) {}

  async read(workspaceId: string, nodeId: string) {
    const result = await this.database.query<Row>("SELECT * FROM scheduler_plans WHERE workspace_id = $1 AND node_id = $2", [workspaceId, nodeId]);
    const row = result.rows[0];
    if (!row) throw new HttpError(404, "NOT_FOUND", "Schedule was not found");
    return schedulerSnapshotDtoSchema.parse({
      plan: mapPlan(row),
      lastFiredAt: row.last_fired_at?.toISOString() ?? null,
      firedCount: row.fired_count,
    });
  }

  async list(workspaceId: string) {
    const result = await this.database.query<Row>("SELECT * FROM scheduler_plans WHERE workspace_id = $1 ORDER BY start_at, id", [workspaceId]);
    return result.rows.map((row) => ({ plan: mapPlan(row), lastFiredAt: row.last_fired_at?.toISOString() ?? null, firedCount: row.fired_count }));
  }

  async update(workspaceId: string, nodeId: string, input: UpdateSchedulerPlanRequest) {
    const currentMinute = new Date();
    currentMinute.setSeconds(0, 0);
    if (input.enabled && [input.startAt, ...input.stops, input.endAt]
      .some((point) => Date.parse(point) < currentMinute.getTime())) {
      throw new HttpError(400, "INVALID_REQUEST", "All schedule times must be in the future");
    }
    const node = await this.database.query(`
      SELECT tree_nodes.id FROM tree_nodes
      JOIN trees ON trees.id = tree_nodes.tree_id
      WHERE tree_nodes.id = $1 AND trees.workspace_id = $2 AND trees.kind = 'data'
    `, [nodeId, workspaceId]);
    if (!node.rows[0]) throw new HttpError(404, "NOT_FOUND", "Schedule item was not found");
    const id = randomUUID();
    const result = await this.database.query<Row>(`
      INSERT INTO scheduler_plans (
        id, workspace_id, node_id, label, revision, start_at, end_at, stops, repetitions,
        comments, time_zone, enabled, notify_with_ntfy, next_due_at, occurrence
      ) VALUES ($1, $2, $3, $4, 1, $5, $6, $7::timestamptz[], $8, $9::text[], $10, $11, $12, $5, 0)
      ON CONFLICT (workspace_id, node_id) DO UPDATE SET
        revision = scheduler_plans.revision + 1, label = $4, start_at = $5, end_at = $6,
        stops = $7::timestamptz[], repetitions = $8, comments = $9::text[], time_zone = $10,
        enabled = $11, notify_with_ntfy = $12, next_due_at = $5, occurrence = 0, updated_at = now()
      WHERE scheduler_plans.revision = $13
      RETURNING *
    `, [id, workspaceId, nodeId, input.label, input.startAt, input.endAt, input.stops,
      input.repetitions, input.comments, input.timeZone, input.enabled, input.notifyWithNtfy,
      input.expectedRevision]);
    if (!result.rows[0]) throw new HttpError(409, "REVISION_CONFLICT", "Schedule changed on another client");
    return schedulerPlanDtoSchema.parse(mapPlan(result.rows[0]));
  }

  async runDueJobs(limit = 20) {
    return this.database.transaction(async (client) => {
      const result = await client.query<Row>(`
        SELECT * FROM scheduler_plans WHERE enabled AND next_due_at <=
          CASE WHEN notify_with_ntfy THEN now() + interval '2 minutes' ELSE now() END
        ORDER BY next_due_at, id FOR UPDATE SKIP LOCKED LIMIT $1
      `, [limit]);
      for (const row of result.rows) {
        const pointCount = row.stops.length + 1;
        const pointComment = (row.comments ?? [])[row.occurrence % pointCount] ?? "";
        if (row.notify_with_ntfy && this.notifier) {
          await this.notifier.sendTimer(
            pointComment || row.comment || row.label,
            row.next_due_at,
            `flydeck-${row.id}-${row.occurrence}`,
            row.label,
          );
        }
        const occurrences = scheduleOccurrences(mapPlan(row));
        const nextIndex = row.occurrence + 1;
        const next = occurrences[nextIndex] ?? null;
        await client.query(`UPDATE scheduler_plans SET
          occurrence = $2, next_due_at = COALESCE($3, next_due_at), enabled = $4,
          last_fired_at = $5, fired_count = fired_count + 1,
          revision = revision + 1, updated_at = now() WHERE id = $1
        `, [row.id, nextIndex, next, Boolean(next), row.next_due_at]);
      }
      return result.rows.length;
    });
  }
}

function mapPlan(row: Row) {
  return {
    id: row.id, nodeId: row.node_id, label: row.label, revision: Number(row.revision),
    startAt: row.start_at.toISOString(), endAt: row.end_at.toISOString(),
    stops: row.stops.map((stop) => stop.toISOString()),
    repetitions: row.repetitions,
    comment: row.comment,
    comments: row.comments ?? [],
    timeZone: row.time_zone, enabled: row.enabled,
    notifyWithNtfy: row.notify_with_ntfy,
  };
}
