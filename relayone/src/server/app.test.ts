import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";

import type { RelayNodePage, RelaySite } from "../shared/contracts.js";
import { createApp } from "./app.js";
import type { RelayConfig } from "./config.js";
import type { RelayReader } from "./RelayStore.js";

const config: RelayConfig = {
  port: 6060,
  host: "127.0.0.1",
  databaseUrl: "postgresql://localhost/relayone",
  databaseSsl: false,
  title: "Relay One",
  info: "Selected posts.",
  imageDirectory: "/tmp/images",
  assetDirectory: "/tmp/relay-assets",
  ingestSecret: null,
  maxAssetBytes: 25 * 1_024 * 1_024,
  dataSource: "legacy",
  publicCacheSeconds: 15,
  frontendDist: path.resolve("dist-does-not-exist"),
};

const site: RelaySite = {
  title: "Relay One",
  info: "Selected posts.",
  roots: [{
    id: "00000000-0000-4000-8000-000000000001",
    label: "Posts",
    localId: "posts",
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  imageUrl: null,
  childCount: 0,
  hasChildren: false,
  }],
};

const page: RelayNodePage = {
  parents: [],
  levels: [{ activeId: site.roots[0].id, depth: 0, nodes: site.roots }],
  post: {
    ...site.roots[0],
    format: "markdown",
    content: "Welcome",
    children: [],
  },
};

describe("Relay One app", () => {
  it("serves the publication with restrictive browser headers", async () => {
    const response = await request(createApp(config, reader())).get("/api/site");

    expect(response.status).toBe(200);
    expect(response.body.roots[0].label).toBe("Posts");
    expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(response.headers["cache-control"]).toContain("max-age=15");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("loads the selected node content separately from the site metadata", async () => {
    const response = await request(createApp(config, reader()))
      .get(`/api/nodes/${page.post.id}`);

    expect(response.status).toBe(200);
    expect(response.body.post.content).toBe("Welcome");
    expect(response.body.levels[0].nodes[0]).not.toHaveProperty("content");
  });

  it("does not expose images rejected by the publication reader", async () => {
    const response = await request(createApp(config, reader()))
      .get("/api/images/00000000-0000-4000-8000-000000000099");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("IMAGE_NOT_FOUND");
  });

  it("serves frontend bundles before interpreting content-addressed assets", async () => {
    const frontendDist = await mkdtemp(path.join(os.tmpdir(), "relay-frontend-"));
    try {
      await mkdir(path.join(frontendDist, "assets"));
      await writeFile(path.join(frontendDist, "assets", "app.js"), "window.relayLoaded=true");
      const response = await request(createApp({ ...config, frontendDist }, reader()))
        .get("/assets/app.js");

      expect(response.status).toBe(200);
      expect(response.text).toContain("relayLoaded");
    } finally {
      await rm(frontendDist, { recursive: true, force: true });
    }
  });

  it("reports an unavailable publication without leaking database details", async () => {
    const unavailable = reader({ loadSite: async () => null, isReady: async () => false });
    expect((await request(createApp(config, unavailable)).get("/api/site")).status)
      .toBe(404);
    expect((await request(createApp(config, unavailable)).get("/api/health/ready")).status)
      .toBe(503);
  });
});

function reader(overrides: Partial<RelayReader> = {}): RelayReader {
  return {
    loadSite: async () => site,
    loadNode: async (nodeId) => nodeId === page.post.id ? page : null,
    readImage: async () => null,
    isReady: async () => true,
    ...overrides,
  };
}
