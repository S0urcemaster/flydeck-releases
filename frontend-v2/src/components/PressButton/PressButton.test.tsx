import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PressButton } from "./PressButton";

describe("PressButton", () => {
  it("owns press activation as a distinct button component", () => {
    const markup = renderToStaticMarkup(<PressButton>Open view</PressButton>);

    expect(markup).toContain('data-component-name="PressButton"');
    expect(markup).toContain('type="button"');
  });
});
