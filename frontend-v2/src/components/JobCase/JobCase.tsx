import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createTreeNodeLocalId,
  jobSnapshotDtoSchema,
  treeNodeLabelSchema,
  type JobConfigDto,
  type JobSnapshotDto,
  type TreeLoadDto,
  type TreeNodeContentDto,
  type TreeNodeDto,
} from "@flydeck/shared/v2";
import { Base, resolveCssValue, type BaseStyleProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
import { CycleButton } from "../CycleButton";
import { InputControl, type InputControlProps } from "../InputControl";
import { ListControlButton } from "../ListControlButton";
import { NodeIdInput, type NodeIdInputProps } from "../NodeIdInput";
import { ParentInput, type ParentInputProps } from "../ParentInput";
import { PromptInput } from "../PromptInput";
import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserContentRenderProps,
  type TreeBrowserProps,
  type TreeBrowserRootControl,
} from "../TreeBrowser";
import { JobApiError, jobApi } from "../../api/jobs";
import {
  workspaceReplica,
  workspaceSyncEngine,
  type WorkspaceReplicaScope,
} from "../../replica";
import {
  isStringRecord,
  useClientStateSlice,
  type ClientStateSlice,
} from "../../state";
import styles from "./JobCase.module.css";

type JobTab = "MEMO" | "DATA" | "PRMPT" | "IMPRT";

export type TreeImportNode = {
  depth: number;
  label: string;
  content: string;
};

const jobMemoryDraftsSlice: ClientStateSlice<Record<string, string>> = {
  name: "agent.jobMemoryDrafts",
  version: 1,
  defaultValue: {},
  validate: isStringRecord,
};

const jobImportSourcesSlice: ClientStateSlice<Record<string, string>> = {
  name: "agent.jobImportSources",
  version: 1,
  defaultValue: {},
  validate: isStringRecord,
};

const jobSnapshotsSlice: ClientStateSlice<Record<string, JobSnapshotDto>> = {
  name: "agent.jobSnapshots",
  version: 1,
  defaultValue: {},
  validate: (value): value is Record<string, JobSnapshotDto> => (
    Boolean(value && typeof value === "object" && !Array.isArray(value))
    && Object.values(value as Record<string, unknown>).every(
      (snapshot) => jobSnapshotDtoSchema.safeParse(snapshot).success,
    )
  ),
};

export type JobCaseStyleProps = BaseStyleProps & {
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  fontSize?: string;
};

export type JobCaseProps = JobCaseStyleProps & Pick<
  TreeBrowserContentRenderProps<{ kind: string }>,
  "height" | "localIdAvailable" | "onLocalIdChange"
> & {
  children?: ReactNode;
  inputControlProps?: InputControlProps;
  localId: string;
  memoSelectionIds?: readonly string[];
  name: string;
  nodeId: string;
  nodeIdInputProps?: Omit<NodeIdInputProps,
    "available" | "disabled" | "onChange" | "onSave" | "savedValue" | "value">;
  parentInputProps?: Omit<ParentInputProps,
    "current" | "onChange" | "onSetParent" | "targets" | "value">;
  root?: TreeBrowserRootControl;
  scope: WorkspaceReplicaScope;
  tree: TreeLoadDto;
  treeBrowserProps?: Omit<TreeBrowserProps<unknown>,
    "model" | "renderContent" | "renderRootContent">;
  workspaceId: string;
  onNameChange: (name: string) => Promise<boolean>;
  onConfigured?: () => void;
};

