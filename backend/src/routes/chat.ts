import { Router } from "express";
import { z } from "zod";
import type { ChatService } from "../services/chatService.js";

const startRunSchema = z.object({
  prompt: z.string().trim().min(1).max(100_000),
  requestId: z.string().uuid(),
  effort: z.enum(["FAST", "MEDI", "DEEP"]).default("FAST"),
  modelTier: z.enum(["ECON", "MEDI", "HIGH"]).default("ECON"),
});

export function createChatRouter(service: ChatService) {
  const router = Router();

  router.get("/:conversation", (request, response) => {
    response.json(service.store.getSnapshot(request.params.conversation));
  });

  router.post("/:conversation/runs", (request, response) => {
    const input = startRunSchema.parse(request.body);
    response.status(202).json(service.start(request.params.conversation, input.prompt, input.requestId, input.effort, input.modelTier));
  });

  router.post("/:conversation/runs/:run/cancel", (request, response) => {
    service.cancel(request.params.conversation, request.params.run);
    response.json({ id: request.params.run, status: "cancelled" });
  });

  router.get("/:conversation/events", (request, response) => {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    const send = (snapshot: unknown) => response.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
    const unsubscribe = service.subscribe(request.params.conversation, send);
    const heartbeat = setInterval(() => response.write(": keepalive\n\n"), 15_000);
    request.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return router;
}
