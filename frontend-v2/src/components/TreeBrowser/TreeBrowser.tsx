import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createTreeNodeLocalId } from "@flydeck/shared/v2";

import { Base, resolveCssValue, type BaseStyleProps } from "../Base";
import { BrowserItem, type BrowserItemProps } from "../BrowserItem";
import {
  ListControl,
  ListControlInput,
  type ListControlInputProps,
  type ListControlProps,
} from "../ListControl";
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
  localId?: string;
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
  path: string;
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
  localIdAvailable: (localId: string) => boolean;
  onLocalIdChange?: (localId: string) => Promise<boolean>;
  root?: TreeBrowserRootControl;
};

export type TreeBrowserProps<TContent = unknown> = BaseStyleProps & {
  componentName?: string;
  browserLabel?: string;
  defaultPageSize?: ListControlListSize;
  rootPageSize?: ListControlListSize;
  model: TreeBrowserModel<TContent>;
  rootListEditable?: boolean;
  rootListItemLimit?: number;
  initialSelectedPath?: string[];
  rowGap?: string;
  browserItemProps?: Omit<
    BrowserItemProps,
    | "checked"
    | "label"
    | "itemNumber"
    | "onCheckedChange"
    | "onSelect"
    | "selected"
    | "activeColor"
  >;
  renderContent?: (
    props: TreeBrowserContentRenderProps<TContent>
  ) => ReactNode;
  renderInlineContent?: (
    props: Pick<TreeBrowserContentRenderProps<TContent>, "node">
  ) => ReactNode;
  onTreeChange?: (
    nodes: readonly TreeBrowserModelSnapshotNode<TContent>[]
  ) => void;
  canCreateNode?: (parentId: string) => boolean;
  canDeleteNode?: (
    node: TreeBrowserModelNode<TContent>,
    parent: TreeBrowserModelNode<TContent> | null,
  ) => boolean;
  canMoveNode?: (
    node: TreeBrowserModelNode<TContent>,
    direction: -1 | 1,
    siblings: readonly TreeBrowserModelNode<TContent>[],
  ) => boolean;
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
  onUpdateNodeLocalId?: (
    nodeId: string,
    localId: string,
  ) => boolean | void | Promise<boolean | void>;
  onMoveNode?: (
    nodeId: string,
    afterNodeId: string | null,
  ) => boolean | void | Promise<boolean | void>;
  onReparentNode?: (
    nodeId: string,
    parentId: string | null,
    userCommandId?: string,
  ) => boolean | void | Promise<boolean | void>;
  onDeleteNode?: (
    nodeId: string,
    userCommandId?: string,
  ) => boolean | void | Promise<boolean | void>;
  onSelectedPathChange?: (
    selectedPath: string[],
  ) => boolean | void | Promise<boolean | void>;
  listControlProps?: Omit<
    ListControlProps,
    | "activeColor"
    | "itemCount"
    | "onPageChange"
    | "onChildPageSizeChange"
    | "page"
    | "pageSize"
    | "mode"
    | "onModeChange"
    | "showModeButton"
    | "showPageButtons"
    | "childPageSize"
    | "selectedName"
  > & Pick<
    ListControlInputProps,
    "deleteButtonProps" | "inputProps" | "newButtonProps"
  >;
};

const rootId = "__tree_root__";
type TreeSearchContext = {
  includeDescendants: boolean;
  value: string;
};

function listLevelActiveColor(depth: number) {
  return depth % 2 === 0 ? "COLOR_ACCENT_ONE" : "COLOR_ACCENT_TWO";
}

