import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import { ZodError } from "zod";
import type { AppConfig } from "./config.js";
import { HttpError } from "./errors.js";
import { createDataRouter } from "./routes/data.js";
import { DataFileStore } from "./storage/dataFiles.js";
import { createSnippetRouter } from "./routes/snippets.js";
import { SnippetStore } from "./storage/snippetStore.js";
import { CronStore } from "./storage/cronStore.js";
import { createCronRouter } from "./routes/cron.js";
import { ChatService } from "./services/chatService.js";
import { createChatRouter } from "./routes/chat.js";
import { createAuthGuard } from "./auth.js";

export async function createApp(config: AppConfig, cronStore = new CronStore(config), chatService = new ChatService(config)) {
  const app = express();
  const store = new DataFileStore(config);
  const snippetStore = new SnippetStore(config);
  const auth = createAuthGuard(config);
  await store.initialize();
  await snippetStore.initialize();
  await cronStore.initialize();
  await chatService.initialize();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use((request, _response, next) => {
    console.info(`${request.method} ${request.path}`);
    next();
  });
  app.get(`${config.basePath}/api/health`, (_request, response) => response.json({ status: "ok" }));
  app.use(`${config.basePath}/api/auth`, auth.router);
  app.use(`${config.basePath}/api`, auth.requireUser);
  app.use(`${config.basePath}/api/data`, createDataRouter(store));
  app.use(`${config.basePath}/api/snippets`, createSnippetRouter(snippetStore));
  app.use(`${config.basePath}/api/cron`, createCronRouter(cronStore));
  app.use(`${config.basePath}/api/chat`, createChatRouter(chatService));

  if (config.frontendDist) {
    app.use(express.static(config.frontendDist));
    app.use((request, response, next) => {
      if (request.method !== "GET" || request.path.startsWith(`${config.basePath}/api/`)) {
        next();
        return;
      }
      response.sendFile(path.join(config.frontendDist!, "index.html"));
    });
  }

  app.use((_request, response) => {
    response.status(404).json({ error: "NOT_FOUND", message: "Endpoint was not found" });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "INVALID_REQUEST", message: error.issues[0]?.message ?? "Invalid request" });
      return;
    }
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.code, message: error.message });
      return;
    }
    console.error(error);
    response.status(500).json({ error: "INTERNAL_ERROR", message: "Internal server error" });
  };
  app.use(errorHandler);
  return app;
}
