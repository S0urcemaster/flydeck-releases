import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HelpModuleButton } from "./HelpModuleButton";

describe("HelpModuleButton", () => {
  it("renders only its configured symbol", () => {
    const markup = renderToStaticMarkup(<HelpModuleButton symbol="?" />);
    expect(markup).toContain("?");
    expect(markup).not.toContain(">HELP<");
  });
});
