import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConfigModuleButton } from "./ConfigModuleButton";

describe("ConfigModuleButton", () => {
  it("renders its icon without a text label", () => {
    const markup = renderToStaticMarkup(<ConfigModuleButton symbol="⚙" />);
    expect(markup).toContain("<svg");
    expect(markup).not.toContain(">CONFIG<");
  });
});
