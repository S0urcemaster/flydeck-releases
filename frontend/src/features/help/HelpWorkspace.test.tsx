import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { renderBold, renderManual } from "./HelpWorkspace";

describe("renderManual", () => {
  it("renders headings, gaps, and text without parsing HTML", () => {
    const rendered = renderManual("# One\n## Two\n### Three\n\nText");

    expect(rendered).toHaveLength(5);
    expect(rendered.every(isValidElement)).toBe(true);
    expect(rendered.map((entry) => entry.type)).toEqual(["h1", "h2", "h3", "div", "p"]);
  });

  it("renders paired asterisks as bold and preserves unmatched ones", () => {
    const bold = renderBold("A *bold* word");
    const unmatched = renderBold("A *plain word");

    expect(bold).toHaveLength(3);
    expect(isValidElement(bold[1]) && bold[1].type).toBe("strong");
    expect(unmatched).toEqual(["A *plain word"]);
  });
});
