import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  TreeBrowser,
  createBatchRootTargets,
  createRootTargets,
  insertAt,
  moveInTree,
  removeFromTree,
  removeNodesFromTree,
  reparentInTree,
  reparentNodesInTree,
  updateActionSelection,
  type TreeBrowserNode,
} from "./TreeBrowser";
import { TreeBrowserModel } from "./TreeBrowserModel";

const tree: TreeBrowserNode[] = [{
  id: "plants",
  label: "Pflanzen",
  enabled: true,
  contentVisible: true,
  children: [],
}];

function createModel(initialTree = tree) {
  return new TreeBrowserModel({
    initialTree,
    storageKey: "flydeck.test.tree-browser",
  });
}

describe("TreeBrowser", () => {
  it("inserts a new sibling directly after the selected position", () => {
    expect(insertAt(["A", "C"], 1, "B")).toEqual(["A", "B", "C"]);
  });

  it("renders one fixed six-item level until an item is selected", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser model={createModel()} rowGap="SPACE_XS" />,
    );

    expect(markup).toContain('aria-label="Tree browser"');
    expect(markup).toContain('aria-label="Root children"');
    expect(markup).toContain(">M</button>");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("Children of plants");
  });

  it("places list controls above or below their list", () => {
    const topMarkup = renderToStaticMarkup(
      <TreeBrowser
        listControlOrientation="top"
        model={createModel()}
      />,
    );
    const bottomMarkup = renderToStaticMarkup(
      <TreeBrowser
        listControlOrientation="bottom"
        model={createModel()}
      />,
    );
    const control = 'data-component-name="ListControl"';
    const item = 'data-component-name="BrowserItem"';
    const separator = 'data-component-name="ListControlListSizeButton"';

    expect(topMarkup.indexOf(control)).toBeLessThan(topMarkup.indexOf(item));
    expect(bottomMarkup.indexOf(control)).toBeGreaterThan(bottomMarkup.indexOf(item));
    expect(topMarkup.indexOf(separator)).toBeGreaterThan(topMarkup.indexOf(item));
    expect(bottomMarkup.indexOf(separator)).toBeGreaterThan(
      bottomMarkup.indexOf(control),
    );
    expect(bottomMarkup).toContain("width:100%");
    expect(bottomMarkup).toContain("height:10px");
    expect(bottomMarkup).toContain("font-size:0");
  });

  it("checks the active item when a row is initially selected", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["plants"]}
        model={createModel()}
      />,
    );

    expect(markup).toContain('aria-label="Deselect Pflanzen for actions"');
  });

  it("applies its configurable row gap below list controls and between items", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser model={createModel()} rowGap="7px" />,
    );

    expect(markup.match(/row-gap:7px/g)).toHaveLength(2);
  });

  it("applies the BrowserItem border to empty item slots", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        model={createModel()}
        rowGap="0"
        browserItemProps={{ border: "0" }}
      />,
    );

    expect(markup.match(
      /<span[^>]*border:0[^>]*aria-hidden="true"/g,
    )).toHaveLength(5);
  });

  it("updates arbitrary tree levels", () => {
    const nestedTree = [{
      ...tree[0],
      children: [
        {
          id: "rose",
          label: "Rose",
          enabled: true,
          contentVisible: true,
          children: [],
        },
        {
          id: "oak",
          label: "Eiche",
          enabled: true,
          contentVisible: true,
          children: [],
        },
      ],
    }];

    expect(removeFromTree(nestedTree, "rose")[0].children[0].id).toBe("oak");
    expect(moveInTree(nestedTree, "oak", -1)[0].children[0].id).toBe("oak");
  });

  it("adds checkbox selections without allowing the active item to be unchecked", () => {
    const selected = updateActionSelection(
      { plants: ["rose"] },
      "plants",
      "oak",
      true,
      "rose",
    );

    expect(selected.plants).toEqual(["rose", "oak"]);
    expect(updateActionSelection(
      selected,
      "plants",
      "rose",
      false,
      "rose",
    )).toBe(selected);
    expect(updateActionSelection(
      selected,
      "plants",
      "oak",
      false,
      "rose",
    ).plants).toEqual(["rose"]);
  });

  it("removes several selected siblings and their subtrees at once", () => {
    const nodes = [{
      id: "parent",
      children: [
        { id: "one", children: [{ id: "nested", children: [] }] },
        { id: "two", children: [] },
        { id: "three", children: [] },
      ],
    }];

    expect(removeNodesFromTree(nodes, ["one", "three"])[0].children)
      .toEqual([{ id: "two", children: [] }]);
  });

  it("moves a complete subtree to another root without losing its children", () => {
    const nodes = [{
      id: "source",
      label: "Source",
      localId: "source-id",
      children: [{ id: "child", label: "Child", children: [] }],
    }, {
      id: "target",
      label: "Target",
      children: [],
    }];

    expect(reparentInTree(nodes, "source", "target")).toEqual([{
      id: "target",
      label: "Target",
      children: [nodes[0]],
    }]);
    expect(reparentInTree(nodes, "source", "child")).toBe(nodes);
  });

  it("reparents all selected siblings in their list order", () => {
    const nodes = [{ id: "one", label: "One", children: [] }, {
      id: "two",
      label: "Two",
      children: [],
    }, {
      id: "target",
      label: "Target",
      children: [],
    }];

    expect(reparentNodesInTree(nodes, ["one", "two"], "target"))
      .toEqual([{
        ...nodes[2],
        children: [nodes[0], nodes[1]],
      }]);
  });

  it("marks self, descendants, locked lists, and full lists as ineligible roots", () => {
    const nodes = [{
      id: "source",
      label: "Source",
      children: [{ id: "child", label: "Child", children: [] }],
    }, {
      id: "locked",
      label: "Locked",
      localId: "locked-id",
      listEditable: false,
      children: [],
    }, {
      id: "full",
      label: "Full",
      localId: "full-id",
      listItemLimit: 0,
      children: [],
    }];
    const targets = createRootTargets(nodes, "source");

    expect(Object.fromEntries(targets.map(({ label, eligible }) => [label, eligible])))
      .toMatchObject({ "": true, Source: false, Child: false, Locked: false, Full: false });
    expect(targets.find(({ id }) => id === "locked")?.path).toBe("locked-id");
  });

  it("reserves enough target capacity for every selected sibling", () => {
    const nodes = [{
      id: "one",
      label: "One",
      children: [],
    }, {
      id: "two",
      label: "Two",
      children: [],
    }, {
      id: "target",
      label: "Target",
      listItemLimit: 2,
      children: [{ id: "existing", label: "Existing", children: [] }],
    }];
    const targets = createBatchRootTargets(nodes, ["one", "two"]);

    expect(targets.find(({ id }) => id === "target")?.eligible).toBe(false);
    expect(targets.find(({ id }) => id === "one")?.eligible).toBe(false);
    expect(targets.find(({ id }) => id === "two")?.eligible).toBe(false);
  });

  it("rejects a parent containing the same sibling-local ID", () => {
    const nodes = [{
      id: "source",
      label: "Source",
      localId: "entry",
      children: [],
    }, {
      id: "target",
      label: "Target",
      localId: "target",
      children: [{
        id: "existing",
        label: "Existing",
        localId: "entry",
        children: [],
      }],
    }];

    expect(createBatchRootTargets(nodes, ["source"])
      .find(({ id }) => id === "target")?.eligible).toBe(false);
  });
});
