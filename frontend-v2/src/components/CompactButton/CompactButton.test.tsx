import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CompactButton } from "./CompactButton";

describe("CompactButton", () => {
  it("specializes Button without replacing its behavior", () => {
    const markup = renderToStaticMarkup(
      <CompactButton fontSize="12px" height="28px">Path</CompactButton>,
    );

    expect(markup).toContain('data-component-name="CompactButton"');
    expect(markup).toContain('data-size="compact"');
    expect(markup).toContain("font-size:12px");
    expect(markup).toContain("height:28px");
  });

  it("uses a thicker border when the item has children", () => {
    const markup = renderToStaticMarkup(
      <CompactButton border="BORDER_STANDARD" hasChildren>Branch</CompactButton>,
    );

    expect(markup).toContain('data-has-children="true"');
    expect(markup).toContain("border:2px solid var(--color-border)");
  });
});
