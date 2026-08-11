import { CircleHelp } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SymbolButton } from "./SymbolButton";

describe("SymbolButton", () => {
  it("positions its decorative symbol with CSS offsets", () => {
    const markup = renderToStaticMarkup(
      <SymbolButton
        symbol={<CircleHelp />}
        symbolLeft="-1px"
        symbolTop="2px"
      />,
    );

    expect(markup).toContain("left:-1px");
    expect(markup).toContain("top:2px");
    expect(markup).toContain('aria-hidden="true"');
  });
});
