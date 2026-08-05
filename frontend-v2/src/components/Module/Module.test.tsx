import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Module } from "./Module";

describe("Module", () => {
  it("renders a section with the Base style contract", () => {
    const markup = renderToStaticMarkup(
      <Module aria-label="Test module" padding="SPACE_MD">Content</Module>,
    );

    expect(markup).toContain("<section");
    expect(markup).toContain('aria-label="Test module"');
    expect(markup).toContain("padding:var(--space-md)");
    expect(markup).toContain(">Content</section>");
  });
});
