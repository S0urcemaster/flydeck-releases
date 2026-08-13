import { describe, expect, it } from "vitest";

import generatedProperties from "./generated-component-properties.json";
import { appComponentNames } from "./componentManifest";
import {
  type ComponentPropertiesConfig,
  type StoredBaseProperties,
  parseComponentPropertiesConfig,
  resolveBaseProperties,
  resolveDerivedBaseProperties,
} from "./componentProperties";

describe("component properties config", () => {
  it("validates the generated config", () => {
    const properties = parseComponentPropertiesConfig(generatedProperties);

    expect(properties).not.toBeNull();
    expect(properties).toEqual(generatedProperties);
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
    const properties = fixtureProperties((fixture) => {
      fixture.Button.base.width = "31px";
      fixture.BrowserItemModeButton.base.width = "53px";
    });

    expect(properties.Button.base.width).toBe("31px");
    expect(properties.BrowserItemModeButton.base.width).toBe("53px");
  });

  it("resolves press controls through their persisted intermediate contract", () => {
    const properties = fixtureProperties((fixture) => {
      fixture.Button.base.height = "41px";
      fixture.Button.base.width = "31px";
      fixture.PressButton.base.height = "inherit";
      fixture.PressButton.base.width = "inherit";
      fixture.ModuleButton.base.height = "inherit";
      fixture.ListControlListSizeButton.base.width = "52px";
      fixture.ListControlButton.base.width = "53px";
    });

    const buttonBase = resolveBaseProperties(properties.Button.base);
    const pressButtonBase = resolveDerivedBaseProperties(
      buttonBase,
      properties.PressButton.base,
    );

    expect(resolveDerivedBaseProperties(
      pressButtonBase,
      properties.ModuleButton.base,
    ).height).toBe("41px");
    expect(resolveDerivedBaseProperties(
      pressButtonBase,
      properties.ListControlListSizeButton.base,
    ).width).toBe("52px");
    expect(properties.ListControlButton.base.width).toBe("53px");
  });

  it("resolves CompactButton through Button", () => {
    const properties = fixtureProperties((fixture) => {
      fixture.Button.base.height = "41px";
      fixture.Button.base.padding = "3px";
      fixture.CompactButton.base.height = "29px";
      fixture.CompactButton.base.padding = "2px";
      fixture.CompactButton.fontSize = "0.73rem";
    });

    const compactBase = resolveDerivedBaseProperties(
      resolveBaseProperties(properties.Button.base),
      properties.CompactButton.base,
    );
    expect(compactBase).toMatchObject({
      height: "29px",
      padding: "2px",
    });
    expect(properties.CompactButton.fontSize).toBe("0.73rem");
  });

  it("resolves FormRow through the full-width Block contract", () => {
    const properties = fixtureProperties((fixture) => {
      fixture.Block.base.width = "73px";
      fixture.FormRow.base.width = "inherit";
    });

    const blockBase = resolveBaseProperties(properties.Block.base);
    const formRowBase = resolveDerivedBaseProperties(
      blockBase,
      properties.FormRow.base,
    );

    expect(blockBase.width).toBe("73px");
    expect(formRowBase.width).toBe("73px");
  });

  it("resolves every application view through AppView", () => {
    const applicationBase = fixtureBase("71px", "43px");
    const properties = fixtureProperties((fixture) => {
      fixture.AppView.base = applicationBase;
      fixture.CompassApp.base = inheritedBase();
      fixture.DeviceInfoView.base = inheritedBase();
      fixture.InventoryApp.base = inheritedBase();
      fixture.ShoppingListView.base = inheritedBase();
    });

    const appViewBase = resolveBaseProperties(properties.AppView.base);
    expect(appViewBase).toEqual(applicationBase);
    for (const name of [
      "CompassApp",
      "DeviceInfoView",
      "InventoryApp",
      "ShoppingListView",
    ] as const) {
      expect(resolveDerivedBaseProperties(
        appViewBase,
        properties[name].base,
      )).toEqual(appViewBase);
    }
  });

  it("resolves the complete tree and input specialization chains", () => {
    const properties = fixtureProperties((fixture) => {
      fixture.TreeBrowser.base = fixtureBase("72px", "44px");
      fixture.DataBrowser.base = inheritedBase();
      fixture.DataTree.base = inheritedBase();
      fixture.MemoryBrowser.base = inheritedBase();
      fixture.InputControl.base = fixtureBase("73px", "45px");
      fixture.ContentEditor.base = inheritedBase();
      fixture.RootInputControl.base = fixtureBase("74px", "46px");
      fixture.DataSourceInput.base = inheritedBase();
    });

    const treeBrowserBase = resolveBaseProperties(properties.TreeBrowser.base);
    const dataBrowserBase = resolveDerivedBaseProperties(
      treeBrowserBase,
      properties.DataBrowser.base,
    );
    expect(resolveDerivedBaseProperties(
      dataBrowserBase,
      properties.DataTree.base,
    )).toEqual(treeBrowserBase);
    expect(resolveDerivedBaseProperties(
      treeBrowserBase,
      properties.MemoryBrowser.base,
    )).toEqual(treeBrowserBase);

    const inputControlBase = resolveBaseProperties(properties.InputControl.base);
    expect(resolveDerivedBaseProperties(
      inputControlBase,
      properties.ContentEditor.base,
    )).toEqual(inputControlBase);

    const rootInputControlBase = resolveBaseProperties(
      properties.RootInputControl.base,
    );
    expect(resolveDerivedBaseProperties(
      rootInputControlBase,
      properties.DataSourceInput.base,
    )).toEqual(rootInputControlBase);
  });

  it("resolves both concrete dialers through Dialer", () => {
    const properties = fixtureProperties((fixture) => {
      fixture.Dialer.base = fixtureBase("75px", "47px");
      fixture.ColorDialer.base = inheritedBase();
      fixture.CronDialer.base = inheritedBase();
    });

    const dialerBase = resolveBaseProperties(properties.Dialer.base);
    expect(resolveDerivedBaseProperties(
      dialerBase,
      properties.ColorDialer.base,
    )).toEqual(dialerBase);
    expect(resolveDerivedBaseProperties(
      dialerBase,
      properties.CronDialer.base,
    )).toEqual(dialerBase);
  });

  it("inherits side-module width through Help and Config buttons", () => {
    const properties = fixtureProperties((fixture) => {
      fixture.Button.base.width = "31px";
      fixture.SymbolButton.base.width = "inherit";
      fixture.SideModuleButton.base.width = "55px";
      fixture.HelpModuleButton.base.width = "inherit";
      fixture.ConfigModuleButton.base.width = "inherit";
    });

    const symbolButtonBase = resolveDerivedBaseProperties(
      resolveBaseProperties(properties.Button.base),
      properties.SymbolButton.base,
    );
    const sideButtonBase = resolveDerivedBaseProperties(
      symbolButtonBase,
      properties.SideModuleButton.base,
    );

    expect(sideButtonBase.width).toBe("55px");
    expect(resolveDerivedBaseProperties(
      sideButtonBase,
      properties.HelpModuleButton.base,
    ).width).toBe("55px");
    expect(resolveDerivedBaseProperties(
      sideButtonBase,
      properties.ConfigModuleButton.base,
    ).width).toBe("55px");
  });
});

function fixtureProperties(
  configure: (fixture: ComponentPropertiesConfig) => void,
) {
  const fixture = structuredClone(
    generatedProperties,
  ) as ComponentPropertiesConfig;
  configure(fixture);
  const properties = parseComponentPropertiesConfig(fixture);
  if (!properties) throw new Error("The component-properties fixture is invalid.");
  return properties;
}

function inheritedBase(): StoredBaseProperties {
  return {
    color: "inherit",
    background: "inherit",
    border: "inherit",
    padding: "inherit",
    margin: "inherit",
    width: "inherit",
    height: "inherit",
  };
}

function fixtureBase(width: string, height: string): StoredBaseProperties {
  return {
    color: "#123456",
    background: "#abcdef",
    border: "2px solid #654321",
    padding: "3px",
    margin: "4px",
    width,
    height,
  };
}
