import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TreeNodeContentDto, TreeNodeDto } from "@flydeck/shared/v2";

import { v2Api } from "../../api/V2ApiClient";
import {
  reportWorkspaceReplicaError,
  persistWorkspaceReplica,
  workspaceReplica,
  workspaceSyncEngine,
  type WorkspaceReplicaScope,
} from "../../replica";
import { useClientStateScope } from "../../state";
import { AppView, type AppViewProps } from "../AppView";
import { Breadcrumb, type BreadcrumbProps } from "../Breadcrumb";
import { Button, type ButtonProps } from "../Button";
import { Form, type FormProps } from "../Form";
import { FormRow, type FormRowProps } from "../FormRow";
import { Input, type InputProps } from "../Input";
import { ItemList, type ItemListProps } from "../ItemList";
import { ParentInput, type ParentInputProps } from "../ParentInput";
import { Textarea, type TextareaProps } from "../Textarea";
import type { TreeBrowserRootTarget } from "../TreeBrowser";
import styles from "./InventoryApp.module.css";

export type InventoryItem = {
  contentRevision?: number;
  id: string;
  name: string;
  description: string;
  nodeRevision?: number;
  parentId: string | null;
};

export type InventoryAppProps = Omit<
  AppViewProps,
  "accessMode" | "children" | "componentName" | "title"
> & {
  initialItems?: readonly InventoryItem[];
  buttonProps?: Omit<ButtonProps, "aria-label" | "children" | "onClick">;
  breadcrumbProps?: Omit<
    BreadcrumbProps,
    "buttonProps" | "currentId" | "items" | "onSelect"
  >;
  compactButtonProps?: BreadcrumbProps["buttonProps"];
  formProps?: Omit<FormProps, "children">;
  formRowProps?: Omit<
    FormRowProps,
    | "buttonProps"
    | "children"
    | "disabled"
    | "label"
    | "newDisabled"
    | "onNew"
    | "onSet"
  >;
  formRowButtonProps?: FormRowProps["buttonProps"];
  inputProps?: Omit<
    InputProps,
    "aria-label" | "keyboardLayout" | "onChange" | "value"
  >;
  itemListProps?: Omit<
    ItemListProps,
    "buttonProps" | "items" | "onSelect" | "selectedId"
  >;
  parentInputProps?: Omit<
    ParentInputProps,
    "current" | "onChange" | "onSetParent" | "targets" | "value"
  >;
  textareaProps?: Omit<
    TextareaProps,
    "aria-label" | "keyboardLayout" | "onChange" | "value"
  >;
  workspaceId?: string;
};

export const inventoryFixture: readonly InventoryItem[] = [
  { id: "drawer-1", name: "Schublade 1", description: "Werkzeug und häufig benötigte Dinge", parentId: null },
  { id: "toolbox", name: "Werkzeugkoffer", description: "Hammer, Zangen und Schraubendreher", parentId: "drawer-1" },
  { id: "flashlight", name: "Taschenlampe", description: "LED-Taschenlampe mit Ersatzakku", parentId: "drawer-1" },
  { id: "drawer-2", name: "Schublade 2", description: "Kleinteile und Verbrauchsmaterial", parentId: null },
  { id: "pen", name: "Stift", description: "Schwarzer Permanentmarker", parentId: "drawer-2" },
  { id: "cables", name: "Kabelbox", description: "USB-, Netzwerk- und Stromkabel", parentId: "drawer-2" },
  { id: "batteries", name: "Batterien", description: "AA- und AAA-Batterien", parentId: "drawer-2" },
  { id: "shelf", name: "Regal", description: "Größere Gegenstände", parentId: null },
  { id: "laptop", name: "Laptop", description: "Mobiler Arbeitsrechner", parentId: "shelf" },
];

