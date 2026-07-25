import type { CreateSnippetRequest, Snippet, UpdateSnippetRequest } from "@flydeck/shared";
import { requestJson } from "./request";

const snippetsApiPath = "/flydeck/api/snippets";

export const snippetsApi = {
  list: () => requestJson<Snippet[]>(snippetsApiPath),
  create: (input: CreateSnippetRequest) => requestJson<Snippet>(snippetsApiPath, { method: "POST", body: JSON.stringify(input) }),
  update: (originalName: string, input: UpdateSnippetRequest) =>
    requestJson<Snippet>(`${snippetsApiPath}/${encodeURIComponent(originalName)}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (name: string) => requestJson<{ name: string }>(`${snippetsApiPath}/${encodeURIComponent(name)}`, { method: "DELETE" }),
};
