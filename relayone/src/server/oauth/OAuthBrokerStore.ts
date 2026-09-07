import { randomUUID } from "node:crypto";
import type {
  NodeSavedSession,
  NodeSavedState,
  NodeSavedSessionStore,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node";

import type { RelayDatabase } from "../database.js";
import { EncryptedJson } from "./EncryptedJson.js";

export type OAuthConnection = {
  id: string;
  userId: string;
  workspaceId: string;
  did: string;
  handle: string;
  status: "connected" | "revoked";
};

export class OAuthBrokerStore {
  readonly stateStore: NodeSavedStateStore;
  readonly sessionStore: NodeSavedSessionStore;

  constructor(
    private readonly database: RelayDatabase,
    private readonly encryptedJson: EncryptedJson,
  ) {
    this.stateStore = {
      set: async (key, value) => {
        await database.query(`
          INSERT INTO relay_oauth_states (key, encrypted_value, expires_at)
          VALUES ($1, $2, now() + interval '1 hour')
          ON CONFLICT (key) DO UPDATE SET
            encrypted_value = EXCLUDED.encrypted_value,
            expires_at = EXCLUDED.expires_at
        `, [key, encryptedJson.encrypt(value)]);
      },
      get: async (key) => {
        const result = await database.query<{ encrypted_value: Buffer }>(`
          SELECT encrypted_value FROM relay_oauth_states
          WHERE key = $1 AND expires_at > now()
        `, [key]);
        return result.rows[0]
          ? encryptedJson.decrypt<NodeSavedState>(result.rows[0].encrypted_value)
          : undefined;
      },
      del: async (key) => {
        await database.query("DELETE FROM relay_oauth_states WHERE key = $1", [key]);
      },
    };
    this.sessionStore = {
      set: async (did, value) => {
        await database.query(`
          INSERT INTO relay_oauth_sessions (did, encrypted_value)
          VALUES ($1, $2)
          ON CONFLICT (did) DO UPDATE SET
            encrypted_value = EXCLUDED.encrypted_value,
            updated_at = now()
        `, [did, encryptedJson.encrypt(value)]);
      },
      get: async (did) => {
        const result = await database.query<{ encrypted_value: Buffer }>(`
          SELECT encrypted_value FROM relay_oauth_sessions WHERE did = $1
        `, [did]);
        return result.rows[0]
          ? encryptedJson.decrypt<NodeSavedSession>(result.rows[0].encrypted_value)
          : undefined;
      },
      del: async (did) => {
        await database.query("DELETE FROM relay_oauth_sessions WHERE did = $1", [did]);
      },
    };
  }

  async connect(userId: string, workspaceId: string, did: string, handle: string) {
    const result = await this.database.query<ConnectionRow>(`
      INSERT INTO relay_oauth_connections
        (id, flydeck_user_id, workspace_id, provider, did, handle, status)
      VALUES ($1, $2, $3, 'bluesky', $4, $5, 'connected')
      ON CONFLICT (flydeck_user_id, workspace_id, provider) DO UPDATE SET
        did = EXCLUDED.did, handle = EXCLUDED.handle, status = 'connected', updated_at = now()
      RETURNING id, flydeck_user_id, workspace_id, did, handle, status
    `, [randomUUID(), userId, workspaceId, did, handle]);
    return toConnection(result.rows[0]);
  }

  async find(userId: string, workspaceId: string) {
    const result = await this.database.query<ConnectionRow>(`
      SELECT id, flydeck_user_id, workspace_id, did, handle, status
      FROM relay_oauth_connections
      WHERE flydeck_user_id = $1 AND workspace_id = $2 AND provider = 'bluesky'
    `, [userId, workspaceId]);
    return result.rows[0] ? toConnection(result.rows[0]) : null;
  }

  async revoke(userId: string, workspaceId: string) {
    const connection = await this.find(userId, workspaceId);
    if (!connection) return null;
    await this.database.transaction(async (client) => {
      await client.query(`
        UPDATE relay_oauth_connections SET status = 'revoked', updated_at = now()
        WHERE id = $1
      `, [connection.id]);
      await client.query("DELETE FROM relay_oauth_sessions WHERE did = $1", [connection.did]);
    });
    return { ...connection, status: "revoked" as const };
  }
}

type ConnectionRow = {
  id: string;
  flydeck_user_id: string;
  workspace_id: string;
  did: string;
  handle: string;
  status: "connected" | "revoked";
};

function toConnection(row: ConnectionRow): OAuthConnection {
  return {
    id: row.id,
    userId: row.flydeck_user_id,
    workspaceId: row.workspace_id,
    did: row.did,
    handle: row.handle,
    status: row.status,
  };
}
