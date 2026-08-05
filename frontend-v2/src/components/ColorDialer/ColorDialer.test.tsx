import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ColorDialer,
  colorFromDialAngles,
  createDetailGradient,
} from "./ColorDialer";

describe("ColorDialer", () => {
  it("specializes Dialer with two replaceable scale renderers", () => {
    const markup = renderToStaticMarkup(<ColorDialer />);

    expect(markup).toContain('aria-label="Color dialer"');
    expect(markup).toContain("conic-gradient");
    expect(markup).toContain("background:hsl(330 80% 50%)");
    expect(markup).toContain(">HUE</button>");
    expect(markup).toContain(">DETAIL</button>");
  });

  it("uses the inner angle as the center of the outer detail range", () => {
    expect(colorFromDialAngles(120, 180)).toBe("hsl(120 80% 50%)");
    expect(createDetailGradient(120)).toContain("hsl(90 80% 50%) 0deg");
    expect(createDetailGradient(120)).toContain("hsl(150 80% 50%) 360deg");
    expect(createDetailGradient(120)).not.toContain("from ");
  });
});
