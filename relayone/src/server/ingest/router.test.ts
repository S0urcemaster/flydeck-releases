import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { PublicationIngestService } from "./PublicationIngestService.js";
import { createIngestRouter } from "./router.js";

const secret = "a-secure-ingest-secret-with-32-characters";
const publicationId = "00000000-0000-4000-8000-000000000001";
const nodeId = "00000000-0000-4000-8000-000000000002";

describe("ingest router", () => {
  it("rejects requests without ingest credentials", async () => {
    const response = await request(app(service())).put(
      `/ingest/v1/publications/${publicationId}/versions/1`,
    ).send(manifest());

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INGEST_UNAUTHORIZED");
  });

  it("stages a complete authenticated manifest", async () => {
    const ingest = service();
    const response = await request(app(ingest)).put(
      `/ingest/v1/publications/${publicationId}/versions/1`,
    ).set("Authorization", `Bearer ${secret}`).send(manifest());

    expect(response.status).toBe(201);
    expect(ingest.stage).toHaveBeenCalledOnce();
    expect(response.body.status).toBe("staging");
  });

  it("rejects content whose manifest identity differs from the URL", async () => {
    const response = await request(app(service())).put(
      "/ingest/v1/publications/00000000-0000-4000-8000-000000000099/versions/1",
    ).set("Authorization", `Bearer ${secret}`).send(manifest());

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("INGEST_MANIFEST_MISMATCH");
  });
});

function app(ingest: PublicationIngestService) {
  const application = express();
  application.use("/ingest/v1", createIngestRouter(secret, 1024, ingest));
  return application;
}

function service() {
  return {
    stage: vi.fn(async (value) => ({
      publicationId: value.publicationId,
      version: value.version,
      missingAssets: [],
      status: "staging" as const,
    })),
    putAsset: vi.fn(),
    activate: vi.fn(),
    unpublish: vi.fn(),
  } as unknown as PublicationIngestService;
}

function manifest() {
  return {
    schemaVersion: 1,
    publicationId,
    version: 1,
    title: "Posts",
    info: "",
    createdAt: "2026-09-03T10:00:00.000Z",
    assets: [],
    nodes: [{
      id: nodeId,
      parentId: null,
      localId: "posts",
      position: 0,
      label: "Posts",
      createdAt: "2026-09-03T10:00:00.000Z",
      updatedAt: "2026-09-03T10:00:00.000Z",
      format: "markdown",
      content: "Hello",
      assets: [],
    }],
  };
}
