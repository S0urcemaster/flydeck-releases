import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrowserItemModeButton } from "./BrowserItemModeButton";

describe("BrowserItemModeButton", () => {
  it("shows the current mode icon", () => {
    const listMarkup = renderToStaticMarkup(
      <BrowserItemModeButton mode="list" onModeChange={() => undefined} />,
    );
    const contentMarkup = renderToStaticMarkup(
      <BrowserItemModeButton mode="content" onModeChange={() => undefined} />,
    );

    expect(listMarkup).toContain('aria-label="Show content"');
    expect(listMarkup).toContain('aria-pressed="true"');
    expect(listMarkup).toContain('data-mode="list"');
    expect(listMarkup).toContain('data-component-name="BrowserItemModeButton"');
    expect(listMarkup).toContain("lucide-list");
    expect(contentMarkup).toContain('aria-label="Show list"');
    expect(contentMarkup).toContain('data-mode="content"');
    expect(contentMarkup).toContain("lucide-file-text");
  });
});