export function InventoryApp({
  initialItems = inventoryFixture,
  buttonProps,
  breadcrumbProps,
  compactButtonProps,
  formProps,
  formRowProps,
  formRowButtonProps,
  inputProps,
  itemListProps,
  parentInputProps,
  textareaProps,
  workspaceId,
  ...appViewProps
}: InventoryAppProps) {
  const { userId } = useClientStateScope();
  const [items, setItems] = useState(() => [...initialItems]);
  const [selectedId, setSelectedId] = useState(() => initialItems[0]?.id ?? "");
  const [parentDrafts, setParentDrafts] = useState<Record<string, string>>({});
  const [itemDrafts, setItemDrafts] = useState<Record<
    string,
    Pick<InventoryItem, "name" | "description">
  >>({});
  const [dataSource, setDataSource] = useState("Lagerraum");
  const [saving, setSaving] = useState(false);
  const inventoryRootId = useRef<string | null>(null);
  const treeRevision = useRef(0);
  const replicaScope = useMemo<WorkspaceReplicaScope | null>(() => (
    workspaceId ? { userId, workspaceId } : null
  ), [userId, workspaceId]);

  const applyLoadedInventory = useCallback((loaded: InventoryLoadResult) => {
    if (loaded.items.length === 0) return;
    inventoryRootId.current = loaded.rootId;
    treeRevision.current = loaded.treeRevision;
    setItems(loaded.items);
    setSelectedId((current) => (
      loaded.items.some(({ id }) => id === current) ? current : loaded.items[0].id
    ));
    setParentDrafts({});
    setItemDrafts({});
  }, []);

  const refreshFromReplica = useCallback(async () => {
    if (!replicaScope) return;
    const loaded = await loadCachedInventory(replicaScope, dataSource);
    if (loaded) applyLoadedInventory(loaded);
  }, [applyLoadedInventory, dataSource, replicaScope]);

  useEffect(() => {
    if (replicaScope) workspaceSyncEngine.register(replicaScope);
  }, [replicaScope]);

  useEffect(() => {
    if (!workspaceId || !replicaScope) return;
    let active = true;
    void (async () => {
      const cached = await loadCachedInventory(replicaScope, dataSource)
        .catch((error) => {
          reportWorkspaceReplicaError(error);
          return null;
        });
      if (active && cached) applyLoadedInventory(cached);
      const confirmed = await loadInventory(workspaceId, dataSource, replicaScope);
      if (active) applyLoadedInventory(confirmed);
    })().catch(() => undefined);
    return () => { active = false; };
  }, [applyLoadedInventory, dataSource, replicaScope, workspaceId]);
  const selected = items.find(({ id }) => id === selectedId) ?? items[0];
  const siblings = selected
    ? items.filter(({ parentId }) => parentId === selected.parentId)
    : [];
  const siblingIndex = selected
    ? siblings.findIndex(({ id }) => id === selected.id)
    : -1;
  const breadcrumbItems = selected
    ? inventoryBreadcrumb(items, selected.id)
    : [];
  const firstChild = selected
    ? items.find(({ parentId }) => parentId === selected.id)
    : undefined;
  const parent = selected?.parentId
    ? items.find(({ id }) => id === selected.parentId)
    : undefined;
  const parentValue = selected
    ? parentDrafts[selected.id] ?? (parent ? inventoryPath(items, parent.id) : "")
    : "";
  const selectedDraft = selected
    ? itemDrafts[selected.id] ?? {
        name: selected.name,
        description: selected.description,
      }
    : null;
  const parentTarget = selected
    ? resolveInventoryParent(items, selected.id, parentValue)
    : undefined;
  const parentTargets = selected
    ? inventoryParentTargets(items, selected.id)
    : [];
  const currentParentTarget = parentTargets.find(
    ({ id }) => id === (selected?.parentId ?? null),
  );
  const newItemName = selectedDraft?.name.trim() ?? "";
  const canCreateItem = Boolean(
    selectedDraft
    && newItemName
    && parentTarget !== undefined
    && !items.some((item) => (
      item.parentId === parentTarget
      && item.name.trim().toLocaleLowerCase() === newItemName.toLocaleLowerCase()
    )),
  );

  function updateSelected(patch: Partial<InventoryItem>) {
    if (!selected) return;
    setItems((current) => current.map((item) => (
      item.id === selected.id ? { ...item, ...patch } : item
    )));
  }

  function updateSelectedDraft(
    patch: Partial<Pick<InventoryItem, "name" | "description">>,
  ) {
    if (!selected || !selectedDraft) return;
    setItemDrafts((current) => ({
      ...current,
      [selected.id]: { ...selectedDraft, ...patch },
    }));
  }

  async function reloadInventoryAfterFailure() {
    if (!workspaceId) return;
    try {
      const loaded = await loadInventory(
        workspaceId,
        dataSource,
        replicaScope ?? undefined,
      );
      inventoryRootId.current = loaded.rootId;
      treeRevision.current = loaded.treeRevision;
      setItems(loaded.items);
      setSelectedId((current) => (
        loaded.items.some(({ id }) => id === current)
          ? current
          : loaded.items[0]?.id ?? ""
      ));
    } catch {
      // Keep the current drafts available for another save attempt.
    }
  }

  return (
    <AppView
      {...appViewProps}
      accessMode="read-write"
      componentName="InventoryApp"
      defaultDataSource="Lagerraum"
      onDataSourceResolved={setDataSource}
      title="INVENTORY"
    >
      {selected ? (
        <div className={styles.root}>
          <div className={styles.navigation} aria-label="Inventory navigation">
            <Button
              {...buttonProps}
              aria-label="Open parent inventory item"
              disabled={!parent}
              onClick={() => {
                if (parent) setSelectedId(parent.id);
              }}
            >
              ↑
            </Button>
            <Button
              {...buttonProps}
              aria-label="Open first child inventory item"
              disabled={!firstChild}
              onClick={() => {
                if (firstChild) setSelectedId(firstChild.id);
              }}
            >
              ↓
            </Button>
            <Button
              {...buttonProps}
              aria-label="Previous inventory item"
              disabled={siblingIndex <= 0}
              onClick={() => setSelectedId(siblings[siblingIndex - 1].id)}
            >
              ←
            </Button>
            <Button
              {...buttonProps}
              aria-label="Next inventory item"
              disabled={siblingIndex < 0 || siblingIndex >= siblings.length - 1}
              onClick={() => setSelectedId(siblings[siblingIndex + 1].id)}
            >
              →
            </Button>
          </div>
          <Breadcrumb
            {...breadcrumbProps}
            buttonProps={compactButtonProps}
            currentId={breadcrumbItems.at(-1)?.id ?? ""}
            items={breadcrumbItems}
            onSelect={setSelectedId}
          />
          <ItemList
            {...itemListProps}
            buttonProps={compactButtonProps}
            items={siblings.map(({ id, name }) => ({
              hasChildren: inventoryItemHasChildren(items, id),
              id,
              label: name,
            }))}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
          <Form {...formProps}>
            <FormRow
              {...formRowProps}
              buttonProps={formRowButtonProps}
              disabled={saving
                || !selectedDraft?.name.trim()
                || selectedDraft.name === selected.name}
              label="Name"
              newDisabled={saving || !canCreateItem}
              onNew={async () => {
                if (!selectedDraft || parentTarget === undefined || !canCreateItem) {
                  return;
                }
                if (workspaceId && inventoryRootId.current) {
                  setSaving(true);
                  try {
                    const targetParentId = parentTarget ?? inventoryRootId.current;
                    const targetSiblings = items.filter((item) => (
                      item.parentId === parentTarget
                    ));
                    if (!replicaScope) return;
                    const nodeId = globalThis.crypto.randomUUID();
                    await workspaceSyncEngine.submit(replicaScope, {
                      type: "create-node",
                      input: {
                      requestId: globalThis.crypto.randomUUID(),
                      nodeId,
                      parentId: targetParentId,
                      afterNodeId: targetSiblings.at(-1)?.id ?? null,
                      kind: "data-file",
                      label: newItemName,
                      expectedTreeRevision: treeRevision.current,
                      },
                    });
                    if (selectedDraft.description) {
                      await workspaceSyncEngine.submit(replicaScope, {
                        type: "update-content",
                        nodeId,
                        input: {
                          requestId: globalThis.crypto.randomUUID(),
                          content: selectedDraft.description,
                          expectedRevision: 0,
                        },
                      });
                    }
                    await refreshFromReplica();
                    setSelectedId(nodeId);
                  } catch {
                    await reloadInventoryAfterFailure();
                  } finally {
                    setSaving(false);
                  }
                  return;
                }
                const id = globalThis.crypto.randomUUID();
                const item: InventoryItem = {
                  id,
                  name: newItemName,
                  description: selectedDraft.description,
                  parentId: parentTarget,
                };
                setItems((current) => [...current, item]);
                setSelectedId(id);
                setItemDrafts((current) => ({
                  ...current,
                  [id]: { name: item.name, description: item.description },
                }));
                setParentDrafts((current) => ({
                  ...current,
                  [id]: item.parentId ? inventoryPath(items, item.parentId) : "",
                }));
              }}
              onSet={async () => {
                if (!selectedDraft) return;
                if (!workspaceId || selected.nodeRevision === undefined) {
                  updateSelected({ name: selectedDraft.name });
                  return;
                }
                setSaving(true);
                try {
                  if (!replicaScope) return;
                  await workspaceSyncEngine.submit(replicaScope, {
                    type: "rename-node",
                    nodeId: selected.id,
                    input: {
                      requestId: globalThis.crypto.randomUUID(),
                      label: selectedDraft.name,
                      expectedRevision: selected.nodeRevision,
                    },
                  });
                  await refreshFromReplica();
                } catch {
                  await reloadInventoryAfterFailure();
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Input
                {...inputProps}
                aria-label="Inventory item name"
                keyboardLayout="block"
                value={selectedDraft?.name ?? selected.name}
                onChange={(event) => updateSelectedDraft({
                  name: event.currentTarget.value,
                })}
              />
            </FormRow>
            <FormRow
              {...formRowProps}
              buttonProps={formRowButtonProps}
              disabled={saving
                || selectedDraft?.description === selected.description}
              label="Desc"
              onSet={async () => {
                if (!selectedDraft) return;
                if (!workspaceId || selected.contentRevision === undefined) {
                  updateSelected({ description: selectedDraft.description });
                  return;
                }
                setSaving(true);
                try {
                  if (!replicaScope) return;
                  await workspaceSyncEngine.submit(replicaScope, {
                    type: "update-content",
                    nodeId: selected.id,
                    input: {
                      requestId: globalThis.crypto.randomUUID(),
                      content: selectedDraft.description,
                      expectedRevision: selected.contentRevision,
                    },
                  });
                  await refreshFromReplica();
                } catch {
                  await reloadInventoryAfterFailure();
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Textarea
                {...textareaProps}
                aria-label="Inventory item description"
                keyboardLayout="block"
                resize={textareaProps?.resize ?? "none"}
                value={selectedDraft?.description ?? selected.description}
                onChange={(event) => updateSelectedDraft({
                  description: event.currentTarget.value,
                })}
              />
            </FormRow>
            {currentParentTarget && (
              <ParentInput
                {...parentInputProps}
                actionDisabled={saving || parentInputProps?.actionDisabled}
                buttonProps={{
                  ...formRowButtonProps,
                  ...parentInputProps?.buttonProps,
                }}
                current={currentParentTarget}
                inputLabel="Inventory item parent"
                inputProps={{
                  ...inputProps,
                  ...parentInputProps?.inputProps,
                }}
                targets={parentTargets}
                value={parentValue}
                onChange={(value) => {
                  setParentDrafts((current) => ({
                    ...current,
                    [selected.id]: value,
                  }));
                }}
                onSetParent={async (target) => {
                  const nextParentId = target.id;
                  if (
                    !workspaceId
                    || !inventoryRootId.current
                    || selected.nodeRevision === undefined
                  ) {
                    updateSelected({ parentId: nextParentId });
                    return;
                  }
                  setSaving(true);
                  try {
                    if (!replicaScope) return;
                    await workspaceSyncEngine.submit(replicaScope, {
                      type: "reparent-node",
                      nodeId: selected.id,
                      input: {
                        requestId: globalThis.crypto.randomUUID(),
                        parentId: nextParentId ?? inventoryRootId.current,
                        expectedTreeRevision: treeRevision.current,
                      },
                    });
                    await refreshFromReplica();
                  } catch {
                    await reloadInventoryAfterFailure();
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            )}
          </Form>
        </div>
      ) : (
        <div className={styles.empty}>No inventory items.</div>
      )}
    </AppView>
  );
}

export function inventoryPath(items: readonly InventoryItem[], itemId: string) {
  const names: string[] = [];
  const visited = new Set<string>();
  let current = items.find(({ id }) => id === itemId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    names.unshift(current.name);
    current = current.parentId
      ? items.find(({ id }) => id === current!.parentId)
      : undefined;
  }
  return names.join("/");
}

export function inventoryParentTargets(
  items: readonly InventoryItem[],
  itemId: string,
): TreeBrowserRootTarget[] {
  return [
    { id: null, label: "", path: "", eligible: true },
    ...items.map((item) => {
      const path = inventoryPath(items, item.id);
      return {
        id: item.id,
        label: item.name,
        path,
        eligible: resolveInventoryParent(items, itemId, path) === item.id,
      };
    }),
  ];
}

export function inventoryBreadcrumb(
  items: readonly InventoryItem[],
  itemId: string,
) {
  const path: BreadcrumbProps["items"][number][] = [];
  const visited = new Set<string>();
  const item = items.find(({ id }) => id === itemId);
  let current = item?.parentId
    ? items.find(({ id }) => id === item.parentId)
    : undefined;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift({
      hasChildren: inventoryItemHasChildren(items, current.id),
      id: current.id,
      label: current.name,
    });
    current = current.parentId
      ? items.find(({ id }) => id === current!.parentId)
      : undefined;
  }
  return path;
}

export function inventoryItemHasChildren(
  items: readonly InventoryItem[],
  itemId: string,
) {
  return items.some(({ parentId }) => parentId === itemId);
}

export function resolveInventoryParent(
  items: readonly InventoryItem[],
  itemId: string,
  path: string,
): string | null | undefined {
  const normalizedPath = path.trim();
  if (normalizedPath === "") return null;
  const segments = normalizedPath.split("/");
  if (segments.some((segment) => segment === "" || segment !== segment.trim())) {
    return undefined;
  }
  let target: InventoryItem | undefined;
  let parentId: string | null = null;
  for (const segment of segments) {
    target = items.find((item) => (
      item.parentId === parentId && item.name === segment
    ));
    if (!target) return undefined;
    parentId = target.id;
  }
  if (!target || target.id === itemId) return undefined;
  let current: InventoryItem | undefined = target;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    if (current.id === itemId) return undefined;
    visited.add(current.id);
    current = current.parentId
      ? items.find(({ id }) => id === current!.parentId)
      : undefined;
  }
  return target.id;
}

export type InventoryLoadResult = {
  items: InventoryItem[];
  rootId: string | null;
  treeRevision: number;
};

export async function loadInventory(
  workspaceId: string,
  dataSource: string,
  replicaScope?: WorkspaceReplicaScope,
): Promise<InventoryLoadResult> {
  const tree = await v2Api.loadDataTree(workspaceId);
  if (replicaScope) {
    persistWorkspaceReplica(workspaceReplica.replaceTree(replicaScope, tree));
  }
  const root = resolveTreePath(tree.document.nodes, dataSource);
  if (!root) return {
    items: [],
    rootId: null,
    treeRevision: tree.document.revision,
  };
  const descendants = inventoryDescendants(tree.document.nodes, root.id);
  const cachedContents = replicaScope
    ? (await workspaceReplica.load(replicaScope))?.contents ?? {}
    : {};
  const contents = await Promise.all(descendants.map(async (node) => {
    try {
      return await v2Api.readDataContent(workspaceId, node.id);
    } catch {
      return cachedContents[node.id] ?? null;
    }
  }));
  const confirmedContents = contents.filter(
    (content): content is TreeNodeContentDto => content !== null,
  );
  if (replicaScope && confirmedContents.length > 0) {
    persistWorkspaceReplica(workspaceReplica.putContents(replicaScope, confirmedContents));
  }
  return projectInventory(
    tree.document.nodes,
    Object.fromEntries(confirmedContents.map((content) => [content.nodeId, content])),
    dataSource,
    tree.document.revision,
  );
}

export async function loadCachedInventory(
  replicaScope: WorkspaceReplicaScope,
  dataSource: string,
): Promise<InventoryLoadResult | null> {
  const cached = await workspaceReplica.load(replicaScope);
  if (!cached?.tree) return null;
  return projectInventory(
    cached.tree.document.nodes,
    cached.contents,
    dataSource,
    cached.tree.document.revision,
  );
}

export function projectInventory(
  nodes: readonly TreeNodeDto[],
  contents: Readonly<Record<string, TreeNodeContentDto>>,
  dataSource: string,
  treeRevision: number,
): InventoryLoadResult {
  const root = resolveTreePath(nodes, dataSource);
  if (!root) return { items: [], rootId: null, treeRevision };
  const descendants = inventoryDescendants(nodes, root.id);
  const descendantIds = new Set(descendants.map(({ id }) => id));
  return {
    items: descendants.map((node): InventoryItem => ({
      contentRevision: contents[node.id]?.revision,
      id: node.id,
      name: node.label,
      description: contents[node.id]?.content ?? "",
      nodeRevision: node.revision,
      parentId: node.parentId && descendantIds.has(node.parentId)
        ? node.parentId
        : null,
    })),
    rootId: root.id,
    treeRevision,
  };
}

export function resolveTreePath(nodes: readonly TreeNodeDto[], path: string) {
  let parentId: string | null = null;
  let current: TreeNodeDto | undefined;
  for (const segment of path.split("/").filter(Boolean)) {
    current = nodes.find((node) => (
      node.parentId === parentId && node.label === segment
    ));
    if (!current) return undefined;
    parentId = current.id;
  }
  return current;
}

export function inventoryDescendants(
  nodes: readonly TreeNodeDto[],
  rootId: string,
) {
  const result: TreeNodeDto[] = [];
  const appendChildren = (parentId: string) => {
    const children = nodes
      .filter((node) => node.parentId === parentId)
      .sort((left, right) => left.position - right.position);
    for (const child of children) {
      result.push(child);
      appendChildren(child.id);
    }
  };
  appendChildren(rootId);
  return result;
}
