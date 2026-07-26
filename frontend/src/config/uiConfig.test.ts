import { describe, expect, it } from "vitest";
import {
  defaultUiConfig,
  getCharacterDialCorners,
  getCharacterDialRightButtons,
  getDialerDefaultDwell,
  getDialerScaleSize,
  getPreferredKeyboard,
  getUiButtonHeight,
  getUiFontScale,
  normalizeUiConfig,
} from "./uiConfig";

describe("uiConfig", () => {
  it("accepts and preserves the canonical defaults", () => {
    expect(normalizeUiConfig(defaultUiConfig, false)).toBe(defaultUiConfig);
  });

  it("fills missing values while loading an older configuration", () => {
    const migrated = normalizeUiConfig("preferred-keyboard : mobile\ntheme : flydeck", true);

    expect(migrated).toContain("preferred-keyboard : mobile");
    expect(migrated).toContain("theme : FLYDECK");
    expect(migrated).toContain("dialerinput-dwell : 0.3");
  });

  it("rejects unknown and duplicate settings", () => {
    expect(normalizeUiConfig(`${defaultUiConfig}\nunknown-option : 1`, true)).toBeNull();
    expect(normalizeUiConfig("theme : flydeck\ntheme : greyscale", true)).toBeNull();
  });

  it("exposes typed UI preferences", () => {
    expect(getPreferredKeyboard(defaultUiConfig)).toBe("dialer");
    expect(getDialerDefaultDwell(defaultUiConfig)).toBe("0.3");
    expect(getDialerScaleSize(defaultUiConfig, "inner")).toBe(20);
    expect(getDialerScaleSize(defaultUiConfig, "outer")).toBe(30);
    expect(getCharacterDialCorners(defaultUiConfig)).toEqual({
      nw: "CURRENTLETTER",
      ne: "DWELL",
      sw: "DIALERSIZE",
      se: "SPACE",
    });
    expect(getCharacterDialRightButtons(defaultUiConfig)).toEqual([
      "BACKSPACE", "", "", "", "", "", "ENTER",
    ]);
    expect(getUiFontScale(defaultUiConfig, "ui-font-size")).toBe(1);
    expect(getUiButtonHeight(defaultUiConfig, "standard")).toBe(44);
    expect(getUiButtonHeight(defaultUiConfig, "compact")).toBe(40);
  });

  it("moves legacy right-button settings between configurable backspace and enter buttons", () => {
    const legacy = defaultUiConfig
      .replace("dialerinput-rightkey1 : BACKSPACE", "dialerinput-rightkey1 : TIME")
      .replace("dialerinput-rightkey6 :\n", "")
      .replace("dialerinput-rightkey7 : ENTER\n", "");
    const migrated = normalizeUiConfig(legacy, true);

    expect(migrated).not.toBeNull();
    expect(getCharacterDialRightButtons(migrated!)).toEqual([
      "BACKSPACE", "TIME", "", "", "", "", "ENTER",
    ]);
  });
});
