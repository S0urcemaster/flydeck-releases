import { z } from "zod";

export const snippetSchema = z.object({
  name: z.string().trim().min(1).max(100),
  text: z.string().max(100_000),
});

export const createSnippetRequestSchema = snippetSchema;
export const updateSnippetRequestSchema = z.object({
  text: z.string().max(100_000),
});

export type Snippet = z.infer<typeof snippetSchema>;
export type CreateSnippetRequest = z.infer<typeof createSnippetRequestSchema>;
export type UpdateSnippetRequest = z.infer<typeof updateSnippetRequestSchema>;
