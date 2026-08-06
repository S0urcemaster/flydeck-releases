import { describe, expect, it } from "vitest";

import {
  applyThemeConfiguration,
  defaultThemeConfiguration,
  isThemeConfiguration,
  isPersistedThemeConfiguration,
  normalizeThemeConfiguration,
  resolveThemeVariables,
} from "./themeConfiguration";

describe("theme configuration", () => {
  it("uses enabled themes as an ordered CSS fallthrough", () => {
    const configuration = structuredClone(defaultThemeConfiguration);
    configuration.themes[0].enabled = true;
    configuration.themes[1].enabled = true;
    configuration.themes[0].variables[0].value = "first";
    configuration.themes[1].variables[0].value = "last";

    expect(resolveThemeVariables(configuration)[configuration.themes[0].variables[0].name])
      .toBe("last");
  });

  it("applies only the resolved variables and clears previous overrides", () => {
    const removed: string[] = [];
    const applied: Record<string, string> = {};
    applyThemeConfiguration(defaultThemeConfiguration, {
      removeProperty: (name) => { removed.push(name); return ""; },
      setProperty: (name, value) => { applied[name] = value ?? ""; },
    });

    expect(removed).toContain("--color-page");
    expect(applied["--color-page"]).toMatch(/^#/);
    expect(applied["--button-width"]).toMatch(/px$/);
  });

  it("validates the complete available configuration", () => {
    expect(isThemeConfiguration(defaultThemeConfiguration)).toBe(true);
    expect(isThemeConfiguration({ themes: [] })).toBe(false);
  });

  it("adds Flydeck V1 without losing a stored two-theme configuration", () => {
    const legacy = structuredClone(defaultThemeConfiguration);
    legacy.themes = legacy.themes.filter(({ id }) => id !== "flydeck-v1");
    for (const theme of legacy.themes) {
      theme.variables = theme.variables.filter(({ name }) => name !== "--item-color");
      const space = theme.variables.find(({ name }) => name === "--space")!;
      theme.variables = theme.variables.filter(({ name }) => name !== "--space");
      theme.variables.push(
        { ...space, name: "--space-unit" },
        { ...space, name: "--space-xs" },
        { ...space, name: "--space-sm", value: "6px" },
        { ...space, name: "--space-md", value: "12px" },
        { ...space, name: "--space-lg", value: "18px" },
      );
    }
    legacy.themes[0].variables[0].value = "custom";

    expect(isThemeConfiguration(legacy)).toBe(false);
    expect(isPersistedThemeConfiguration(legacy)).toBe(true);
    const normalized = normalizeThemeConfiguration(legacy);
    expect(normalized.themes.map(({ label }) => label)).toEqual([
      "Flydeck V2",
      "Flydeck V1",
      "Greyscale",
    ]);
    expect(normalized.themes[0].variables[0].value).toBe("custom");
    expect(normalized.themes.every((theme) => (
      theme.variables.some(({ name }) => name === "--item-color")
    ))).toBe(true);
    expect(normalized.themes.every((theme) => (
      theme.variables.some(({ name, value }) => name === "--space" && value === "3px")
    ))).toBe(true);
  });
});
