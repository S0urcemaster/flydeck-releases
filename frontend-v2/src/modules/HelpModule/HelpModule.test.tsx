import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HelpModule, renderBold, renderManual } from "./HelpModule";

describe("HelpModule", () => {
  it("renders the bundled manual inside the shared Module surface", () => {
    const markup = renderToStaticMarkup(<HelpModule />);

    expect(markup).toContain('aria-label="Help module"');
    expect(markup).toContain("Flydeck Manual");
    expect(markup).toContain("Maintenance");
  });

  it("renders headings, gaps, and text without parsing HTML", () => {
    const rendered = renderManual("# One\n## Two\n### Three\n\nText");

    expect(rendered).toHaveLength(5);
    expect(rendered.every(isValidElement)).toBe(true);
    expect(rendered.map((entry) => (
      isValidElement(entry) ? entry.type : null
    ))).toEqual(["h1", "h2", "h3", "div", "p"]);
  });

  it("renders paired asterisks as bold", () => {
    const bold = renderBold("A *bold* word");

    expect(bold).toHaveLength(3);
    expect(isValidElement(bold[1]) && bold[1].type).toBe("strong");
  });
});
