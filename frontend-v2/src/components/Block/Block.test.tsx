import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Block } from "./Block";

describe("Block", () => {
  it("always occupies the complete app width", () => {
    const markup = renderToStaticMarkup(<Block>Row</Block>);

    expect(markup).toContain('data-component-name="Block"');
    expect(markup).toContain("width:100%");
    expect(markup).toContain("Row");
  });
});
