import express, { type ErrorRequestHandler } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { RelayError } from "../shared/contracts.js";
import type { RelayConfig } from "./config.js";
import type { RelayReader } from "./RelayStore.js";

export function createApp(config: RelayConfig, relay: RelayReader) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.set({
      "Content-Security-Policy": [
        "default-src 'self'",
        "base-uri 'none'",
        "connect-src 'self'",
        "font-src 'self'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "img-src 'self' data:",
        "object-src 'none'",
        "script-src 'self'",
        "style-src 'self'",
      ].join("; "),
      "Cross-Origin-Resource-Policy": "same-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    next();
  });

  app.get("/api/health/live", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.get("/api/health/ready", async (_request, response) => {
    const ready = await relay.isReady();
    response.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
  });
  app.get("/api/site", async (_request, response) => {
    const site = await relay.loadSite();
    if (!site) {
      response.status(404).json({
        error: "PUBLICATION_NOT_FOUND",
        message: "The configured publication root is unavailable.",
      } satisfies RelayError);
      return;
    }
    response.setHeader(
      "Cache-Control",
      `public, max-age=${config.publicCacheSeconds}, must-revalidate`,
    );
    response.json(site);
  });
  app.get("/api/nodes/:nodeId", async (request, response) => {
    const page = await relay.loadNode(request.params.nodeId);
    if (!page) {
      response.status(404).json({
        error: "NODE_NOT_FOUND",
        message: "The node is not part of this publication.",
      } satisfies RelayError);
      return;
    }
    response.setHeader(
      "Cache-Control",
      `public, max-age=${config.publicCacheSeconds}, must-revalidate`,
    );
    response.json(page);
  });
  app.get("/api/images/:nodeId", async (request, response) => {
    const image = await relay.readImage(request.params.nodeId);
    if (!image) {
      response.status(404).json({
        error: "IMAGE_NOT_FOUND",
        message: "The image is not part of this publication.",
      } satisfies RelayError);
      return;
    }
    response.set({
      "Cache-Control": `public, max-age=${config.publicCacheSeconds}, must-revalidate`,
      "Content-Length": String(image.byte_size),
      "Content-Type": image.mime_type,
      "Last-Modified": image.updated_at.toUTCString(),
    });
    response.sendFile(image.absolutePath);
  });

  app.use(express.static(config.frontendDist, {
    index: false,
    immutable: true,
    maxAge: "1y",
  }));
  app.use(async (request, response, next) => {
    if (request.method !== "GET" || !request.accepts("html")) {
      next();
      return;
    }
    response.setHeader("Cache-Control", "no-cache");
    response.type("html").send(
      await readFile(path.join(config.frontendDist, "index.html"), "utf8"),
    );
  });
  app.use((_request, response) => {
    response.status(404).json({
      error: "NOT_FOUND",
      message: "Endpoint was not found.",
    } satisfies RelayError);
  });
  app.use(((error, _request, response, _next) => {
    console.error("Relay One request failed", error);
    response.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Relay One could not complete the request.",
    } satisfies RelayError);
  }) as ErrorRequestHandler);
  return app;
}
