import { Router, type Request } from "express";
import { z } from "zod";
import type { SessionService } from "../auth/SessionService.js";
import { requireWorkspaceAccess } from "../auth/workspaceAuthorization.js";
import type { ChatService } from "./ChatService.js";

const uuidSchema = z.uuid();
const startRunSchema = z.object({
  prompt: z.string().trim().min(1).max(100_000),
  requestId: z.uuid(),
  effort: z.enum(["FAST", "MEDI", "DEEP"]).default("FAST"),
  modelTier: z.enum(["ECON", "MEDI", "HIGH"]).default("ECON"),
  contextConversationIds: z.array(z.uuid()).max(32).default([]),
});

export function createChatRouter(sessions: SessionService, service: ChatService) {
  const router = Router({ mergeParams: true });

  router.get("/:conversationId", async (request, response) => {
    const { workspaceId } = await access(sessions, request, false);
    const conversationId = uuidSchema.parse(request.params.conversationId);
    response.json(await service.store.getSnapshot(workspaceId, conversationId));
  });

  router.post("/:conversationId/runs", async (request, response) => {
    const { workspaceId } = await access(sessions, request, true);
    const conversationId = uuidSchema.parse(request.params.conversationId);
    const input = startRunSchema.parse(request.body);
    response.status(202).json(await service.start(
      workspaceId,
      conversationId,
      input.prompt,
      input.requestId,
      input.effort,
      input.modelTier,
      input.contextConversationIds,
    ));
  });

  router.post("/:conversationId/runs/:runId/cancel", async (request, response) => {
    const { workspaceId } = await access(sessions, request, true);
    const conversationId = uuidSchema.parse(request.params.conversationId);
    const runId = uuidSchema.parse(request.params.runId);
    await service.cancel(workspaceId, conversationId, runId);
    response.json({ id: runId, status: "cancelled" });
  });

  router.get("/:conversationId/events", async (request, response) => {
    const { workspaceId } = await access(sessions, request, false);
    const conversationId = uuidSchema.parse(request.params.conversationId);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    const send = (snapshot: unknown) => {
      response.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
    };
    const unsubscribe = await service.subscribe(workspaceId, conversationId, send);
    const heartbeat = setInterval(() => response.write(": keepalive\n\n"), 15_000);
    request.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return router;
}

async function access(sessions: SessionService, request: Request, write: boolean) {
  return requireWorkspaceAccess(
    sessions,
    request,
    String(request.params.workspaceId),
    write,
  );
}
