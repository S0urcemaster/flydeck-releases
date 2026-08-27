import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  canResetSelection,
  createSettingsTree,
  findSettingsSelection,
  resetSettingsSelection,
  SettingsModule,
  updateCheckedSetting,
} from "./SettingsModule";
import { defaultThemeConfiguration } from "../../themes/themeConfiguration";

describe("SettingsModule", () => {
  it("composes the shared Module surface", () => {
    const markup = renderToStaticMarkup(
      <SettingsModule
        configuration={defaultThemeConfiguration}
        padding="SPACE_SM"
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Settings module"');
    expect(markup).toContain('aria-label="Settings configuration"');
    expect(markup).toContain("Flydeck V2");
    expect(markup).toContain("Flydeck V1");
    expect(markup).toContain("Greyscale");
    expect(markup).toContain('aria-label="List controls for Flydeck V2"');
    expect(markup).toContain('aria-label="Deselect Flydeck V2 for actions"');
    expect(markup).not.toContain('data-component-name="ListControlListSizeButton"');
    expect(markup).toContain(">RESET</button>");
    expect(markup).toContain(">SAVE</button>");
  });

  it("groups themes and global accessibility settings", () => {
    const tree = createSettingsTree(defaultThemeConfiguration);

    expect(tree.map(({ label }) => label)).toEqual([
      "Themes",
      "Global",
    ]);
    expect(tree[0].children.map(({ label }) => label)).toEqual([
      "Flydeck V2",
      "Flydeck V1",
      "Greyscale",
    ]);
    expect(tree[0].children[0].children[0].label).toBe("--app-inset");
    expect(tree[0].children[0].children.some(({ label }) => label === "--item-color"))
      .toBe(true);
    expect(tree[1].children[0].label).toBe("Accessibility");
    expect(tree[1].children[0].children[0].label).toBe("Capital letters");
    expect(tree[1].children[0].children[0].contentEditable).toBe(true);
  });

  it("resets either the selected value or every value in a selected theme", () => {
    const configuration = structuredClone(defaultThemeConfiguration);
    const theme = configuration.themes[0];
    theme.variables[0].value = "changed-one";
    theme.variables[1].value = "changed-two";
    const variableSelection = findSettingsSelection(configuration, [
      "settings:themes",
      `theme:${theme.id}`,
      `theme:${theme.id}:variable:${theme.variables[0].name}`,
    ]);
    const themeSelection = findSettingsSelection(configuration, [
      "settings:themes",
      `theme:${theme.id}`,
    ]);

    expect(canResetSelection(configuration, variableSelection)).toBe(true);
    expect(canResetSelection(configuration, themeSelection)).toBe(true);
    const variableReset = resetSettingsSelection(configuration, variableSelection!);
    expect(variableReset.themes[0].variables[0].value)
      .toBe(defaultThemeConfiguration.themes[0].variables[0].value);
    expect(variableReset.themes[0].variables[1].value).toBe("changed-two");
    const themeReset = resetSettingsSelection(configuration, themeSelection!);
    expect(themeReset.themes[0].variables.map(({ value }) => value))
      .toEqual(defaultThemeConfiguration.themes[0].variables.map(({ value }) => value));
  });

  it("selects one theme and updates the boolean setting in the draft", () => {
    const configuration = structuredClone(defaultThemeConfiguration);
    const selected = updateCheckedSetting(configuration, {
      kind: "theme",
      themeId: "greyscale",
    }, true);

    expect(selected.themes.filter(({ enabled }) => enabled).map(({ id }) => id))
      .toEqual(["greyscale"]);
    const enlarged = updateCheckedSetting(selected, {
      kind: "boolean",
      setting: "capitalLetters",
    }, true);
    expect(enlarged.global.accessibility.capitalLetters).toBe(true);
  });
});
