import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { BlueskyOAuthBrokerApi } from "./BlueskyOAuthBroker.js";
import { createOAuthRouters } from "./router.js";

const secret = "a".repeat(32);
function setup() {
  const broker: BlueskyOAuthBrokerApi = {
    clientMetadata: { client_id: "https://relay-one.de/oauth/bluesky/client-metadata.json" },
    jwks: { keys: [] },
    authorize: vi.fn(async () => "https://bsky.social/authorize"),
    callback: vi.fn(async () => undefined),
    status: vi.fn(async () => ({ provider: "bluesky", connected: false })),
    disconnect: vi.fn(async () => undefined),
    publish: vi.fn(async () => []),
  };
  const routers = createOAuthRouters(broker, secret, "https://flydon.example/v2");
  const app = express(); app.use(express.json());
  app.use("/oauth", routers.publicRouter); app.use("/internal", routers.internalRouter);
  return { app, broker };
}

describe("OAuth broker routes", () => {
  it("publishes client metadata without internal authentication", async () => {
    const { app } = setup();
    const response = await request(app).get("/oauth/bluesky/client-metadata.json");
    expect(response.status).toBe(200);
    expect(response.body.client_id).toContain("client-metadata.json");
  });
  it("protects broker operations and creates an authorization URL", async () => {
    const { app, broker } = setup();
    expect((await request(app).post("/internal/oauth/bluesky/authorize")).status).toBe(401);
    const response = await request(app).post("/internal/oauth/bluesky/authorize")
      .set("Authorization", `Bearer ${secret}`)
      .send({ userId: "00000000-0000-4000-8000-000000000001",
        workspaceId: "00000000-0000-4000-8000-000000000002", handle: "alice.bsky.social" });
    expect(response.status).toBe(200);
    expect(response.body.authorizationUrl).toContain("bsky.social");
    expect(broker.authorize).toHaveBeenCalledWith(expect.any(String), expect.any(String), "alice.bsky.social");
  });
  it("passes an original image payload to the publisher", async () => {
    const { app, broker } = setup();
    const userId = "00000000-0000-4000-8000-000000000001";
    const workspaceId = "00000000-0000-4000-8000-000000000002";
    const response = await request(app).post("/internal/oauth/bluesky/publish")
      .set("Authorization", `Bearer ${secret}`)
      .send({
        userId,
        workspaceId,
        posts: ["Post with image"],
        image: { mimeType: "image/png", data: Buffer.from("original").toString("base64") },
      });

    expect(response.status).toBe(200);
    expect(broker.publish).toHaveBeenCalledWith(userId, workspaceId, ["Post with image"], {
      mimeType: "image/png",
      content: Buffer.from("original"),
    });
  });
});
