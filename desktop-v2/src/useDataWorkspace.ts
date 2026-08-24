import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import { createTreeNodeLocalId, treeNodeLocalIdSchema } from "@flydeck/shared/v2";
import {
  createDataNode,
  deleteDataNode,
  editDataNode,
  loadDesktopData,
  loadNodeContent,
  setDataNodeEnabled,
  type DesktopData,
  type TreeRow,
} from "./api";
import type {
  AppVisualization,
  DesktopAppId,
  InspectorDraft,
  ModuleId,
  NavigatorRow,
  ParentOption,
} from "./ui";

const DATA_ROOT_ID = "__data_root__";

export function useDataWorkspace() {
  const activeModule = ref<ModuleId>("DATA");
  const desktopData = shallowRef<DesktopData | null>(null);
  const selectedRootId = ref<string | null>(null);
  const selected = shallowRef<TreeRow | null>(null);
  const content = ref("");
  const contentFormat = ref("");
  const contentRevision = ref(0);
  const contentUpdatedAt = ref("");
  const contentLoading = ref(false);
  const loading = ref(true);
  const error = ref("");
  const search = ref("");
  const expandedRowKeys = ref<Array<string | number>>([]);
  const loadDurationMs = ref(0);
  const focusDurationMs = ref(0);
  const editorDraft = ref<InspectorDraft | null>(null);
  const newDraftAnchorId = ref<string | null>(null);
  const editorSaving = ref(false);
  const editorDeleting = ref(false);
  const editorError = ref("");
  const enabledSavingIds = ref<string[]>([]);
  const activeAppId = ref<DesktopAppId>("data-analysis");
  const appConfigs = ref<Record<DesktopAppId, {
    visualization: AppVisualization;
    dataSourceText: string;
    dataSourceId: string | null;
    dataSourceValid: boolean;
  }>>({
    "data-analysis": {
      visualization: "timeline",
      dataSourceText: "",
      dataSourceId: null,
      dataSourceValid: false,
    },
    mindmap: {
      visualization: "mindmap",
      dataSourceText: "",
      dataSourceId: null,
      dataSourceValid: false,
    },
  });

  const roots = computed(() => desktopData.value?.roots ?? []);
  const activeRoot = computed(() => (
    selectedRootId.value
      ? desktopData.value?.rowsById.get(selectedRootId.value) ?? null
      : null
  ));
  const sourceRows = computed(() => activeRoot.value?.children ?? roots.value);
  const filteredRows = computed(() => {
    const rows = filterRows(sourceRows.value, search.value);
    if (editorDraft.value?.mode !== "new") return rows;
    return insertDraftRow(rows, createDraftRow(editorDraft.value), newDraftAnchorId.value, activeRoot.value?.id ?? null);
  });
  const visibleCount = computed(() => countRows(filteredRows.value));
  const sectionTitle = computed(() => activeRoot.value?.label ?? "DATA");
  const totalCount = computed(() => desktopData.value?.tree.document.nodes.length ?? 0);
  const navigatorData = computed<NavigatorRow[]>(() => {
    const parentRoots = roots.value.flatMap((row) => {
      const parent = toNavigatorRow(row);
      return parent ? [parent] : [];
    });
    return [{
      id: DATA_ROOT_ID,
      parentId: null,
      localId: "data",
      label: "DATA",
      kind: "system.directory",
      position: 0,
      revision: desktopData.value?.tree.document.revision ?? 0,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      capabilities: { contentEditable: false, listEditable: false, listItemLimit: null },
      children: parentRoots,
      descendantCount: totalCount.value,
      enabled: true,
      enabledRevision: 0,
      path: ["DATA"],
      synthetic: true,
    }];
  });
  const navigatorCurrentKey = computed(() => selectedRootId.value ?? DATA_ROOT_ID);
  const selectedTableId = computed(() => (
    editorDraft.value?.mode === "new" ? DRAFT_NODE_ID : selected.value?.id
  ));
  const parentOptions = computed<ParentOption[]>(() => {
    const forbiddenIds = new Set<string>();
    if (editorDraft.value?.mode === "edit" && editorDraft.value.nodeId) {
      forbiddenIds.add(editorDraft.value.nodeId);
      const node = desktopData.value?.rowsById.get(editorDraft.value.nodeId);
      if (node) collectIds(node.children, forbiddenIds);
    }
    const options: ParentOption[] = [{ id: null, label: "" }];
    for (const row of desktopData.value?.rowsById.values() ?? []) {
      if (row.capabilities.listEditable && !forbiddenIds.has(row.id)) {
        options.push({ id: row.id, label: row.path.join("/") });
      }
    }
    return options.sort((left, right) => left.label.localeCompare(right.label, "de"));
  });
  const appDataSourceOptions = computed<ParentOption[]>(() => (
    [...(desktopData.value?.rowsById.values() ?? [])]
      .map((row) => ({ id: row.id, label: row.path.join("/") }))
      .sort((left, right) => left.label.localeCompare(right.label, "de"))
  ));
  const activeAppConfig = computed(() => appConfigs.value[activeAppId.value]);
  const appVisualization = computed(() => activeAppConfig.value.visualization);
  const appDataSourceText = computed(() => activeAppConfig.value.dataSourceText);
  const appDataSourceId = computed(() => activeAppConfig.value.dataSourceId);
  const appDataSource = computed(() => (
    appDataSourceId.value
      ? desktopData.value?.rowsById.get(appDataSourceId.value) ?? null
      : null
  ));
  const appDataSourceValid = computed(() => (
    activeAppConfig.value.dataSourceValid && Boolean(appDataSource.value)
  ));
  const appRows = computed(() => {
    const source = appDataSource.value;
    if (!source) return [];
    return source.children.length ? flattenRows(source.children) : [source];
  });

  onMounted(loadData);

  watch(selected, async (row) => {
    if (row && !row.draft) editorDraft.value = editDraft(row);
    content.value = "";
    contentFormat.value = "";
    contentRevision.value = 0;
    contentUpdatedAt.value = "";
    if (!row || !desktopData.value) return;
    const requestedId = row.id;
    contentLoading.value = true;
    try {
      const result = await loadNodeContent(desktopData.value.workspace.id, row.id);
      if (selected.value?.id !== requestedId) return;
    content.value = result.content;
    contentFormat.value = result.format;
    contentRevision.value = result.revision;
    contentUpdatedAt.value = result.updatedAt ?? "";
    if (
      editorDraft.value?.mode === "edit"
      && editorDraft.value.nodeId === requestedId
      && !editorDraft.value.contentDirty
    ) {
      editorDraft.value = {
        ...editorDraft.value,
        content: result.content,
        contentRevision: result.revision,
      };
    }
    } catch (reason) {
      if (selected.value?.id === requestedId) {
        content.value = reason instanceof Error ? reason.message : "Inhalt konnte nicht geladen werden.";
      }
    } finally {
      if (selected.value?.id === requestedId) contentLoading.value = false;
    }
  });

  async function loadData(preferredSelectedId?: string | null) {
    const started = performance.now();
    loading.value = true;
    error.value = "";
    try {
      desktopData.value = await loadDesktopData();
      if (selectedRootId.value && !desktopData.value.rowsById.has(selectedRootId.value)) {
        selectedRootId.value = null;
      }
      const selectedId = preferredSelectedId === undefined
        ? selected.value?.id ?? selectedRootId.value
        : preferredSelectedId;
      selected.value = selectedId
        ? desktopData.value.rowsById.get(selectedId) ?? null
        : desktopData.value.roots[0] ?? null;
      expandedRowKeys.value = [];
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : "DATA konnte nicht geladen werden.";
    } finally {
      loading.value = false;
      loadDurationMs.value = performance.now() - started;
    }
  }

  function openModule(module: ModuleId) {
    activeModule.value = module;
    search.value = "";
  }

  function selectApp(appId: DesktopAppId) {
    activeAppId.value = appId;
    activeModule.value = "APPS";
  }

  function updateAppDataSourceText(value: string) {
    const normalized = value.trim();
    const match = appDataSourceOptions.value.find(({ label }) => label === normalized);
    appConfigs.value[activeAppId.value] = {
      ...activeAppConfig.value,
      dataSourceText: value,
      dataSourceId: match?.id ?? null,
      dataSourceValid: Boolean(match),
    };
  }

  function selectAppDataSource(option: ParentOption) {
    appConfigs.value[activeAppId.value] = {
      ...activeAppConfig.value,
      dataSourceText: option.label,
      dataSourceId: option.id,
      dataSourceValid: true,
    };
  }

  function updateAppVisualization(visualization: AppVisualization) {
    appConfigs.value[activeAppId.value] = {
      ...activeAppConfig.value,
      visualization,
    };
  }

  async function focusNode(row: NavigatorRow) {
    const started = performance.now();
    const nodeId = row.synthetic ? null : row.id;
    await focusContent(nodeId);
    requestAnimationFrame(() => {
      focusDurationMs.value = performance.now() - started;
    });
  }

  async function selectRow(row: TreeRow) {
    if (row.draft) return;
    if (row.children.length) {
      await focusContent(row.id);
      return;
    }
    selected.value = row;
  }

  async function focusContent(nodeId: string | null) {
    activeModule.value = "DATA";
    selectedRootId.value = nodeId;
    selected.value = nodeId
      ? desktopData.value?.rowsById.get(nodeId) ?? null
      : roots.value[0] ?? null;
    search.value = "";
    expandedRowKeys.value = [];
    await nextTick();
  }

  function updateEditorLabel(label: string) {
    if (!editorDraft.value) return;
    editorError.value = "";
    const localId = editorDraft.value.mode === "new" && editorDraft.value.localIdAutomatic
      ? generatedLocalId(label, editorDraft.value.parentId, desktopData.value)
      : editorDraft.value.localId;
    editorDraft.value = { ...editorDraft.value, label, localId };
  }

  function updateEditorLocalId(localId: string) {
    if (!editorDraft.value) return;
    editorError.value = "";
    editorDraft.value = {
      ...editorDraft.value,
      localId,
      localIdAutomatic: false,
    };
  }

  function updateParentText(parentText: string) {
    if (!editorDraft.value) return;
    editorError.value = "";
    const match = parentOptions.value.find((option) => option.label === parentText.trim());
    const parentId = match?.id ?? null;
    editorDraft.value = {
      ...editorDraft.value,
      parentText,
      parentId,
      parentValid: Boolean(match),
      localId: editorDraft.value.mode === "new" && editorDraft.value.localIdAutomatic && match
        ? generatedLocalId(editorDraft.value.label, parentId, desktopData.value)
        : editorDraft.value.localId,
    };
  }

  function selectParent(option: ParentOption) {
    if (!editorDraft.value) return;
    editorError.value = "";
    editorDraft.value = {
      ...editorDraft.value,
      parentText: option.label,
      parentId: option.id,
      parentValid: true,
      localId: editorDraft.value.mode === "new" && editorDraft.value.localIdAutomatic
        ? generatedLocalId(editorDraft.value.label, option.id, desktopData.value)
        : editorDraft.value.localId,
    };
  }

  function updateEditorContent(value: string) {
    if (!editorDraft.value) return;
    editorDraft.value = {
      ...editorDraft.value,
      content: value,
      contentDirty: true,
    };
  }

  function startNew() {
    const parent = selected.value ?? activeRoot.value;
    if (parent && !parent.capabilities.listEditable) {
      editorError.value = `${parent.label} kann keine Unterknoten aufnehmen.`;
      return;
    }
    editorError.value = "";
    newDraftAnchorId.value = parent?.id ?? null;
    editorDraft.value = {
      mode: "new",
      nodeId: null,
      label: "",
      localId: "",
      localIdAutomatic: true,
      parentId: parent?.id ?? null,
      parentText: parent?.path.join("/") ?? "",
      parentValid: true,
      content: "",
      contentRevision: 0,
      contentDirty: false,
    };
    if (parent && !expandedRowKeys.value.includes(parent.id)) {
      expandedRowKeys.value = [...expandedRowKeys.value, parent.id];
    }
  }

  function cancelNew() {
    if (editorDraft.value?.mode !== "new") return;
    editorDraft.value = selected.value
      ? editDraft(selected.value, content.value, contentRevision.value)
      : null;
    newDraftAnchorId.value = null;
    editorError.value = "";
  }

  async function saveEditor() {
    const draft = editorDraft.value;
    const data = desktopData.value;
    if (!draft || !data || editorSaving.value) return;
    const validationError = validateDraft(draft, data);
    if (validationError) {
      editorError.value = validationError;
      return;
    }

    editorSaving.value = true;
    editorError.value = "";
    let targetId = draft.nodeId;
    try {
      if (draft.mode === "new") {
        targetId = crypto.randomUUID();
        await createDataNode(data.workspace.id, {
          requestId: crypto.randomUUID(),
          nodeId: targetId,
          parentId: draft.parentId,
          afterNodeId: null,
          kind: "data-file",
          label: draft.label.trim(),
          localId: draft.localId.trim(),
          content: draft.content,
          expectedTreeRevision: data.tree.document.revision,
        });
      } else if (draft.nodeId) {
        const original = data.rowsById.get(draft.nodeId);
        if (!original) throw new Error("Der Knoten ist nicht mehr vorhanden.");
        await editDataNode(data.workspace.id, original.id, {
          requestId: crypto.randomUUID(),
          label: draft.label.trim(),
          localId: draft.localId.trim(),
          parentId: draft.parentId,
          content: draft.content,
          expectedNodeRevision: original.revision,
          expectedContentRevision: draft.contentRevision,
          expectedTreeRevision: data.tree.document.revision,
        });
      }
      newDraftAnchorId.value = null;
      editorDraft.value = null;
      await loadData(targetId);
    } catch (reason) {
      editorError.value = reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.";
      await loadData(targetId);
    } finally {
      editorSaving.value = false;
    }
  }

  async function toggleEnabled(row: TreeRow, enabled: boolean) {
    const data = desktopData.value;
    if (!data || row.draft || enabledSavingIds.value.includes(row.id)) return;
    const preservedDraft = editorDraft.value ? { ...editorDraft.value } : null;
    enabledSavingIds.value = [...enabledSavingIds.value, row.id];
    editorError.value = "";
    try {
      await setDataNodeEnabled(data.workspace.id, row.id, {
        requestId: crypto.randomUUID(),
        enabled,
        expectedRevision: row.enabledRevision,
      });
      await loadData(selected.value?.id);
      await nextTick();
      if (preservedDraft?.mode === "edit") editorDraft.value = preservedDraft;
    } catch (reason) {
      editorError.value = reason instanceof Error ? reason.message : "Aktiv-Status konnte nicht gespeichert werden.";
      await loadData(selected.value?.id);
    } finally {
      enabledSavingIds.value = enabledSavingIds.value.filter((id) => id !== row.id);
    }
  }

  async function deleteSelected() {
    const target = selected.value;
    const data = desktopData.value;
    if (
      !target
      || !data
      || editorDeleting.value
      || editorDraft.value?.mode === "new"
      || target.kind === "system-directory"
      || target.kind === "trash-directory"
    ) return;

    editorDeleting.value = true;
    editorError.value = "";
    try {
      await deleteDataNode(data.workspace.id, target.id, {
        requestId: crypto.randomUUID(),
        expectedTreeRevision: data.tree.document.revision,
      });
      selectedRootId.value = target.parentId;
      editorDraft.value = null;
      await loadData(target.parentId);
    } catch (reason) {
      editorError.value = reason instanceof Error ? reason.message : "Löschen fehlgeschlagen.";
      await loadData(target.id);
    } finally {
      editorDeleting.value = false;
    }
  }

  return {
    activeModule,
    desktopData,
    selectedRootId,
    selected,
    content,
    contentFormat,
    contentLoading,
    contentUpdatedAt,
    loading,
    error,
    search,
    expandedRowKeys,
    loadDurationMs,
    focusDurationMs,
    activeRoot,
    filteredRows,
    visibleCount,
    sectionTitle,
    totalCount,
    navigatorData,
    navigatorCurrentKey,
    selectedTableId,
    parentOptions,
    editorDraft,
    editorSaving,
    editorDeleting,
    editorError,
    enabledSavingIds,
    activeAppId,
    appVisualization,
    appDataSourceText,
    appDataSourceValid,
    appDataSourceOptions,
    appDataSource,
    appRows,
    loadData,
    openModule,
    selectApp,
    updateAppDataSourceText,
    selectAppDataSource,
    updateAppVisualization,
    focusNode,
    selectRow,
    updateEditorLabel,
    updateEditorLocalId,
    updateParentText,
    selectParent,
    updateEditorContent,
    startNew,
    cancelNew,
    saveEditor,
    deleteSelected,
    toggleEnabled,
  };
}

