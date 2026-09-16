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
    expect(modulePanelItems).toEqual(["AGNT", "DATA", "LENS", "FUNC"]);
    expect(isValidElement(
      <ModulePanel
        activeItem="FUNC"
        moduleButtonProps={moduleButtonProps}
        onChange={() => undefined}
      />,
    )).toBe(true);
  });

  it("shows the Lens module with its own symbol", () => {
    const markup = renderToStaticMarkup(
      <ModulePanel
        activeItem="LENS"
        moduleButtonProps={moduleButtonProps}
        onChange={() => undefined}
      />,
    );

    const lensButton = markup.match(
      /<button[^>]*>.*?LENS.*?<\/button>/,
    )?.[0];
    expect(lensButton).toContain("lucide-focus");
    expect(lensButton).toContain(">LENS<");
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

  it("does not render AGNT for a restricted hosted account", () => {
    const markup = renderToStaticMarkup(
      <ModulePanel
        activeItem="DATA"
        agentEnabled={false}
        moduleButtonProps={moduleButtonProps}
        onChange={() => undefined}
      />,
    );

    expect(markup).not.toContain("AGNT");
    expect(markup).toContain("DATA");
  });
});
