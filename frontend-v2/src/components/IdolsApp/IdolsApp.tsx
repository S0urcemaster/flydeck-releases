import { useCallback, useEffect, useMemo, useState } from "react";
import { createTreeNodeLocalId, type SchedulePlan, type TreeNodeDto } from "@flydeck/shared/v2";
import { ArrowRight, Dog, Play, Repeat2, Snail } from "lucide-react";
import { AppView, type AppViewProps } from "../AppView";
import { Button, type ButtonProps } from "../Button";
import { DeleteButton } from "../DeleteButton";
import { Input, type InputProps } from "../Input";
import { ScheduleEditor } from "../ScheduleEditor";
import { Textarea, type TextareaProps } from "../Textarea";
import type { BaseStyleProps } from "../Base";
import { jobApi } from "../../api/jobs";
import { useWorkspaceReplica, workspaceReplica, workspaceSyncEngine, type WorkspaceReplicaScope } from "../../replica";
import { useClientStateScope } from "../../state";
import styles from "./IdolsApp.module.css";

const prototypes = {
  Gary: {
    icon: Snail,
    prototypePath: "_system/Agnt/Jobs/_idols/Gary",
    memoPath: "_system/Agnt/Memo/_idols/Gary",
    memo: "You are Gary, a quiet and curious data companion. Select one interesting fragment from the configured datasource. Return the fragment, its exact source path, and one concise sentence explaining why it caught your attention. Never invent source material.",
    prompt: "Select one interesting fragment from the configured datasource and bring it to me with its exact source path.",
  },
  Bello: {
    icon: Dog,
    prototypePath: "_system/Agnt/Jobs/_idols/Bello",
    memoPath: "_system/Agnt/Memo/_idols/Bello",
    memo: "You are Bello, an eager newspaper dog. Bite one random newspaper clipping from the configured datasource and proudly bring it to your owner. Return the clipping, its exact source path, publication date when available, and one short cheerful sentence. Never invent a clipping or source.",
    prompt: "Bite one random newspaper clipping from the configured datasource and proudly bring it to me with its exact source path and publication date when available.",
  },
} as const;

type IdolName = keyof typeof prototypes;

export type IdolsAppProps = Omit<AppViewProps, "children" | "componentName"> & {
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  dateInputProps?: BaseStyleProps;
  inputProps?: Omit<InputProps, "aria-label" | "label" | "onChange" | "value">;
  promptTextareaProps?: Omit<TextareaProps, "aria-label" | "label" | "onChange" | "rows" | "value">;
  timeZone?: string;
  workspaceId?: string;
};