export function JobCase({
  buttonProps,
  children,
  fontSize,
  inputControlProps,
  localId,
  localIdAvailable,
  memoSelectionIds = [],
  name,
  nodeId,
  nodeIdInputProps,
  parentInputProps,
  root,
  scope,
  tree,
  treeBrowserProps,
  workspaceId,
  onLocalIdChange,
  onNameChange,
  onConfigured,
  ...baseProps
}: JobCaseProps) {
  const [cachedSnapshots, setCachedSnapshots] = useClientStateSlice(
    jobSnapshotsSlice,
  );
  const cachedSnapshot = cachedSnapshots[nodeId] ?? null;
  const [snapshotState, setSnapshotState] = useState<{
    nodeId: string; value: JobSnapshotDto | null;
  }>({ nodeId, value: cachedSnapshot });
  const snapshot = snapshotState.nodeId === nodeId
    ? snapshotState.value ?? cachedSnapshot
    : cachedSnapshot;
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);
  const publishSnapshot = useCallback((value: JobSnapshotDto) => {
    snapshotRef.current = value;
    setSnapshotState({ nodeId, value });
    setCachedSnapshots((current) => ({ ...current, [nodeId]: value }));
  }, [nodeId, setCachedSnapshots]);
  const [tab, setTab] = useState<JobTab>("MEMO");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const ignoredRunIds = useRef(new Set<string>());
  const [promptDraft, setPromptDraft] = useState({ nodeId, saved: "", value: "" });
  const [memoryDrafts, setMemoryDrafts] = useClientStateSlice(jobMemoryDraftsSlice);
  const [importSources, setImportSources] = useClientStateSlice(jobImportSourcesSlice);
  const [dataSourcesDraft, setDataSourcesDraft] = useState({
    nodeId, saved: "", value: "",
  });
  const [nameDraft, setNameDraft] = useState({ nodeId, saved: name, value: name });
  const [localIdDraft, setLocalIdDraft] = useState({ nodeId, saved: localId, value: localId });
  const [parentDraft, setParentDraft] = useState({
    nodeId, currentId: root?.current.id, currentPath: root?.current.path,
    value: root?.current.path ?? "",
  });
  const [importParent, setImportParent] = useState({ nodeId, value: "" });
  const [importPreview, setImportPreview] = useState<{
    nodeId: string;
    source: string;
    nodes: TreeImportNode[] | null;
    error: string | null;
  }>({ nodeId, source: "", nodes: null, error: null });
  const [importPending, setImportPending] = useState(false);
  const [importResult, setImportResult] = useState("");

  useEffect(() => {
    let active = true;
    void jobApi.read(workspaceId, nodeId).then((value) => {
      if (active) {
        publishSnapshot(value);
      }
    }).catch(() => undefined);
    const events = new EventSource(jobApi.eventsUrl(workspaceId, nodeId));
    events.addEventListener("snapshot", (event) => {
      if (!active) return;
      const value = JSON.parse((event as MessageEvent<string>).data) as JobSnapshotDto;
      const activeRun = value.activeRun && ignoredRunIds.current.has(value.activeRun.id)
        ? null : value.activeRun;
      const currentConfig = snapshotRef.current?.config;
      const config = currentConfig && currentConfig.revision > value.config.revision
        ? currentConfig : value.config;
      publishSnapshot({ ...value, config, activeRun });
      void workspaceSyncEngine.flush(scope).then((succeeded) => (
        succeeded && value.latestRun
          ? workspaceSyncEngine.ensureContents(scope, [value.latestRun.nodeId])
          : false
      ));
    });
    events.onerror = () => undefined;
    return () => {
      active = false;
      events.close();
    };
  }, [nodeId, publishSnapshot, scope, workspaceId]);

  const config = snapshot?.config ?? null;
  const activeRun = snapshot?.activeRun ?? null;
  const busy = activeRun?.status === "queued" || activeRun?.status === "running";
  const editingLocked = busy && !cancelPending;
  const effectivePrompt = promptDraft.nodeId === nodeId
    && promptDraft.saved === (config?.prompt ?? "")
    ? promptDraft.value : config?.prompt ?? "";
  const effectiveMemory = Object.hasOwn(memoryDrafts, nodeId)
    ? memoryDrafts[nodeId] : config?.memory ?? "";
  const effectiveDataSources = dataSourcesDraft.nodeId === nodeId
    && dataSourcesDraft.saved === (config?.dataSources ?? "")
    ? dataSourcesDraft.value : config?.dataSources ?? "";
  const effectiveName = nameDraft.nodeId === nodeId && nameDraft.saved === name
    ? nameDraft.value : name;
  const effectiveLocalId = localIdDraft.nodeId === nodeId && localIdDraft.saved === localId
    ? localIdDraft.value : localId;
  const parentValue = parentDraft.nodeId === nodeId
    && parentDraft.currentId === root?.current.id
    && parentDraft.currentPath === root?.current.path
    ? parentDraft.value : root?.current.path ?? "";
  const effectiveImportSource = importSources[nodeId] ?? "";
  const effectiveImportParent = importParent.nodeId === nodeId
    ? importParent.value : "";
  const importParentNode = effectiveImportParent.trim()
    ? resolveDataSource(tree.document.nodes, effectiveImportParent)
    : null;
  const importParentValid = !effectiveImportParent.trim() || Boolean(importParentNode);
  const currentImportPreview = importPreview.nodeId === nodeId
    && importPreview.source === effectiveImportSource
    ? importPreview : null;

  function setLocalMemoryDraft(value: string) {
    setMemoryDrafts((current) => ({ ...current, [nodeId]: value }));
  }

  function clearLocalMemoryDraft() {
    setMemoryDrafts((current) => {
      const next = { ...current };
      delete next[nodeId];
      return next;
    });
  }

  useEffect(() => {
    if (!effectiveImportSource.trim()) return;
    const timer = window.setTimeout(() => {
      try {
        setImportPreview({
          nodeId,
          source: effectiveImportSource,
          nodes: parseTreeImport(effectiveImportSource),
          error: null,
        });
      } catch (cause) {
        setImportPreview({
          nodeId,
          source: effectiveImportSource,
          nodes: null,
          error: cause instanceof Error ? cause.message : "Parser error",
        });
      }
    }, 2_000);
    return () => window.clearTimeout(timer);
  }, [effectiveImportSource, nodeId]);

  async function updateConfig(change: (current: JobConfigDto) => JobConfigDto) {
    if (!config || editingLocked) return false;
    const previousSnapshot = snapshot;
    let currentConfig = config;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const next = change(currentConfig);
      publishSnapshot({
        ...(snapshotRef.current ?? previousSnapshot!),
        configured: true,
        config: next,
      });
      try {
        const saved = await jobApi.update(workspaceId, nodeId, {
          requestId: crypto.randomUUID(),
          expectedRevision: currentConfig.revision,
          memoryNodeIds: next.memoryNodeIds,
          memory: next.memory,
          dataSourceNodeIds: next.dataSourceNodeIds,
          dataSources: next.dataSources,
          prompt: next.prompt,
          modelTier: next.modelTier,
          effort: next.effort,
          schedule: next.schedule,
        });
        publishSnapshot({
          ...(snapshotRef.current ?? previousSnapshot!),
          configured: true,
          config: saved,
        });
        onConfigured?.();
        return true;
      } catch (cause) {
        if (!(cause instanceof JobApiError)
          || cause.response.error !== "REVISION_CONFLICT"
          || attempt === 2) {
          publishSnapshot(previousSnapshot!);
          return false;
        }
        const fresh = await jobApi.read(workspaceId, nodeId).catch(() => null);
        if (!fresh) {
          publishSnapshot(previousSnapshot!);
          return false;
        }
        currentConfig = fresh.config;
        publishSnapshot(fresh);
      }
    }
    return false;
  }

  async function setMemoryFromMemo() {
    if (editingLocked || memoSelectionIds.length === 0) return;
    const buildMemory = (
      record: Awaited<ReturnType<typeof workspaceReplica.load>>,
    ) => {
      const sections = memoSelectionIds.map((id) => {
        const node = tree.document.nodes.find((candidate) => (
          candidate.id === id && candidate.kind === "agent-memo"
        ));
        const content = record?.contents[id]?.content;
        return node && content !== undefined
          ? content
          : null;
      });
      if (sections.some((section) => section === null)) {
        return null;
      }
      const memory = sections
        .filter((section): section is string => section !== null)
        .map((section) => section.trim())
        .filter(Boolean)
        .join("\n\n");
      return memory;
    };
    try {
      const priorDraft = memoryDrafts[nodeId];
      const cached = await workspaceReplica.load(scope);
      const cachedValue = buildMemory(cached);
      if (cachedValue !== null) {
        setLocalMemoryDraft(cachedValue);
        return;
      }
      void workspaceSyncEngine.ensureContents(scope, memoSelectionIds)
        .then(() => workspaceReplica.load(scope))
        .then((hydrated) => {
          const value = buildMemory(hydrated);
          if (value === null) return;
          setMemoryDrafts((current) => current[nodeId] === priorDraft
            ? { ...current, [nodeId]: value }
            : current);
        })
        .catch(() => undefined);
    } catch { /* Keep JobCase errors out of the content layout. */ }
  }

  async function selectTab(nextTab: JobTab) {
    if (nextTab === tab) return;
    const previousTab = tab;
    setTab(nextTab);
    if (previousTab === "MEMO" && config && effectiveMemory !== config.memory) {
      const value = effectiveMemory;
      if (await updateConfig((current) => ({
        ...current, memory: value, memoryNodeIds: [],
      }))) {
        clearLocalMemoryDraft();
      }
    }
    if (previousTab === "DATA" && config && effectiveDataSources !== config.dataSources) {
      const value = effectiveDataSources;
      if (await updateConfig((current) => ({ ...current, dataSources: value }))) {
        setDataSourcesDraft({ nodeId, saved: value, value });
      }
    }
    if (previousTab === "PRMPT" && config && effectivePrompt !== config.prompt) {
      const value = effectivePrompt;
      if (await updateConfig((current) => ({ ...current, prompt: value }))) {
        setPromptDraft({ nodeId, saved: value, value });
      }
    }
  }

  async function resolveCurrentDataSource(value: string) {
    const nodes = tree.document.nodes;
    const source = resolveDataSource(nodes, value);
    return source ? {
      source,
      path: dataSourcePath(nodes, source.id) ?? source.localId,
    } : undefined;
  }

  async function setDataSourcesFromSelection() {
    if (editingLocked || !config || config.dataSourceNodeIds.length === 0) return;
    try {
      const record = await workspaceReplica.load(scope);
      const nodes = record?.tree?.document.nodes ?? tree.document.nodes;
      const nodeIds = dataSourceSubtreeIds(nodes, config.dataSourceNodeIds);
      const cachedValue = serializeDataSources(
        nodes,
        record?.contents ?? {},
        config.dataSourceNodeIds,
      );
      setDataSourcesDraft({
        nodeId,
        saved: config.dataSources,
        value: cachedValue,
      });
      void workspaceSyncEngine.ensureContents(scope, nodeIds)
        .then(() => workspaceReplica.load(scope))
        .then((hydrated) => {
          const value = serializeDataSources(
            hydrated?.tree?.document.nodes ?? nodes,
            hydrated?.contents ?? {},
            config.dataSourceNodeIds,
          );
          setDataSourcesDraft((current) => current.nodeId === nodeId
            && current.value === cachedValue
            ? { nodeId, saved: config.dataSources, value }
            : current);
        })
        .catch(() => undefined);
    } catch { /* Keep JobCase errors out of the content layout. */ }
  }

  async function importDataTree() {
    if (importPending || !currentImportPreview?.nodes || !importParentValid) return;
    setImportPending(true);
    setImportResult("");
    try {
      let record = await workspaceReplica.load(scope);
      const currentNodes = record?.tree?.document.nodes ?? tree.document.nodes;
      const parentId = importParentNode?.id ?? null;
      assertImportCapacity(currentNodes, parentId, currentImportPreview.nodes);
      const siblingLocalIds = new Map<string, string[]>();
      const lastChildIds = new Map<string, string | null>();
      for (const currentNode of [...currentNodes].sort(compareTreeNodes)) {
        const key = currentNode.parentId ?? "";
        siblingLocalIds.set(key, [...(siblingLocalIds.get(key) ?? []), currentNode.localId]);
        lastChildIds.set(key, currentNode.id);
      }
      const parentsByDepth = new Map<number, string | null>([[0, parentId]]);
      const commandId = crypto.randomUUID();
      for (const entry of currentImportPreview.nodes) {
        if (!parentsByDepth.has(entry.depth - 1)) throw new Error("Import depth has no parent");
        const actualParentId = parentsByDepth.get(entry.depth - 1) ?? null;
        const parentKey = actualParentId ?? "";
        const siblingIds = siblingLocalIds.get(parentKey) ?? [];
        const localId = createTreeNodeLocalId(entry.label, siblingIds);
        const createdId = crypto.randomUUID();
        record = await workspaceSyncEngine.submit(scope, {
          type: "create-node",
          input: {
            requestId: crypto.randomUUID(),
            nodeId: createdId,
            parentId: actualParentId,
            afterNodeId: lastChildIds.get(parentKey) ?? null,
            kind: "data-file",
            label: entry.label,
            localId,
            expectedTreeRevision: record?.tree?.document.revision
              ?? tree.document.revision,
          },
        }, commandId);
        siblingLocalIds.set(parentKey, [...siblingIds, localId]);
        lastChildIds.set(parentKey, createdId);
        parentsByDepth.set(entry.depth, createdId);
        for (const depth of [...parentsByDepth.keys()]) {
          if (depth > entry.depth) parentsByDepth.delete(depth);
        }
        if (entry.content) {
          record = await workspaceSyncEngine.submit(scope, {
            type: "update-content",
            nodeId: createdId,
            input: {
              requestId: crypto.randomUUID(),
              content: entry.content,
              expectedRevision: 0,
            },
          }, commandId);
        }
      }
      const saved = await workspaceSyncEngine.flush(scope);
      setImportResult(saved
        ? `${currentImportPreview.nodes.length} items imported`
        : "Import is queued for synchronization");
    } catch (cause) {
      setImportResult(cause instanceof Error ? cause.message : "Import failed");
    } finally {
      setImportPending(false);
    }
  }

  async function start() {
    const prompt = effectivePrompt;
    if (!config || busy || cancelPending || !prompt.trim()) return;
    try {
      if (prompt !== config.prompt) {
        if (!await updateConfig((current) => ({ ...current, prompt }))) return;
        setPromptDraft({ nodeId, saved: prompt, value: prompt });
      }
      const run = await jobApi.start(
        workspaceId,
        nodeId,
        crypto.randomUUID(),
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      );
      const current = snapshotRef.current;
      if (current) publishSnapshot({ ...current, activeRun: run, latestRun: run });
      void workspaceSyncEngine.flush(scope);
    } catch { /* Keep JobCase errors out of the content layout. */ }
  }

  async function cancel() {
    if (!activeRun || cancelPending) return;
    ignoredRunIds.current.add(activeRun.id);
    setCancelPending(true);
    const optimistic = snapshotRef.current;
    if (optimistic) publishSnapshot({ ...optimistic, activeRun: null });
    try {
      await jobApi.cancel(workspaceId, nodeId, activeRun.id);
      const current = await jobApi.read(workspaceId, nodeId);
      publishSnapshot(current);
      void workspaceSyncEngine.flush(scope);
    } catch {
      ignoredRunIds.current.delete(activeRun.id);
      const current = await jobApi.read(workspaceId, nodeId).catch(() => null);
      if (current) publishSnapshot(current);
      else if (optimistic) publishSnapshot(optimistic);
    } finally {
      setCancelPending(false);
    }
  }

  const dataSourceModel = useMemo(() => new TreeBrowserModel({
    definitionAuthority: true,
    initialTree: (config?.dataSourceNodeIds ?? []).map((id) => ({
      id, label: dataSourcePath(tree.document.nodes, id) ?? id, localId: id, enabled: true,
      contentVisible: false, listEditable: false, children: [],
    })),
    storageKey: `flydeck.tree.job-data.${workspaceId}.${nodeId}`,
  }), [config?.dataSourceNodeIds, nodeId, tree.document.nodes, workspaceId]);

  return (
    <Base
      {...baseProps}
      as="section"
      className={styles.root}
      componentName="JobCase"
      aria-label="Job case"
      data-locked={editingLocked || undefined}
      style={{ fontSize: resolveCssValue(fontSize) }}
    >
      <ListControlButton
        {...buttonProps}
        aria-expanded={detailsOpen}
        width="100%"
        onClick={() => setDetailsOpen((open) => !open)}
      >
        {detailsOpen ? "Hide details" : "Details"}
      </ListControlButton>
      {detailsOpen ? (
        <div className={styles.identityFields}>
          <NodeIdInput
            {...inputControlProps}
            {...nodeIdInputProps}
            available={localIdAvailable}
            disabled={editingLocked || !onLocalIdChange}
            savedValue={localId}
            value={effectiveLocalId}
            onChange={(value) => setLocalIdDraft({ nodeId, saved: localId, value })}
            onSave={async (value) => {
              if (!editingLocked && await onLocalIdChange?.(value)) {
                setLocalIdDraft({ nodeId, saved: value, value });
              }
            }}
          />
          <InputControl
            {...inputControlProps}
            buttonProps={{
              ...inputControlProps?.buttonProps,
              disabled: editingLocked
                || !treeNodeLabelSchema.safeParse(effectiveName.trim()).success
                || effectiveName.trim() === name,
            }}
            control="input"
            inputProps={{
              ...inputControlProps?.inputProps,
              "aria-label": "Job name", label: "Name", maxLength: 200,
              readOnly: editingLocked,
            }}
            keyboardLayout="block"
            value={effectiveName}
            onChange={(value) => setNameDraft({ nodeId, saved: name, value })}
            onSend={async () => {
              const value = effectiveName.trim();
              if (!editingLocked && await onNameChange(value)) {
                setNameDraft({ nodeId, saved: value, value });
              }
            }}
          />
          {root ? (
            <ParentInput
              {...parentInputProps}
              current={root.current}
              targets={root.targets}
              value={parentValue}
              inputProps={{
                ...parentInputProps?.inputProps,
                readOnly: editingLocked,
              }}
              onChange={(value) => setParentDraft({
                nodeId, currentId: root.current.id,
                currentPath: root.current.path, value,
              })}
              onSetParent={async (target) => {
                if (!editingLocked && await root.onChange(target.id)) {
                  setParentDraft({
                    nodeId, currentId: target.id,
                    currentPath: target.path, value: target.path,
                  });
                }
              }}
            />
          ) : null}
        </div>
      ) : null}
      <div className={styles.tabs} role="tablist" aria-label="Job settings">
        {(["MEMO", "DATA", "PRMPT", "IMPRT"] as const).map((item) => (
          <Button
            {...buttonProps}
            key={item}
            activeColor={item === "IMPRT"
              ? "COLOR_SUCCESS"
              : buttonProps?.activeColor}
            role="tab"
            aria-selected={tab === item}
            selected={tab === item}
            onClick={() => void selectTab(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className={styles.panel} role="tabpanel" aria-label={`${tab} settings`}>
        {tab === "MEMO" && (
          <div className={styles.memoryFields}>
            <Button
              {...buttonProps}
              disabled={editingLocked || memoSelectionIds.length === 0}
              onClick={() => void setMemoryFromMemo()}
            >
              Set Memory
            </Button>
            <PromptInput
              {...inputControlProps}
              keyboardLayout="block"
              value={effectiveMemory}
              textareaProps={{
                ...inputControlProps?.textareaProps,
                "aria-label": "Job memory", label: "Memory",
                height: "26rem",
                readOnly: editingLocked,
              }}
              onChange={setLocalMemoryDraft}
              onSend={async (value) => {
                if (await updateConfig((current) => ({
                  ...current, memory: value, memoryNodeIds: [],
                }))) {
                  clearLocalMemoryDraft();
                }
              }}
            />
          </div>
        )}
        {tab === "DATA" && (
          <div className={styles.dataFields}>
            <TreeBrowser
              {...treeBrowserProps}
              defaultPageSize={4}
              leafListsVisible={false}
              menuVisible={false}
              model={dataSourceModel}
              rootLabel="Datasources"
              rootPageSize={4}
              rootListEditable={!editingLocked}
              onCreateNode={async (value) => {
                const resolved = await resolveCurrentDataSource(value);
                const source = resolved?.source;
                if (!source || config?.dataSourceNodeIds.includes(source.id)) return false;
                const saved = await updateConfig((current) => ({
                  ...current,
                  dataSourceNodeIds: current.dataSourceNodeIds.includes(source.id)
                    ? current.dataSourceNodeIds
                    : [...current.dataSourceNodeIds, source.id],
                }));
                return saved ? {
                  id: source.id, label: resolved.path, localId: source.id,
                  enabled: true, contentVisible: false, listEditable: false, children: [],
                } : false;
              }}
              onRenameNode={async (sourceId, value) => {
                const source = (await resolveCurrentDataSource(value))?.source;
                if (!source || source.id === sourceId) return false;
                return updateConfig((current) => ({
                  ...current,
                  dataSourceNodeIds: current.dataSourceNodeIds.map((id) => (
                    id === sourceId ? source.id : id
                  )),
                }));
              }}
              onDeleteNode={(sourceId) => updateConfig((current) => ({
                ...current,
                dataSourceNodeIds: current.dataSourceNodeIds.filter((id) => id !== sourceId),
              }))}
            />
            <Button
              {...buttonProps}
              disabled={editingLocked || !config?.dataSourceNodeIds.length}
              onClick={() => void setDataSourcesFromSelection()}
            >
              Set Datasources
            </Button>
            <PromptInput
              {...inputControlProps}
              keyboardLayout="block"
              value={effectiveDataSources}
              textareaProps={{
                ...inputControlProps?.textareaProps,
                "aria-label": "Job datasources", label: "Datasources",
                height: "26rem",
                readOnly: editingLocked,
              }}
              onChange={(value) => setDataSourcesDraft({
                nodeId, saved: config?.dataSources ?? "", value,
              })}
              onSend={async (value) => {
                if (await updateConfig((current) => ({
                  ...current, dataSources: value,
                }))) {
                  setDataSourcesDraft({ nodeId, saved: value, value });
                }
              }}
            />
          </div>
        )}
        {tab === "PRMPT" && (
          <>
            <div className={styles.modelControls}>
              <CycleButton
                {...buttonProps}
                activeColor={jobOptionColor(config?.modelTier ?? "ECON", buttonProps?.activeColor)}
                disabled={!config || editingLocked}
                options={["ECON", "MEDI", "HIGH"]}
                selected
                showAlternatives={false}
                value={config?.modelTier ?? "ECON"}
                onChange={(value) => void updateConfig((current) => ({
                  ...current, modelTier: value as JobConfigDto["modelTier"],
                }))}
              />
              <CycleButton
                {...buttonProps}
                activeColor={jobOptionColor(config?.effort ?? "FAST", buttonProps?.activeColor)}
                disabled={!config || editingLocked}
                options={["FAST", "MEDI", "DEEP"]}
                selected
                showAlternatives={false}
                value={config?.effort ?? "FAST"}
                onChange={(value) => void updateConfig((current) => ({
                  ...current, effort: value as JobConfigDto["effort"],
                }))}
              />
            </div>
            <PromptInput
              {...inputControlProps}
              keyboardLayout="block"
              value={effectivePrompt}
              textareaProps={{
                ...inputControlProps?.textareaProps,
                "aria-label": "Job prompt", label: "Prompt",
                height: "13rem",
                readOnly: editingLocked,
              }}
              onChange={(value) => setPromptDraft({
                nodeId, saved: config?.prompt ?? "", value,
              })}
              onSend={async (value) => {
                if (await updateConfig((current) => ({ ...current, prompt: value }))) {
                  setPromptDraft({ nodeId, saved: value, value });
                }
              }}
            />
            {config ? (
              <TimeSettings
                buttonProps={buttonProps}
                config={config}
                disabled={editingLocked}
                inputControlProps={inputControlProps}
                onUpdate={updateConfig}
              />
            ) : null}
          </>
        )}
        {tab === "IMPRT" && (
          <div className={styles.importFields}>
            <InputControl
              {...inputControlProps}
              control="textarea"
              keyboardActions={<></>}
              keyboardLayout="block"
              value={effectiveImportSource}
              textareaProps={{
                ...inputControlProps?.textareaProps,
                "aria-label": "Import source",
                label: "Import source",
                height: "18rem",
                readOnly: importPending,
              }}
              onChange={(value) => {
                setImportResult("");
                setImportSources((current) => ({ ...current, [nodeId]: value }));
              }}
            />
            <InputControl
              {...inputControlProps}
              control="input"
              keyboardActions={<></>}
              keyboardLayout="block"
              value={effectiveImportParent}
              inputProps={{
                ...inputControlProps?.inputProps,
                "aria-label": "Import parent",
                label: "setParent",
                color: importParentValid ? "COLOR_SUCCESS" : "COLOR_ERROR",
                placeholder: "empty = DATA root",
                readOnly: importPending,
              }}
              onChange={(value) => setImportParent({ nodeId, value })}
            />
            <div
              className={styles.importPreview}
              aria-live="polite"
              aria-label="Import preview"
            >
              {!effectiveImportSource.trim() ? "Paste import source" : null}
              {effectiveImportSource.trim() && !currentImportPreview
                ? "Generating preview …" : null}
              {currentImportPreview?.error ? (
                <p className={styles.importError}>Parser error: {currentImportPreview.error}</p>
              ) : null}
              {currentImportPreview?.nodes ? (
                <pre>{formatTreeImportPreview(currentImportPreview.nodes)}</pre>
              ) : null}
            </div>
            <Button
              {...buttonProps}
              disabled={importPending || !importParentValid || !currentImportPreview?.nodes}
              onClick={() => void importDataTree()}
            >
              {importPending ? "Importing …" : "Import"}
            </Button>
            {importResult ? <p className={styles.status}>{importResult}</p> : null}
          </div>
        )}
      </div>
      {tab === "PRMPT" ? (
        <div className={styles.actions}>
          <Button
            {...buttonProps}
            activeColor="COLOR_SUCCESS"
            disabled={!config || busy || cancelPending || !effectivePrompt.trim()}
            onClick={() => void start()}
          >
            Start
          </Button>
          {busy || cancelPending ? (
            <Button
              {...buttonProps}
              activeColor="COLOR_SPEECH"
              disabled={!busy || cancelPending}
              selected
              onClick={() => void cancel()}
            >
              {cancelPending ? "Stopping …" : "Cancel"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {children}
    </Base>
  );
}

function TimeSettings({
  buttonProps,
  config,
  disabled,
  inputControlProps,
  onUpdate,
}: {
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  config: JobConfigDto;
  disabled: boolean;
  inputControlProps?: InputControlProps;
  onUpdate: (change: (current: JobConfigDto) => JobConfigDto) => Promise<boolean>;
}) {
  const defaultZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [due, setDue] = useState(() => config.schedule?.dueAt
    ? toLocalDateTimeInput(config.schedule.dueAt)
    : toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1_000).toISOString()));
  const [zone, setZone] = useState(config.schedule?.timeZone ?? defaultZone);
  const schedule = config.schedule;
  const save = () => onUpdate((current) => ({
    ...current,
    schedule: {
      dueAt: new Date(due).toISOString(),
      timeZone: zone.trim() || defaultZone,
      enabled: current.schedule?.enabled ?? false,
    },
  }));
  return (
    <div className={styles.timeFields}>
      <Button
        {...buttonProps}
        disabled={disabled}
        selected={schedule?.enabled ?? false}
        onClick={() => void onUpdate((current) => ({
          ...current,
          schedule: {
            dueAt: current.schedule?.dueAt ?? new Date(due).toISOString(),
            timeZone: current.schedule?.timeZone ?? zone,
            enabled: !(current.schedule?.enabled ?? false),
          },
        }))}
      >
        {schedule?.enabled ? "Scheduled" : "Not scheduled"}
      </Button>
      <InputControl
        {...inputControlProps}
        control="input"
        inputProps={{
          ...inputControlProps?.inputProps,
          "aria-label": "Job start time", label: "Start time", type: "datetime-local",
          readOnly: disabled,
        }}
        value={due}
        onChange={setDue}
        onSend={() => void save()}
      />
      <InputControl
        {...inputControlProps}
        control="input"
        inputProps={{
          ...inputControlProps?.inputProps,
          "aria-label": "Job timezone", label: "Timezone", readOnly: disabled,
        }}
        value={zone}
        onChange={setZone}
        onSend={() => void save()}
      />
    </div>
  );
}

function jobOptionColor(value: string, defaultColor?: string) {
  if (value === "MEDI") return "COLOR_SPEECH";
  if (value === "HIGH" || value === "DEEP") return "COLOR_ERROR";
  return defaultColor ?? "COLOR_ACCENT_ONE";
}

export function resolveDataSource(nodes: readonly TreeNodeDto[], value: string) {
  const normalized = value.trim();
  if (!normalized) return undefined;

  const direct = nodes.find(({ id }) => id === normalized);
  if (direct && !isTrashNode(nodes, direct.id)) return direct;

  const selectableNodes = nodes.filter((node) => !isTrashNode(nodes, node.id));
  const normalizedLowerCase = normalized.toLowerCase();
  const idMatches = selectableNodes.filter((node) => (
    node.localId.toLowerCase() === normalizedLowerCase
  ));
  if (idMatches.length === 1) return idMatches[0];

  const labelMatches = selectableNodes.filter((node) => (
    node.label.trim().toLowerCase() === normalizedLowerCase
  ));
  if (labelMatches.length === 1) return labelMatches[0];

  const path = normalized.split("/").filter(Boolean);
  let parentId: string | null = null;
  let current: TreeNodeDto | undefined;
  for (const segment of path) {
    current = nodes.find((node) => node.parentId === parentId
      && (node.localId.toLowerCase() === segment.toLowerCase()
        || node.label.trim().toLowerCase() === segment.toLowerCase()));
    if (!current) return undefined;
    parentId = current.id;
  }
  return current && !isTrashNode(nodes, current.id) ? current : undefined;
}

export function dataSourcePath(nodes: readonly TreeNodeDto[], id: string) {
  const segments: string[] = [];
  let current = nodes.find((node) => node.id === id);
  if (!current || isTrashNode(nodes, current.id)) return undefined;
  while (current) {
    segments.unshift(current.localId);
    current = current.parentId
      ? nodes.find((node) => node.id === current?.parentId)
      : undefined;
  }
  return segments.join("/");
}

export function dataSourceSubtreeIds(
  nodes: readonly TreeNodeDto[],
  rootIds: readonly string[],
) {
  const children = new Map<string, TreeNodeDto[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort(compareTreeNodes);
  }
  const ids: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id) || !nodes.some((node) => node.id === id)) return;
    visited.add(id);
    ids.push(id);
    for (const child of children.get(id) ?? []) visit(child.id);
  };
  for (const rootId of rootIds) visit(rootId);
  return ids;
}

export function serializeDataSources(
  nodes: readonly TreeNodeDto[],
  contents: Readonly<Record<string, Pick<TreeNodeContentDto, "content">>>,
  rootIds: readonly string[],
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, TreeNodeDto[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  for (const siblings of children.values()) siblings.sort(compareTreeNodes);

  const lines: string[] = [];
  const visited = new Set<string>();
  const visit = (node: TreeNodeDto, depth: number) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    lines.push(`${"|-".repeat(depth + 1)} ${node.label}`);
    const content = contents[node.id]?.content.trim();
    if (content) {
      for (const line of content.split(/\r?\n/)) {
        lines.push(`${"|-".repeat(depth + 2)} ${line}`);
      }
    }
    for (const child of children.get(node.id) ?? []) visit(child, depth + 1);
  };
  for (const rootId of rootIds) {
    const root = byId.get(rootId);
    if (root) visit(root, 0);
  }
  return lines.join("\n");
}

export function parseTreeImport(source: string): TreeImportNode[] {
  const nodes: TreeImportNode[] = [];
  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const match = rawLine.match(/^((?:\|-)+)[ \t]*(.*)$/);
    if (match) {
      const depth = match[1].length / 2;
      const label = match[2].trim();
      if (!treeNodeLabelSchema.safeParse(label).success) {
        throw new Error("Every tree line needs a valid item name");
      }
      if (depth !== 1 && depth > (nodes.at(-1)?.depth ?? 0) + 1) {
        throw new Error("A tree level cannot skip its parent");
      }
      nodes.push({ depth, label, content: "" });
      continue;
    }
    if (!nodes.length) {
      if (rawLine.trim()) throw new Error("Content needs a tree item first");
      continue;
    }
    nodes[nodes.length - 1].content += `${
      nodes[nodes.length - 1].content ? "\n" : ""
    }${rawLine}`;
  }
  for (const node of nodes) node.content = node.content.trim();
  if (!nodes.length) throw new Error("Import contains no tree items");
  return nodes;
}

export function formatTreeImportPreview(nodes: readonly TreeImportNode[]) {
  return nodes.flatMap((node) => [
    `${"  ".repeat(node.depth - 1)}${node.label}`,
    ...node.content.split("\n").filter(Boolean).map((line) => (
      `${"  ".repeat(node.depth)}${line}`
    )),
  ]).join("\n");
}

function assertImportCapacity(
  currentNodes: readonly TreeNodeDto[],
  parentId: string | null,
  imported: readonly TreeImportNode[],
) {
  const rootAdditions = imported.filter(({ depth }) => depth === 1).length;
  const existingChildren = currentNodes.filter((node) => node.parentId === parentId).length;
  if (existingChildren + rootAdditions > 99) {
    throw new Error("Import would exceed the 99-item limit");
  }
  const childCounts = new Map<number, number>();
  const parentIndexByDepth = new Map<number, number>();
  imported.forEach((node, index) => {
    if (node.depth > 1) {
      const importedParent = parentIndexByDepth.get(node.depth - 1);
      if (importedParent === undefined) throw new Error("Import depth has no parent");
      childCounts.set(importedParent, (childCounts.get(importedParent) ?? 0) + 1);
    }
    parentIndexByDepth.set(node.depth, index);
    for (const depth of [...parentIndexByDepth.keys()]) {
      if (depth > node.depth) parentIndexByDepth.delete(depth);
    }
  });
  if ([...childCounts.values()].some((count) => count > 99)) {
    throw new Error("Import would exceed the 99-item limit");
  }
}

function compareTreeNodes(left: TreeNodeDto, right: TreeNodeDto) {
  return left.position - right.position || left.id.localeCompare(right.id);
}

function isTrashNode(nodes: readonly TreeNodeDto[], id: string) {
  let current = nodes.find((node) => node.id === id);
  while (current) {
    if (current.kind === "trash-directory") return true;
    current = current.parentId
      ? nodes.find((node) => node.id === current?.parentId)
      : undefined;
  }
  return false;
}

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
