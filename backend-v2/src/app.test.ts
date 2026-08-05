import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";
import type { AppConfig } from "./config.js";
import type { Database } from "./db/database.js";
import { createPasswordCredential } from "./auth/passwordCredential.js";

const config: AppConfig = {
  port: 5100,
  basePath: "/flydeck",
  databaseUrl: "postgresql://unused",
  databaseSsl: false,
  trustProxy: false,
  schedulerIntervalMs: 5_000,
  loginRequired: true,
  authSecureCookie: false,
  sessionTtlDays: 30,
  frontendBasePath: "/v2",
};
const userId = "00000000-0000-4000-8000-000000000001";
const workspaceId = "00000000-0000-4000-8000-000000000002";

function database(query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 })) {
  return {
    query,
    transaction: vi.fn(),
    end: vi.fn(),
  } as Database;
}

describe("backend-v2 HTTP foundation", () => {
  it("serves liveness without touching PostgreSQL", async () => {
    const db = database();
    const response = await request(createApp(config, db))
      .get("/flydeck/api/v2/health/live")
      .expect(200);

    expect(response.body).toEqual({ status: "ok" });
    expect(db.query).not.toHaveBeenCalled();
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("reports readiness only when PostgreSQL responds", async () => {
    await request(createApp(config, database()))
      .get("/flydeck/api/v2/health/ready")
      .expect(200, { status: "ready" });

    const response = await request(createApp(config, database(
      vi.fn().mockRejectedValue(new Error("offline")),
    )))
      .get("/flydeck/api/v2/health/ready")
      .expect(503);
    expect(response.body).toMatchObject({
      error: "SERVICE_UNAVAILABLE",
      message: "PostgreSQL is unavailable",
    });
  });

  it("exposes an unauthenticated session boundary without development bypass", async () => {
    await request(createApp(config, database()))
      .get("/flydeck/api/v2/auth/session")
      .expect(200, {
        authenticated: false,
        loginRequired: true,
        user: null,
        workspaces: [],
      });
  });

  it("resolves an opaque session and returns only its workspace summaries", async () => {
    const db = database(vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{
        user_id: userId,
        display_name: "Sean",
        workspace_id: workspaceId,
        workspace_name: "Home",
        role: "owner",
      }],
    }));
    const response = await request(createApp(config, db))
      .get("/flydeck/api/v2/auth/session")
      .set("Cookie", "flydeck_v2_session=secret-session-token")
      .expect(200);

    expect(response.body).toEqual({
      authenticated: true,
      loginRequired: true,
      user: { id: userId, displayName: "Sean" },
      workspaces: [{ id: workspaceId, name: "Home", role: "owner" }],
    });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining(
      "sessions.token_hash = $1",
    ), [expect.any(Buffer)]);
  });

  it("uses the configured local owner when login is disabled", async () => {
    const db = database(vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{
        user_id: userId,
        display_name: "Sean",
        workspace_id: workspaceId,
        workspace_name: "Home",
        role: "owner",
      }],
    }));
    const response = await request(createApp({
      ...config, loginRequired: false, authDefaultUserId: userId,
    }, db)).get("/flydeck/api/v2/auth/session").expect(200);

    expect(response.body).toMatchObject({
      authenticated: true,
      loginRequired: false,
      user: { id: userId },
    });
  });

  it("creates an opaque HttpOnly session after password login", async () => {
    const credential = await createPasswordCredential("password-123");
    const query = vi.fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ user_id: userId, method: "password", credential }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          user_id: userId,
          display_name: "Sean",
          workspace_id: workspaceId,
          workspace_name: "Home",
          role: "owner",
        }],
      });
    const response = await request(createApp(config, database(query)))
      .post("/flydeck/api/v2/auth/login")
      .send({ loginName: "Sean", password: "password-123" })
      .expect(200);

    expect(response.body).toMatchObject({ authenticated: true, loginRequired: true });
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.[0]).toContain("SameSite=Strict");
  });

  it("protects the workspace list", async () => {
    const response = await request(createApp(config, database()))
      .get("/flydeck/api/v2/workspaces")
      .expect(401);

    expect(response.body).toMatchObject({ error: "AUTH_REQUIRED" });
  });

  it("uses the stable error envelope for unknown routes", async () => {
    const response = await request(createApp(config, database()))
      .get("/flydeck/api/v2/unknown")
      .expect(404);
    expect(response.body).toMatchObject({
      error: "NOT_FOUND",
      message: "Endpoint was not found",
    });
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
  });
});
