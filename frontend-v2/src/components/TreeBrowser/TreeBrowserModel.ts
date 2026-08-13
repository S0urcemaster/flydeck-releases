import {
  clientStateStore,
  type ClientStateSlice,
  type ClientStateStore,
} from "../../state";

export type TreeBrowserPageSize = 3 | 5 | 9;

export type TreeBrowserModelNode<TData = unknown> = {
  id: string;
  kind?: string;
  label: string;
  localId?: string;
  contentEditable: boolean;
  listEditable: boolean;
  listItemLimit?: number;
  data?: TData;
  children: TreeBrowserModelNode<TData>[];
};

export type TreeBrowserModelInitialNode<TData = unknown> = {
  id: string;
  kind?: string;
  label: string;
  localId?: string;
  enabled: boolean;
  contentEditable?: boolean;
  contentVisible?: boolean;
  listEditable?: boolean;
  listItemLimit?: number;
  data?: TData;
  children: TreeBrowserModelInitialNode<TData>[];
};

export type TreeBrowserDocument<TData = unknown> = {
  nodes: TreeBrowserModelNode<TData>[];
  revision: number;
};

export type TreeBrowserSemanticState = {
  enabledByNodeId: Record<string, boolean>;
};

export type TreeBrowserViewState = {
  contentVisibleByNodeId: Record<string, boolean>;
  pages: Record<string, number>;
  pageSizes: Record<string, TreeBrowserPageSize>;
  selectedPath: string[];
};

export type TreeBrowserModelState<TData = unknown> = {
  document: TreeBrowserDocument<TData>;
  semanticState: TreeBrowserSemanticState;
  viewState: TreeBrowserViewState;
};

export type TreeBrowserModelSnapshotNode<TData = unknown> = Readonly<
  Omit<TreeBrowserModelNode<TData>, "children"> & {
    enabled: boolean;
    contentVisible: boolean;
    children: readonly TreeBrowserModelSnapshotNode<TData>[];
  }
>;

type StoredTreeBrowserNode = Omit<
  TreeBrowserModelNode,
  "children" | "data"
> & {
  children: StoredTreeBrowserNode[];
};

type StoredTreeBrowserModel = {
  version: 2;
  document: {
    nodes: StoredTreeBrowserNode[];
    revision: number;
  };
  semanticState: TreeBrowserSemanticState;
  viewState: Omit<
    TreeBrowserViewState,
    "contentVisibleByNodeId" | "pageSizes"
  > & {
    contentVisibleByNodeId?: Record<string, boolean>;
    pageSizes: Record<string, TreeBrowserPageSize | 10>;
  };
};

type LegacyStoredNode = {
  id: string;
  label: string;
  enabled: boolean;
  contentVisible: boolean;
  contentEditable?: boolean;
  listEditable?: boolean;
  listItemLimit?: number;
  children: LegacyStoredNode[];
};

type LegacyStoredTreeBrowserModel = {
  version: 1;
  nodes: LegacyStoredNode[];
  pages: Record<string, number>;
  pageSizes: Record<string, TreeBrowserPageSize | 10>;
  selectedPath: string[];
};

export type TreeBrowserModelOptions<TData> = {
  definitionAuthority?: boolean;
  initialTree: TreeBrowserModelInitialNode<TData>[];
  storageKey: string;
  store?: ClientStateStore;
};

export class TreeBrowserModel<TData = unknown> {
  readonly storageKey: string;
  readonly initialTree: TreeBrowserModelInitialNode<TData>[];
  private readonly definitionAuthority: boolean;
  private readonly store: ClientStateStore;
  private readonly slice: ClientStateSlice<StoredTreeBrowserModel>;

  constructor({
    definitionAuthority = false,
    initialTree,
    storageKey,
    store = clientStateStore,
  }: TreeBrowserModelOptions<TData>) {
    this.initialTree = initialTree;
    this.definitionAuthority = definitionAuthority;
    this.storageKey = storageKey;
    this.store = store;
    const initialized = initializeTree(initialTree);
    this.slice = {
      name: toTreeSliceName(storageKey),
      version: 1,
      defaultValue: createStoredModel(initialized),
      validate: isStoredModel,
      legacyKeys: [storageKey],
      migrateLegacy: migrateLegacyModel,
    };
  }

