import { describe, expect, it } from "vitest";

import {
  defaultColorValues,
  greyscaleColorValues,
  parseColorValues,
  parseThemeConfig,
  renderColors,
} from "./colorDefinitions";
import { defaultLabTokenValues } from "../lab/tokenDefinitions";

describe("theme color definitions", () => {
  it("accepts a complete RGB color map", () => {
    const values = parseColorValues({
      ...defaultColorValues,
      accentTwo: "#AABBCC80",
    });

    expect(values?.accentTwo).toBe("#aabbcc80");
    expect(renderColors(values!)).toContain("--color-accent-two: #aabbcc80;");
  });

  it("rejects incomplete maps and non-RGB values", () => {
    expect(parseColorValues({})).toBeNull();
    expect(parseColorValues({
      ...defaultColorValues,
      accentTwo: "#aabbcc",
    })).toBeNull();
  });

  it("validates the complete theme catalog", () => {
    expect(parseThemeConfig({
      activeTheme: "greyscale",
      themes: {
        flydeck: defaultColorValues,
        greyscale: greyscaleColorValues,
      },
      tokens: {
        flydeck: defaultLabTokenValues,
        greyscale: defaultLabTokenValues,
      },
    })?.activeTheme).toBe("greyscale");
  });
});
