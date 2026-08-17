import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ListControlListSizeButton,
  nextListControlListSize,
} from "./ListControlListSizeButton";

describe("ListControlListSizeButton", () => {
  it("renders controlled page state", () => {
    const markup = renderToStaticMarkup(
      <ListControlListSizeButton
        activeColor="COLOR_ACCENT_TWO"
        pageSize={7}
        onPageSizeChange={() => undefined}
      />,
    );
    expect(markup).toContain('data-component-name="ListControlListSizeButton"');
    expect(markup).not.toContain('aria-pressed="true"');
    expect(markup).not.toContain('background:var(--color-accent-two)');
    expect(markup).toContain(">M</span>");
    expect(markup).toContain(">L X S</small>");
    expect(markup).toContain(
      'aria-label="List size M (7 items); change to L (10 items)"',
    );
  });

  it("cycles list sizes", () => {
    expect(nextListControlListSize(4)).toBe(7);
    expect(nextListControlListSize(7)).toBe(10);
    expect(nextListControlListSize(10)).toBe(15);
    expect(nextListControlListSize(15)).toBe(4);
  });
});