  load(): TreeBrowserModelState<TData> {
    const initialized = initializeTree(this.initialTree);
    const stored = this.store.get(this.slice);
    const nodes = this.definitionAuthority
      ? initialized.document.nodes
      : mergeNodes(initialized.document.nodes, stored.document.nodes);
    const nodeIds = collectNodeIds(nodes);
    const semanticState = this.definitionAuthority
      ? initialized.semanticState
      : {
      enabledByNodeId: mergeBooleanState(
        initialized.semanticState.enabledByNodeId,
        stored.semanticState.enabledByNodeId,
        nodeIds,
      ),
    };
    const contentVisibleByNodeId = createDefaultContentVisibility(nodes);

    return {
      document: {
        nodes,
        revision: this.definitionAuthority
          ? initialized.document.revision
          : stored.document.revision,
      },
      semanticState,
      viewState: {
        contentVisibleByNodeId,
        pages: stored.viewState.pages,
        pageSizes: normalizePageSizes(stored.viewState.pageSizes),
        selectedPath: repairSelectedPath(nodes, stored.viewState.selectedPath),
      },
    };
  }

  save(state: TreeBrowserModelState<TData>) {
    this.store.set(this.slice, createStoredModel(state));
  }
}

function initializeTree<TData>(
  nodes: TreeBrowserModelInitialNode<TData>[],
): TreeBrowserModelState<TData> {
  const enabledByNodeId: Record<string, boolean> = {};
  const contentVisibleByNodeId: Record<string, boolean> = {};

  function initialize(
    initialNodes: TreeBrowserModelInitialNode<TData>[],
  ): TreeBrowserModelNode<TData>[] {
    return initialNodes.map((node) => {
      enabledByNodeId[node.id] = node.enabled;
      contentVisibleByNodeId[node.id] = node.children.length === 0;
      return {
        id: node.id,
        kind: node.kind,
        label: node.label,
        localId: node.localId,
        contentEditable: node.contentEditable ?? true,
        listEditable: node.listEditable ?? true,
        listItemLimit: node.listItemLimit,
        data: node.data,
        children: initialize(node.children),
      };
    });
  }

  return {
    document: { nodes: initialize(nodes), revision: 0 },
    semanticState: { enabledByNodeId },
    viewState: {
      contentVisibleByNodeId,
      pages: {},
      pageSizes: {},
      selectedPath: [],
    },
  };
}

function mergeNodes<TData>(
  definitions: TreeBrowserModelNode<TData>[],
  storedNodes: StoredTreeBrowserNode[],
): TreeBrowserModelNode<TData>[] {
  const definitionsById = new Map(definitions.map((node) => [node.id, node]));
  const storedById = new Map(storedNodes.map((node) => [node.id, node]));
  const orderedIds = [
    ...storedNodes.map(({ id }) => id),
    ...definitions.filter(({ id }) => !storedById.has(id)).map(({ id }) => id),
  ];

  return orderedIds.flatMap((id) => {
    const definition = definitionsById.get(id);
    const stored = storedById.get(id);
    if (!definition && stored) return [restoreStoredNode<TData>(stored)];
    if (!definition) return [];
    if (!stored) return [definition];

    return [{
      ...definition,
      kind: definition.kind ?? stored.kind,
      label: definition.data === undefined ? stored.label : definition.label,
      localId: definition.data === undefined
        ? stored.localId ?? definition.localId
        : definition.localId,
      contentEditable: definition.data === undefined
        ? stored.contentEditable
        : definition.contentEditable,
      listEditable: definition.data === undefined
        ? stored.listEditable
        : definition.listEditable,
      listItemLimit: definition.data === undefined
        ? stored.listItemLimit
        : definition.listItemLimit,
      children: mergeNodes(definition.children, stored.children),
    }];
  });
}

function restoreStoredNode<TData>(
  node: StoredTreeBrowserNode,
): TreeBrowserModelNode<TData> {
  return {
    ...node,
    children: node.children.map(restoreStoredNode<TData>),
  };
}

