import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ColorDialer,
  createModeGradient,
  hslaToHex,
  parseHexColor,
} from "./ColorDialer";

describe("ColorDialer", () => {
  it("uses hue on the inner dial and hides the corner buttons", () => {
    const markup = renderToStaticMarkup(<ColorDialer value="#2468b280" />);

    expect(markup).toContain('aria-label="Color dialer"');
    expect(markup).toContain("conic-gradient");
    expect(markup).not.toContain(">SAT</span>");
    expect(markup).not.toContain('data-component-name="DialerButton"');
    expect(markup).toContain('data-component-name="DialerCenterButton"');
  });

  it("round-trips opaque and transparent hex colors", () => {
    const opaque = parseHexColor("#2468b2ff");
    const transparent = parseHexColor("#a52b2b40");

    expect(opaque && hslaToHex(opaque)).toBe("#2468b2ff");
    expect(transparent && hslaToHex(transparent)).toBe("#a52b2b40");
    expect(parseHexColor("not-a-color")).toBeNull();
  });

  it("shows transparency over a checkerboard", () => {
    const color = parseHexColor("#2468b280");

    expect(color && createModeGradient(color, "ALPHA"))
      .toContain("conic-gradient(#b8b8b8");
  });
});