const DRAFT_NODE_ID = "__desktop_new_draft__";

function editDraft(row: TreeRow, content = "", contentRevision = 0): InspectorDraft {
  return {
    mode: "edit",
    nodeId: row.id,
    label: row.label,
    localId: row.localId,
    localIdAutomatic: false,
    parentId: row.parentId,
    parentText: row.path.slice(0, -1).join("/"),
    parentValid: true,
    content,
    contentRevision,
    contentDirty: false,
  };
}

function createDraftRow(draft: InspectorDraft): TreeRow {
  return {
    id: DRAFT_NODE_ID,
    parentId: draft.parentId,
    kind: "data-file",
    label: draft.label,
    localId: draft.localId,
    position: Number.MAX_SAFE_INTEGER,
    revision: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    capabilities: { contentEditable: true, listEditable: true, listItemLimit: null },
    children: [],
    descendantCount: 0,
    enabled: true,
    enabledRevision: 0,
    path: [],
    draft: true,
  };
}

function insertDraftRow(
  rows: TreeRow[],
  draft: TreeRow,
  anchorId: string | null,
  activeRootId: string | null,
): TreeRow[] {
  if (anchorId === activeRootId) return [...rows, draft];
  if (anchorId === null && activeRootId === null) return [...rows, draft];
  let inserted = false;
  const insert = (items: TreeRow[]): TreeRow[] => items.map((row) => {
    if (row.id === anchorId) {
      inserted = true;
      return { ...row, children: [...row.children, draft] };
    }
    const children = insert(row.children);
    return children === row.children ? row : { ...row, children };
  });
  const result = insert(rows);
  return inserted ? result : [...rows, draft];
}

