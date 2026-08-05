import { describe, expect, it } from "vitest";

import generatedProperties from "./generated-component-properties.json";
import {
  parseComponentPropertiesConfig,
  resolveBaseProperties,
  resolveDerivedBaseProperties,
} from "./componentProperties";

describe("component properties config", () => {
  it("validates the generated config", () => {
    expect(parseComponentPropertiesConfig(generatedProperties)).not.toBeNull();
  });

  it("rejects non-zero dimensions without a CSS unit", () => {
    const invalid = structuredClone(generatedProperties);
    invalid.Button.base.height = "40";

    expect(parseComponentPropertiesConfig(invalid)).toBeNull();
  });

  it("keeps explicit CSS inheritance and values unchanged", () => {
    expect(resolveBaseProperties(
      {
        color: "inherit",
        background: "COLOR_APP",
        border: "inherit",
        padding: "SPACE_SM",
        margin: "0",
        width: "unset",
        height: "10rem",
      },
    )).toEqual({
      color: "inherit",
      background: "COLOR_APP",
      border: "inherit",
      padding: "SPACE_SM",
      margin: "0",
      width: "unset",
      height: "10rem",
    });
  });

  it("resolves inherited component values from its parent component", () => {
    expect(resolveDerivedBaseProperties(
      {
        color: "COLOR_TEXT",
        background: "COLOR_SURFACE",
        border: "1px solid red",
        padding: "SPACE_SM",
        margin: "0",
        width: "100%",
        height: "unset",
      },
      {
        color: "inherit",
        background: "transparent",
        border: "inherit",
        padding: "inherit",
        margin: "SPACE_MD",
        width: "inherit",
        height: "20rem",
      },
    )).toEqual({
      color: "COLOR_TEXT",
      background: "transparent",
      border: "1px solid red",
      padding: "SPACE_SM",
      margin: "SPACE_MD",
      width: "100%",
      height: "20rem",
    });
  });

  it("keeps the mode switch width as an individual component override", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);

    expect(properties?.Button.base.width).toBe("inherit");
    expect(properties?.BrowserItemModeButton.base.width).toBe("BUTTON_WIDTH");
  });

  it("inherits side-module width through Help and Config buttons", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);
    expect(properties).not.toBeNull();

    const moduleButtonBase = resolveDerivedBaseProperties(
      resolveBaseProperties(properties!.Button.base),
      properties!.ModuleButton.base,
    );
    const sideButtonBase = resolveDerivedBaseProperties(
      moduleButtonBase,
      properties!.SideModuleButton.base,
    );

    expect(sideButtonBase.width).toBe("BUTTON_WIDTH");
    expect(resolveDerivedBaseProperties(
      sideButtonBase,
      properties!.HelpModuleButton.base,
    ).width).toBe("BUTTON_WIDTH");
    expect(resolveDerivedBaseProperties(
      sideButtonBase,
      properties!.ConfigModuleButton.base,
    ).width).toBe("BUTTON_WIDTH");
  });
});
