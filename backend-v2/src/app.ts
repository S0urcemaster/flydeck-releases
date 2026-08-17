import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import {
  loginRequestSchema,
  logoutResponseSchema,
  sessionDtoSchema,
  workspaceListDtoSchema,
} from "@flydeck/shared/v2";
import type { AppConfig } from "./config.js";
import { BackupService } from "./backup/BackupService.js";
import { createBackupRouter } from "./backup/backupRouter.js";
import { SessionService, sessionCookieName } from "./auth/SessionService.js";
import { CronService } from "./cron/CronService.js";
import { createCronRouter } from "./cron/cronRouter.js";
import type { Database } from "./db/database.js";
import { errorHandler } from "./http/errorHandler.js";
import { HttpError } from "./http/HttpError.js";
import { requestContext } from "./http/requestContext.js";
import { TreeService } from "./tree/TreeService.js";
import { createTreeRouter } from "./tree/treeRouter.js";

export function createApp(config: AppConfig, database: Database) {
  const app = express();
  const backups = new BackupService(config);
  const sessions = new SessionService(database, config);
  const cron = new CronService(database);
  const trees = new TreeService(database);
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);
  app.use(requestContext);
  app.use((_request, response, next) => {
    response.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    });
    next();
  });
  app.use(express.json({ limit: "128kb" }));

  const apiPath = `${config.basePath}/api/v2`;
  app.get(`${apiPath}/health/live`, (_request, response) => {
    response.json({ status: "ok" });
  });
  app.get(`${apiPath}/health/ready`, async (_request, response) => {
    try {
      await database.query("SELECT 1");
      response.json({ status: "ready" });
    } catch {
      response.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "PostgreSQL is unavailable",
        requestId: String(response.locals.requestId),
      });
    }
  });
  app.get(`${apiPath}/auth/session`, async (request, response) => {
    response.json(await sessions.read(request));
  });
  app.post(`${apiPath}/auth/login`, async (request, response) => {
    const input = loginRequestSchema.parse(request.body);
    const result = await sessions.login(input.loginName, input.password);
    response.cookie(sessionCookieName, result.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: config.authSecureCookie,
      path: `${apiPath}/`,
      maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1_000,
    });
    response.json(sessionDtoSchema.parse(result.session));
  });
  app.post(`${apiPath}/auth/logout`, async (request, response) => {
    await sessions.logout(request);
    response.clearCookie(sessionCookieName, {
      httpOnly: true,
      sameSite: "strict",
      secure: config.authSecureCookie,
      path: `${apiPath}/`,
    });
    response.json(logoutResponseSchema.parse({ loggedOut: true }));
  });
  app.get(`${apiPath}/workspaces`, async (request, response) => {
    const session = await sessions.read(request);
    if (!session.authenticated) {
      throw new HttpError(401, "AUTH_REQUIRED", "Authentication is required");
    }
    response.json(workspaceListDtoSchema.parse(session.workspaces));
  });
  app.use(
    `${apiPath}/workspaces/:workspaceId/trees/data`,
    createTreeRouter(sessions, trees),
  );
  app.use(
    `${apiPath}/workspaces/:workspaceId/cron`,
    createCronRouter(sessions, cron),
  );
  app.use(
    `${apiPath}/workspaces/:workspaceId/backup`,
    createBackupRouter(sessions, backups),
  );

  if (config.frontendDist) {
    app.use(
      config.frontendBasePath,
      express.static(config.frontendDist, { index: "index.html" }),
    );
    app.use(config.frontendBasePath, (request, response, next) => {
      if (request.method !== "GET") {
        next();
        return;
      }
      response.setHeader("Cache-Control", "no-store");
      response.sendFile(path.join(config.frontendDist!, "index.html"));
    });
  }

  app.use((_request, response) => {
    response.status(404).json({
      error: "NOT_FOUND",
      message: "Endpoint was not found",
      requestId: String(response.locals.requestId),
    });
  });
  app.use(errorHandler as ErrorRequestHandler);
  return app;
}
