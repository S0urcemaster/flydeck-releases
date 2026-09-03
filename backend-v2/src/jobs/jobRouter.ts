import { Router, type Request } from "express";
import {
  cancelJobRunResponseSchema,
  jobConfigDtoSchema,
  jobSnapshotDtoSchema,
  startJobRunRequestSchema,
  updateJobConfigRequestSchema,
} from "@flydeck/shared/v2";
import { z } from "zod";
import type { SessionService } from "../auth/SessionService.js";
import { requireWorkspaceAccess } from "../auth/workspaceAuthorization.js";
import type { JobService } from "./JobService.js";

const uuidSchema = z.uuid();

export function createJobRouter(sessions: SessionService, service: JobService) {
  const router = Router({ mergeParams: true });

  router.get("/:jobId", async (request, response) => {
    const { workspaceId } = await access(sessions, request, false);
    const jobId = uuidSchema.parse(request.params.jobId);
    response.json(jobSnapshotDtoSchema.parse(
      await service.store.getSnapshot(workspaceId, jobId),
    ));
  });

  router.put("/:jobId", async (request, response) => {
    const { workspaceId } = await access(sessions, request, true);
    const jobId = uuidSchema.parse(request.params.jobId);
    const input = updateJobConfigRequestSchema.parse(request.body);
    response.json(jobConfigDtoSchema.parse(
      await service.store.updateConfig(workspaceId, jobId, input),
    ));
  });

  router.post("/:jobId/runs", async (request, response) => {
    const { workspaceId } = await access(sessions, request, true);
    const jobId = uuidSchema.parse(request.params.jobId);
    const input = startJobRunRequestSchema.parse(request.body);
    response.status(202).json(await service.start(
      workspaceId, jobId, input.requestId, "manual", input.timeZone,
    ));
  });

  router.post("/:jobId/runs/:runId/cancel", async (request, response) => {
    const { workspaceId } = await access(sessions, request, true);
    const jobId = uuidSchema.parse(request.params.jobId);
    const runId = uuidSchema.parse(request.params.runId);
    await service.cancel(workspaceId, jobId, runId);
    response.json(cancelJobRunResponseSchema.parse({ id: runId, status: "cancelled" }));
  });

  router.get("/:jobId/events", async (request, response) => {
    const { workspaceId } = await access(sessions, request, false);
    const jobId = uuidSchema.parse(request.params.jobId);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    const unsubscribe = await service.subscribe(workspaceId, jobId, (snapshot) => {
      response.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
    });
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
