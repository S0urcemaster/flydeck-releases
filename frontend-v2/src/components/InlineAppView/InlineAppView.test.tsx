import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InlineAppView } from "./InlineAppView";

describe("InlineAppView", () => {
  it("owns an inline application surface", () => {
    const markup = renderToStaticMarkup(
      <InlineAppView padding="SPACE_XS">Inline content</InlineAppView>,
    );

    expect(markup).toContain('data-component-name="InlineAppView"');
    expect(markup).toContain("Inline content");
  });
});
