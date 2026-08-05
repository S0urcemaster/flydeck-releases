import { describe, expect, it } from "vitest";

import {
  hexToRgb,
  hexToRgba,
  rgbaToHex,
  rgbToHex,
} from "./RgbColorField";

describe("lab RGB color conversion", () => {
  it("converts between hex and RGBA channels", () => {
    expect(hexToRgb("#2468b2ff")).toEqual({ r: 36, g: 104, b: 178 });
    expect(rgbToHex({ r: 36, g: 104, b: 178 })).toBe("#2468b2");
    expect(hexToRgba("#2468b280")).toEqual({ r: 36, g: 104, b: 178, a: 128 });
    expect(rgbaToHex({ r: 36, g: 104, b: 178, a: 128 })).toBe("#2468b280");
  });
});
