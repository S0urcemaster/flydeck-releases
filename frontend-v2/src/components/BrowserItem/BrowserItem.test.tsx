import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrowserItem } from "./BrowserItem";

describe("BrowserItem", () => {
  it("shows guarded delete only for the selected item", () => {
    const markup = renderToStaticMarkup(
      <BrowserItem
        enabled
        label="USER"
        selected
        activeColor="COLOR_ACCENT_TWO"
        background="ITEM_COLOR"
        buttonProps={{ width: "41px" }}
        deleteButtonProps={{ width: "53px" }}
        labelButtonProps={{ padding: "7px" }}
        onDelete={() => undefined}
        onEnabledChange={() => undefined}
      />,
    );
    expect(markup).not.toContain("Move USER up");
    expect(markup).not.toContain("Move USER down");
    expect(markup).toContain("Arm delete for USER");
    expect(markup).toContain("width:53px");
    expect(markup).toContain("padding:7px");
    expect(markup).toContain(
      'data-component-name="BrowserItemLabelButton"',
    );
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("background:var(--item-color)");
    expect(
      markup.match(/background:var\(--color-accent-two\)/g),
    ).toHaveLength(2);
  });

  it("shows a disabled mode switch only when an unavailable item is selected", () => {
    const markup = renderToStaticMarkup(
      <BrowserItem
        enabled
        label="Leaf"
        selected
        onDelete={() => undefined}
        onEnabledChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-component-name="BrowserItemModeButton"');
    expect(markup).toContain('aria-label="Show content"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("Arm delete for Leaf");

    const unselectedMarkup = renderToStaticMarkup(
      <BrowserItem
        enabled
        label="Leaf"
        onDelete={() => undefined}
        onEnabledChange={() => undefined}
      />,
    );
    expect(unselectedMarkup).not.toContain("BrowserItemModeButton");
  });

  it("keeps the mode switch available when content rendering is connected", () => {
    const markup = renderToStaticMarkup(
      <BrowserItem
        enabled
        label="Entry"
        selected
        onDelete={() => undefined}
        onEnabledChange={() => undefined}
        onModeChange={() => undefined}
      />,
    );
    const modeButton = markup.match(/<button[^>]+aria-label="Show content"[^>]*>/)?.[0];

    expect(modeButton).toBeTruthy();
    expect(modeButton).not.toContain("disabled");
  });
});
