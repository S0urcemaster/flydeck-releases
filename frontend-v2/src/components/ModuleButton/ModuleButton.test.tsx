import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModuleButton } from "./ModuleButton";

describe("ModuleButton", () => {
  it("renders a character symbol before its label", () => {
    const markup = renderToStaticMarkup(
      <ModuleButton symbol="◆">DATA</ModuleButton>,
    );

    expect(markup.indexOf("◆")).toBeLessThan(markup.indexOf("DATA"));
    expect(markup).toContain('aria-hidden="true"');
  });

  it("accepts an editable Base height", () => {
    const markup = renderToStaticMarkup(
      <ModuleButton symbol="◆" height="48px">DATA</ModuleButton>,
    );

    expect(markup).toContain("height:48px");
  });
});