function collectIds(rows: TreeRow[], target: Set<string>) {
  for (const row of rows) {
    target.add(row.id);
    collectIds(row.children, target);
  }
}

function validateDraft(draft: InspectorDraft, data: DesktopData): string {
  const label = draft.label.trim();
  const localId = draft.localId.trim();
  if (!label) return "Name darf nicht leer sein.";
  if (label.length > 200) return "Name darf maximal 200 Zeichen lang sein.";
  if (!treeNodeLocalIdSchema.safeParse(localId).success) {
    return "ID darf nur a-z, 0-9, _ und - enthalten.";
  }
  if (!draft.parentValid) return "Parent muss einem vorhandenen Pfad entsprechen.";
  if (draft.content.length > 1_000_000) return "Content darf maximal 1.000.000 Zeichen lang sein.";
  const parent = draft.parentId ? data.rowsById.get(draft.parentId) : null;
  if (draft.parentId && !parent) return "Der gewählte Parent ist nicht mehr vorhanden.";
  if (parent && !parent.capabilities.listEditable) return `${parent.label} kann keine Unterknoten aufnehmen.`;
  if (draft.mode === "edit" && draft.nodeId) {
    const node = data.rowsById.get(draft.nodeId);
    if (!node) return "Der Knoten ist nicht mehr vorhanden.";
    if (draft.parentId === draft.nodeId) return "Ein Knoten kann nicht sein eigener Parent sein.";
    const descendants = new Set<string>();
    collectIds(node.children, descendants);
    if (draft.parentId && descendants.has(draft.parentId)) return "Ein Unterknoten kann nicht zum Parent werden.";
  }
  return "";
}

