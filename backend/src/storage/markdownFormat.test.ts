import { describe, expect, it } from "vitest";
import { createMarkdownData, dataMarker, parseMarkdownData, serializeMarkdownData } from "./markdownFormat.js";

describe("markdown data format", () => {
  it("round-trips header, metadata and entries", () => {
    const source = `# Ideen\n\nowner: flydon\n\n${dataMarker}\nAlpha\nBeta\n`;
    const parsed = parseMarkdownData(source);
    expect(parsed.title).toBe("Ideen");
    expect(parsed.metadata.owner).toBe("flydon");
    expect(parsed.entries).toEqual(["Alpha", "Beta"]);
    expect(serializeMarkdownData(parsed)).toBe(source);
  });

  it("creates an empty valid data file", () => {
    expect(parseMarkdownData(createMarkdownData("Notizen")).entries).toEqual([]);
  });

  it("rejects markdown without a data marker", () => {
    expect(() => parseMarkdownData("# Normale Notiz\n")).toThrow("Marker");
  });

  it("rejects missing titles and duplicate data markers", () => {
    expect(() => parseMarkdownData(`${dataMarker}\nEintrag\n`)).toThrow("title");
    expect(() => parseMarkdownData(`# Liste\n${dataMarker}\n${dataMarker}\n`)).toThrow("more than once");
  });
});
