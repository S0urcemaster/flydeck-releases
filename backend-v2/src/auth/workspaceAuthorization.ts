import type { Request } from "express";
import { z } from "zod";
import type { SessionService } from "./SessionService.js";
import { HttpError } from "../http/HttpError.js";

const uuidSchema = z.uuid();

export async function requireWorkspaceAccess(
  sessions: SessionService,
  request: Request,
  workspaceIdValue: unknown,
  write: boolean,
) {
  const workspaceId = uuidSchema.parse(workspaceIdValue);
  const session = await sessions.read(request);
  if (!session.authenticated || !session.user) {
    throw new HttpError(401, "AUTH_REQUIRED", "Authentication is required");
  }
  const workspace = session.workspaces.find(({ id }) => id === workspaceId);
  if (!workspace) throw new HttpError(403, "FORBIDDEN", "Workspace access is forbidden");
  if (write && workspace.role === "viewer") {
    throw new HttpError(403, "FORBIDDEN", "Workspace is read-only for this user");
  }
  return { workspaceId, userId: session.user.id, role: workspace.role };
}
