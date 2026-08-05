import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrowserItemLabelButton } from "./BrowserItemLabelButton";

describe("BrowserItemLabelButton", () => {
  it("forwards complete Button Base properties", () => {
    const markup = renderToStaticMarkup(
      <BrowserItemLabelButton padding="7px">Rose</BrowserItemLabelButton>,
    );
    expect(markup).toContain("padding:7px");
    expect(markup).toContain('data-component-name="BrowserItemLabelButton"');
  });
});
