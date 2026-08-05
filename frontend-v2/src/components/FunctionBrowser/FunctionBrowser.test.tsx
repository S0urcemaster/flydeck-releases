import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  FunctionBrowser,
  generateFunctionOutput,
  type FunctionData,
} from "./FunctionBrowser";
import type { TreeBrowserNode } from "../TreeBrowser";

describe("FunctionBrowser", () => {
  it("starts with Widgets, System, and User without rendering function results", () => {
    const markup = renderToStaticMarkup(<FunctionBrowser rowGap="0" />);

    expect(markup).toContain('data-component-name="FunctionBrowser"');
    expect(markup).toContain("Widgets");
    expect(markup).toContain("System");
    expect(markup).toContain("User");
    expect(markup).toContain("Enable Widgets");
    expect(markup).toContain("Enable System");
    expect(markup).toContain("Enable User");
    expect(markup).not.toContain('aria-label="DeviceInfo result"');
  });

  it("requires every parent visibility flag for generated output", () => {
    const nodes: TreeBrowserNode<FunctionData>[] = [{
      id: "widgets",
      label: "Widgets",
      enabled: false,
      contentVisible: false,
      data: { kind: "group", groupId: "widgets" },
      children: [{
        id: "compass",
        label: "Compass",
        enabled: true,
        contentVisible: false,
        data: { kind: "view-generator", viewId: "compass" },
        children: [{
          id: "category",
          label: "Mut",
          enabled: true,
          contentVisible: false,
          data: { kind: "category", category: "Mut" },
          children: [{
            id: "saying",
            label: "Vollständiger Spruch",
            enabled: true,
            contentVisible: true,
            data: {
              kind: "saying",
              saying: {
                id: 1,
                text: "Vollständiger Spruch",
                categories: ["Mut"],
                source: [],
                rating: 0,
              },
            },
            children: [],
          }],
        }],
      }],
    }];

    expect(generateFunctionOutput(nodes).categories).toEqual([]);
    nodes[0].enabled = true;
    const output = generateFunctionOutput(nodes);
    expect(output.compassActive).toBe(true);
    expect(output.categories[0]).toMatchObject({
      label: "Mut",
      sayings: [{ text: "Vollständiger Spruch" }],
    });
  });

  it("generates shopping output only through the complete active path", () => {
    const nodes: TreeBrowserNode<FunctionData>[] = [{
      id: "widgets",
      label: "Widgets",
      enabled: false,
      contentVisible: false,
      data: { kind: "group", groupId: "widgets" },
      children: [{
        id: "shopping-list",
        label: "ShoppingList",
        enabled: true,
        contentVisible: false,
        data: { kind: "view-generator", viewId: "shopping-list" },
        children: [{
          id: "bakery",
          label: "Backwaren",
          enabled: true,
          contentVisible: false,
          data: { kind: "shopping-category", category: "Backwaren" },
          children: [{
            id: "bread",
            label: "Brot",
            enabled: true,
            contentVisible: true,
            data: { kind: "shopping-item", label: "Brot" },
            children: [],
          }],
        }],
      }],
    }];

    expect(generateFunctionOutput(nodes).shoppingCategories).toEqual([]);
    nodes[0].enabled = true;
    const output = generateFunctionOutput(nodes);
    expect(output.shoppingListActive).toBe(true);
    expect(output.shoppingCategories[0]).toEqual({
      id: "bakery",
      label: "Backwaren",
      items: [{ id: "bread", label: "Brot" }],
    });
  });
});
