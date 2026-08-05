import { Router, type Request } from "express";
import {
  createCronTimerRequestSchema,
  cronTimerDtoSchema,
  cronTimerListDtoSchema,
  deleteCronTimerRequestSchema,
  updateCronTimerRequestSchema,
} from "@flydeck/shared/v2";
import { z } from "zod";
import type { SessionService } from "../auth/SessionService.js";
import { requireWorkspaceAccess } from "../auth/workspaceAuthorization.js";
import type { CronService } from "./CronService.js";

const uuidSchema = z.uuid();

export function createCronRouter(sessions: SessionService, cron: CronService) {
  const router = Router({ mergeParams: true });

  router.get("/", async (request, response) => {
    const { workspaceId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), false,
    );
    response.json(cronTimerListDtoSchema.parse(await cron.list(workspaceId)));
  });

  router.post("/", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const input = createCronTimerRequestSchema.parse(request.body);
    response.status(201).json(cronTimerDtoSchema.parse(
      await cron.create(workspaceId, userId, input),
    ));
  });

  router.put("/:timerId", async (request, response) => {
    const { workspaceId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const timerId = uuidSchema.parse(request.params.timerId);
    const input = updateCronTimerRequestSchema.parse(request.body);
    response.json(cronTimerDtoSchema.parse(
      await cron.updateDueAt(workspaceId, timerId, input),
    ));
  });

  router.delete("/:timerId", async (request, response) => {
    const { workspaceId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const timerId = uuidSchema.parse(request.params.timerId);
    const input = deleteCronTimerRequestSchema.parse(request.body);
    response.json(await cron.remove(workspaceId, timerId, input.expectedRevision));
  });

  return router;
}

function workspaceIdParameter(request: Request) {
  return (request.params as Record<string, string | undefined>).workspaceId;
}
