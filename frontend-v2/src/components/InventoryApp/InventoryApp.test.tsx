import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  InventoryApp,
  inventoryBreadcrumb,
  inventoryFixture,
  inventoryItemHasChildren,
  inventoryPath,
  inventoryParentTargets,
  projectInventory,
  resolveInventoryParent,
} from "./InventoryApp";

describe("InventoryApp", () => {
  it("renders the fixture as an AppView form with hierarchical navigation", () => {
    const markup = renderToStaticMarkup(
      <InventoryApp
        buttonProps={{ width: "91px" }}
        breadcrumbProps={{ padding: "2px" }}
        compactButtonProps={{ height: "27px" }}
        formRowProps={{ padding: "4px" }}
        inputProps={{ width: "92px" }}
        itemListProps={{ margin: "3px" }}
        textareaProps={{ width: "93px" }}
      />,
    );

    expect(markup).toContain('data-component-name="InventoryApp"');
    expect(markup).toContain('data-access-mode="read-write"');
    expect(markup).toContain("INVENTORY");
    expect(markup).toContain('aria-label="Inventory item name"');
    expect(markup).toContain('aria-label="Inventory item ID"');
    expect(markup).toContain('aria-label="Inventory item description"');
    expect(markup).toContain('aria-label="Inventory item parent"');
    expect(markup).toContain('data-component-name="Form"');
    expect(markup).toContain('data-component-name="NodeIdInput"');
    expect(markup.match(/data-component-name="FormRow"/g)).toHaveLength(2);
    expect(markup).toContain('data-component-name="ParentInput"');
    expect(markup).not.toContain(">Name</span>");
    expect(markup).not.toContain(">Desc</span>");
    expect(markup).toContain(">Parent</span>");
    expect(markup).not.toContain('aria-label="Set Parent"');
    expect(markup).toContain('aria-label="Previous inventory item"');
    expect(markup).toContain('aria-label="Next inventory item"');
    expect(markup).toContain('aria-label="Open parent inventory item"');
    expect(markup).toContain('aria-label="Open first child inventory item"');
    expect(markup).toMatch(
      /aria-label="Open parent inventory item"[^>]*>↑<\/button>/,
    );
    expect(markup).toMatch(
      /aria-label="Open first child inventory item"[^>]*>↓<\/button>/,
    );
    expect(markup).toMatch(
      /aria-label="Previous inventory item"[^>]*>←<\/button>/,
    );
    expect(markup).toMatch(
      /aria-label="Next inventory item"[^>]*>→<\/button>/,
    );
    expect(markup).not.toContain("Move inventory branch");
    expect(markup).toContain('data-component-name="Breadcrumb"');
    expect(markup).toContain(">root</button>");
    expect(markup).toContain('data-component-name="ItemList"');
    expect(markup).not.toContain('aria-label="Open Schublade 1"');
    expect(markup).toContain('aria-label="Select Schublade 1"');
    expect(markup).toContain('aria-label="Select Schublade 2"');
    expect(markup).toContain('aria-label="Select Regal"');
    expect(markup).toContain("width:91px");
    expect(markup).toContain("width:92px");
    expect(markup).toContain("width:93px");
    expect(markup).toContain("padding:4px");
    expect(markup).toContain("padding:2px");
    expect(markup).toContain("margin:3px");
  });

  it("builds a path from the inventory hierarchy", () => {
    expect(inventoryPath(inventoryFixture, "toolbox")).toBe(
      "schublade-1/werkzeugkoff",
    );
  });

  it("resolves valid parents and rejects hierarchy cycles", () => {
    expect(resolveInventoryParent(inventoryFixture, "pen", "regal")).toBe(
      "shelf",
    );
    expect(resolveInventoryParent(
      inventoryFixture,
      "drawer-1",
      "schublade-1/werkzeugkoff",
    ))
      .toBeUndefined();
    expect(resolveInventoryParent(inventoryFixture, "pen", "")).toBeNull();
  });

  it("projects Inventory parents into the shared ParentInput contract", () => {
    const targets = inventoryParentTargets(inventoryFixture, "drawer-1");

    expect(targets.find(({ id }) => id === null)?.eligible).toBe(true);
    expect(targets.find(({ id }) => id === "toolbox")?.eligible).toBe(false);
    expect(targets.find(({ id }) => id === "shelf")?.path).toBe("regal");
  });

  it("allows spaces in parent names and only uses slash as the separator", () => {
    expect(resolveInventoryParent(
      inventoryFixture,
      "pen",
      "schublade-1/werkzeugkoff",
    )).toBe("toolbox");
    expect(resolveInventoryParent(
      inventoryFixture,
      "pen",
      "schublade-1 /werkzeugkoff",
    )).toBeUndefined();
    expect(resolveInventoryParent(
      inventoryFixture,
      "pen",
      "schublade-1/ werkzeugkoff",
    )).toBeUndefined();
  });

  it("maps every parent through the selected item into a breadcrumb", () => {
    expect(inventoryBreadcrumb(inventoryFixture, "toolbox")).toEqual([
      { hasChildren: true, id: "drawer-1", label: "Schublade 1" },
    ]);
    expect(inventoryBreadcrumb(inventoryFixture, "drawer-1")).toEqual([]);
  });

  it("derives the child status for every navigation item", () => {
    expect(inventoryItemHasChildren(inventoryFixture, "drawer-1")).toBe(true);
    expect(inventoryItemHasChildren(inventoryFixture, "toolbox")).toBe(false);
  });

  it("projects Inventory from the shared cached tree and contents", () => {
    const root = {
      id: "root",
      parentId: null,
      kind: "data-directory",
      label: "Lagerraum",
      localId: "lagerraum",
      position: 0,
      revision: 2,
      capabilities: { contentEditable: false, listEditable: true, listItemLimit: null },
    };
    const item = {
      ...root,
      id: "item",
      parentId: root.id,
      kind: "data-file",
      label: "Kiste",
      localId: "kiste",
      revision: 3,
    };

    expect(projectInventory(
      [root, item],
      {
        item: { nodeId: "item", format: "text", content: "Kabel", revision: 4 },
      },
      "lagerraum",
      5,
    )).toEqual({
      items: [{
        contentRevision: 4,
        description: "Kabel",
        id: "item",
        localId: "kiste",
        name: "Kiste",
        nodeRevision: 3,
        parentId: null,
      }],
      rootId: "root",
      treeRevision: 5,
    });
  });
});
