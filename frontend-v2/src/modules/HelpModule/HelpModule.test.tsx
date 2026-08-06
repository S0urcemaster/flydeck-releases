import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  HelpModule,
  renderInlineMarkdown,
  renderManual,
} from "./HelpModule";

describe("HelpModule", () => {
  it("renders the bundled manual inside the shared Module surface", () => {
    const markup = renderToStaticMarkup(<HelpModule />);

    expect(markup).toContain('aria-label="Help module"');
    expect(markup).toContain("Flydeck Manual");
    expect(markup).toContain("Maintenance");
  });

  it("renders headings, gaps, and text without parsing HTML", () => {
    const rendered = renderManual(
      "# One\n## Two\n### Three\n#### Four\n\n> Quote\nText",
    );

    expect(rendered).toHaveLength(7);
    expect(rendered.every(isValidElement)).toBe(true);
    expect(rendered.map((entry) => (
      isValidElement(entry) ? entry.type : null
    ))).toEqual(["h1", "h2", "h3", "h4", "div", "blockquote", "p"]);
  });

  it("renders standard Markdown bold and italic markers", () => {
    const inline = renderInlineMarkdown(
      "A **bold** and *italic* or __bold__ and _italic_ word",
    );

    expect(inline.filter((part) => isValidElement(part) && part.type === "strong"))
      .toHaveLength(2);
    expect(inline.filter((part) => isValidElement(part) && part.type === "em"))
      .toHaveLength(2);
    expect(renderToStaticMarkup(<>{inline}</>)).toContain(
      "A <strong>bold</strong> and <em>italic</em>",
    );
  });
});
