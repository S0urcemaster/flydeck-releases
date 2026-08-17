import { describe, expect, it } from "vitest";

import {
  appComponentNames,
  componentManifest,
  getComponentAncestors,
  getComponentDepth,
} from "./componentManifest";

const componentModules = import.meta.glob([
  "../components/**/*.tsx",
  "../modules/**/*.tsx",
]);
const componentSourceModules = import.meta.glob([
  "../components/**/*.tsx",
  "../modules/**/*.tsx",
], {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const productionComponentSources = Object.keys(componentModules)
  .filter((source) => !source.endsWith(".test.tsx"))
  .map((source) => source.replace(/^\.\.\//, ""))
  .sort();

describe("application component manifest", () => {
  it("is the complete production component inventory", () => {
    const manifestSources = appComponentNames
      .map((name) => componentManifest[name].source)
      .sort();

    expect(manifestSources).toEqual(productionComponentSources);
  });

  it("declares one valid acyclic path to Base for every component", () => {
    expect(componentManifest.Base.parent).toBeNull();

    for (const name of appComponentNames) {
      if (name === "Base") continue;
      const ancestors = getComponentAncestors(name);
      expect(ancestors.at(-1), name).toBe("Base");
      expect(new Set(ancestors).size, name).toBe(ancestors.length);
      expect(getComponentDepth(name), name).toBe(ancestors.length);
    }
  });

  it("renders the same direct parent that its public manifest declares", () => {
    for (const name of appComponentNames) {
      if (name === "Base") continue;
      const definition = componentManifest[name];
      const sourceKey = `../${definition.source}`;
      const source = componentSourceModules[sourceKey];

      expect(source, name).toBeTypeOf("string");
      expect(source, name).toContain(`<${definition.parent}`);
    }
  });

  it("records the current deep behavior and application families", () => {
    expect(getComponentAncestors("CompassApp")).toEqual([
      "AppView",
      "Base",
    ]);
    expect(getComponentAncestors("CompactButton")).toEqual([
      "Button",
      "Base",
    ]);
    expect(getComponentAncestors("FormRow")).toEqual([
      "Block",
      "Base",
    ]);
    expect(getComponentAncestors("DataTree")).toEqual([
      "DataBrowser",
      "TreeBrowser",
      "Base",
    ]);
    expect(getComponentAncestors("SideModuleButton")).toEqual([
      "SymbolButton",
      "Button",
      "Base",
    ]);
    expect(getComponentAncestors("DeleteButton")).toEqual([
      "Button",
      "Base",
    ]);
    expect(getComponentAncestors("ListControlListSizeButton")).toEqual([
      "CycleButton",
      "PressButton",
      "Button",
      "Base",
    ]);
    expect(getComponentAncestors("ShiftButton")).toEqual([
      "LongPressButton",
      "Button",
      "Base",
    ]);
  });

  it("keeps editable visual defaults in generated properties only", () => {
    const visualProperties = [
      "color",
      "background",
      "border",
      "padding",
      "margin",
      "width",
      "height",
      "fontSize",
    ];

    for (const name of appComponentNames) {
      if (name === "Base") continue;
      const source = componentSourceModules[`../${componentManifest[name].source}`];
      const functionStart = source.indexOf(`export function ${name}`);
      const bodyStart = source.indexOf(") {", functionStart);
      expect(functionStart, name).toBeGreaterThanOrEqual(0);
      expect(bodyStart, name).toBeGreaterThan(functionStart);
      const parameters = source.slice(functionStart, bodyStart);
      for (const property of visualProperties) {
        expect(parameters, `${name}.${property}`).not.toMatch(
          new RegExp(`\\b${property}\\s*=\\s*["']`),
        );
      }
    }
  });
});
