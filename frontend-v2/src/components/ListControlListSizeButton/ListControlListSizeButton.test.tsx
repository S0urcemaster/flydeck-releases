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
        pageSize={6}
        onPageSizeChange={() => undefined}
      />,
    );
    expect(markup).toContain('data-component-name="ListControlListSizeButton"');
    expect(markup).not.toContain('aria-pressed="true"');
    expect(markup).not.toContain('background:var(--color-accent-two)');
    expect(markup).toContain(">M</button>");
    expect(markup).toContain(
      'aria-label="List size M (6 items); change to L (9 items)"',
    );
  });

  it("cycles list sizes", () => {
    expect(nextListControlListSize(3)).toBe(6);
    expect(nextListControlListSize(6)).toBe(9);
    expect(nextListControlListSize(9)).toBe(12);
    expect(nextListControlListSize(12)).toBe(3);
  });
});
