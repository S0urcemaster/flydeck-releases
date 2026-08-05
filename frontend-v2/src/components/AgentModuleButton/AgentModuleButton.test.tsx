import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AgentModuleButton } from "./AgentModuleButton";

describe("AgentModuleButton", () => {
  it("owns its label and character", () => {
    const markup = renderToStaticMarkup(<AgentModuleButton symbol="●" />);
    expect(markup).toContain("●");
    expect(markup).toContain("AGNT");
  });
});
