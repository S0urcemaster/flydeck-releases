import { timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { z } from "zod";
import type { BlueskyOAuthBrokerApi } from "./BlueskyOAuthBroker.js";

const identitySchema = z.object({ userId: z.uuid(), workspaceId: z.uuid() });
const authorizeSchema = identitySchema.extend({ handle: z.string().trim().min(1).max(253) });
const publishSchema = identitySchema.extend({
  posts: z.array(z.string().trim().min(1).max(3_000)).min(1).max(100),
  image: z.object({
    mimeType: z.string().startsWith("image/").max(100),
    data: z.string().min(1),
  }).optional(),
});

export function createOAuthRouters(broker: BlueskyOAuthBrokerApi, secret: string, returnUrl: string) {
  const publicRouter = Router();
  publicRouter.get("/bluesky/client-metadata.json", (_request, response) => response.json(broker.clientMetadata));
  publicRouter.get("/bluesky/jwks.json", (_request, response) => response.json(broker.jwks));
  publicRouter.get("/bluesky/callback", async (request, response) => {
    await broker.callback(new URLSearchParams(request.url.split("?", 2)[1] ?? ""));
    response.redirect(303, returnUrl);
  });

  const internalRouter = Router();
  internalRouter.use(express.json({ limit: "28mb" }));
  internalRouter.use((request, response, next) => {
    const supplied = request.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const left = Buffer.from(supplied); const right = Buffer.from(secret);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      response.status(401).json({ error: "AUTH_REQUIRED", message: "Broker authentication failed" });
      return;
    }
    next();
  });
  internalRouter.post("/oauth/bluesky/authorize", async (request, response) => {
    const input = authorizeSchema.parse(request.body);
    response.json({ authorizationUrl: await broker.authorize(input.userId, input.workspaceId, input.handle) });
  });
  internalRouter.get("/oauth/bluesky/connections/:userId/:workspaceId", async (request, response) => {
    const input = identitySchema.parse(request.params);
    response.json(await broker.status(input.userId, input.workspaceId));
  });
  internalRouter.delete("/oauth/bluesky/connections/:userId/:workspaceId", async (request, response) => {
    const input = identitySchema.parse(request.params);
    await broker.disconnect(input.userId, input.workspaceId);
    response.json({ disconnected: true });
  });
  internalRouter.post("/oauth/bluesky/publish", async (request, response) => {
    const input = publishSchema.parse(request.body);
    response.json({ posts: await broker.publish(
      input.userId,
      input.workspaceId,
      input.posts,
      input.image ? {
        mimeType: input.image.mimeType,
        content: Buffer.from(input.image.data, "base64"),
      } : undefined,
    ) });
  });
  return { publicRouter, internalRouter };
}
