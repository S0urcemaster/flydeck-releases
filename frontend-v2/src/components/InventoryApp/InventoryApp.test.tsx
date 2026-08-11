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
        formProps={{ actionWidth: "94px" }}
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
    expect(markup).toContain('aria-label="Inventory item description"');
    expect(markup).toContain('aria-label="Inventory item parent"');
    expect(markup).toContain('data-component-name="Form"');
    expect(markup.match(/data-component-name="FormRow"/g)).toHaveLength(2);
    expect(markup).toContain('data-component-name="ParentInput"');
    expect(markup).toContain('aria-label="Name"');
    expect(markup).toContain('aria-label="Desc"');
    expect(markup).toContain('aria-label="Set Parent"');
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
    expect(markup.match(/width:94px/g)).toHaveLength(2);
    expect(markup).toContain("padding:4px");
    expect(markup).toContain("padding:2px");
    expect(markup).toContain("margin:3px");
  });

  it("builds a path from the inventory hierarchy", () => {
    expect(inventoryPath(inventoryFixture, "toolbox")).toBe(
      "Schublade 1/Werkzeugkoffer",
    );
  });

  it("resolves valid parents and rejects hierarchy cycles", () => {
    expect(resolveInventoryParent(inventoryFixture, "pen", "Regal")).toBe(
      "shelf",
    );
    expect(resolveInventoryParent(
      inventoryFixture,
      "drawer-1",
      "Schublade 1/Werkzeugkoffer",
    ))
      .toBeUndefined();
    expect(resolveInventoryParent(inventoryFixture, "pen", "")).toBeNull();
  });

  it("projects Inventory parents into the shared ParentInput contract", () => {
    const targets = inventoryParentTargets(inventoryFixture, "drawer-1");

    expect(targets.find(({ id }) => id === null)?.eligible).toBe(true);
    expect(targets.find(({ id }) => id === "toolbox")?.eligible).toBe(false);
    expect(targets.find(({ id }) => id === "shelf")?.path).toBe("Regal");
  });

  it("allows spaces in parent names and only uses slash as the separator", () => {
    expect(resolveInventoryParent(
      inventoryFixture,
      "pen",
      "Schublade 1/Werkzeugkoffer",
    )).toBe("toolbox");
    expect(resolveInventoryParent(
      inventoryFixture,
      "pen",
      "Schublade 1 /Werkzeugkoffer",
    )).toBeUndefined();
    expect(resolveInventoryParent(
      inventoryFixture,
      "pen",
      "Schublade 1/ Werkzeugkoffer",
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
      revision: 3,
    };

    expect(projectInventory(
      [root, item],
      {
        item: { nodeId: "item", format: "text", content: "Kabel", revision: 4 },
      },
      "Lagerraum",
      5,
    )).toEqual({
      items: [{
        contentRevision: 4,
        description: "Kabel",
        id: "item",
        name: "Kiste",
        nodeRevision: 3,
        parentId: null,
      }],
      rootId: "root",
      treeRevision: 5,
    });
  });
});
