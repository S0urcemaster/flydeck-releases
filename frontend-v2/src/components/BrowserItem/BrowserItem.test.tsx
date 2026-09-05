import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrowserItem } from "./BrowserItem";

describe("BrowserItem", () => {
  it("renders only selection and label controls", () => {
    const markup = renderToStaticMarkup(
      <BrowserItem
        checked
        label="USER"
        itemNumber={1}
        selected
        activeColor="COLOR_ACCENT_TWO"
        background="ITEM_COLOR"
        buttonProps={{ width: "41px" }}
        labelButtonProps={{ padding: "7px" }}
        onCheckedChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-hidden="true">1</span>');
    expect(markup).toContain("padding:7px");
    expect(markup).toContain('data-component-name="BrowserItemLabelButton"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain("DeleteButton");
    expect(markup).not.toContain("BrowserItemModeButton");
  });

  it("applies an item color only to its two button surfaces", () => {
    const markup = renderToStaticMarkup(
      <BrowserItem
        checked={false}
        label="USER"
        itemNumber={1}
        background="hsl(210 65% 88%)"
        onCheckedChange={() => undefined}
      />,
    );

    expect(markup.match(/background:hsl\(210 65% 88%\)/g)).toHaveLength(2);
  });
});
