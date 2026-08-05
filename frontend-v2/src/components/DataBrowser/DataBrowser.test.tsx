import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataBrowser } from "./DataBrowser";

describe("DataBrowser", () => {
  it("uses the neutral Data root without demo entries", () => {
    const markup = renderToStaticMarkup(<DataBrowser rowGap="0" />);

    expect(markup).toContain('data-component-name="DataBrowser"');
    expect(markup).toContain("Data");
    expect(markup).not.toContain("Documents");
  });
});
