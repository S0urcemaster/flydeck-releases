import { randomUUID } from "node:crypto";
import {
  cronTimerDtoSchema,
  type CreateCronTimerRequest,
  type CronTimerDto,
  type UpdateCronTimerRequest,
} from "@flydeck/shared/v2";
import type { Database } from "../db/database.js";
import { HttpError } from "../http/HttpError.js";

type CronRow = {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  title: string;
  due_at: Date;
  status: "active" | "expired";
  revision: string | number;
  created_at: Date;
  updated_at: Date;
  expired_at: Date | null;
};

export class CronService {
  constructor(private readonly database: Database) {}

  async list(workspaceId: string) {
    const result = await this.database.query<CronRow>(`
      SELECT * FROM cron_timers
      WHERE workspace_id = $1
      ORDER BY
        CASE status WHEN 'active' THEN 0 ELSE 1 END,
        CASE WHEN status = 'active' THEN due_at END ASC,
        CASE WHEN status = 'expired' THEN due_at END DESC,
        id
    `, [workspaceId]);
    return result.rows.map(toDto);
  }

  async create(
    workspaceId: string,
    userId: string,
    input: CreateCronTimerRequest,
    now = new Date(),
  ) {
    assertFuture(input.dueAt, now);
    return this.database.transaction(async (client) => {
      const previous = await client.query<{ response_body: CronTimerDto }>(`
        SELECT response_body
        FROM idempotency_keys
        WHERE user_id = $1 AND workspace_id = $2 AND request_id = $3
      `, [userId, workspaceId, input.requestId]);
      if (previous.rows[0]) {
        return cronTimerDtoSchema.parse(previous.rows[0].response_body);
      }

      const result = await client.query<CronRow>(`
        INSERT INTO cron_timers (
          id, workspace_id, created_by_user_id, title, due_at
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [randomUUID(), workspaceId, userId, input.title, input.dueAt]);
      const timer = toDto(result.rows[0]);
      await client.query(`
        INSERT INTO idempotency_keys (
          user_id, workspace_id, request_id, operation,
          response_status, response_body, expires_at
        )
        VALUES ($1, $2, $3, 'cron.create', 201, $4, now() + interval '24 hours')
      `, [userId, workspaceId, input.requestId, timer]);
      return timer;
    });
  }

  async updateDueAt(
    workspaceId: string,
    timerId: string,
    input: UpdateCronTimerRequest,
    now = new Date(),
  ) {
    assertFuture(input.dueAt, now);
    const result = await this.database.query<CronRow>(`
      UPDATE cron_timers
      SET due_at = $1, revision = revision + 1, updated_at = now()
      WHERE id = $2 AND workspace_id = $3
        AND status = 'active' AND revision = $4
      RETURNING *
    `, [input.dueAt, timerId, workspaceId, input.expectedRevision]);
    if (result.rows[0]) return toDto(result.rows[0]);
    return this.throwTimerMutationError(workspaceId, timerId);
  }

  async remove(workspaceId: string, timerId: string, expectedRevision: number) {
    const result = await this.database.query<{ id: string }>(`
      DELETE FROM cron_timers
      WHERE id = $1 AND workspace_id = $2 AND revision = $3
      RETURNING id
    `, [timerId, workspaceId, expectedRevision]);
    if (result.rows[0]) return result.rows[0];
    return this.throwTimerMutationError(workspaceId, timerId);
  }

  async claimDueTimers(limit: number, now = new Date()) {
    return this.database.transaction(async (client) => {
      const result = await client.query<{ id: string; title: string }>(`
        WITH due AS (
          SELECT id FROM cron_timers
          WHERE status = 'active' AND due_at <= $1
            AND (
              notification_claimed_at IS NULL
              OR notification_claimed_at < $1 - interval '5 minutes'
            )
          ORDER BY due_at, id
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE cron_timers
        SET notification_claimed_at = $1,
            notification_attempts = notification_attempts + 1,
            notification_last_error = NULL,
            updated_at = now()
        FROM due
        WHERE cron_timers.id = due.id
        RETURNING cron_timers.id, cron_timers.title
      `, [now, limit]);
      return result.rows;
    });
  }

  async completeNotification(timerId: string, now = new Date()) {
    await this.database.query(`
      UPDATE cron_timers
      SET status = 'expired', expired_at = $2, notified_at = $2,
          notification_claimed_at = NULL,
          revision = revision + 1, updated_at = now()
      WHERE id = $1 AND status = 'active'
    `, [timerId, now]);
  }

  async failNotification(timerId: string, message: string) {
    await this.database.query(`
      UPDATE cron_timers
      SET notification_claimed_at = NULL,
          notification_last_error = left($2, 2000),
          updated_at = now()
      WHERE id = $1 AND status = 'active'
    `, [timerId, message]);
  }

  private async throwTimerMutationError(workspaceId: string, timerId: string): Promise<never> {
    const current = await this.database.query<{ revision: string | number; status: string }>(`
      SELECT revision, status FROM cron_timers
      WHERE id = $1 AND workspace_id = $2
    `, [timerId, workspaceId]);
    if (!current.rows[0]) {
      throw new HttpError(404, "NOT_FOUND", "Timer was not found");
    }
    if (current.rows[0].status !== "active") {
      throw new HttpError(409, "REVISION_CONFLICT", "Expired timer cannot be changed", {
        currentRevision: Number(current.rows[0].revision),
      });
    }
    throw new HttpError(409, "REVISION_CONFLICT", "Timer was changed by another request", {
      currentRevision: Number(current.rows[0].revision),
    });
  }
}

function assertFuture(dueAt: string, now: Date) {
  if (new Date(dueAt).getTime() <= now.getTime()) {
    throw new HttpError(400, "INVALID_REQUEST", "Timer must be in the future", {
      field: "dueAt",
    });
  }
}

function toDto(row: CronRow): CronTimerDto {
  return cronTimerDtoSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    dueAt: row.due_at.toISOString(),
    status: row.status,
    revision: Number(row.revision),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    expiredAt: row.expired_at?.toISOString() ?? null,
  });
}