function stripData<TData>(
  nodes: TreeBrowserModelNode<TData>[],
): StoredTreeBrowserNode[] {
  return nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    label: node.label,
    localId: node.localId,
    contentEditable: node.contentEditable,
    listEditable: node.listEditable,
    listItemLimit: node.listItemLimit,
    children: stripData(node.children),
  }));
}

function createStoredModel<TData>(
  state: TreeBrowserModelState<TData>,
): StoredTreeBrowserModel {
  return {
    version: 2,
    document: {
      nodes: stripData(state.document.nodes),
      revision: state.document.revision,
    },
    semanticState: state.semanticState,
    viewState: {
      pages: state.viewState.pages,
      pageSizes: state.viewState.pageSizes,
      selectedPath: state.viewState.selectedPath,
    },
  };
}

function migrateLegacyModel(value: unknown): StoredTreeBrowserModel | null {
  if (!isLegacyStoredModel(value)) return null;
  const enabledByNodeId: Record<string, boolean> = {};
  function migrateNodes(nodes: LegacyStoredNode[]): StoredTreeBrowserNode[] {
    return nodes.map((node) => {
      enabledByNodeId[node.id] = node.enabled;
      return {
        id: node.id,
        label: node.label,
        contentEditable: node.contentEditable ?? true,
        listEditable: node.listEditable ?? true,
        listItemLimit: node.listItemLimit,
        children: migrateNodes(node.children),
      };
    });
  }
  return {
    version: 2,
    document: { nodes: migrateNodes(value.nodes), revision: 0 },
    semanticState: { enabledByNodeId },
    viewState: {
      pages: value.pages,
      pageSizes: value.pageSizes,
      selectedPath: value.selectedPath,
    },
  };
}

export function repairSelectedPath<TData>(
  nodes: TreeBrowserModelNode<TData>[],
  selectedPath: string[],
) {
  const repaired: string[] = [];
  let siblings = nodes;
  for (const id of selectedPath) {
    const node = siblings.find((candidate) => candidate.id === id);
    if (!node) break;
    repaired.push(id);
    siblings = node.children;
  }
  return repaired;
}

export function createTreeBrowserSnapshot<TData>(
  nodes: TreeBrowserModelNode<TData>[],
  semanticState: TreeBrowserSemanticState,
  viewState: TreeBrowserViewState,
): readonly TreeBrowserModelSnapshotNode<TData>[] {
  return Object.freeze(nodes.map((node) => Object.freeze({
    ...node,
    enabled: semanticState.enabledByNodeId[node.id] ?? false,
    contentVisible: viewState.contentVisibleByNodeId[node.id] ?? false,
    children: createTreeBrowserSnapshot(node.children, semanticState, viewState),
  })));
}

function mergeBooleanState(
  defaults: Record<string, boolean>,
  stored: Record<string, boolean>,
  validIds: Set<string>,
) {
  return Object.fromEntries([...validIds].map((id) => [
    id,
    stored[id] ?? defaults[id] ?? false,
  ]));
}

function collectNodeIds<TData>(nodes: TreeBrowserModelNode<TData>[]) {
  const ids = new Set<string>();
  for (const node of nodes) {
    ids.add(node.id);
    for (const id of collectNodeIds(node.children)) ids.add(id);
  }
  return ids;
}

function toTreeSliceName(storageKey: string) {
  return storageKey.startsWith("flydeck.tree.")
    ? `tree.${storageKey.slice("flydeck.tree.".length)}`
    : `tree.${storageKey}`;
}

function isStoredModel(value: unknown): value is StoredTreeBrowserModel {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredTreeBrowserModel>;
  return candidate.version === 2
    && isStoredDocument(candidate.document)
    && isSemanticState(candidate.semanticState)
    && isViewState(candidate.viewState);
}

function isStoredDocument(
  value: unknown,
): value is StoredTreeBrowserModel["document"] {
  if (!value || typeof value !== "object") return false;
  const document = value as StoredTreeBrowserModel["document"];
  return Number.isInteger(document.revision)
    && document.revision >= 0
    && Array.isArray(document.nodes)
    && document.nodes.every(isStoredNode);
}

