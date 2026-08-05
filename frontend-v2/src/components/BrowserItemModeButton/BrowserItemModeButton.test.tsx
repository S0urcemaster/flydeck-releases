import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrowserItemModeButton } from "./BrowserItemModeButton";

describe("BrowserItemModeButton", () => {
  it("shows the target mode symbol", () => {
    const markup = renderToStaticMarkup(
      <BrowserItemModeButton mode="list" onModeChange={() => undefined} />,
    );

    expect(markup).toContain('aria-label="Show content"');
    expect(markup).toContain(">▤</button>");
  });
});
