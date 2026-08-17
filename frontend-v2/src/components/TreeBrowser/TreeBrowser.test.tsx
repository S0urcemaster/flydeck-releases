import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  TreeBrowser,
  createBatchRootTargets,
  createRootTargets,
  filterDirectListNodes,
  findFirstMatchingNodePath,
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

  it("renders the virtual root control before its list", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser model={createModel()} rowGap="SPACE_XS" />,
    );

    expect(markup).toContain('aria-label="Tree browser"');
    expect(markup).toContain('aria-label="Root children"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('data-component-name="ListControlListSizeButton"');
    expect(markup).toContain('aria-label="List controls for root"');
    expect(markup.indexOf('aria-label="List controls for root"')).toBeLessThan(
      markup.indexOf(">Pflanzen</button>"),
    );
    expect(markup).not.toContain('aria-label="Show content"');
    expect(markup).not.toContain("Children of plants");
  });

  it("renders each owner control before its own list", () => {
    const contextualTree: TreeBrowserNode[] = [
      { id: "one", label: "One", enabled: true, contentVisible: true, children: [] },
      { id: "two", label: "Two", enabled: true, contentVisible: true, children: [] },
      { id: "three", label: "Three", enabled: true, contentVisible: true, children: [] },
    ];
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["two"]}
        model={createModel(contextualTree)}
      />,
    );
    const input = 'aria-label="New item name"';
    expect(markup.indexOf('aria-label="List controls for root"')).toBeLessThan(
      markup.indexOf(">One</button>"),
    );
    expect(markup.indexOf(">One</button>")).toBeLessThan(markup.indexOf(input));
    expect(markup.indexOf(input)).toBeLessThan(
      markup.indexOf('aria-label="Arm delete for Two"'),
    );
    expect(markup.indexOf('aria-label="Arm delete for Two"')).toBeLessThan(
      markup.indexOf(">Three</button>"),
    );
    expect(markup.indexOf(input)).toBeLessThan(markup.indexOf(">Three</button>"));
    expect(markup.indexOf(">Three</button>")).toBeLessThan(
      markup.indexOf('aria-label="List controls for Two"'),
    );
    expect(markup).toContain('value="Two"');
    expect(markup).toContain('aria-label="Search children of Two"');
    expect(markup).not.toContain('data-component-name="ListControlListSizeButton"');
    expect(markup).not.toContain("autofocus");
    expect(markup).toContain('aria-label="Previous page"');
    expect(markup).toContain('aria-label="Next page"');
    expect(markup.indexOf('aria-label="Search list"')).toBeLessThan(
      markup.indexOf('aria-label="Previous page"'),
    );
    expect(markup).toContain("width:100%");
  });

  it("opens the active item in its contextual list control", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["plants"]}
        model={createModel()}
      />,
    );

    expect(markup).toContain('data-component-name="ListControl"');
    expect(markup).toContain('value="Pflanzen"');
    expect(markup).not.toContain('aria-label="Select Pflanzen for actions"');
  });

  it("places the mode switch at the far right of the fixed list control", () => {
    const listTree = [{
      ...tree[0],
      children: [{
        id: "rose",
        label: "Rose",
        enabled: true,
        contentVisible: true,
        children: [],
      }],
    }];
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["plants"]}
        model={createModel(listTree)}
        renderContent={() => <div>Content</div>}
      />,
    );

    expect(markup).toContain('aria-label="Show content"');
    expect(markup.indexOf('aria-label="Show content"')).toBeLessThan(
      markup.indexOf(">Rose</button>"),
    );
    expect(markup.indexOf('aria-label="Next page"')).toBeLessThan(
      markup.indexOf('aria-label="Show content"'),
    );
    expect(markup).not.toContain(">Content</div>");
  });

  it("places the fixed list control before the content", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["plants"]}
        model={createModel()}
        renderContent={() => <div data-content>ID input</div>}
      />,
    );

    expect(markup).toContain('aria-label="Show list"');
    expect(markup.indexOf('aria-label="Show list"')).toBeLessThan(
      markup.indexOf("data-content"),
    );
  });

  it("renders inline content directly after its selected item", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["plants"]}
        model={createModel()}
        renderInlineContent={({ node }) => (
          node.id === "plants" ? <div data-inline-app>Inline app</div> : null
        )}
      />,
    );

    expect(markup).toContain(">Pflanzen</button>");
    expect(markup).toContain("data-inline-app");
    expect(markup.indexOf(">Pflanzen</button>")).toBeLessThan(
      markup.indexOf("data-inline-app"),
    );
    expect(markup.indexOf('aria-label="List controls for root"')).toBeLessThan(
      markup.indexOf(">Pflanzen</button>"),
    );
    expect(markup.match(/data-component-name="ListControl"/g)).toHaveLength(1);
    expect(markup).not.toContain('data-component-name="BrowserItemModeButton"');
  });

  it("applies its configurable row gap below list controls and between items", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser model={createModel()} rowGap="7px" />,
    );

    expect(markup.match(/row-gap:7px/g)).toHaveLength(2);
  });

  it("reserves empty item rows without rendering placeholders", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        model={createModel()}
        rowGap="0"
        browserItemProps={{ border: "0" }}
      />,
    );

    expect(markup.match(
      /<span[^>]*class="[^"]*emptySpace[^"]*"/g,
    )).toHaveLength(6);
    expect(markup).not.toMatch(/emptySpace[^>]*style=/);
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

  it("filters only the direct list by its label", () => {
    const nodes = [
      { label: "Alpha", children: [{ label: "Needle", children: [] }] },
      { label: "Beta", children: [] },
    ];

    expect(filterDirectListNodes(nodes, "alp")).toEqual([nodes[0]]);
    expect(filterDirectListNodes(nodes, "needle")).toEqual([]);
    expect(filterDirectListNodes(nodes, "needle", true)).toEqual([nodes[0]]);
    expect(filterDirectListNodes(nodes, " ")).toEqual(nodes);
  });

  it("keeps the complete parent path for a descendant search hit", () => {
    const desk = [{
      id: "desk",
      label: "Schreibtisch",
      children: [{
        id: "drawer",
        label: "Schublade",
        children: [{ id: "pen", label: "Stift", children: [] }],
      }],
    }];

    expect(findFirstMatchingNodePath(desk, "stift")).toEqual([
      "desk",
      "drawer",
      "pen",
    ]);
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
