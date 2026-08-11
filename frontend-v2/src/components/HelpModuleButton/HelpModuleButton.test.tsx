import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HelpModuleButton } from "./HelpModuleButton";

describe("HelpModuleButton", () => {
  it("renders its icon without a text label", () => {
    const markup = renderToStaticMarkup(<HelpModuleButton symbol="?" />);
    expect(markup).toContain("<svg");
    expect(markup).not.toContain(">HELP<");
  });
});
