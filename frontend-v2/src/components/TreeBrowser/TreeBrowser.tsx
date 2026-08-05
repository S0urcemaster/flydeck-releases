import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Base, resolveCssValue, type BaseStyleProps } from "../Base";
import { BrowserItem, type BrowserItemProps } from "../BrowserItem";
import { ListControl, type ListControlProps } from "../ListControl";
import type { ListControlListSize } from "../ListControlListSizeButton";
import {
  TreeBrowserModel,
  createTreeBrowserSnapshot,
  type TreeBrowserModelInitialNode,
  type TreeBrowserModelNode,
  type TreeBrowserModelSnapshotNode,
  type TreeBrowserSemanticState,
  type TreeBrowserViewState,
} from "./TreeBrowserModel";
import styles from "./TreeBrowser.module.css";

export type TreeBrowserNode<TData = unknown> = {
  id: string;
  kind?: string;
  label: string;
  enabled: boolean;
  contentVisible: boolean;
  contentEditable?: boolean;
  listEditable?: boolean;
  listItemLimit?: number;
  data?: TData;
  children: TreeBrowserNode<TData>[];
};
export type TreeBrowserInitialNode<TData = unknown> =
  TreeBrowserModelInitialNode<TData>;

export type TreeBrowserRootTarget = {
  id: string | null;
  label: string;
  eligible: boolean;
};

export type TreeBrowserRootControl = {
  current: TreeBrowserRootTarget;
  targets: readonly TreeBrowserRootTarget[];
  onChange: (parentId: string | null) => Promise<boolean>;
};

export type TreeBrowserContentRenderProps<TContent> = {
  height?: string;
  node: TreeBrowserNode<TContent>;
  root?: TreeBrowserRootControl;
};

export type TreeBrowserProps<TContent = unknown> = BaseStyleProps & {
  componentName?: string;
  browserLabel?: string;
  model: TreeBrowserModel<TContent>;
  rootListEditable?: boolean;
  rootListItemLimit?: number;
  initialSelectedPath?: string[];
  rowGap?: string;
  browserItemProps?: Omit<
    BrowserItemProps,
    | "enabled"
    | "editable"
    | "label"
    | "onDelete"
    | "onEnabledChange"
    | "onSelect"
    | "mode"
    | "onModeChange"
    | "selected"
    | "activeColor"
  >;
  renderContent?: (
    props: TreeBrowserContentRenderProps<TContent>
  ) => ReactNode;
  onTreeChange?: (
    nodes: readonly TreeBrowserModelSnapshotNode<TContent>[]
  ) => void;
  canCreateNode?: (parentId: string) => boolean;
  createNode?: (
    name: string,
    parentId: string,
  ) => TreeBrowserNode<TContent>;
  onCreateNode?: (
    name: string,
    parentId: string | null,
    afterNodeId: string | null,
  ) => TreeBrowserNode<TContent> | false | void
    | Promise<TreeBrowserNode<TContent> | false | void>;
  onRenameNode?: (
    nodeId: string,
    name: string,
  ) => boolean | void | Promise<boolean | void>;
  onMoveNode?: (
    nodeId: string,
    afterNodeId: string | null,
  ) => boolean | void | Promise<boolean | void>;
  onReparentNode?: (
    nodeId: string,
    parentId: string | null,
  ) => boolean | void | Promise<boolean | void>;
  onDeleteNode?: (nodeId: string) => boolean | void | Promise<boolean | void>;
  onEnabledNode?: (
    nodeId: string,
    enabled: boolean,
  ) => boolean | void | Promise<boolean | void>;
  onSelectedPathChange?: (
    selectedPath: string[],
  ) => boolean | void | Promise<boolean | void>;
  listControlProps?: Omit<
    ListControlProps,
    | "itemCount"
    | "itemLimit"
    | "itemNames"
    | "editable"
    | "onNew"
    | "onRename"
    | "onPageChange"
    | "onPageSizeChange"
    | "page"
    | "pageSize"
    | "selectedName"
  >;
};

const defaultPageSize: ListControlListSize = 5;
const rootId = "__tree_root__";

