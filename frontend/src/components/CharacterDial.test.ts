import { describe, expect, it } from "vitest";
import { getCharacterPages } from "./CharacterDial";

describe("character dial pages", () => {
  it("uses four complete pages with 19 characters in the small view", () => {
    const pages = getCharacterPages("small");
    expect(pages).toHaveLength(4);
    expect(pages.every((page) => page.length === 19)).toBe(true);
    expect(pages.flat().join("")).not.toMatch(/[A-Z]/);
  });

  it("adds one symbol page in medium and another in large", () => {
    expect(getCharacterPages("compact")).toHaveLength(5);
    expect(getCharacterPages("compact").every((page) => page.length === 21)).toBe(true);
    expect(getCharacterPages("large")).toHaveLength(6);
    expect(getCharacterPages("large").every((page) => page.length === 23)).toBe(true);
  });
});
