import express, { type ErrorRequestHandler } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { RelayError, RelayNodeDescriptor } from "../shared/contracts.js";
import type { RelayConfig } from "./config.js";
import type { PublicNodeIdentity } from "./NodeIdentity.js";
import type { RelayReader } from "./RelayStore.js";
import { createIngestRouter } from "./ingest/router.js";
import type { PublicationIngestService } from "./ingest/PublicationIngestService.js";
import type { BlueskyOAuthBrokerApi } from "./oauth/BlueskyOAuthBroker.js";
import { createOAuthRouters } from "./oauth/router.js";
import type { FederationService } from "./federation/FederationService.js";
import { createFederationAdminRouter, createFederationPublicRouter } from "./federation/router.js";

export function createApp(
  config: RelayConfig,
  relay: RelayReader,
  ingest?: PublicationIngestService,
  oauthBroker?: BlueskyOAuthBrokerApi,
  nodeIdentity: PublicNodeIdentity | null = null,
  federation?: FederationService,
) {
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
        "script-src 'self' 'wasm-unsafe-eval'",
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
  if (oauthBroker && config.oauthBrokerSecret && config.oauthFlydeckReturnUrl) {
    const oauth = createOAuthRouters(oauthBroker, config.oauthBrokerSecret, config.oauthFlydeckReturnUrl);
    app.use("/oauth", oauth.publicRouter);
    app.use("/internal", oauth.internalRouter);
  }

  if (config.ingestSecret && ingest) {
    app.use("/ingest/v1", createIngestRouter(
      config.ingestSecret,
      config.maxAssetBytes,
      ingest,
    ));
  }
  if (config.capabilities.federation && federation) {
    app.use("/federation/v1", createFederationPublicRouter(federation));
    // The reverse proxy must expose this route only on the Tailnet listener.
    app.use("/admin/v1/federation", createFederationAdminRouter(federation));
  }

  app.get("/api/health/live", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.get("/api/health/ready", async (_request, response) => {
    const ready = await relay.isReady();
    response.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
  });
  app.get("/api/node", (_request, response) => {
    response.json({
      protocolVersion: 1,
      nodeId: config.nodeId,
      origin: config.publicOrigin,
      title: config.title,
      identity: nodeIdentity,
      capabilities: config.capabilities,
    } satisfies RelayNodeDescriptor);
  });
  if (config.capabilities.federation && federation) {
    app.get("/api/peers", async (_request, response) => response.json(await federation.publicPeers()));
    app.get("/api/peers/:peerId/site", async (request, response) => {
      const snapshot = await federation.peerSnapshot(request.params.peerId);
      if (!snapshot) return response.status(404).json({ error: "PEER_NOT_FOUND", message: "Peer snapshot was not found." });
      response.json(snapshot.site);
    });
    app.get("/api/peers/:peerId/nodes/:nodeId", async (request, response) => {
      const snapshot = await federation.peerSnapshot(request.params.peerId);
      const page = snapshot?.nodes.find(({ post }) => post.id === request.params.nodeId);
      if (!page) return response.status(404).json({ error: "NODE_NOT_FOUND", message: "Peer node was not found." });
      response.json(page);
    });
    app.get("/api/peers/:peerId/path", async (request, response) => {
      const parts = String(request.query.value ?? "").split("/").filter(Boolean);
      const page = await federation.loadPeerPath(request.params.peerId, parts);
      if (!page) return response.status(404).json({ error: "NODE_NOT_FOUND", message: "Peer path was not found." });
      response.json(page);
    });
    app.get("/api/peers/:peerId/assets/:sha256", async (request, response) => {
      const asset = await federation.peerAsset(request.params.peerId, request.params.sha256);
      if (!asset) return response.status(404).end();
      response.type(asset.mime_type).sendFile(asset.stored_path);
    });
  }
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
  app.get("/api/path", async (request, response) => {
    const value = typeof request.query.value === "string" ? request.query.value : "";
    const localIds = value.split("/").filter(Boolean);
    const page = localIds.length > 0 ? await relay.loadNodeByPath(localIds) : null;
    if (!page) {
      response.status(404).json({
        error: "NODE_NOT_FOUND",
        message: "The path is not part of this publication.",
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
  app.get("/assets/:sha256", async (request, response) => {
    const asset = await relay.readAsset?.(request.params.sha256);
    if (!asset) {
      response.status(404).json({
        error: "ASSET_NOT_FOUND",
        message: "The asset is not part of an active publication.",
      } satisfies RelayError);
      return;
    }
    response.set({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(asset.byte_size),
      "Content-Type": asset.mime_type,
      "Last-Modified": asset.updated_at.toUTCString(),
    });
    response.sendFile(asset.absolutePath);
  });
  app.use(async (request, response, next) => {
    if (request.method !== "GET" || !request.accepts("html")) {
      next();
      return;
    }
    const localIds = request.path.split("/").filter(Boolean).map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return "";
      }
    });
    if (localIds.length > 0 && (
      localIds.some((segment) => !segment)
      || !await relay.loadNodeByPath(localIds)
    )) {
      response.status(404);
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
  app.use(((error, request, response, _next) => {
    console.error(`${config.nodeId} request failed`, {
      method: request.method,
      path: request.originalUrl,
      error,
    });
    response.status(500).json({
      error: "INTERNAL_ERROR",
      message: `${config.title} could not complete the request.`,
    } satisfies RelayError);
  }) as ErrorRequestHandler);
  return app;
}
