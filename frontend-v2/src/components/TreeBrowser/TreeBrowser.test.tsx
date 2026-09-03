import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  TreeBrowser,
  createBatchRootTargets,
  createRootTargets,
  createSelectedPathLabel,
  insertAt,
  moveInTree,
  removeFromTree,
  removeNodesFromTree,
  reparentInTree,
  reparentNodesInTree,
  resolveTreeLabelPath,
  updateActionSelection,
  updateTreeActionSelection,
  type TreeBrowserNode,
  type TreeBrowserRootControl,
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
    expect(markup).toContain('aria-label="Tree browser menu"');
    expect(markup).toContain("background:var(--color-app)");
    expect(markup).toContain('aria-label="Search tree"');
    expect(markup).not.toContain('aria-label="Show saved views"');
    expect(markup).toContain('aria-label="Tree path"');
    expect(markup).toContain('value="root"');
    expect(markup).toContain('color:var(--color-success)');
    expect(markup).toContain('aria-label="Root children"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('data-component-name="ListControlListSizeButton"');
    expect(markup).toContain('aria-label="List controls for root"');
    expect(markup.indexOf('aria-label="List controls for root"')).toBeLessThan(
      markup.lastIndexOf(">Pflanzen</button>"),
    );
    expect(markup).not.toContain('aria-label="Show content"');
    expect(markup).not.toContain("Children of plants");
  });

  it("offers the content switch when the virtual root has content", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        model={createModel()}
        renderRootContent={() => <div>Root settings</div>}
      />,
    );

    expect(markup).toContain('aria-label="Show content"');
  });

  it("can hide its own menu and name the virtual root for a referenced browser", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        menuVisible={false}
        model={createModel([])}
        rootLabel="views"
      />,
    );

    expect(markup).not.toContain('aria-label="Tree browser menu"');
    expect(markup).toContain('aria-label="List controls for views"');
    expect(markup).toContain('aria-label="Create child in views"');
  });

  it("does not check a focused item in a referenced tree", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["plants"]}
        menuVisible={false}
        model={createModel()}
        selectionActiveColor="COLOR_SUCCESS"
      />,
    );

    expect(markup).toContain(
      'aria-label="Select Pflanzen for actions" type="button" aria-pressed="false"',
    );
  });


  it("allows deleting the focused item without checking it for a view", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["plants"]}
        model={createModel()}
        onDeleteNode={() => true}
      />,
    );
    const deleteButton = markup.match(
      /<button[^>]*aria-label="Arm delete for Pflanzen"[^>]*>/,
    )?.[0];

    expect(markup).toContain(
      'aria-label="Select Pflanzen for actions" type="button" aria-pressed="false"',
    );
    expect(deleteButton).toBeDefined();
    expect(deleteButton).not.toContain("disabled");
  });

  it("still disables delete when the focused item is protected", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        canDeleteNode={() => false}
        initialSelectedPath={["plants"]}
        model={createModel()}
        onDeleteNode={() => true}
      />,
    );
    const deleteButton = markup.match(
      /<button[^>]*aria-label="Arm delete for Pflanzen"[^>]*>/,
    )?.[0];

    expect(deleteButton).toContain("disabled");
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
    const input = 'aria-label="Item name"';
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
    expect(markup).toContain('aria-label="Tree path"');
    expect(markup).toContain('value="Two"');
    expect(markup).toContain('aria-label="Create child in Two"');
    expect(markup).not.toContain('data-component-name="ListControlListSizeButton"');
    expect(markup).not.toContain("autofocus");
    expect(markup).toContain('aria-label="Previous page"');
    expect(markup).toContain('aria-label="Next page"');
    expect(markup.indexOf('aria-label="Create root item"')).toBeLessThan(
      markup.indexOf('aria-label="Previous page"'),
    );
    expect(markup).toContain("width:100%");
  });

  it("builds the current label path and stops at invalid segments", () => {
    const nodes = [{
      id: "desk",
      label: "Desk",
      children: [{ id: "drawer", label: "Drawer", children: [] }],
    }];

    expect(createSelectedPathLabel(nodes, ["desk", "drawer"]))
      .toBe("Desk/Drawer");
    expect(createSelectedPathLabel(nodes, ["desk", "missing"]))
      .toBe("Desk");
    expect(createSelectedPathLabel(nodes, [])).toBe("root");

    const identifiedNodes = [{
      id: "desk",
      label: "My Desk",
      localId: "my-desk",
      children: [{
        id: "drawer",
        label: "Top Drawer",
        localId: "top-drawer",
        children: [],
      }],
    }];
    expect(createSelectedPathLabel(identifiedNodes, ["desk", "drawer"]))
      .toBe("my-desk/top-drawer");
  });

  it("resolves label and local-ID paths for direct navigation", () => {
    const nodes = [{
      id: "desk-id",
      label: "My Desk",
      localId: "desk",
      children: [{
        id: "drawer-id",
        label: "Top Drawer",
        localId: "top",
        children: [],
      }],
    }];

    expect(resolveTreeLabelPath(nodes, "My Desk / Top Drawer"))
      .toEqual(["desk-id", "drawer-id"]);
    expect(resolveTreeLabelPath(nodes, "desk/top"))
      .toEqual(["desk-id", "drawer-id"]);
    expect(resolveTreeLabelPath(nodes, "missing")).toBeNull();
    expect(resolveTreeLabelPath(nodes, "root")).toEqual([]);
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
    expect(markup).toContain(
      'aria-label="Select Pflanzen for actions" type="button" aria-pressed="false"',
    );
  });

  it("keeps rename out of an item when its content editor owns the name", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["plants"]}
        itemRenameVisible={false}
        model={createModel()}
      />,
    );

    expect(markup).toContain('data-component-name="BrowserItem"');
    expect(markup).not.toContain('aria-label="Item name"');
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
    expect(markup.lastIndexOf(">Pflanzen</button>")).toBeLessThan(
      markup.indexOf("data-inline-app"),
    );
    expect(markup.indexOf('aria-label="List controls for root"')).toBeLessThan(
      markup.lastIndexOf(">Pflanzen</button>"),
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
    )).toHaveLength(3);
    expect(markup).not.toMatch(/emptySpace[^>]*style=/);
  });

  it("uses authoritative initial page sizes instead of the local default", () => {
    const markup = renderToStaticMarkup(
      <TreeBrowser
        initialPageSizes={{ __tree_root__: 4 }}
        model={createModel()}
      />,
    );

    expect(markup.match(
      /<span[^>]*class="[^"]*emptySpace[^"]*"/g,
    )).toHaveLength(3);
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


  it("keeps checkbox state independent from the active item", () => {
    const selected = updateActionSelection(
      { plants: ["rose"] },
      "plants",
      "oak",
      true,
    );

    expect(selected.plants).toEqual(["rose", "oak"]);
    expect(updateActionSelection(
      selected,
      "plants",
      "rose",
      false,
    ).plants).toEqual(["oak"]);
  });

  it("checks and unchecks a complete subtree from its parent", () => {
    const branch = {
      id: "garden",
      children: [{
        id: "flowers",
        children: [{ id: "rose", children: [] }],
      }, { id: "shed", children: [] }],
    };
    const checked = updateTreeActionSelection(
      {},
      [branch],
      "__tree_root__",
      branch,
      true,
    );
    expect(checked).toEqual({
      __tree_root__: ["garden"],
      garden: ["flowers", "shed"],
      flowers: ["rose"],
    });
    expect(updateTreeActionSelection(
      checked,
      [branch],
      "__tree_root__",
      branch,
      false,
    ))
      .toEqual({
        __tree_root__: [],
        garden: [],
        flowers: [],
      });
  });

  it("selects a checked child's ancestors without selecting its siblings", () => {
    const sibling = { id: "shed", children: [] };
    const child = {
      id: "flowers",
      children: [{ id: "rose", children: [] }],
    };
    const parent = { id: "garden", children: [child, sibling] };
    expect(updateTreeActionSelection(
      {},
      [parent],
      "garden",
      child,
      true,
    )).toEqual({
      __tree_root__: ["garden"],
      garden: ["flowers"],
      flowers: ["rose"],
    });
  });

  it("unchecks empty ancestors after their last checked child", () => {
    const rose = { id: "rose", children: [] };
    const flowers = { id: "flowers", children: [rose] };
    const garden = { id: "garden", children: [flowers] };
    const checked = updateTreeActionSelection(
      {},
      [garden],
      "flowers",
      rose,
      true,
    );

    expect(updateTreeActionSelection(
      checked,
      [garden],
      "flowers",
      rose,
      false,
    )).toEqual({
      __tree_root__: [],
      garden: [],
      flowers: [],
    });
  });

  it("keeps ancestors checked while another child remains checked", () => {
    const rose = { id: "rose", children: [] };
    const oak = { id: "oak", children: [] };
    const garden = { id: "garden", children: [rose, oak] };
    const checked = updateTreeActionSelection(
      updateTreeActionSelection({}, [garden], "garden", rose, true),
      [garden],
      "garden",
      oak,
      true,
    );

    expect(updateTreeActionSelection(
      checked,
      [garden],
      "garden",
      rose,
      false,
    )).toEqual({
      __tree_root__: ["garden"],
      garden: ["oak"],
    });
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

  it("reparents the focused content item without requiring a view checkbox", async () => {
    const nodes: TreeBrowserNode[] = [{
      id: "source",
      label: "Source",
      enabled: true,
      contentVisible: true,
      children: [],
    }, {
      id: "target",
      label: "Target",
      enabled: true,
      contentVisible: false,
      children: [],
    }];
    const onReparentNode = vi.fn().mockResolvedValue(true);
    let rootControl: TreeBrowserRootControl | undefined;
    renderToStaticMarkup(
      <TreeBrowser
        initialSelectedPath={["source"]}
        model={createModel(nodes)}
        onReparentNode={onReparentNode}
        renderContent={({ root }) => {
          rootControl = root;
          return <span>Content</span>;
        }}
      />,
    );

    expect(rootControl?.targets.find(({ id }) => id === "target")?.eligible)
      .toBe(true);
    await expect(rootControl?.onChange("target")).resolves.toBe(true);
    expect(onReparentNode).toHaveBeenCalledWith(
      "source",
      "target",
      expect.any(String),
    );
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