function isStoredNode(value: unknown): value is StoredTreeBrowserNode {
  if (!value || typeof value !== "object") return false;
  const node = value as Partial<StoredTreeBrowserNode>;
  return typeof node.id === "string"
    && (node.kind === undefined || typeof node.kind === "string")
    && typeof node.label === "string"
    && (node.localId === undefined || typeof node.localId === "string")
    && typeof node.contentEditable === "boolean"
    && typeof node.listEditable === "boolean"
    && (node.listItemLimit === undefined || (
      Number.isInteger(node.listItemLimit) && Number(node.listItemLimit) >= 0
    ))
    && Array.isArray(node.children)
    && node.children.every(isStoredNode);
}

function isSemanticState(value: unknown): value is TreeBrowserSemanticState {
  if (!value || typeof value !== "object") return false;
  return isBooleanRecord((value as TreeBrowserSemanticState).enabledByNodeId);
}

function isViewState(
  value: unknown,
): value is StoredTreeBrowserModel["viewState"] {
  if (!value || typeof value !== "object") return false;
  const view = value as StoredTreeBrowserModel["viewState"];
  return (view.contentVisibleByNodeId === undefined
      || isBooleanRecord(view.contentVisibleByNodeId))
    && isPageRecord(view.pages)
    && isPageSizeRecord(view.pageSizes)
    && Array.isArray(view.selectedPath)
    && view.selectedPath.every((id) => typeof id === "string");
}

function createDefaultContentVisibility<TData>(
  nodes: TreeBrowserModelNode<TData>[],
) {
  const visibility: Record<string, boolean> = {};
  function visit(currentNodes: TreeBrowserModelNode<TData>[]) {
    for (const node of currentNodes) {
      visibility[node.id] = node.children.length === 0;
      visit(node.children);
    }
  }
  visit(nodes);
  return visibility;
}

function isLegacyStoredModel(
  value: unknown,
): value is LegacyStoredTreeBrowserModel {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LegacyStoredTreeBrowserModel>;
  return candidate.version === 1
    && Array.isArray(candidate.nodes)
    && candidate.nodes.every(isLegacyStoredNode)
    && Array.isArray(candidate.selectedPath)
    && candidate.selectedPath.every((id) => typeof id === "string")
    && isPageRecord(candidate.pages)
    && isPageSizeRecord(candidate.pageSizes);
}

function isLegacyStoredNode(value: unknown): value is LegacyStoredNode {
  if (!value || typeof value !== "object") return false;
  const node = value as Partial<LegacyStoredNode>;
  return typeof node.id === "string"
    && typeof node.label === "string"
    && typeof node.enabled === "boolean"
    && typeof node.contentVisible === "boolean"
    && (node.contentEditable === undefined
      || typeof node.contentEditable === "boolean")
    && (node.listEditable === undefined || typeof node.listEditable === "boolean")
    && (node.listItemLimit === undefined || (
      Number.isInteger(node.listItemLimit) && Number(node.listItemLimit) >= 0
    ))
    && Array.isArray(node.children)
    && node.children.every(isLegacyStoredNode);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    && Object.values(value as Record<string, unknown>).every(
      (entry) => typeof entry === "boolean",
    );
}

function isPageRecord(value: unknown): value is Record<string, number> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    && Object.values(value as Record<string, unknown>).every(
      (page) => Number.isInteger(page) && Number(page) >= 0,
    );
}

function isPageSizeRecord(
  value: unknown,
): value is Record<string, TreeBrowserPageSize> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    && Object.values(value as Record<string, unknown>).every(
      (size) => size === 3 || size === 5 || size === 9 || size === 10,
    );
}

function normalizePageSizes(
  pageSizes: Record<string, TreeBrowserPageSize | 10>,
): Record<string, TreeBrowserPageSize> {
  return Object.fromEntries(Object.entries(pageSizes).map(([id, size]) => [
    id,
    size === 10 ? 9 : size,
  ]));
}
