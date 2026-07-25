import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { AppConfig } from "./config.js";

const temporaryRoots: string[] = [];

async function createConfig(mode: "off" | "token"): Promise<AppConfig> {
  const root = await mkdtemp(path.join(os.tmpdir(), "flydeck-auth-"));
  temporaryRoots.push(root);
  return {
    port: 5000,
    basePath: "/flydeck",
    workspaceRoot: root,
    dataHome: path.join(root, "data"),
    tailscaleUrl: "https://flydon.example.test",
    flydonDir: path.join(root, ".flydon"),
    trashDir: path.join(root, ".flydon", "trash"),
    schedulerIntervalMs: 30_000,
    auth: { mode, token: mode === "token" ? "a-secure-token-123" : undefined, secureCookie: false },
  };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("single-user authentication", () => {
  it("keeps API access open when authentication is disabled", async () => {
    const app = await createApp(await createConfig("off"));
    await request(app).get("/flydeck/api/data").expect(200);
  });

  it("protects the API and accepts a login cookie in token mode", async () => {
    const app = await createApp(await createConfig("token"));
    const agent = request.agent(app);

    await agent.get("/flydeck/api/data").expect(401);
    await agent.post("/flydeck/api/auth/login").send({ token: "wrong" }).expect(401);
    await agent.post("/flydeck/api/auth/login").send({ token: "a-secure-token-123" }).expect(200);
    await agent.get("/flydeck/api/auth/session").expect(200, {
      authenticated: true,
      mode: "token",
      user: "owner",
    });
    await agent.get("/flydeck/api/data").expect(200);
    await agent.post("/flydeck/api/auth/logout").expect(200);
    await agent.get("/flydeck/api/data").expect(401);
  });
});
