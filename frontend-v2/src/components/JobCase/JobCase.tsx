import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
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
import styles from "./JobCase.module.css";

type JobTab = "MEMO" | "DATA" | "PRMPT" | "FUNC";

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
  const [snapshotState, setSnapshotState] = useState<{
    nodeId: string; value: JobSnapshotDto | null;
  }>({ nodeId, value: null });
  const snapshot = snapshotState.nodeId === nodeId ? snapshotState.value : null;
  const [tab, setTab] = useState<JobTab>("MEMO");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const ignoredRunIds = useRef(new Set<string>());
  const [promptDraft, setPromptDraft] = useState({ nodeId, saved: "", value: "" });
  const [memoryDraft, setMemoryDraft] = useState({ nodeId, saved: "", value: "" });
  const [dataSourcesDraft, setDataSourcesDraft] = useState({
    nodeId, saved: "", value: "",
  });
  const [nameDraft, setNameDraft] = useState({ nodeId, saved: name, value: name });
  const [localIdDraft, setLocalIdDraft] = useState({ nodeId, saved: localId, value: localId });
  const [parentDraft, setParentDraft] = useState({
    nodeId, currentId: root?.current.id, currentPath: root?.current.path,
    value: root?.current.path ?? "",
  });

  useEffect(() => {
    let active = true;
    void jobApi.read(workspaceId, nodeId).then((value) => {
      if (active) {
        setSnapshotState({ nodeId, value });
      }
    }).catch(() => undefined);
    const events = new EventSource(jobApi.eventsUrl(workspaceId, nodeId));
    events.addEventListener("snapshot", (event) => {
      if (!active) return;
      const value = JSON.parse((event as MessageEvent<string>).data) as JobSnapshotDto;
      const activeRun = value.activeRun && ignoredRunIds.current.has(value.activeRun.id)
        ? null : value.activeRun;
      setSnapshotState((current) => {
        const currentConfig = current.nodeId === nodeId ? current.value?.config : null;
        const config = currentConfig && currentConfig.revision > value.config.revision
          ? currentConfig : value.config;
        return { nodeId, value: { ...value, config, activeRun } };
      });
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
  }, [nodeId, scope, workspaceId]);

  const config = snapshot?.config ?? null;
  const activeRun = snapshot?.activeRun ?? null;
  const busy = activeRun?.status === "queued" || activeRun?.status === "running";
  const editingLocked = busy && !cancelPending;
  const effectivePrompt = promptDraft.nodeId === nodeId
    && promptDraft.saved === (config?.prompt ?? "")
    ? promptDraft.value : config?.prompt ?? "";
  const effectiveMemory = memoryDraft.nodeId === nodeId
    && memoryDraft.saved === (config?.memory ?? "")
    ? memoryDraft.value : config?.memory ?? "";
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

  async function updateConfig(change: (current: JobConfigDto) => JobConfigDto) {
    if (!config || editingLocked) return false;
    const latest = await jobApi.read(workspaceId, nodeId).catch(() => null);
    if (!latest) return false;
    let currentConfig = latest.config;
    setSnapshotState({ nodeId, value: latest });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const next = change(currentConfig);
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
        setSnapshotState((current) => current.nodeId === nodeId && current.value
          ? { nodeId, value: { ...current.value, configured: true, config: saved } }
          : current);
        onConfigured?.();
        return true;
      } catch (cause) {
        if (!(cause instanceof JobApiError)
          || cause.response.error !== "REVISION_CONFLICT"
          || attempt === 2) return false;
        const fresh = await jobApi.read(workspaceId, nodeId).catch(() => null);
        if (!fresh) return false;
        currentConfig = fresh.config;
        setSnapshotState({ nodeId, value: fresh });
      }
    }
    return false;
  }

  async function setMemoryFromMemo() {
    if (editingLocked || memoSelectionIds.length === 0) return;
    try {
      await workspaceSyncEngine.ensureContents(scope, memoSelectionIds);
      const record = await workspaceReplica.load(scope);
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
        return;
      }
      const memory = sections
        .filter((section): section is string => section !== null)
        .map((section) => section.trim())
        .filter(Boolean)
        .join("\n\n");
      setMemoryDraft({ nodeId, saved: config?.memory ?? "", value: memory });
    } catch { /* Keep JobCase errors out of the content layout. */ }
  }

  async function selectTab(nextTab: JobTab) {
    if (nextTab === tab) return;
    if (tab === "MEMO" && config && effectiveMemory !== config.memory) {
      const value = effectiveMemory;
      if (await updateConfig((current) => ({
        ...current, memory: value, memoryNodeIds: [],
      }))) {
        setMemoryDraft({ nodeId, saved: value, value });
      }
    }
    if (tab === "DATA" && config && effectiveDataSources !== config.dataSources) {
      const value = effectiveDataSources;
      if (await updateConfig((current) => ({ ...current, dataSources: value }))) {
        setDataSourcesDraft({ nodeId, saved: value, value });
      }
    }
    if (tab === "PRMPT" && config && effectivePrompt !== config.prompt) {
      const value = effectivePrompt;
      if (await updateConfig((current) => ({ ...current, prompt: value }))) {
        setPromptDraft({ nodeId, saved: value, value });
      }
    }
    setTab(nextTab);
  }

  async function resolveCurrentDataSource(value: string) {
    await workspaceSyncEngine.flush(scope).catch(() => false);
    const record = await workspaceReplica.load(scope).catch(() => null);
    const nodes = record?.tree?.document.nodes ?? tree.document.nodes;
    const source = resolveDataSource(nodes, value);
    return source ? {
      source,
      path: dataSourcePath(nodes, source.id) ?? source.localId,
    } : undefined;
  }

  async function setDataSourcesFromSelection() {
    if (editingLocked || !config || config.dataSourceNodeIds.length === 0) return;
    try {
      await workspaceSyncEngine.flush(scope).catch(() => false);
      let record = await workspaceReplica.load(scope);
      const nodes = record?.tree?.document.nodes ?? tree.document.nodes;
      const nodeIds = dataSourceSubtreeIds(nodes, config.dataSourceNodeIds);
      await workspaceSyncEngine.ensureContents(scope, nodeIds);
      record = await workspaceReplica.load(scope);
      const value = serializeDataSources(
        nodes,
        record?.contents ?? {},
        config.dataSourceNodeIds,
      );
      setDataSourcesDraft({
        nodeId,
        saved: config.dataSources,
        value,
      });
    } catch { /* Keep JobCase errors out of the content layout. */ }
  }

  async function start() {
    if (!config || busy || cancelPending) return;
    try {
      const run = await jobApi.start(
        workspaceId,
        nodeId,
        crypto.randomUUID(),
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      );
      setSnapshotState((current) => current.nodeId === nodeId && current.value
        ? { nodeId, value: { ...current.value, activeRun: run, latestRun: run } }
        : current);
      void workspaceSyncEngine.flush(scope);
    } catch { /* Keep JobCase errors out of the content layout. */ }
  }

  async function cancel() {
    if (!activeRun || cancelPending) return;
    ignoredRunIds.current.add(activeRun.id);
    setCancelPending(true);
    setSnapshotState((current) => current.nodeId === nodeId && current.value
      ? { nodeId, value: { ...current.value, activeRun: null } }
      : current);
    try {
      await jobApi.cancel(workspaceId, nodeId, activeRun.id);
      const current = await jobApi.read(workspaceId, nodeId);
      setSnapshotState({ nodeId, value: current });
      void workspaceSyncEngine.flush(scope);
    } catch {
      ignoredRunIds.current.delete(activeRun.id);
      const current = await jobApi.read(workspaceId, nodeId).catch(() => null);
      if (current) setSnapshotState({ nodeId, value: current });
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
        {(["MEMO", "DATA", "PRMPT", "FUNC"] as const).map((item) => (
          <Button
            {...buttonProps}
            key={item}
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
              onChange={(value) => setMemoryDraft({
                nodeId, saved: config?.memory ?? "", value,
              })}
              onSend={async (value) => {
                if (await updateConfig((current) => ({
                  ...current, memory: value, memoryNodeIds: [],
                }))) {
                  setMemoryDraft({ nodeId, saved: value, value });
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
      </div>
      <div className={styles.actions}>
        <Button
          {...buttonProps}
          activeColor="COLOR_SUCCESS"
          disabled={!config || busy || cancelPending || tab === "FUNC"}
          onClick={() => void start()}
        >
          {cancelPending ? "Stopping …" : "Start"}
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