function generatedLocalId(
  label: string,
  parentId: string | null,
  data: DesktopData | null,
): string {
  if (!label.trim()) return "";
  const siblings = parentId
    ? data?.rowsById.get(parentId)?.children ?? []
    : data?.roots ?? [];
  return createTreeNodeLocalId(label, siblings.map((row) => row.localId));
}

function toNavigatorRow(row: TreeRow): NavigatorRow | null {
  if (!row.children.length) return null;
  return {
    ...row,
    children: row.children.flatMap((child) => {
      const parent = toNavigatorRow(child);
      return parent ? [parent] : [];
    }),
  };
}

function filterRows(rows: TreeRow[], query: string): TreeRow[] {
  const normalized = query.trim().toLocaleLowerCase("de");
  if (!normalized) return rows;

  return rows.flatMap((row) => {
    const children = filterRows(row.children, normalized);
    const matches = [row.label, row.localId, row.kind]
      .join(" ")
      .toLocaleLowerCase("de")
      .includes(normalized);
    return matches || children.length ? [{ ...row, children }] : [];
  });
}

function countRows(rows: TreeRow[]): number {
  return rows.reduce((total, row) => total + 1 + countRows(row.children), 0);
}

function flattenRows(rows: TreeRow[]): TreeRow[] {
  return rows.flatMap((row) => [row, ...flattenRows(row.children)]);
}