export function IdolsApp({ buttonProps, dateInputProps, inputProps, promptTextareaProps, timeZone = "Europe/Berlin", workspaceId, ...props }: IdolsAppProps) {
  const { userId } = useClientStateScope();
  const scope = useMemo<WorkspaceReplicaScope | null>(() => workspaceId ? { userId, workspaceId } : null, [userId, workspaceId]);
  const record = useWorkspaceReplica(scope);
  const [name, setName] = useState<IdolName>("Gary");
  const [dataSource, setDataSource] = useState("");
  const [prompts, setPrompts] = useState<Record<IdolName, string>>(() => ({ Gary: prototypes.Gary.prompt, Bello: prototypes.Bello.prompt }));
  const [schedule, setSchedule] = useState(() => createIdolSchedule(timeZone));
  const [live, setLive] = useState(false);
  const [autorun, setAutorun] = useState(false);
  const [position, setPosition] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [completedRunId, setCompletedRunId] = useState<string | null>(null);
  const [approvedRunId, setApprovedRunId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = prototypes[name];
  const PortraitIcon = current.icon;
  const points = useMemo(() => [schedule.startAt, ...schedule.stops, schedule.endAt], [schedule]);
  const updateSchedule = useCallback((next: SchedulePlan) => setSchedule(next), []);

  useEffect(() => {
    if (!workspaceId || !record?.tree) return;
    const prototypeNode = findNodeByPath(record.tree.document.nodes, current.prototypePath);
    if (!prototypeNode) return;
    void jobApi.read(workspaceId, prototypeNode.id).then((snapshot) => {
      if (!snapshot.configured) return;
      setPrompts((values) => ({ ...values, [name]: snapshot.config.prompt }));
      setDataSource(snapshot.config.dataSources);
    }).catch(() => undefined);
  }, [current.prototypePath, name, record?.tree, workspaceId]);

  useEffect(() => {
    if (!live || !jobId || !workspaceId) return;
    let cancelled = false;
    async function refresh() {
      try {
        const snapshot = await jobApi.read(workspaceId!, jobId!);
        const run = snapshot.latestRun;
        if (!cancelled && run && ["completed", "failed", "cancelled", "interrupted"].includes(run.status)) setCompletedRunId(run.id);
      } catch { /* A later poll can recover. */ }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 2_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [jobId, live, workspaceId]);

  async function approve() {
    if (!live || !jobId || !workspaceId) return;
    const nextPosition = (position + 1) % Math.max(1, points.length - 1);
    setBusy(true);
    setError("");
    try {
      await updateJobSchedule(workspaceId, jobId, oneOccurrenceAt(points[nextPosition] ?? schedule.startAt, timeZone));
      setPosition(nextPosition);
      setApprovedRunId(completedRunId);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function goLive() {
    if (!scope || !workspaceId || !record?.tree || busy) return;
    setBusy(true);
    setError("");
    try {
      const source = findNodeByPath(record.tree.document.nodes, dataSource);
      if (!source) throw new Error("The datasource path does not exist.");
      const prototypeNode = findNodeByPath(record.tree.document.nodes, current.prototypePath);
      const prototypeSnapshot = prototypeNode ? await jobApi.read(workspaceId, prototypeNode.id) : null;
      const memoNode = findNodeByPath(record.tree.document.nodes, current.memoPath);
      if (memoNode) await workspaceSyncEngine.ensureContents(scope, [memoNode.id]);
      const hydrated = await workspaceReplica.load(scope);
      const memoMemory = memoNode ? hydrated?.contents[memoNode.id]?.content || current.memo : current.memo;
      const nodeId = await ensureIdolJob(scope, record.tree.document.nodes, record.tree.document.revision, name);
      const snapshot = await jobApi.read(workspaceId, nodeId);
      await jobApi.update(workspaceId, nodeId, {
        requestId: crypto.randomUUID(), expectedRevision: snapshot.config.revision,
        memoryNodeIds: memoNode ? [memoNode.id] : [], memory: prototypeSnapshot?.config.memory || memoMemory,
        dataSourceNodeIds: [source.id], dataSources: dataSource,
        destinationNodeId: prototypeSnapshot?.config.destinationNodeId ?? null,
        parserNodeId: prototypeSnapshot?.config.parserNodeId ?? null,
        prompt: prototypeSnapshot?.config.parserNodeId
          ? `${prompts[name]}\n\nReturn only JSON matching _system/Agnt/_prsr/_input_prototypes/ntfy: {"title":"...","message":"...","tags":["..."],"priority":"default","item":{"label":"...","content":"...","source":"..."}}`
          : prompts[name],
        modelTier: prototypeSnapshot?.config.modelTier ?? "ECON", effort: prototypeSnapshot?.config.effort ?? "FAST",
        schedule: { ...schedule, enabled: false, repetitions: 0, notifyWithNtfy: true },
      });
      await jobApi.start(workspaceId, nodeId, crypto.randomUUID(), timeZone);
      setJobId(nodeId);
      setCompletedRunId(null);
      setApprovedRunId(null);
      setPosition(0);
      setLive(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function toggleAutorun() {
    if (!live || !jobId || !workspaceId || busy) return;
    const next = !autorun;
    setBusy(true);
    setError("");
    try {
      await updateJobSchedule(workspaceId, jobId, next ? { ...schedule, enabled: true, repetitions: 10_000, notifyWithNtfy: true } : { ...schedule, enabled: false, repetitions: 0, notifyWithNtfy: true });
      setAutorun(next);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return <AppView {...props} componentName="IdolsApp" accessMode="read-write"><div className={styles.root}>
    <div className={styles.prototypeList} aria-label="Idol prototypes">
      {(Object.keys(prototypes) as IdolName[]).map((idolName) => {
        const Icon = prototypes[idolName].icon;
        return <Button {...buttonProps} key={idolName} selected={name === idolName} onClick={() => { setName(idolName); setLive(false); setAutorun(false); setPosition(0); }}><Icon aria-hidden="true" />{idolName}</Button>;
      })}
    </div>
    <div className={styles.portrait}><PortraitIcon aria-hidden="true" /><div><strong>{name}</strong><span>{current.memoPath}</span></div></div>
    <Input {...inputProps} label="Datasource" aria-label="Idol datasource" value={dataSource} onChange={(event) => setDataSource(event.currentTarget.value)} />
    <Textarea {...promptTextareaProps} label="Prompt" aria-label="Idol prompt" rows={5} value={prompts[name]} onChange={(event) => setPrompts((currentPrompts) => ({ ...currentPrompts, [name]: event.currentTarget.value }))} />
    <ScheduleEditor value={schedule} timeZone={timeZone} dateInputProps={dateInputProps} buttonProps={buttonProps} showActivationButton={false} showComment={false} showNtfyToggle={false} showRepetitions={false} showSaveButton={false} onChange={updateSchedule} onSave={() => undefined} />
    <div className={styles.progress}><strong>Next</strong><span>{position + 1} / {Math.max(1, points.length - 1)}</span><time>{new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(points[position] ?? schedule.startAt))}</time></div>
    <div className={styles.actions}>
      <DeleteButton {...buttonProps} action="run" label={`${name} live`} disabled={busy || !workspaceId || !dataSource.trim() || !prompts[name].trim()} onDelete={goLive}><Play aria-hidden="true" />Live!</DeleteButton>
      <DeleteButton {...buttonProps} action="run" label="next idol run" disabled={busy || !live || autorun || !completedRunId || completedRunId === approvedRunId} onDelete={approve}><ArrowRight aria-hidden="true" />Approve</DeleteButton>
      <Button {...buttonProps} selected={autorun} disabled={busy || !live} onClick={() => void toggleAutorun()}><Repeat2 aria-hidden="true" />Autorun</Button>
    </div>
    <p className={styles.state}>{live ? autorun ? `${name} is live and approved for every loop.` : `${name} is live and waiting for approval after each run.` : "Configure the idol, then arm Live! to prepare its first run."}</p>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </div></AppView>;
}

async function updateJobSchedule(workspaceId: string, jobId: string, schedule: SchedulePlan | null) {
  const snapshot = await jobApi.read(workspaceId, jobId);
  return jobApi.update(workspaceId, jobId, {
    requestId: crypto.randomUUID(), expectedRevision: snapshot.config.revision,
    memoryNodeIds: snapshot.config.memoryNodeIds, memory: snapshot.config.memory,
    dataSourceNodeIds: snapshot.config.dataSourceNodeIds, dataSources: snapshot.config.dataSources,
    destinationNodeId: snapshot.config.destinationNodeId, prompt: snapshot.config.prompt,
    parserNodeId: snapshot.config.parserNodeId,
    modelTier: snapshot.config.modelTier, effort: snapshot.config.effort, schedule,
  });
}

function oneOccurrenceAt(value: string, timeZone: string): SchedulePlan {
  const start = Math.max(Date.parse(value), Date.now() + 5_000);
  return { comment: "", comments: ["", ""], startAt: new Date(start).toISOString(), endAt: new Date(start + 60_000).toISOString(), stops: [], repetitions: 0, timeZone, enabled: true, notifyWithNtfy: true };
}

async function ensureIdolJob(scope: WorkspaceReplicaScope, initialNodes: readonly TreeNodeDto[], initialRevision: number, name: IdolName) {
  let nodes = [...initialNodes];
  let revision = initialRevision;
  const jobs = findNodeByPath(nodes, "_system/agnt/jobs");
  if (!jobs) throw new Error("The Agent Jobs directory is not available yet.");
  async function ensureNode(parentId: string, label: string, kind: "agent-job" | "agent-job-group") {
    const localId = createTreeNodeLocalId(label);
    const existing = nodes.find((node) => node.parentId === parentId && node.localId.toLowerCase() === localId.toLowerCase());
    if (existing) return existing;
    const siblings = nodes.filter((node) => node.parentId === parentId).sort((left, right) => left.position - right.position);
    const nodeId = crypto.randomUUID();
    const result = await workspaceSyncEngine.submit(scope, { type: "create-node", input: {
      requestId: crypto.randomUUID(), nodeId, parentId, afterNodeId: siblings.at(-1)?.id ?? null,
      kind, label, localId, expectedTreeRevision: revision,
    }});
    if (!result.tree) throw new Error("The Idol job could not be created.");
    nodes = [...result.tree.document.nodes];
    revision = result.tree.document.revision;
    return nodes.find((node) => node.id === nodeId)!;
  }
  const group = await ensureNode(jobs.id, "Idols", "agent-job-group");
  const job = await ensureNode(group.id, name, "agent-job");
  if (!await workspaceSyncEngine.flush(scope)) throw new Error("The Idol job could not be synchronized.");
  await workspaceReplica.load(scope);
  return job.id;
}

function findNodeByPath(nodes: readonly TreeNodeDto[], path: string) {
  let parentId: string | null = null;
  let current: TreeNodeDto | undefined;
  for (const segment of path.split("/").filter(Boolean)) {
    current = nodes.find((node) => node.parentId === parentId && (node.localId.toLowerCase() === segment.toLowerCase() || node.label.toLowerCase() === segment.toLowerCase()));
    if (!current) return undefined;
    parentId = current.id;
  }
  return current;
}

function errorMessage(cause: unknown) { return cause instanceof Error ? cause.message : "The Idol could not be started."; }

function createIdolSchedule(timeZone: string): SchedulePlan {
  const start = Date.now() + 5 * 60_000;
  return { comment: "", comments: ["", ""], startAt: new Date(start).toISOString(), endAt: new Date(start + 24 * 60 * 60_000).toISOString(), stops: [], repetitions: 0, timeZone, enabled: false, notifyWithNtfy: true };
}
