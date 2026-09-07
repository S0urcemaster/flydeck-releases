import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AppBrowser,
  generateFunctionOutput,
  type AppData,
} from "./AppBrowser";
import type { TreeBrowserNode } from "../TreeBrowser";

describe("AppBrowser", () => {
  it("starts with apps and _system directly in the root list", () => {
    const markup = renderToStaticMarkup(<AppBrowser rowGap="0" />);

    expect(markup).toContain('data-component-name="AppBrowser"');
    expect(markup).toContain("Compass");
    expect(markup).toContain("Inventory");
    expect(markup).toContain("ShoppingList");
    expect(markup).toContain("Bluesky");
    expect(markup).not.toContain(">Widgets</button>");
    expect(markup).not.toContain(">User</button>");
    expect(markup).not.toContain('aria-label="DeviceInfo result"');
    expect(markup).toContain('aria-label="Create child in root" disabled=""');
  });

  it("renders Backup inline beneath its System item", () => {
    const markup = renderToStaticMarkup(
      <AppBrowser
        initialSelectedPath={["_system", "backup"]}
        workspaceId="00000000-0000-4000-8000-000000000001"
      />,
    );

    expect(markup).toContain(">Backup</button>");
    expect(markup).toContain('data-component-name="BackupApp"');
    expect(markup.indexOf(">Backup</button>")).toBeLessThan(
      markup.indexOf('data-component-name="BackupApp"'),
    );
  });

  it("places Maintenance directly before Backup", () => {
    const markup = renderToStaticMarkup(
      <AppBrowser initialSelectedPath={["_system"]} />,
    );

    expect(markup).toContain(">Maintenance</button>");
    expect(markup.indexOf(">Maintenance</button>"))
      .toBeLessThan(markup.indexOf(">Backup</button>"));
  });

  it("requires the root app and its content choices to be checked", () => {
    const nodes: TreeBrowserNode<AppData>[] = [{
      id: "compass",
      label: "Compass",
      enabled: false,
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
    const nodes: TreeBrowserNode<AppData>[] = [{
      id: "shopping-list",
      label: "ShoppingList",
      enabled: false,
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
