import { Router } from "express";
import { createCronTimerRequestSchema, updateCronTimerRequestSchema } from "@flydeck/shared/cron";
import type { CronStore } from "../storage/cronStore.js";

export function createCronRouter(store: CronStore) {
  const router = Router();
  router.get("/", async (_request, response) => response.json(await store.list()));
  router.post("/", async (request, response) => response.status(201).json(await store.create(createCronTimerRequestSchema.parse(request.body))));
  router.put("/:id", async (request, response) => {
    const input = updateCronTimerRequestSchema.parse(request.body);
    response.json(await store.updateDueAt(request.params.id, input.dueAt));
  });
  router.delete("/:id", async (request, response) => response.json(await store.remove(request.params.id)));
  return router;
}
