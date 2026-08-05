import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModulePanel, modulePanelItems } from "./ModulePanel";

const moduleButtonProps = {
  AGNT: { activeColor: "COLOR_ACCENT_ONE", height: "32px", symbol: "●" },
  DATA: { activeColor: "COLOR_ACCENT_ONE", height: "32px", symbol: "◆" },
  FUNC: { activeColor: "COLOR_ACCENT_ONE", height: "32px", symbol: "⚙" },
  CRON: { activeColor: "COLOR_ACCENT_ONE", height: "32px", symbol: "◷" },
};

describe("ModulePanel", () => {
  it("defines the mobile menu order", () => {
    expect(modulePanelItems).toEqual(["AGNT", "DATA", "FUNC", "CRON"]);
    expect(isValidElement(ModulePanel({
      activeItem: "FUNC",
      moduleButtonProps,
      onChange: () => undefined,
    }))).toBe(true);
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
