import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ListControlButton } from "./ListControlButton";

describe("ListControlButton", () => {
  it("derives from Button", () => {
    const markup = renderToStaticMarkup(
      <ListControlButton width="52px">→</ListControlButton>,
    );

    expect(markup).toContain('data-component-name="ListControlButton"');
    expect(markup).toContain("width:52px");
  });
});
