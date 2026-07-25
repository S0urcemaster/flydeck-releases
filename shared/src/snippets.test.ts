import { describe, expect, it } from "vitest";
import { snippetSchema, updateSnippetRequestSchema } from "./snippets";
import { defaultSnippets } from "./snippetDefaults";

describe("snippet API contract", () => {
  it("accepts multiline snippet text", () => {
    expect(snippetSchema.parse({ name: "Test", text: "Zeile 1\nZeile 2" }).text).toContain("\n");
  });

  it("requires a non-empty name", () => {
    expect(snippetSchema.safeParse({ name: " ", text: "Text" }).success).toBe(false);
  });

  it("ships valid initial snippets", () => {
    expect(defaultSnippets.every((snippet) => snippetSchema.safeParse(snippet).success)).toBe(true);
  });

  it("only permits changing text through the update contract", () => {
    expect(updateSnippetRequestSchema.parse({ name: "Neuer Name", text: "Neu" })).toEqual({ text: "Neu" });
  });
});
