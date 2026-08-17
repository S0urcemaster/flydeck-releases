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
});
