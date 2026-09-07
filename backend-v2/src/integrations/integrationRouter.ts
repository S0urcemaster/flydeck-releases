import { Router, type Request } from "express";
import {
  blueskyConnectionDtoSchema,
  connectBlueskyRequestSchema,
  connectBlueskyResponseSchema,
  disconnectBlueskyResponseSchema,
  publishBlueskyThreadRequestSchema,
  publishBlueskyThreadResponseSchema,
} from "@flydeck/shared/v2";
import type { SessionService } from "../auth/SessionService.js";
import { requireWorkspaceAccess } from "../auth/workspaceAuthorization.js";
import type { OAuthBroker } from "./RelayOAuthClient.js";
import type { NodeImageService } from "../tree/NodeImageService.js";
import { HttpError } from "../http/HttpError.js";
import { readFile } from "node:fs/promises";
import { prepareBlueskyImage } from "./prepareBlueskyImage.js";

export function createIntegrationRouter(
  sessions: SessionService,
  broker: OAuthBroker,
  images: NodeImageService,
) {
  const router = Router({ mergeParams: true });
  router.get("/bluesky", async (request, response) => {
    const { userId, workspaceId } = await access(sessions, request, false);
    response.json(blueskyConnectionDtoSchema.parse(await broker.status(userId, workspaceId)));
  });
  router.post("/bluesky", async (request, response) => {
    const { userId, workspaceId } = await access(sessions, request, true);
    const { handle } = connectBlueskyRequestSchema.parse(request.body);
    response.json(connectBlueskyResponseSchema.parse(await broker.authorize(userId, workspaceId, handle)));
  });
  router.delete("/bluesky", async (request, response) => {
    const { userId, workspaceId } = await access(sessions, request, true);
    await broker.disconnect(userId, workspaceId);
    response.json(disconnectBlueskyResponseSchema.parse({ disconnected: true }));
  });
  router.post("/bluesky/posts", async (request, response) => {
    const { userId, workspaceId } = await access(sessions, request, true);
    const { posts, imageNodeId } = publishBlueskyThreadRequestSchema.parse(request.body);
    let image: { mimeType: string; content: Buffer } | undefined;
    if (imageNodeId) {
      try {
        const stored = await images.read(workspaceId, imageNodeId);
        image = await prepareBlueskyImage(
          stored.mimeType,
          await readFile(stored.absolutePath),
        );
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 404) throw error;
      }
    }
    response.json(publishBlueskyThreadResponseSchema.parse(
      await broker.publish(userId, workspaceId, posts, image),
    ));
  });
  return router;
}

function access(sessions: SessionService, request: Request, write: boolean) {
  return requireWorkspaceAccess(sessions, request,
    (request.params as Record<string, string | undefined>).workspaceId, write);
}
