import { Router } from "express";
import { createSnippetRequestSchema, updateSnippetRequestSchema } from "@flydeck/shared/snippets";
import type { SnippetStore } from "../storage/snippetStore.js";

export function createSnippetRouter(store: SnippetStore) {
  const router = Router();
  router.get("/", async (_request, response) => response.json(await store.list()));
  router.post("/", async (request, response) => response.status(201).json(await store.create(createSnippetRequestSchema.parse(request.body))));
  router.put("/:name", async (request, response) => {
    const input = updateSnippetRequestSchema.parse(request.body);
    response.json(await store.update(request.params.name, input.text));
  });
  router.delete("/:name", async (request, response) => response.json(await store.remove(request.params.name)));
  return router;
}
