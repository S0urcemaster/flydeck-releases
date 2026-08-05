import { createHash, randomBytes } from "node:crypto";
import type { Request } from "express";
import {
  sessionDtoSchema,
  type SessionDto,
  type WorkspaceSummaryDto,
} from "@flydeck/shared/v2";
import type { Database } from "../db/database.js";
import type { AppConfig } from "../config.js";
import { HttpError } from "../http/HttpError.js";
import { verifyPassword } from "./passwordCredential.js";

export const sessionCookieName = "flydeck_v2_session";

type SessionRow = {
  user_id: string;
  display_name: string;
  workspace_id: string | null;
  workspace_name: string | null;
  role: WorkspaceSummaryDto["role"] | null;
};

export class SessionService {
  constructor(
    private readonly database: Database,
    private readonly config: Pick<
      AppConfig,
      "loginRequired" | "authDefaultUserId" | "sessionTtlDays"
    >,
  ) {}

  async read(request: Pick<Request, "headers">): Promise<SessionDto> {
    const token = readCookie(request.headers.cookie, sessionCookieName);
    if (!token) {
      return this.config.loginRequired
        ? unauthenticatedSession(true)
        : this.readDefaultUser();
    }
    const result = await this.readTokenRows(token);
    const first = result[0];
    if (!first) {
      return this.config.loginRequired
        ? unauthenticatedSession(true)
        : this.readDefaultUser();
    }

    return toSession(result, this.config.loginRequired);
  }

  async login(loginName: string, password: string) {
    const result = await this.database.query<{
      user_id: string;
      method: string;
      credential: unknown;
    }>(`
      SELECT users.id AS user_id, user_credentials.method, user_credentials.credential
      FROM users
      JOIN user_credentials ON user_credentials.user_id = users.id
      WHERE lower(users.display_name) = lower($1)
      ORDER BY users.created_at
      LIMIT 2
    `, [loginName]);
    const credential = result.rows.length === 1 ? result.rows[0] : null;
    if (
      !credential
      || credential.method !== "password"
      || !(await verifyPassword(password, credential.credential))
    ) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Login name or password is invalid");
    }

    const token = randomBytes(32).toString("base64url");
    await this.database.query(`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES ($1, $2, now() + ($3 * interval '1 day'))
    `, [hashToken(token), credential.user_id, this.config.sessionTtlDays]);
    const rows = await this.readTokenRows(token);
    return { token, session: toSession(rows, this.config.loginRequired) };
  }

  async logout(request: Pick<Request, "headers">) {
    const token = readCookie(request.headers.cookie, sessionCookieName);
    if (token) {
      await this.database.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
    }
  }

  private async readTokenRows(token: string) {
    const tokenHash = hashToken(token);
    return (await this.database.query<SessionRow>(`
      SELECT
        users.id AS user_id,
        users.display_name,
        workspaces.id AS workspace_id,
        workspaces.name AS workspace_name,
        workspace_memberships.role
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      LEFT JOIN workspace_memberships
        ON workspace_memberships.user_id = users.id
      LEFT JOIN workspaces
        ON workspaces.id = workspace_memberships.workspace_id
      WHERE sessions.token_hash = $1
        AND sessions.expires_at > now()
      ORDER BY workspaces.name, workspaces.id
    `, [tokenHash])).rows;
  }

  private async readDefaultUser() {
    const result = await this.database.query<SessionRow>(`
      SELECT
        users.id AS user_id,
        users.display_name,
        workspaces.id AS workspace_id,
        workspaces.name AS workspace_name,
        workspace_memberships.role
      FROM users
      JOIN workspace_memberships
        ON workspace_memberships.user_id = users.id
      JOIN workspaces
        ON workspaces.id = workspace_memberships.workspace_id
      WHERE ($1::uuid IS NOT NULL AND users.id = $1)
         OR ($1::uuid IS NULL AND workspace_memberships.role = 'owner')
      ORDER BY
        CASE WHEN $1::uuid IS NOT NULL AND users.id = $1 THEN 0 ELSE 1 END,
        users.created_at,
        workspaces.name,
        workspaces.id
    `, [this.config.authDefaultUserId ?? null]);
    if (!result.rows[0]) return unauthenticatedSession(false);
    const selectedUserId = result.rows[0].user_id;
    return toSession(
      result.rows.filter((row) => row.user_id === selectedUserId),
      false,
    );
  }
}

function toSession(rows: SessionRow[], loginRequired: boolean) {
  const first = rows[0];
  return sessionDtoSchema.parse({
      authenticated: true,
      loginRequired,
      user: { id: first.user_id, displayName: first.display_name },
      workspaces: rows.flatMap((row) => (
        row.workspace_id && row.workspace_name && row.role
          ? [{
              id: row.workspace_id,
              name: row.workspace_name,
              role: row.role,
            }]
          : []
      )),
    });
}

function unauthenticatedSession(loginRequired: boolean): SessionDto {
  return { authenticated: false, loginRequired, user: null, workspaces: [] };
}

function readCookie(header: string | undefined, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [cookieName, ...valueParts] = part.trim().split("=");
    if (cookieName !== name) continue;
    try {
      return decodeURIComponent(valueParts.join("="));
    } catch {
      return null;
    }
  }
  return null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest();
}
