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
        currentPage={2}
        pageSize={5}
        totalPages={3}
        onPageSizeChange={() => undefined}
      />,
    );
    expect(markup).toContain('data-component-name="ListControlListSizeButton"');
    expect(markup).toContain(">2/3</button>");
  });

  it("cycles list sizes", () => {
    expect(nextListControlListSize(3)).toBe(5);
    expect(nextListControlListSize(5)).toBe(10);
    expect(nextListControlListSize(10)).toBe(3);
  });
});
