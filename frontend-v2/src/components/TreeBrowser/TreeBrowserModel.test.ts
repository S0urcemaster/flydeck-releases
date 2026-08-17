import { describe, expect, it } from "vitest";

import { ClientStateStore } from "../../state";
import { TreeBrowserModel } from "./TreeBrowserModel";

function createStore(values = new Map<string, string>()) {
  return {
    store: new ClientStateStore({
      storage: () => ({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      }),
    }),
    values,
  };
}

describe("TreeBrowserModel", () => {
  it("defaults empty item lists to content and populated lists to list mode", () => {
    const { store } = createStore();
    const model = new TreeBrowserModel({
      store,
      storageKey: "tree-default-mode",
      initialTree: [
        {
          id: "parent",
          label: "Parent",
          enabled: true,
          contentVisible: true,
          children: [{
            id: "leaf",
            label: "Leaf",
            enabled: true,
            contentVisible: false,
            children: [],
          }],
        },
        {
          id: "trash",
          label: "_trash",
          enabled: true,
          contentEditable: false,
          children: [],
        },
      ],
    });

    const state = model.load();
    expect(state.viewState.contentVisibleByNodeId).toMatchObject({
      parent: false,
      leaf: true,
      trash: false,
    });
    state.viewState.contentVisibleByNodeId.leaf = false;
    model.save(state);
    expect(model.load().viewState.contentVisibleByNodeId.leaf).toBe(true);
  });

  it("persists separated state without serializing attached foreign data", () => {
    const { store, values } = createStore();
    const model = new TreeBrowserModel({
      store,
      storageKey: "tree",
      initialTree: [{
        id: "compass",
        label: "Compass",
        enabled: false,
        data: { kind: "server-data", text: "not persisted" },
        children: [],
      }],
    });
    const state = model.load();
    state.semanticState.enabledByNodeId.compass = true;
    model.save(state);

    const stored = values.get(store.getKey("tree.tree"));
    expect(stored).not.toContain("server-data");
    expect(stored).not.toContain("not persisted");
    expect(stored).not.toContain("contentVisibleByNodeId");
    expect(model.load()).toMatchObject({
      document: {
        nodes: [{
          id: "compass",
          data: { kind: "server-data", text: "not persisted" },
        }],
      },
      semanticState: { enabledByNodeId: { compass: true } },
    });

    const refreshedModel = new TreeBrowserModel({
      store,
      storageKey: "tree",
      initialTree: [{
        id: "compass",
        label: "Updated server label",
        enabled: false,
        data: { kind: "server-data", text: "updated" },
        children: [],
      }],
    });
    expect(refreshedModel.load().document.nodes[0]).toMatchObject({
      label: "Updated server label",
      data: { kind: "server-data", text: "updated" },
    });
  });

  it("migrates legacy state and repairs an invalid selected path", () => {
    const { store, values } = createStore(new Map([[
      "flydeck.tree.memo",
      JSON.stringify({
        version: 1,
        nodes: [{
          id: "root",
          label: "Root",
          enabled: true,
          contentVisible: false,
          children: [],
        }],
        pages: {},
        pageSizes: {},
        selectedPath: ["root", "missing"],
      }),
    ]]));
    const model = new TreeBrowserModel({
      store,
      storageKey: "flydeck.tree.memo",
      initialTree: [{
        id: "root",
        label: "Root",
        enabled: false,
        children: [],
      }],
    });

    const loaded = model.load();

    expect(loaded.semanticState.enabledByNodeId.root).toBe(true);
    expect(loaded.viewState.selectedPath).toEqual(["root"]);
    expect(values.has(store.getKey("tree.memo"))).toBe(true);
    expect(values.has("flydeck.tree.memo")).toBe(true);
  });

  it("adds newly supplied definitions to an existing stored model", () => {
    const { store } = createStore();
    const firstModel = new TreeBrowserModel({
      store,
      storageKey: "tree",
      initialTree: [{
        id: "compass",
        label: "Compass",
        enabled: false,
        children: [],
      }],
    });
    firstModel.save(firstModel.load());
    const extendedModel = new TreeBrowserModel({
      store,
      storageKey: "tree",
      initialTree: [
        ...firstModel.initialTree,
        { id: "device-info", label: "DeviceInfo", enabled: false, children: [] },
      ],
    });

    expect(extendedModel.load().document.nodes.map(({ id }) => id)).toEqual([
      "compass",
      "device-info",
    ]);
  });

  it("keeps page sizes per branch while definitions remain authoritative", () => {
    const { store } = createStore();
    const firstModel = new TreeBrowserModel({
      definitionAuthority: true,
      store,
      storageKey: "authoritative-tree",
      initialTree: [{
        id: "theme",
        label: "Old definition",
        enabled: false,
        children: [],
      }],
    });
    const firstState = firstModel.load();
    firstState.document.nodes[0].label = "Stored edit";
    firstState.semanticState.enabledByNodeId.theme = true;
    firstState.viewState.pageSizes.theme = 10;
    firstModel.save(firstState);

    const refreshedModel = new TreeBrowserModel({
      definitionAuthority: true,
      store,
      storageKey: "authoritative-tree",
      initialTree: [{
        id: "theme",
        label: "Current definition",
        enabled: false,
        children: [],
      }],
    });
    const refreshed = refreshedModel.load();

    expect(refreshed.document.nodes[0].label).toBe("Current definition");
    expect(refreshed.semanticState.enabledByNodeId.theme).toBe(false);
    expect(refreshed.viewState.pageSizes.theme).toBe(10);
  });
});
