import { describe, expect, it } from "vitest";
import { filterDataLines } from "./DataWorkspace";

describe("filterDataLines", () => {
  const lines = ["Alpha one", "beta two", "Alphabet soup"];

  it("filters case-insensitively and retains original line indexes", () => {
    expect(filterDataLines(lines, "ALPHA")).toEqual([
      { text: "Alpha one", index: 0 },
      { text: "Alphabet soup", index: 2 },
    ]);
  });

  it("returns every line for an empty search", () => {
    expect(filterDataLines(lines, " ")).toHaveLength(3);
  });
});