export function TreeBrowser<TContent = unknown>({
  componentName = "TreeBrowser",
  browserLabel = "Tree browser",
  model,
  rootListEditable = true,
  rootListItemLimit,
  initialSelectedPath,
  rowGap,
  browserItemProps,
  renderContent,
  onTreeChange,
  canCreateNode = () => true,
  createNode = createDefaultNode,
  onCreateNode,
  onRenameNode,
  onMoveNode,
  onReparentNode,
  onDeleteNode,
  onEnabledNode,
  onSelectedPathChange,
  listControlProps,
  color = "COLOR_TEXT",
  background = "transparent",
  border = "BORDER_STANDARD",
  padding = "SPACE_XS",
  ...baseProps
}: TreeBrowserProps<TContent>) {
  const [initialState] = useState(() => model.load());
  const [tree, setTree] = useState(initialState.document.nodes);
  const [revision, setRevision] = useState(initialState.document.revision);
  const [enabledByNodeId, setEnabledByNodeId] = useState(
    initialState.semanticState.enabledByNodeId,
  );
  const [contentVisibleByNodeId, setContentVisibleByNodeId] = useState(
    initialState.viewState.contentVisibleByNodeId,
  );
  const [selectedPath, setSelectedPath] = useState(
    initialSelectedPath ?? initialState.viewState.selectedPath,
  );
  const [pages, setPages] = useState(initialState.viewState.pages);
  const [pageSizes, setPageSizes] = useState(initialState.viewState.pageSizes);
  const selectionPending = useRef(false);
  const semanticState: TreeBrowserSemanticState = useMemo(
    () => ({ enabledByNodeId }),
    [enabledByNodeId],
  );
  const viewState: TreeBrowserViewState = useMemo(() => ({
    contentVisibleByNodeId,
    pages,
    pageSizes,
    selectedPath,
  }), [contentVisibleByNodeId, pageSizes, pages, selectedPath]);

  useEffect(() => {
    onTreeChange?.(createTreeBrowserSnapshot(tree, semanticState, viewState));
  }, [onTreeChange, semanticState, tree, viewState]);

  useEffect(() => {
    model.save({
      document: { nodes: tree, revision },
      semanticState,
      viewState,
    });
  }, [
    model,
    revision,
    semanticState,
    tree,
    viewState,
  ]);

  async function selectNode(depth: number, id: string) {
    const nextPath = [...selectedPath.slice(0, depth), id];
    if (nextPath.length === selectedPath.length
      && nextPath.every((value, index) => value === selectedPath[index])) return;
    if (onSelectedPathChange) {
      if (selectionPending.current) return;
      selectionPending.current = true;
      try {
        const confirmed = await onSelectedPathChange(nextPath);
        if (confirmed !== false) setSelectedPath(nextPath);
      } finally {
        selectionPending.current = false;
      }
      return;
    }
    setSelectedPath(nextPath);
  }

  async function removeNode(id: string) {
    if (onDeleteNode) {
      const confirmed = await onDeleteNode(id);
      if (confirmed === false) return;
    }
    const removedIds = findSubtreeIds(tree, id);
    setTree((current) => removeFromTree(current, id));
    setRevision((current) => current + 1);
    setEnabledByNodeId((current) => omitRecordKeys(current, removedIds));
    setContentVisibleByNodeId((current) => omitRecordKeys(current, removedIds));
    setSelectedPath((current) => {
      const removedDepth = current.indexOf(id);
      return removedDepth < 0 ? current : current.slice(0, removedDepth);
    });
  }

  async function reparentNode(nodeId: string, parentId: string | null) {
    if (!onReparentNode) return false;
    const confirmed = await onReparentNode(nodeId, parentId);
    if (confirmed === false) return false;
    const target = parentId ? findTreeNode(tree, parentId) : null;
    const nextPath = parentId
      ? [...(findTreePath(tree, parentId) ?? []), nodeId]
      : [nodeId];
    const targetItemCount = target ? target.children.length : tree.length;
    setTree((current) => reparentInTree(current, nodeId, parentId));
    setRevision((current) => current + 1);
    if (parentId) {
      setContentVisibleByNodeId((current) => ({
        ...current,
        [parentId]: false,
      }));
    }
    const targetListId = parentId ?? rootId;
    setPages((current) => ({
      ...current,
      [targetListId]: Math.floor(
        targetItemCount / (pageSizes[targetListId] ?? defaultPageSize),
      ),
    }));
    if (onSelectedPathChange) {
      const selectionConfirmed = await onSelectedPathChange(nextPath);
      if (selectionConfirmed === false) return false;
    }
    setSelectedPath(nextPath);
    return true;
  }

  function renderLevel(
    nodes: TreeBrowserModelNode<TContent>[],
    parentId: string,
    depth: number,
    listEditable: boolean,
    listItemLimit?: number,
  ) {
    const pageSize = pageSizes[parentId] ?? defaultPageSize;
    const pageCount = Math.max(1, Math.ceil(nodes.length / pageSize));
    const page = Math.min(pages[parentId] ?? 0, pageCount - 1);
    const visibleNodes = nodes.slice(
      page * pageSize,
      (page + 1) * pageSize,
    );
    const selectedId = selectedPath[depth];
    const selectedNode = nodes.find(({ id }) => id === selectedId);
    const selectedIndex = nodes.findIndex(({ id }) => id === selectedId);

    async function moveSelected(direction: -1 | 1) {
      if (!selectedNode) {
        return;
      }
      const nextIndex = selectedIndex + direction;
      if (onMoveNode) {
        const afterNodeId = direction < 0
          ? nodes[selectedIndex - 2]?.id ?? null
          : nodes[nextIndex]?.id ?? null;
        const confirmed = await onMoveNode(selectedNode.id, afterNodeId);
        if (confirmed === false) return;
      }
      setTree((current) => moveInTree(current, selectedNode.id, direction));
      setRevision((current) => current + 1);
      setPages((current) => ({
        ...current,
        [parentId]: Math.floor(nextIndex / pageSize),
      }));
    }

    async function addNode(name: string) {
      if (!listEditable || nodes.length >= (listItemLimit ?? Infinity)) return;
      if (onCreateNode) {
        const confirmedNode = await onCreateNode(
          name,
          parentId === rootId ? null : parentId,
          selectedNode?.id ?? nodes.at(-1)?.id ?? null,
        );
        if (!confirmedNode) return;
        insertNode(confirmedNode);
        await selectNode(depth, confirmedNode.id);
        return;
      }
      insertNode(createNode(name, parentId));
    }

    function insertNode(node: TreeBrowserNode<TContent>) {
      const documentNode = toDocumentNode(node);
      const nextIndex = selectedIndex < 0 ? nodes.length : selectedIndex + 1;
      setTree((current) =>
        parentId === rootId
          ? insertAt(current, nextIndex, documentNode)
          : mapTree(current, parentId, (parent) => ({
              ...parent,
              children: insertAt(parent.children, nextIndex, documentNode),
            })));
      setRevision((current) => current + 1);
      setEnabledByNodeId((current) => ({
        ...current,
        [node.id]: node.enabled,
      }));
      setContentVisibleByNodeId((current) => ({
        ...current,
        [node.id]: node.contentVisible,
      }));
      setPages((current) => ({
        ...current,
        [parentId]: Math.floor(nextIndex / pageSize),
      }));
      setSelectedPath((current) => [...current.slice(0, depth), node.id]);
    }

    async function renameSelected(name: string) {
      if (!selectedNode) return;
      if (onRenameNode) {
        const confirmed = await onRenameNode(selectedNode.id, name);
        if (confirmed === false) return;
      }
      const renamedNodes = nodes.map((node) =>
        node.id === selectedNode.id ? { ...node, label: name } : node);
      setTree((current) =>
        parentId === rootId
          ? renamedNodes
          : mapTree(current, parentId, (parent) => ({
              ...parent,
              children: renamedNodes,
            })));
      setRevision((current) => current + 1);
    }

    return (
      <section
        className={styles.level}
        style={{ rowGap: resolveCssValue(rowGap) }}
        aria-label={depth === 0 ? "Root children" : `Children of ${parentId}`}
        key={`${parentId}-${depth}`}
      >
        <ListControl
          {...listControlProps}
          itemCount={nodes.length}
          itemNames={nodes.map(({ label }) => label)}
          selectedName={selectedNode?.label}
          page={page}
          pageSize={pageSize}
          editable={listEditable}
          itemLimit={listItemLimit}
          onNew={listEditable && canCreateNode(parentId) ? addNode : undefined}
          onRename={listEditable && selectedNode ? renameSelected : undefined}
          onPageSizeChange={(nextPageSize) => {
            setPageSizes((current) => ({
              ...current,
              [parentId]: nextPageSize,
            }));
            setPages((current) => ({ ...current, [parentId]: 0 }));
          }}
          moveDownDisabled={
            !listEditable || selectedIndex < 0 || selectedIndex === nodes.length - 1
          }
          moveUpDisabled={!listEditable || selectedIndex <= 0}
          onMoveDown={() => moveSelected(1)}
          onMoveUp={() => moveSelected(-1)}
          onPageChange={(nextPage) => {
            setPages((current) => ({ ...current, [parentId]: nextPage }));
          }}
        />
        <div
          className={styles.list}
          style={{ rowGap: resolveCssValue(rowGap) }}
        >
          {visibleNodes.map((node) => {
            const enabled = enabledByNodeId[node.id] ?? false;
            const contentVisible = contentVisibleByNodeId[node.id] ?? false;
            return (
              <BrowserItem
                {...browserItemProps}
                enabled={enabled}
                editable={listEditable}
                key={node.id}
                label={node.label}
                selected={node.id === selectedId}
                activeColor={
                  depth % 2 === 0
                    ? "COLOR_ACCENT_ONE"
                    : "COLOR_ACCENT_TWO"
                }
                onDelete={() => removeNode(node.id)}
                mode={contentVisible ? "content" : "list"}
                onModeChange={renderContent
                  ? (mode) => setContentVisibleByNodeId((current) => ({
                      ...current,
                      [node.id]: mode === "content",
                    }))
                  : undefined}
                onEnabledChange={async () => {
                  if (onEnabledNode) {
                    const confirmed = await onEnabledNode(node.id, !enabled);
                    if (confirmed !== false) {
                      setEnabledByNodeId((current) => ({
                        ...current,
                        [node.id]: !enabled,
                      }));
                    }
                    return;
                  }
                  setEnabledByNodeId((current) => ({
                    ...current,
                    [node.id]: !enabled,
                  }));
                }}
                onSelect={() => selectNode(depth, node.id)}
              />
            );
          })}
          {Array.from(
            { length: pageSize - visibleNodes.length },
            (_, index) => (
              <span
                className={styles.emptyItem}
                style={{
                  border: resolveCssValue(browserItemProps?.border),
                  height: resolveCssValue(
                    browserItemProps?.buttonProps?.height,
                  ),
                }}
                aria-hidden="true"
                key={`empty-${index}`}
              />
            ),
          )}
        </div>
        {selectedNode
          ? (contentVisibleByNodeId[selectedNode.id] ?? false)
            ? renderContent?.({
                node: toTreeBrowserNode(
                  selectedNode,
                  enabledByNodeId,
                  contentVisibleByNodeId,
                ),
                height: createContentHeight(
                  pageSizes[selectedNode.id] ?? defaultPageSize,
                  browserItemProps?.buttonProps?.height,
                  rowGap,
                ),
                root: onReparentNode ? {
                  current: parentId === rootId
                    ? { id: null, label: "", eligible: true }
                    : {
                        id: parentId,
                        label: findTreeNode(tree, parentId)?.label ?? "",
                        eligible: true,
                      },
                  targets: createRootTargets(
                    tree,
                    selectedNode.id,
                    rootListItemLimit,
                  ),
                  onChange: (nextParentId) => reparentNode(
                    selectedNode.id,
                    nextParentId,
                  ),
                } : undefined,
              })
            : renderLevel(
                selectedNode.children,
                selectedNode.id,
                depth + 1,
                selectedNode.listEditable !== false,
                selectedNode.listItemLimit,
              )
          : null}
      </section>
    );
  }

  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName={componentName}
      color={color}
      background={background}
      border={border}
      padding={padding}
      aria-label={browserLabel}
    >
      {renderLevel(tree, rootId, 0, rootListEditable, rootListItemLimit)}
    </Base>
  );
}

