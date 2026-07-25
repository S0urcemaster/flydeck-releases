import { Router } from "express";
import { createDataFileRequestSchema, dataFileNameSchema, writeDataEntryRequestSchema } from "@flydeck/shared/data";
import type { DataFileStore } from "../storage/dataFiles.js";

export function createDataRouter(store: DataFileStore) {
  const router = Router();

  router.get("/", async (_request, response) => {
    response.json(await store.list());
  });

  router.post("/", async (request, response) => {
    const input = createDataFileRequestSchema.parse(request.body);
    response.status(201).json(await store.create(input.name, input.title));
  });

  router.get("/:file", async (request, response) => {
    response.json(await store.read(dataFileNameSchema.parse(request.params.file)));
  });

  router.post("/:file/entries", async (request, response) => {
    const name = dataFileNameSchema.parse(request.params.file);
    const input = writeDataEntryRequestSchema.parse(request.body);
    response.status(201).json(await store.appendEntry(name, input.text));
  });

  router.put("/:file/entries/:line", async (request, response) => {
    const name = dataFileNameSchema.parse(request.params.file);
    const input = writeDataEntryRequestSchema.parse(request.body);
    response.json(await store.replaceEntry(name, Number(request.params.line), input.text));
  });

  router.delete("/:file/entries/:line", async (request, response) => {
    const name = dataFileNameSchema.parse(request.params.file);
    response.json(await store.removeEntry(name, Number(request.params.line)));
  });

  router.delete("/:file", async (request, response) => {
    response.json(await store.moveToTrash(dataFileNameSchema.parse(request.params.file)));
  });

  return router;
}
