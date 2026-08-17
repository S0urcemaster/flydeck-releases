import { Router, type Request } from "express";
import { backupStatusDtoSchema } from "@flydeck/shared/v2";
import type { SessionService } from "../auth/SessionService.js";
import { requireWorkspaceAccess } from "../auth/workspaceAuthorization.js";
import type { BackupService } from "./BackupService.js";

export function createBackupRouter(
  sessions: SessionService,
  backups: BackupService,
) {
  const router = Router({ mergeParams: true });

  router.get("/", async (request, response) => {
    await requireWorkspaceAccess(
      sessions,
      request,
      workspaceIdParameter(request),
      false,
    );
    response.json(backupStatusDtoSchema.parse(await backups.status()));
  });

  router.post("/", async (request, response) => {
    await requireWorkspaceAccess(
      sessions,
      request,
      workspaceIdParameter(request),
      true,
    );
    response.status(202).json(backupStatusDtoSchema.parse(backups.start()));
  });

  return router;
}

function workspaceIdParameter(request: Request) {
  return (request.params as Record<string, string | undefined>).workspaceId;
}
