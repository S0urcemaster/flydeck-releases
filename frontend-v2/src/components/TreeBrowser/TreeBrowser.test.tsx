import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  TreeBrowser,
  insertAt,
  moveInTree,
  removeFromTree,
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

  it("renders one fixed five-item level until an item is selected", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser model={createModel()} rowGap="SPACE_XS" />,
    );

    expect(markup).toContain('aria-label="Tree browser"');
    expect(markup).toContain('aria-label="Root children"');
    expect(markup).toContain(">1/1</button>");
    expect(markup.match(/aria-hidden="true"/g)).toHaveLength(5);
    expect(markup).not.toContain("Children of plants");
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

    expect(markup.match(/border:0/g)).toHaveLength(5);
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
});
