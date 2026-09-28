import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { SchedulePlan, TreeNodeDto } from "@flydeck/shared/v2";
import { AppView, type AppViewProps } from "../AppView";
import { DataTree, type DataTreeProps } from "../DataTree";
import { ScheduleEditor } from "../ScheduleEditor";
import type { BaseStyleProps } from "../Base";
import type { TextareaProps } from "../Textarea";
import { resolveFlatTreePath } from "../DataBrowser/DataBrowser";
import { schedulerApi } from "../../api/scheduler";
import { useWorkspaceReplica, workspaceReplica, workspaceSyncEngine, type WorkspaceReplicaScope } from "../../replica";
import { useClientStateScope } from "../../state";
import styles from "./SchedulerApp.module.css";

const StableDataTree = memo(DataTree);
export type SchedulerAppProps = Omit<AppViewProps, "children" | "componentName"> & { workspaceId?: string; timeZone?: string; treeProps?: DataTreeProps; dateInputProps?: BaseStyleProps; commentTextareaProps?: Omit<TextareaProps, "aria-label" | "onChange" | "rows" | "value"> };

export function SchedulerApp({ workspaceId, timeZone = "Europe/Berlin", treeProps, dateInputProps, commentTextareaProps, ...props }: SchedulerAppProps) {
  const { userId } = useClientStateScope();
  const scope = useMemo<WorkspaceReplicaScope | null>(() => workspaceId ? { userId, workspaceId } : null, [userId, workspaceId]);
  const record = useWorkspaceReplica(scope);
  const [source, setSource] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const nodes = record?.tree?.document.nodes ?? [];
  const root = resolveFlatTreePath(nodes, source);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedContent = selectedNodeId ? record?.contents[selectedNodeId]?.content : undefined;
  const saved = useMemo(
    () => parseScheduleItem(selectedContent)?.plan ?? null,
    [selectedContent],
  );

  useEffect(() => {
    let timeout: number;
    const updateAtNextMinute = () => {
      const current = Date.now();
      timeout = window.setTimeout(() => {
        setNow(new Date());
        updateAtNextMinute();
      }, 60_000 - current % 60_000 + 20);
    };
    updateAtNextMinute();
    return () => window.clearTimeout(timeout);
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setRevision(0);
  }, []);

  useEffect(() => { if (scope && selectedNodeId) void workspaceSyncEngine.ensureContents(scope, [selectedNodeId]); }, [scope, selectedNodeId]);
  useEffect(() => {
    if (!workspaceId || !selectedNodeId || !saved) return;
    void schedulerApi.read(workspaceId, selectedNodeId).then((snapshot) => {
      setRevision(snapshot.plan.revision);
    }).catch(() => { setRevision(0); });
  }, [selectedNodeId, workspaceId, saved]);

  const createScheduleContent = useCallback(async (node: TreeNodeDto) => {
    if (!scope) return;
    await workspaceSyncEngine.submit(scope, { type: "update-content", nodeId: node.id, input: {
      requestId: crypto.randomUUID(), content: JSON.stringify(createScheduleItem(timeZone), null, 2), expectedRevision: 0,
    }});
  }, [scope, timeZone]);

  async function save(plan: SchedulePlan) {
    if (!scope || !workspaceId || !selectedNode) return false;
    try {
      const contentRevision = workspaceReplica.getSnapshot(scope)?.contents[selectedNode.id]?.revision ?? 0;
      await workspaceSyncEngine.submit(scope, { type: "update-content", nodeId: selectedNode.id, input: {
        requestId: crypto.randomUUID(), content: JSON.stringify({ type: "flydeck-schedule", version: 1, plan }, null, 2), expectedRevision: contentRevision,
      }});
      const next = await schedulerApi.read(workspaceId, selectedNode.id);
      setRevision(next.plan.revision);
      return true;
    } catch (error) {
      treeProps?.onSynchronizationError?.(
        error instanceof Error ? error.message : "Schedule could not be saved.",
      );
      return false;
    }
  }

  return <AppView {...props} onDataSourceResolved={setSource} componentName="SchedulerApp" accessMode="read-write"><div className={styles.root}>
    {saved && selectedNode ? <><div className={styles.titleRow}><strong>{selectedNode.label}</strong><time dateTime={now.toISOString()}>{formatSchedulerDateTime(now, timeZone)}</time></div><ScheduleEditor key={`${selectedNode.id}:${revision}:${saved.startAt}:${timeZone}`} value={saved} timeZone={timeZone} disabled={!workspaceId} dateInputProps={dateInputProps} textareaProps={commentTextareaProps} showNtfyToggle onSave={save} /></> : <p>Select a schedule item or create one below.</p>}
    {root && workspaceId ? <StableDataTree {...treeProps} navigationSlot="scheduler-items" rootNodeId={root.id} workspaceId={workspaceId} onSelectedNodeChange={selectNode} onNodeCreated={createScheduleContent} /> : <p>Choose a scheduler data source in the app settings.</p>}
  </div></AppView>;
}

type ScheduleItem = { type: "flydeck-schedule"; version: 1; plan: SchedulePlan };
function createScheduleItem(timeZone: string): ScheduleItem { const start = Date.now(); return { type: "flydeck-schedule", version: 1, plan: { comment: "", comments: ["", ""], startAt: new Date(start).toISOString(), endAt: new Date(start + 60 * 60_000).toISOString(), stops: [], repetitions: 0, timeZone, enabled: false, notifyWithNtfy: true } }; }
function parseScheduleItem(content: string | undefined): ScheduleItem | null { if (!content) return null; try { const value = JSON.parse(content) as Partial<ScheduleItem>; return value.type === "flydeck-schedule" && value.version === 1 && value.plan ? value as ScheduleItem : null; } catch { return null; } }

export function formatSchedulerDateTime(date: Date, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${String(Number(parts.year) % 1000).padStart(3, "0")}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}
