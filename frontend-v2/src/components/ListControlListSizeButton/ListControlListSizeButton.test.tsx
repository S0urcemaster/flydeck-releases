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
        pageSize={5}
        onPageSizeChange={() => undefined}
      />,
    );
    expect(markup).toContain('data-component-name="ListControlListSizeButton"');
    expect(markup).toContain(">5</button>");
  });

  it("cycles list sizes", () => {
    expect(nextListControlListSize(3)).toBe(5);
    expect(nextListControlListSize(5)).toBe(9);
    expect(nextListControlListSize(9)).toBe(3);
  });
});
