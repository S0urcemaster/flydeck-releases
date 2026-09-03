import express, { type RequestHandler } from "express";

import type { RelayError } from "../../shared/contracts.js";
import { AssetDigestMismatchError } from "./AssetStore.js";
import { requireIngestSecret } from "./auth.js";
import { parsePublicationManifest } from "./manifest.js";
import { IngestConflictError, PublicationIngestService } from "./PublicationIngestService.js";

export function createIngestRouter(
  secret: string,
  maxAssetBytes: number,
  service: PublicationIngestService,
): RequestHandler {
  const router = express.Router();
  router.use(requireIngestSecret(secret));

  router.put("/publications/:publicationId/versions/:version", express.json({ limit: "12mb" }),
    async (request, response) => {
      const manifest = parsePublicationManifest(request.body);
      if (manifest.publicationId !== request.params.publicationId
        || manifest.version !== parseVersion(request.params.version)) {
        response.status(400).json(error("INGEST_MANIFEST_MISMATCH", "Manifest identity differs from its URL."));
        return;
      }
      response.status(201).json(await service.stage(manifest));
    });

  router.put("/assets/:sha256", express.raw({ type: "*/*", limit: maxAssetBytes }),
    async (request, response) => {
      if (!Buffer.isBuffer(request.body)) {
        response.status(400).json(error("INGEST_INVALID_ASSET", "A binary request body is required."));
        return;
      }
      await service.putAsset(request.params.sha256, request.body);
      response.status(204).end();
    });

  router.post("/publications/:publicationId/versions/:version/activate",
    async (request, response) => {
      response.json(await service.activate(
        request.params.publicationId,
        parseVersion(request.params.version),
      ));
    });

  router.delete("/publications/:publicationId", async (request, response) => {
    const removed = await service.unpublish(request.params.publicationId);
    response.status(removed ? 204 : 404).end();
  });

  router.use(((caught, _request, response, next) => {
    if (caught instanceof IngestConflictError || caught instanceof AssetDigestMismatchError) {
      response.status(409).json(error("INGEST_CONFLICT", caught.message));
      return;
    }
    if (caught && typeof caught === "object" && "issues" in caught) {
      response.status(400).json(error("INGEST_INVALID_MANIFEST", "Publication manifest is invalid."));
      return;
    }
    next(caught);
  }) as express.ErrorRequestHandler);
  return router;
}

function parseVersion(value: string) {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version <= 0) {
    throw new IngestConflictError("Publication version must be a positive integer");
  }
  return version;
}

function error(code: string, message: string): RelayError {
  return { error: code, message };
}
