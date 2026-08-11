import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Database } from "lucide-react";

import { ModuleButton } from "./ModuleButton";

describe("ModuleButton", () => {
  it("renders a symbol before its label", () => {
    const markup = renderToStaticMarkup(
      <ModuleButton symbol={<Database />}>DATA</ModuleButton>,
    );

    expect(markup.indexOf("<svg")).toBeLessThan(markup.indexOf("DATA"));
    expect(markup).toContain('aria-hidden="true"');
  });

  it("accepts an editable Base height", () => {
    const markup = renderToStaticMarkup(
      <ModuleButton symbol={<Database />} height="48px">DATA</ModuleButton>,
    );

    expect(markup).toContain("height:48px");
  });
});
