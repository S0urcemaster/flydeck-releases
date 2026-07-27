import { describe, expect, it } from "vitest";
import { getAvailableSnippetName } from "./useSnippetController";

describe("getAvailableSnippetName", () => {
  it("keeps a free name and numbers an existing one", () => {
    const snippets = [{ name: "Status" }, { name: "Status 2" }];

    expect(getAvailableSnippetName("New", snippets)).toBe("New");
    expect(getAvailableSnippetName("Status", snippets)).toBe("Status 3");
  });
});
