import { Router, json } from "express";
import type { FederationService } from "./FederationService.js";

export function createFederationPublicRouter(service: FederationService) {
  const router = Router();
  router.use(json({ limit: "32kb" }));
  router.post("/exchange-requests", async (request, response) => {
    await service.receive(request.body);
    response.status(202).json({ received: true });
  });
  router.post("/exchange-acceptances", async (request, response) => {
    await service.receiveAcceptance(request.body); response.status(202).json({ received: true });
  });
  return router;
}

export function createFederationAdminRouter(service: FederationService) {
  const router = Router();
  router.use(json({ limit: "32kb" }));
  router.get("/inbox", async (_request, response) => response.json(await service.inbox()));
  router.post("/requests", async (request, response) => response.status(202).json(
    await service.send(String(request.body?.origin ?? "")),
  ));
  router.post("/inbox/:id/accept", async (request, response) => response.json(
    await service.decide(request.params.id, true),
  ));
  router.post("/inbox/:id/reject", async (request, response) => response.json(
    await service.decide(request.params.id, false),
  ));
  router.delete("/inbox/:id", async (request, response) => {
    await service.removeRequest(request.params.id); response.status(204).end();
  });
  router.get("/connections", async (_request, response) => response.json(await service.connections()));
  router.delete("/connections/:id", async (request, response) => {
    await service.disconnect(request.params.id); response.status(204).end();
  });
  router.post("/connections/:id/sync", async (request, response) => {
    await service.syncIndex(request.params.id); response.json({ synchronized: true });
  });
  return router;
}
