import { randomUUID } from "node:crypto";
import {
  scheduleOccurrences, schedulerPlanDtoSchema, schedulerSnapshotDtoSchema,
  type UpdateSchedulerPlanRequest,
} from "@flydeck/shared/v2";
import type { Database } from "../db/database.js";
import { HttpError } from "../http/HttpError.js";

type Row = {
  id: string; workspace_id: string; revision: string | number;
  start_at: Date; end_at: Date; stops: Date[]; repetitions: number;
  time_zone: string; enabled: boolean; next_due_at: Date; occurrence: number;
  last_fired_at: Date | null; fired_count: number;
};

export class SchedulerPlanService {
  constructor(private readonly database: Database) {}

  async read(workspaceId: string) {
    const result = await this.database.query<Row>("SELECT * FROM scheduler_plans WHERE workspace_id = $1", [workspaceId]);
    const row = result.rows[0];
    return schedulerSnapshotDtoSchema.parse({
      plan: row ? mapPlan(row) : null,
      lastFiredAt: row?.last_fired_at?.toISOString() ?? null,
      firedCount: row?.fired_count ?? 0,
    });
  }

  async update(workspaceId: string, input: UpdateSchedulerPlanRequest) {
    const id = randomUUID();
    const result = await this.database.query<Row>(`
      INSERT INTO scheduler_plans (
        id, workspace_id, revision, start_at, end_at, stops, repetitions,
        time_zone, enabled, next_due_at, occurrence
      ) VALUES ($1, $2, 1, $3, $4, $5::timestamptz[], $6, $7, $8, $3, 0)
      ON CONFLICT (workspace_id) DO UPDATE SET
        revision = scheduler_plans.revision + 1, start_at = $3, end_at = $4,
        stops = $5::timestamptz[], repetitions = $6, time_zone = $7,
        enabled = $8, next_due_at = $3, occurrence = 0, updated_at = now()
      WHERE scheduler_plans.revision = $9
      RETURNING *
    `, [id, workspaceId, input.startAt, input.endAt, input.stops,
      input.repetitions, input.timeZone, input.enabled, input.expectedRevision]);
    if (!result.rows[0]) throw new HttpError(409, "REVISION_CONFLICT", "Schedule changed on another client");
    return schedulerPlanDtoSchema.parse(mapPlan(result.rows[0]));
  }

  async runDueJobs(limit = 20) {
    return this.database.transaction(async (client) => {
      const result = await client.query<Row>(`
        SELECT * FROM scheduler_plans WHERE enabled AND next_due_at <= now()
        ORDER BY next_due_at, id FOR UPDATE SKIP LOCKED LIMIT $1
      `, [limit]);
      for (const row of result.rows) {
        const occurrences = scheduleOccurrences(mapPlan(row));
        const nextIndex = row.occurrence + 1;
        const next = occurrences[nextIndex] ?? null;
        await client.query(`UPDATE scheduler_plans SET
          occurrence = $2, next_due_at = COALESCE($3, next_due_at), enabled = $4,
          last_fired_at = now(), fired_count = fired_count + 1,
          revision = revision + 1, updated_at = now() WHERE id = $1
        `, [row.id, nextIndex, next, Boolean(next)]);
      }
      return result.rows.length;
    });
  }
}

function mapPlan(row: Row) {
  return {
    id: row.id, revision: Number(row.revision),
    startAt: row.start_at.toISOString(), endAt: row.end_at.toISOString(),
    stops: row.stops.map((stop) => stop.toISOString()),
    repetitions: row.repetitions, timeZone: row.time_zone, enabled: row.enabled,
  };
}
