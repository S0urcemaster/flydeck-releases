import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConfigModuleButton } from "./ConfigModuleButton";

describe("ConfigModuleButton", () => {
  it("renders only its configured symbol", () => {
    const markup = renderToStaticMarkup(<ConfigModuleButton symbol="⚙" />);
    expect(markup).toContain("⚙");
    expect(markup).not.toContain(">CONFIG<");
  });
});
