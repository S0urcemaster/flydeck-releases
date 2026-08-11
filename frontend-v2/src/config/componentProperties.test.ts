import { describe, expect, it } from "vitest";

import generatedProperties from "./generated-component-properties.json";
import { appComponentNames } from "./componentManifest";
import {
  parseComponentPropertiesConfig,
  resolveBaseProperties,
  resolveDerivedBaseProperties,
} from "./componentProperties";

describe("component properties config", () => {
  it("validates the generated config", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);

    expect(properties).not.toBeNull();
    expect(properties?.AppStatusLine).toMatchObject({
      error: false,
      fontSize: "0.84rem",
      base: { color: "inherit" },
    });
    expect(properties?.SymbolButton).toMatchObject({
      symbolTop: "2px",
      symbolLeft: "-1px",
    });
  });

  it("provides a persisted Base contract for every manifest component", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);
    expect(properties).not.toBeNull();

    for (const name of appComponentNames) {
      if (name === "Base") continue;
      expect(
        (properties as unknown as Record<string, { base?: unknown }>)[name]?.base,
        name,
      ).toBeTruthy();
    }
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

  it("resolves press controls through their persisted intermediate contract", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);
    expect(properties).not.toBeNull();

    const buttonBase = resolveBaseProperties(properties!.Button.base);
    const pressButtonBase = resolveDerivedBaseProperties(
      buttonBase,
      properties!.PressButton.base,
    );

    expect(resolveDerivedBaseProperties(
      pressButtonBase,
      properties!.ModuleButton.base,
    ).height).toBe("40px");
    expect(resolveDerivedBaseProperties(
      pressButtonBase,
      properties!.ListControlListSizeButton.base,
    ).width).toBe("BUTTON_WIDTH");
    expect(properties!.ListControlButton.base.width).toBe("BUTTON_WIDTH");
  });

  it("resolves CompactButton through Button", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);
    expect(properties).not.toBeNull();

    const compactBase = resolveDerivedBaseProperties(
      resolveBaseProperties(properties!.Button.base),
      properties!.CompactButton.base,
    );
    expect(compactBase).toMatchObject({
      height: "28px",
      padding: "0 SPACE_XS",
    });
    expect(properties!.CompactButton.fontSize).toBe("0.72rem");
  });

  it("resolves FormRow through the full-width Block contract", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);
    expect(properties).not.toBeNull();

    const blockBase = resolveBaseProperties(properties!.Block.base);
    const formRowBase = resolveDerivedBaseProperties(
      blockBase,
      properties!.FormRow.base,
    );

    expect(blockBase.width).toBe("100%");
    expect(formRowBase.width).toBe("100%");
  });

  it("resolves every application view through AppView", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);
    expect(properties).not.toBeNull();

    const appViewBase = resolveBaseProperties(properties!.AppView.base);
    expect(appViewBase).toMatchObject({
      background: "transparent",
      border: "0",
      padding: "0",
    });
    for (const name of [
      "CompassApp",
      "DeviceInfoView",
      "InventoryApp",
      "ShoppingListView",
    ] as const) {
      expect(resolveDerivedBaseProperties(
        appViewBase,
        properties![name].base,
      )).toEqual(appViewBase);
    }
  });

  it("resolves the complete tree and input specialization chains", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);
    expect(properties).not.toBeNull();

    const treeBrowserBase = resolveBaseProperties(properties!.TreeBrowser.base);
    const dataBrowserBase = resolveDerivedBaseProperties(
      treeBrowserBase,
      properties!.DataBrowser.base,
    );
    expect(resolveDerivedBaseProperties(
      dataBrowserBase,
      properties!.DataTree.base,
    )).toEqual(treeBrowserBase);
    expect(resolveDerivedBaseProperties(
      treeBrowserBase,
      properties!.MemoryBrowser.base,
    )).toEqual(treeBrowserBase);

    const inputControlBase = resolveBaseProperties(properties!.InputControl.base);
    expect(resolveDerivedBaseProperties(
      inputControlBase,
      properties!.ContentEditor.base,
    )).toEqual(inputControlBase);

    const rootInputControlBase = resolveBaseProperties(
      properties!.RootInputControl.base,
    );
    expect(resolveDerivedBaseProperties(
      rootInputControlBase,
      properties!.DataSourceInput.base,
    )).toEqual(rootInputControlBase);
  });

  it("resolves both concrete dialers through Dialer", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);
    expect(properties).not.toBeNull();

    const dialerBase = resolveBaseProperties(properties!.Dialer.base);
    expect(resolveDerivedBaseProperties(
      dialerBase,
      properties!.ColorDialer.base,
    )).toEqual(dialerBase);
    expect(resolveDerivedBaseProperties(
      dialerBase,
      properties!.CronDialer.base,
    )).toEqual(dialerBase);
  });

  it("inherits side-module width through Help and Config buttons", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);
    expect(properties).not.toBeNull();

    const symbolButtonBase = resolveDerivedBaseProperties(
      resolveBaseProperties(properties!.Button.base),
      properties!.SymbolButton.base,
    );
    const sideButtonBase = resolveDerivedBaseProperties(
      symbolButtonBase,
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
