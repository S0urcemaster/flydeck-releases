import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SideModuleButton } from "./SideModuleButton";

describe("SideModuleButton", () => {
  it("composes a symbol-only ModuleButton", () => {
    const markup = renderToStaticMarkup(
      <SideModuleButton symbol="?" width="44px" />,
    );

    expect(markup).toContain('data-component-name="SideModuleButton"');
    expect(markup).toContain("width:44px");
    expect(markup).toContain(">?</span>");
  });
});
