import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DialSurface, getDialPosition } from "./DialSurface";

describe("DialSurface", () => {
  it("owns one circular pointer surface", () => {
    const markup = renderToStaticMarkup(
      <DialSurface layer="outer" aria-label="Outer dial" />,
    );

    expect(markup).toContain("<button");
    expect(markup).toContain('data-layer="outer"');
  });

  it("normalizes pointer position and radius around the center", () => {
    const rect = { left: 10, top: 20, width: 200, height: 200 };

    expect(getDialPosition(rect, 110, 20)).toEqual({
      x: 0.5,
      y: 0,
      radius: 1,
      angle: 0,
    });
    expect(getDialPosition(rect, 110, 120)).toEqual({
      x: 0.5,
      y: 0.5,
      radius: 0,
      angle: 90,
    });
  });

  it("projects an outward drag onto the circle edge", () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 };

    expect(getDialPosition(rect, 300, 100, true)).toEqual({
      x: 1,
      y: 0.5,
      radius: 1,
      angle: 90,
    });
  });
});
