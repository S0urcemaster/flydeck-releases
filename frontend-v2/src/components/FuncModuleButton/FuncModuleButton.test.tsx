import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FuncModuleButton } from "./FuncModuleButton";

describe("FuncModuleButton", () => {
  it("owns its label and character", () => {
    const markup = renderToStaticMarkup(<FuncModuleButton symbol="⚙" />);
    expect(markup).toContain("⚙");
    expect(markup).toContain("FUNC");
  });
});
