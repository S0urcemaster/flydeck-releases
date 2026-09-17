import { Router, type Request } from "express";
import { schedulerPlanDtoSchema, schedulerSnapshotDtoSchema, updateSchedulerPlanRequestSchema } from "@flydeck/shared/v2";
import type { SessionService } from "../auth/SessionService.js";
import { requireWorkspaceAccess } from "../auth/workspaceAuthorization.js";
import type { SchedulerPlanService } from "./SchedulerPlanService.js";

export function createSchedulerRouter(sessions: SessionService, service: SchedulerPlanService) {
  const router = Router({ mergeParams: true });
  router.get("/", async (request, response) => {
    const workspaceId = await access(sessions, request, false);
    response.json(schedulerSnapshotDtoSchema.parse(await service.read(workspaceId)));
  });
  router.put("/", async (request, response) => {
    const workspaceId = await access(sessions, request, true);
    response.json(schedulerPlanDtoSchema.parse(await service.update(
      workspaceId, updateSchedulerPlanRequestSchema.parse(request.body),
    )));
  });
  return router;
}

async function access(sessions: SessionService, request: Request, write: boolean) {
  return (await requireWorkspaceAccess(
    sessions, request, String(request.params.workspaceId), write,
  )).workspaceId;
}