export function TreeBrowser<TContent = unknown>({
  componentName = "TreeBrowser",
  browserLabel = "Tree browser",
  defaultPageSize = 7,
  rootPageSize = defaultPageSize,
  model,
  rootListEditable = true,
  rootListItemLimit,
  initialSelectedPath,
  rowGap,
  browserItemProps,
  renderContent,
  renderInlineContent,
  onTreeChange,
  canCreateNode = () => true,
  canDeleteNode,
  canMoveNode = () => true,
  createNode = createDefaultNode,
  onCreateNode,
  onRenameNode,
  onUpdateNodeLocalId,
  onMoveNode,
  onReparentNode,
  onDeleteNode,
  onSelectedPathChange,
  listControlProps,
  color,
  background,
  border,
  padding,
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
  const [actionSelectionByListId, setActionSelectionByListId] = useState(
    () => createInitialActionSelection(
      initialSelectedPath ?? initialState.viewState.selectedPath,
    ),
  );
  const [pages, setPages] = useState(initialState.viewState.pages);
  const [pageSizes, setPageSizes] = useState(initialState.viewState.pageSizes);
  const [searchByListId, setSearchByListId] = useState<Record<string, string>>({});
  const [searchDescendantsByListId, setSearchDescendantsByListId] = useState<
    Record<string, boolean>
  >({});
  const [searchEnabledByListId, setSearchEnabledByListId] = useState<
    Record<string, boolean>
  >({});
  const activeSearchListId = Object.entries(searchByListId).find(
    ([listId, value]) => value.trim()
      && (searchEnabledByListId[listId] ?? true),
  )?.[0];
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

  async function selectNode(depth: number, id: string, parentId: string) {
    const nextPath = [...selectedPath.slice(0, depth), id];
    if (nextPath.length === selectedPath.length
      && nextPath.every((value, index) => value === selectedPath[index])) return;
    if (onSelectedPathChange) {
      if (selectionPending.current) return;
      selectionPending.current = true;
      const previousPath = selectedPath;
      const previousActionSelection = actionSelectionByListId;
      setSelectedPath(nextPath);
      setActionSelectionByListId((current) => resetActionSelection(
        current,
        nextPath,
        depth,
        parentId,
        id,
      ));
      try {
        const confirmed = await onSelectedPathChange(nextPath);
        if (confirmed === false) {
          setSelectedPath(previousPath);
          setActionSelectionByListId(previousActionSelection);
        } else {
          setDefaultMode(id);
        }
      } catch (error) {
        setSelectedPath(previousPath);
        setActionSelectionByListId(previousActionSelection);
        throw error;
      } finally {
        selectionPending.current = false;
      }
      return;
    }
    setSelectedPath(nextPath);
    setActionSelectionByListId((current) => resetActionSelection(
      current,
      nextPath,
      depth,
      parentId,
      id,
    ));
    setDefaultMode(id);
  }

  function setDefaultMode(id: string) {
    const node = findTreeNode(tree, id);
    if (!node) return;
    setContentVisibleByNodeId((current) => ({
      ...current,
      [id]: node.children.length === 0,
    }));
  }

  async function removeNodes(ids: string[]) {
    const confirmedIds: string[] = [];
    const userCommandId = globalThis.crypto.randomUUID();
    for (const id of ids) {
      if (!onDeleteNode || await onDeleteNode(id, userCommandId) !== false) {
        confirmedIds.push(id);
      }
    }
    if (confirmedIds.length === 0) return;

    const removedIds = new Set(confirmedIds.flatMap((id) => [
      ...findSubtreeIds(tree, id),
    ]));
    const nextTree = removeNodesFromTree(tree, confirmedIds);
    const affectedParentIds = new Set(confirmedIds
      .map((id) => findTreePath(tree, id)?.at(-2))
      .filter((id): id is string => Boolean(id)));
    setTree(nextTree);
    setRevision((current) => current + confirmedIds.length);
    setEnabledByNodeId((current) => omitRecordKeys(current, removedIds));
    setContentVisibleByNodeId((current) => {
      const next = omitRecordKeys(current, removedIds);
      for (const parentId of affectedParentIds) {
        if (findTreeNode(nextTree, parentId)?.children.length === 0) {
          next[parentId] = true;
        }
      }
      return next;
    });
    setActionSelectionByListId((current) => omitActionSelection(
      current,
      removedIds,
    ));
    setSelectedPath((current) => {
      const removedDepth = current.findIndex((id) => removedIds.has(id));
      return removedDepth < 0 ? current : current.slice(0, removedDepth);
    });
  }

  async function reparentNodes(
    nodeIds: string[],
    activeNodeId: string,
    parentId: string | null,
  ) {
    if (!onReparentNode) return false;
    const confirmedIds: string[] = [];
    const userCommandId = globalThis.crypto.randomUUID();
    for (const nodeId of nodeIds) {
      if (await onReparentNode(nodeId, parentId, userCommandId) !== false) {
        confirmedIds.push(nodeId);
      }
    }
    if (confirmedIds.length === 0) return false;

    const sourcePath = findTreePath(tree, activeNodeId) ?? [];
    const sourceParentId = sourcePath.at(-2);
    const sourceListId = sourceParentId ?? rootId;
    const targetListId = parentId ?? rootId;
    const target = parentId ? findTreeNode(tree, parentId) : null;
    const targetItemCount = target ? target.children.length : tree.length;
    const nextTree = reparentNodesInTree(tree, confirmedIds, parentId);
    const activeMoved = confirmedIds.includes(activeNodeId);
    const nextPath = activeMoved
      ? findTreePath(nextTree, activeNodeId) ?? []
      : selectedPath;
    setTree(nextTree);
    setRevision((current) => current + confirmedIds.length);
    setContentVisibleByNodeId((current) => ({
      ...current,
      ...(parentId ? { [parentId]: false } : {}),
      ...(sourceParentId
        && findTreeNode(nextTree, sourceParentId)?.children.length === 0
        ? { [sourceParentId]: true }
        : {}),
    }));
    setActionSelectionByListId((current) => {
      const next = { ...current };
      next[sourceListId] = (next[sourceListId] ?? [])
        .filter((id) => !confirmedIds.includes(id));
      if (activeMoved) next[targetListId] = confirmedIds;
      return next;
    });
    setPages((current) => ({
      ...current,
      [targetListId]: Math.floor(
        (targetItemCount + Math.max(0, confirmedIds.indexOf(activeNodeId)))
        / (pageSizes[targetListId]
          ?? (targetListId === rootId ? rootPageSize : defaultPageSize)),
      ),
    }));
    if (activeMoved) {
      if (onSelectedPathChange) await onSelectedPathChange(nextPath);
      setSelectedPath(nextPath);
    }
    return activeMoved;
  }

  function renderLevel(
    nodes: TreeBrowserModelNode<TContent>[],
    parentId: string,
    depth: number,
    listEditable: boolean,
    listItemLimit?: number,
    inheritedSearch?: TreeSearchContext,
  ) {
    const {
      inputProps: configuredListInputProps,
      newButtonProps: configuredNewButtonProps,
      ...configuredListControlProps
    } = listControlProps ?? {};
    const effectiveListItemLimit = Math.min(listItemLimit ?? 99, 99);
    const searchContext = resolveTreeSearchContext(
      parentId,
      searchByListId,
      searchEnabledByListId,
      searchDescendantsByListId,
      inheritedSearch,
    );
    const searchValue = searchContext?.value ?? "";
    const normalizedSearch = searchValue.trim().toLocaleLowerCase();
    const filteredNodes = filterDirectListNodes(
      nodes,
      normalizedSearch,
      searchContext?.includeDescendants ?? false,
    );
    const pageSize = pageSizes[parentId]
      ?? (parentId === rootId ? rootPageSize : defaultPageSize);
    const pageCount = Math.max(1, Math.ceil(filteredNodes.length / pageSize));
    const page = Math.min(pages[parentId] ?? 0, pageCount - 1);
    const visibleNodes = filteredNodes.slice(
      page * pageSize,
      (page + 1) * pageSize,
    );
    const selectedId = selectedPath[depth];
    const selectedNode = nodes.find(({ id }) => id === selectedId);
    const selectedBrowserNode = selectedNode
      ? toTreeBrowserNode(
          selectedNode,
          enabledByNodeId,
          contentVisibleByNodeId,
        )
      : null;
    const selectedInlineContent = selectedBrowserNode
      ? renderInlineContent?.({ node: selectedBrowserNode })
      : null;
    const inlineContentVisible = selectedInlineContent !== null
      && selectedInlineContent !== undefined
      && selectedInlineContent !== false;
    const parentNode = parentId === rootId ? null : findTreeNode(tree, parentId) ?? null;
    const ownerName = parentNode?.label ?? "root";
    const ownerContentVisible = parentNode
      ? contentVisibleByNodeId[parentId] ?? false
      : false;
    const actionSelectedIds = actionSelectionByListId[parentId]
      ?? (selectedId ? [selectedId] : []);
    const actionSelectedSet = new Set(actionSelectedIds);
    const actionNodes = nodes.filter(({ id }) => actionSelectedSet.has(id));
    const actionNodesDeletable = actionNodes.length > 0 && actionNodes.every(
      (actionNode) => canDeleteNode?.(actionNode, parentNode) ?? listEditable,
    );
    const selectedIndex = nodes.findIndex(({ id }) => id === selectedId);
    const canMoveUp = selectedNode ? canMoveNode(selectedNode, -1, nodes) : false;
    const canMoveDown = selectedNode ? canMoveNode(selectedNode, 1, nodes) : false;

    async function moveSelected(direction: -1 | 1) {
      if (!selectedNode) {
        return;
      }
      if (!canMoveNode(selectedNode, direction, nodes)) return;
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
      if (!listEditable || nodes.length >= effectiveListItemLimit) return;
      if (onCreateNode) {
        const confirmedNode = await onCreateNode(
          name,
          parentId === rootId ? null : parentId,
          selectedNode?.id ?? nodes.at(-1)?.id ?? null,
        );
        if (!confirmedNode) return;
        insertNode(confirmedNode);
        await selectNode(depth, confirmedNode.id, parentId);
        return;
      }
      insertNode(createNode(name, parentId));
    }

    function insertNode(node: TreeBrowserNode<TContent>) {
      const documentNode = toDocumentNode({
        ...node,
        localId: node.localId ?? createTreeNodeLocalId(
          node.label,
          nodes.map((sibling) => sibling.localId ?? sibling.id),
        ),
      });
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
        [node.id]: documentNode.children.length === 0,
        ...(parentId === rootId ? {} : { [parentId]: false }),
      }));
      setPages((current) => ({
        ...current,
        [parentId]: Math.floor(nextIndex / pageSize),
      }));
      setSelectedPath((current) => [...current.slice(0, depth), node.id]);
      setActionSelectionByListId((current) => ({
        ...current,
        [parentId]: [node.id],
      }));
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

    function changePage(nextPage: number) {
      setPages((current) => ({ ...current, [parentId]: nextPage }));
      const nextPageNode = filteredNodes[nextPage * pageSize];
      if (nextPageNode) void selectNode(depth, nextPageNode.id, parentId);
    }

    const modeAvailable = Boolean(
      parentNode
      && parentNode.contentEditable !== false
      && renderContent,
    );
    const setOwnerMode = (mode: "content" | "list") => {
      if (!parentNode) return;
      setContentVisibleByNodeId((current) => ({
        ...current,
        [parentId]: mode === "content",
      }));
    };
    const listInput = (
      <ListControlInput
        key={`list-input-${parentId}`}
        activeColor={listLevelActiveColor(depth)}
        background={browserItemProps?.background}
        buttonProps={listControlProps?.buttonProps}
        checked={selectedNode
          ? actionSelectedSet.has(selectedNode.id)
          : undefined}
        checkboxProps={browserItemProps?.checkboxProps}
        deleteButtonProps={listControlProps?.deleteButtonProps}
        deleteEnabled={actionNodesDeletable}
        deleteLabel={selectedNode?.label}
        editable={listEditable}
        inputProps={configuredListInputProps}
        itemCount={nodes.length}
        itemLimit={effectiveListItemLimit}
        itemNames={nodes.map(({ label }) => label)}
        itemNumber={selectedNode ? selectedIndex + 1 : undefined}
        newButtonProps={configuredNewButtonProps}
        onNew={listEditable && canCreateNode(parentId) ? addNode : undefined}
        onCheckedChange={selectedNode ? (nextChecked) => {
          setActionSelectionByListId((current) => updateActionSelection(
            current,
            parentId,
            selectedNode.id,
            nextChecked,
            selectedId,
          ));
        } : undefined}
        onDelete={selectedNode
          ? () => removeNodes(actionNodes.map(({ id }) => id))
          : undefined}
        onRename={listEditable && selectedNode ? renameSelected : undefined}
        selectedName={selectedNode?.label}
      />
    );
    const listControl = (
        <ListControl
          key={`list-control-${parentId}`}
          {...configuredListControlProps}
          activeColor={listLevelActiveColor(depth)}
          itemCount={filteredNodes.length}
          selectedName={ownerName}
          searchInputProps={configuredListInputProps}
          searchValue={searchByListId[parentId] ?? searchValue}
          searchDisabled={nodes.length === 0}
          searchActive={activeSearchListId === parentId}
          searchEnabled={searchEnabledByListId[parentId] ?? true}
          searchLocked={Boolean(
            activeSearchListId
            && activeSearchListId !== parentId,
          )}
          searchDescendants={searchDescendantsByListId[parentId] ?? true}
          page={page}
          pageSize={pageSize}
          childPageSize={pageSize}
          showPageButtons
          showModeButton={modeAvailable}
          mode={ownerContentVisible ? "content" : "list"}
          modeButtonProps={listControlProps?.modeButtonProps}
          onChildPageSizeChange={(nextPageSize) => {
            setPageSizes((current) => ({
              ...current,
              [parentId]: nextPageSize,
            }));
            setPages((current) => ({ ...current, [parentId]: 0 }));
          }}
          moveDownDisabled={
            !listEditable
            || selectedIndex < 0
            || selectedIndex === nodes.length - 1
            || !canMoveDown
          }
          moveUpDisabled={
            !listEditable || selectedIndex <= 0 || !canMoveUp
          }
          onMoveDown={() => moveSelected(1)}
          onMoveUp={() => moveSelected(-1)}
          onModeChange={setOwnerMode}
          onPageChange={changePage}
          onSearchChange={(value) => {
            if (activeSearchListId && activeSearchListId !== parentId) return;
            setSearchByListId((current) => ({
              ...current,
              [parentId]: value,
            }));
            setSearchEnabledByListId((current) => ({
              ...current,
              [parentId]: true,
            }));
            setPages((current) => ({
              ...current,
              [parentId]: 0,
            }));
            if (searchDescendantsByListId[parentId] ?? true) {
              expandSelectedSearchPath(
                nodes,
                value,
                depth,
                setSelectedPath,
              );
            }
          }}
          onSearchEnabledChange={(enabled) => {
            if (activeSearchListId && activeSearchListId !== parentId) return;
            const effectiveValue = searchByListId[parentId]?.trim()
              ? searchByListId[parentId]
              : searchValue;
            if (!searchByListId[parentId]?.trim() && effectiveValue) {
              setSearchByListId((current) => ({
                ...current,
                [parentId]: effectiveValue,
              }));
            }
            setSearchEnabledByListId((current) => ({
              ...current,
              [parentId]: enabled,
            }));
            setPages((current) => ({
              ...current,
              [parentId]: 0,
            }));
            if (enabled && (searchDescendantsByListId[parentId] ?? true)) {
              expandSelectedSearchPath(
                nodes,
                effectiveValue,
                depth,
                setSelectedPath,
              );
            }
          }}
          onSearchDescendantsChange={(enabled) => {
            if (activeSearchListId && activeSearchListId !== parentId) return;
            setSearchDescendantsByListId((current) => ({
              ...current,
              [parentId]: enabled,
            }));
            setPages((current) => ({
              ...current,
              [parentId]: 0,
            }));
            if (enabled) {
              expandSelectedSearchPath(
                nodes,
                searchValue,
                depth,
                setSelectedPath,
              );
            }
          }}
        />
    );
    const ownerPath = parentNode ? findTreePath(tree, parentId) ?? [] : [];
    const ownerParentId = ownerPath.at(-2) ?? rootId;
    const ownerSiblings = ownerParentId === rootId
      ? tree
      : findTreeNode(tree, ownerParentId)?.children ?? [];
    const ownerActionSelectedIds = actionSelectionByListId[ownerParentId]
      ?? (parentNode ? [parentNode.id] : []);
    const ownerActionSelectedSet = new Set(ownerActionSelectedIds);
    const ownerActionNodes = ownerSiblings.filter(
      ({ id }) => ownerActionSelectedSet.has(id),
    );

    return (
      <section
        className={styles.level}
        style={{ rowGap: resolveCssValue(rowGap) }}
        aria-label={depth === 0 ? "Root children" : `Children of ${parentId}`}
        key={`${parentId}-${depth}`}
      >
        {listControl}
        {ownerContentVisible && parentNode ? (
              <div className={styles.contentFrame}>
                <div className={styles.contentBody}>
                  {renderContent?.({
                node: toTreeBrowserNode(
                  parentNode,
                  enabledByNodeId,
                  contentVisibleByNodeId,
                ),
                localIdAvailable: (localId) => !ownerSiblings.some((node) => (
                  node.id !== parentNode.id && node.localId === localId
                )),
                onLocalIdChange: onUpdateNodeLocalId
                  && parentNode.contentEditable !== false
                  ? async (localId) => {
                      if (!localId || !onUpdateNodeLocalId) return false;
                      const confirmed = await onUpdateNodeLocalId(
                        parentNode.id,
                        localId,
                      );
                      if (confirmed === false) return false;
                      setTree((current) => mapTree(
                        current,
                        parentNode.id,
                        (node) => ({ ...node, localId }),
                      ));
                      setRevision((current) => current + 1);
                      return true;
                    }
                  : undefined,
                height: createContentHeight(
                  pageSizes[parentId] ?? defaultPageSize,
                  browserItemProps?.buttonProps?.height,
                  rowGap,
                ),
                root: onReparentNode ? {
                  current: ownerParentId === rootId
                    ? { id: null, label: "", path: "", eligible: true }
                    : {
                        id: ownerParentId,
                        label: findTreeNode(tree, ownerParentId)?.label ?? "",
                        path: findTreeLocalIdPath(tree, ownerParentId)?.join("/") ?? "",
                        eligible: true,
                      },
                  targets: createBatchRootTargets(
                    tree,
                    ownerActionNodes.map(({ id }) => id),
                    rootListItemLimit,
                  ),
                  onChange: (nextParentId) => reparentNodes(
                    ownerActionNodes.map(({ id }) => id),
                    parentNode.id,
                    nextParentId,
                  ),
                } : undefined,
                  })}
                </div>
              </div>
        ) : (
          <>
            <div className={styles.listFrame}>
              <div
                className={styles.list}
                style={{ rowGap: resolveCssValue(rowGap) }}
              >
                {visibleNodes.map((node) => {
                  const checked = actionSelectedSet.has(node.id);
                  if (node.id === selectedId && !inlineContentVisible) {
                    return listInput;
                  }
                  const browserItem = (
                    <BrowserItem
                      {...browserItemProps}
                      checked={checked}
                      key={node.id}
                      label={node.label}
                      itemNumber={nodes.findIndex(({ id }) => id === node.id) + 1}
                      selected={node.id === selectedId}
                      activeColor={listLevelActiveColor(depth)}
                      onCheckedChange={(nextChecked) => {
                        setActionSelectionByListId((current) =>
                          updateActionSelection(
                            current,
                            parentId,
                            node.id,
                            nextChecked,
                            selectedId,
                          ));
                      }}
                      onSelect={() => selectNode(depth, node.id, parentId)}
                    />
                  );
                  if (node.id !== selectedId || !inlineContentVisible) {
                    return browserItem;
                  }
                  return (
                    <Fragment key={node.id}>
                      {browserItem}
                      <div className={styles.inlineContent}>
                        {selectedInlineContent}
                      </div>
                    </Fragment>
                  );
                })}
                {nodes.length === 0 ? listInput : null}
                {Array.from(
                  { length: pageSize - visibleNodes.length },
                  (_, index) => (
                    <span
                      className={styles.emptySpace}
                      style={{
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
            </div>
            {selectedNode && !inlineContentVisible ? (
              <div className={styles.childListFrame}>
                {renderLevel(
                  selectedNode.children,
                  selectedNode.id,
                  depth + 1,
                  selectedNode.listEditable !== false,
                  selectedNode.listItemLimit,
                  searchContext?.includeDescendants
                    ? searchContext
                    : undefined,
                )}
              </div>
            ) : null}
          </>
        )}
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

function resolveTreeSearchContext(
  listId: string,
  searchByListId: Record<string, string>,
  searchEnabledByListId: Record<string, boolean>,
  searchDescendantsByListId: Record<string, boolean>,
  inheritedSearch?: TreeSearchContext,
): TreeSearchContext | undefined {
  if (inheritedSearch) return inheritedSearch;
  const ownSearchValue = searchByListId[listId] ?? "";
  return ownSearchValue.trim()
    ? (searchEnabledByListId[listId] ?? true) ? {
        includeDescendants: searchDescendantsByListId[listId] ?? true,
        value: ownSearchValue,
      } : undefined
    : inheritedSearch;
}

function expandSelectedSearchPath<TNode extends {
  id: string;
  label: string;
  children: readonly TNode[];
}>(
  nodes: readonly TNode[],
  searchValue: string,
  depth: number,
  setSelectedPath: Dispatch<SetStateAction<string[]>>,
) {
  const matchPath = findFirstMatchingNodePath(nodes, searchValue);
  if (!matchPath || matchPath.length < 2) return;
  setSelectedPath((current) => [
    ...current.slice(0, depth + 1),
    ...matchPath.slice(0, -1),
  ]);
}

export function findFirstMatchingNodePath<TNode extends {
  id: string;
  label: string;
  children: readonly TNode[];
}>(nodes: readonly TNode[], searchValue: string): string[] | null {
  const normalizedSearch = searchValue.trim().toLocaleLowerCase();
  if (!normalizedSearch) return null;
  for (const node of nodes) {
    if (node.label.toLocaleLowerCase().includes(normalizedSearch)) {
      return [node.id];
    }
    const childPath = findFirstMatchingNodePath(node.children, normalizedSearch);
    if (childPath) return [node.id, ...childPath];
  }
  return null;
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

export function filterDirectListNodes<
  TNode extends { label: string; children?: readonly TNode[] },
>(
  nodes: readonly TNode[],
  searchValue: string,
  includeDescendants = false,
): TNode[] {
  const normalizedSearch = searchValue.trim().toLocaleLowerCase();
  return normalizedSearch
    ? nodes.filter((node) => nodeMatchesSearch(
        node,
        normalizedSearch,
        includeDescendants,
      ))
    : [...nodes];
}

function nodeMatchesSearch<
  TNode extends { label: string; children?: readonly TNode[] },
>(node: TNode, searchValue: string, includeDescendants: boolean): boolean {
  if (node.label.toLocaleLowerCase().includes(searchValue)) return true;
  return includeDescendants && Boolean(
    node.children?.some((child) => nodeMatchesSearch(child, searchValue, true)),
  );
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

export function removeNodesFromTree<
  TNode extends { id: string; children: TNode[] },
>(nodes: TNode[], ids: readonly string[]): TNode[] {
  return ids.reduce((current, id) => removeFromTree(current, id), nodes);
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

export function reparentNodesInTree<
  TNode extends { id: string; children: TNode[] },
>(nodes: TNode[], nodeIds: readonly string[], parentId: string | null): TNode[] {
  return nodeIds.reduce(
    (current, nodeId) => reparentInTree(current, nodeId, parentId),
    nodes,
  );
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
  return createBatchRootTargets(nodes, [nodeId], rootItemLimit);
}

export function createBatchRootTargets<
  TNode extends {
    id: string;
    label: string;
    localId?: string;
    listEditable?: boolean;
    listItemLimit?: number;
    children: TNode[];
  },
>(
  nodes: TNode[],
  nodeIds: readonly string[],
  rootItemLimit?: number,
): TreeBrowserRootTarget[] {
  const forbidden = new Set(nodeIds.flatMap((nodeId) => {
    const source = findTreeNode(nodes, nodeId);
    return source ? [...collectTreeIds(source)] : [];
  }));
  const itemCount = nodeIds.length;
  const movingLocalIds = new Set(nodeIds.flatMap((nodeId) => {
    const node = findTreeNode(nodes, nodeId);
    return node ? [node.localId ?? node.id] : [];
  }));
  const rootHasCollision = nodes.some((node) => (
    !forbidden.has(node.id) && movingLocalIds.has(node.localId ?? node.id)
  ));
  return [{
    id: null,
    label: "",
    path: "",
    eligible: !rootHasCollision
      && nodes.length + itemCount <= Math.min(rootItemLimit ?? 99, 99),
  }, ...flattenTreeWithPaths(nodes).map(({ node, path }) => ({
    id: node.id,
    label: node.label,
    path: path.join("/"),
    eligible: !forbidden.has(node.id)
      && node.listEditable !== false
      && !node.children.some((child) => (
        !forbidden.has(child.id)
        && movingLocalIds.has(child.localId ?? child.id)
      ))
      && node.children.length + itemCount
        <= Math.min(node.listItemLimit ?? 99, 99),
  }))];
}

export function createInitialActionSelection(
  selectedPath: readonly string[],
): Record<string, string[]> {
  const selection: Record<string, string[]> = {};
  let listId = rootId;
  for (const nodeId of selectedPath) {
    selection[listId] = [nodeId];
    listId = nodeId;
  }
  return selection;
}

export function updateActionSelection(
  current: Record<string, string[]>,
  listId: string,
  nodeId: string,
  checked: boolean,
  activeNodeId?: string,
): Record<string, string[]> {
  if (!checked && nodeId === activeNodeId) return current;
  const selected = current[listId] ?? (activeNodeId ? [activeNodeId] : []);
  const nextSelected = checked
    ? [...new Set([...selected, nodeId])]
    : selected.filter((id) => id !== nodeId);
  return { ...current, [listId]: nextSelected };
}

function resetActionSelection(
  current: Record<string, string[]>,
  selectedPath: readonly string[],
  depth: number,
  listId: string,
  nodeId: string,
): Record<string, string[]> {
  const visibleListIds = new Set([rootId, ...selectedPath.slice(0, depth)]);
  return {
    ...Object.fromEntries(
      Object.entries(current).filter(([id]) => visibleListIds.has(id)),
    ),
    [listId]: [nodeId],
  };
}

function omitActionSelection(
  current: Record<string, string[]>,
  removedIds: Set<string>,
): Record<string, string[]> {
  return Object.fromEntries(Object.entries(current)
    .filter(([listId]) => !removedIds.has(listId))
    .map(([listId, ids]) => [
      listId,
      ids.filter((id) => !removedIds.has(id)),
    ]));
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

function findTreeLocalIdPath<
  TNode extends { id: string; localId?: string; children: TNode[] },
>(nodes: TNode[], id: string): string[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node.localId ?? node.id];
    const nested = findTreeLocalIdPath(node.children, id);
    if (nested) return [node.localId ?? node.id, ...nested];
  }
  return null;
}

function flattenTreeWithPaths<
  TNode extends { id: string; label: string; localId?: string; children: TNode[] },
>(nodes: TNode[], parentPath: string[] = []): { node: TNode; path: string[] }[] {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.localId ?? node.id];
    return [{ node, path }, ...flattenTreeWithPaths(node.children, path)];
  });
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
    localId: node.localId,
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