function createContentHeight(
  pageSize: ListControlListSize,
  itemHeight: string | undefined,
  rowGap: string | undefined,
): string | undefined {
  const resolvedHeight = resolveCssValue(itemHeight);
  if (!resolvedHeight) {
    return undefined;
  }
  const resolvedGap = resolveCssValue(rowGap ?? "0");
  return `calc((${resolvedHeight} * ${pageSize + 1}) + (${resolvedGap} * ${pageSize}))`;
}

function createDefaultNode<TContent>(
  name: string,
  parentId: string,
): TreeBrowserNode<TContent> {
  return {
    id: createNodeId(parentId, name),
    label: name,
    enabled: true,
    contentVisible: true,
    contentEditable: true,
    listEditable: true,
    children: [],
  };
}

function createNodeId(parentId: string, name: string): string {
  const slug = name
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${parentId}:${slug || "item"}`;
}

export function mapTree<TNode extends { id: string; children: TNode[] }>(
  nodes: TNode[],
  id: string,
  update: (node: TNode) => TNode,
): TNode[] {
  return nodes.map((node) => node.id === id
    ? update(node)
    : { ...node, children: mapTree(node.children, id, update) });
}

export function insertAt<TItem>(items: TItem[], index: number, item: TItem) {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

export function removeFromTree<
  TNode extends { id: string; children: TNode[] },
>(
  nodes: TNode[],
  id: string,
): TNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeFromTree(node.children, id),
    }));
}

export function moveInTree<
  TNode extends { id: string; children: TNode[] },
>(
  nodes: TNode[],
  id: string,
  direction: -1 | 1,
): TNode[] {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    const destination = index + direction;
    if (destination < 0 || destination >= nodes.length) {
      return nodes;
    }
    const next = [...nodes];
    [next[index], next[destination]] = [next[destination], next[index]];
    return next;
  }

  return nodes.map((node) => ({
    ...node,
    children: moveInTree(node.children, id, direction),
  }));
}

export function reparentInTree<
  TNode extends { id: string; children: TNode[] },
>(nodes: TNode[], nodeId: string, parentId: string | null): TNode[] {
  const node = findTreeNode(nodes, nodeId);
  if (!node || node.id === parentId || collectTreeIds(node).has(parentId ?? "")) {
    return nodes;
  }
  const withoutNode = removeFromTree(nodes, nodeId);
  if (parentId === null) return [...withoutNode, node];
  return mapTree(withoutNode, parentId, (parent) => ({
    ...parent,
    children: [...parent.children, node],
  }));
}

export function createRootTargets<
  TNode extends {
    id: string;
    label: string;
    listEditable?: boolean;
    listItemLimit?: number;
    children: TNode[];
  },
>(nodes: TNode[], nodeId: string, rootItemLimit?: number): TreeBrowserRootTarget[] {
  const source = findTreeNode(nodes, nodeId);
  const forbidden = source ? collectTreeIds(source) : new Set<string>();
  return [{
    id: null,
    label: "",
    eligible: nodes.length < (rootItemLimit ?? Infinity),
  }, ...flattenTree(nodes).map((node) => ({
    id: node.id,
    label: node.label,
    eligible: !forbidden.has(node.id)
      && node.listEditable !== false
      && node.children.length < (node.listItemLimit ?? Infinity),
  }))];
}

function findTreeNode<TNode extends { id: string; children: TNode[] }>(
  nodes: TNode[],
  id: string,
): TNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findTreeNode(node.children, id);
    if (nested) return nested;
  }
}

function findTreePath<TNode extends { id: string; children: TNode[] }>(
  nodes: TNode[],
  id: string,
): string[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node.id];
    const nested = findTreePath(node.children, id);
    if (nested) return [node.id, ...nested];
  }
  return null;
}

function flattenTree<TNode extends { children: TNode[] }>(nodes: TNode[]): TNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

function collectTreeIds<TNode extends { id: string; children: TNode[] }>(
  node: TNode,
): Set<string> {
  return new Set([
    node.id,
    ...node.children.flatMap((child) => [...collectTreeIds(child)]),
  ]);
}

function toDocumentNode<TContent>(
  node: TreeBrowserNode<TContent>,
): TreeBrowserModelNode<TContent> {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    contentEditable: node.contentEditable ?? true,
    listEditable: node.listEditable ?? true,
    listItemLimit: node.listItemLimit,
    data: node.data,
    children: node.children.map(toDocumentNode),
  };
}

function toTreeBrowserNode<TContent>(
  node: TreeBrowserModelNode<TContent>,
  enabledByNodeId: Record<string, boolean>,
  contentVisibleByNodeId: Record<string, boolean>,
): TreeBrowserNode<TContent> {
  return {
    ...node,
    enabled: enabledByNodeId[node.id] ?? false,
    contentVisible: contentVisibleByNodeId[node.id] ?? false,
    children: node.children.map((child) => toTreeBrowserNode(
      child,
      enabledByNodeId,
      contentVisibleByNodeId,
    )),
  };
}

function omitRecordKeys<TValue>(
  record: Record<string, TValue>,
  keys: Set<string>,
) {
  return Object.fromEntries(
    Object.entries(record).filter(([entryKey]) => !keys.has(entryKey)),
  ) as Record<string, TValue>;
}

function findSubtreeIds<TContent>(
  nodes: TreeBrowserModelNode<TContent>[],
  id: string,
): Set<string> {
  for (const node of nodes) {
    if (node.id === id) return collectSubtreeIds(node);
    const nested = findSubtreeIds(node.children, id);
    if (nested.size > 0) return nested;
  }
  return new Set();
}

function collectSubtreeIds<TContent>(
  node: TreeBrowserModelNode<TContent>,
): Set<string> {
  return new Set([
    node.id,
    ...node.children.flatMap((child) => [...collectSubtreeIds(child)]),
  ]);
}
