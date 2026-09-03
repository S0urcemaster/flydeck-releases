import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModulePanel, modulePanelItems } from "./ModulePanel";

const moduleButtonProps = {
  activeColor: "COLOR_ACCENT_ONE",
  height: "32px",
};

describe("ModulePanel", () => {
  it("defines the mobile menu order", () => {
    expect(modulePanelItems).toEqual(["AGNT", "DATA", "DATB", "FUNC"]);
    expect(isValidElement(
      <ModulePanel
        activeItem="FUNC"
        moduleButtonProps={moduleButtonProps}
        onChange={() => undefined}
      />,
    )).toBe(true);
  });

  it("shows only the active B/C/D slot label with its own symbol", () => {
    const markup = renderToStaticMarkup(
      <ModulePanel
        activeItem="DATC"
        moduleButtonProps={moduleButtonProps}
        onChange={() => undefined}
      />,
    );

    const cycleButton = markup.match(
      /<button[^>]*aria-label="Data navigation slot C"[^>]*>.*?<\/button>/,
    )?.[0];
    expect(cycleButton).toContain("database-zap");
    expect(cycleButton).toContain(">DATC<");
    expect(cycleButton).not.toContain(">DATB<");
    expect(cycleButton).not.toContain(">DATD<");
  });

  it("passes configured Button base properties to its controls", () => {
    const markup = renderToStaticMarkup(
      <ModulePanel
        activeItem="FUNC"
        moduleButtonProps={moduleButtonProps}
        onChange={() => undefined}
      />,
    );

    expect(markup.match(/height:32px/g)).toHaveLength(modulePanelItems.length);
  });
});
