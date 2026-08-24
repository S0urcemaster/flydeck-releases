import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pointer } from "./Pointer";

describe("Pointer", () => {
  it("owns its mode, position, line, dot, and shadow state", () => {
    const markup = renderToStaticMarkup(
      <Pointer
        lineWidth="0.2rem"
        mode="browse"
        position="37.5%"
        shadow
        tipRadius="0.5rem"
      />,
    );

    expect(markup).toContain('data-component-name="Pointer"');
    expect(markup).toContain('data-pointer-mode="browse"');
    expect(markup).toContain('data-shadow="true"');
    expect(markup).toContain("--pointer-position:37.5%");
    expect(markup).toContain("--pointer-line-width:0.2rem");
    expect(markup).toContain("--pointer-tip-radius:0.5rem");
    expect(markup).toContain("<span");
  });
});
