import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { SessionService } from "../auth/SessionService.js";
import type { JobService } from "./JobService.js";
import { errorHandler } from "../http/errorHandler.js";
import { requestContext } from "../http/requestContext.js";
import { createJobRouter } from "./jobRouter.js";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const jobId = "00000000-0000-4000-8000-000000000002";

describe("job account policy", () => {
  it("hides the AGNT endpoint from hosted accounts", async () => {
    const sessions = {
      read: vi.fn().mockResolvedValue({
        authenticated: true,
        loginRequired: true,
        user: {
          id: "00000000-0000-4000-8000-000000000003",
          displayName: "Guest",
          accountType: "guest",
        },
        capabilities: { agents: false, images: true, integrations: false, usageLogging: false },
        workspaces: [{ id: workspaceId, name: "Guest", role: "owner" }],
      }),
    } as unknown as SessionService;
    const service = {
      store: { getSnapshot: vi.fn() },
    } as unknown as JobService;
    const app = express();
    app.use(requestContext);
    app.use(`/workspaces/:workspaceId/jobs`, createJobRouter(sessions, service));
    app.use(errorHandler);

    const response = await request(app)
      .get(`/workspaces/${workspaceId}/jobs/${jobId}`)
      .expect(404);

    expect(response.body).toMatchObject({ error: "NOT_FOUND" });
    expect(service.store.getSnapshot).not.toHaveBeenCalled();
  });
});
