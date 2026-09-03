import type { Database, Queryable } from "../db/database.js";

export type PublicationOutboxAction = "publish" | "unpublish";

export type PublicationOutboxEntry = {
  id: string;
  workspaceId: string;
  publicationId: string;
  action: PublicationOutboxAction;
  targetVersion: number | null;
  attempts: number;
};

type OutboxRow = {
  id: string;
  workspace_id: string;
  publication_id: string;
  action: PublicationOutboxAction;
  target_version: string | null;
  attempts: number;
};

export class PublicationOutbox {
  constructor(private readonly database: Database) {}

  async enqueue(
    workspaceId: string,
    publicationId: string,
    action: PublicationOutboxAction,
  ) {
    return this.database.transaction(async (client) => {
      const targetVersion = action === "publish"
        ? await issueVersion(client, publicationId)
        : null;
      const result = await client.query<OutboxRow>(`
        INSERT INTO relay_publication_outbox (
          id, workspace_id, publication_id, action, target_version
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (publication_id)
          WHERE status IN ('pending', 'sending', 'failed')
        DO UPDATE SET
          action = EXCLUDED.action,
          target_version = EXCLUDED.target_version,
          status = 'pending',
          attempts = 0,
          next_attempt_at = now(),
          last_error = NULL,
          updated_at = now()
        RETURNING id, workspace_id, publication_id, action, target_version, attempts
      `, [crypto.randomUUID(), workspaceId, publicationId, action, targetVersion]);
      return toEntry(result.rows[0]);
    });
  }

  async claimNext(): Promise<PublicationOutboxEntry | null> {
    return this.database.transaction(async (client) => {
      const result = await client.query<OutboxRow>(`
        WITH candidate AS (
          SELECT id
          FROM relay_publication_outbox
          WHERE status IN ('pending', 'failed') AND next_attempt_at <= now()
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE relay_publication_outbox entry
        SET status = 'sending', attempts = attempts + 1, updated_at = now()
        FROM candidate
        WHERE entry.id = candidate.id
        RETURNING entry.id, entry.workspace_id, entry.publication_id,
          entry.action, entry.target_version, entry.attempts
      `);
      return result.rows[0] ? toEntry(result.rows[0]) : null;
    });
  }

  async complete(entry: PublicationOutboxEntry) {
    await this.database.transaction(async (client) => {
      const completed = await client.query(`
        UPDATE relay_publication_outbox
        SET status = 'completed', completed_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'sending'
      `, [entry.id]);
      if (completed.rowCount !== 1) return;
      if (entry.action === "publish" && entry.targetVersion !== null) {
        await client.query(`
          UPDATE relay_publication_versions
          SET last_confirmed_version = GREATEST(last_confirmed_version, $2), updated_at = now()
          WHERE publication_id = $1
        `, [entry.publicationId, entry.targetVersion]);
      }
    });
  }

  async fail(id: string, message: string, attempts: number) {
    const delaySeconds = Math.min(300, 2 ** Math.min(attempts, 8));
    await this.database.query(`
      UPDATE relay_publication_outbox
      SET status = 'failed', last_error = $2,
          next_attempt_at = now() + ($3 * interval '1 second'), updated_at = now()
      WHERE id = $1 AND status = 'sending'
    `, [id, message.slice(0, 2_000), delaySeconds]);
  }
}

async function issueVersion(client: Queryable, publicationId: string) {
  const result = await client.query<{ last_issued_version: string }>(`
    INSERT INTO relay_publication_versions (publication_id, last_issued_version)
    VALUES ($1, 1)
    ON CONFLICT (publication_id) DO UPDATE SET
      last_issued_version = relay_publication_versions.last_issued_version + 1,
      updated_at = now()
    RETURNING last_issued_version::text
  `, [publicationId]);
  return Number(result.rows[0].last_issued_version);
}

function toEntry(row: OutboxRow): PublicationOutboxEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    publicationId: row.publication_id,
    action: row.action,
    targetVersion: row.target_version === null ? null : Number(row.target_version),
    attempts: row.attempts,
  };
}
