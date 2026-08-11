import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataTree } from "./DataTree";

describe("DataTree", () => {
  it("forwards its derived Base properties to DataBrowser", () => {
    const markup = renderToStaticMarkup(<DataTree padding="15px" rowGap="0" />);

    expect(markup).toContain('data-component-name="DataTree"');
    expect(markup).toContain("padding:15px");
  });
});
