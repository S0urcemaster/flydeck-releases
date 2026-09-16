import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Activity, Armchair, BedDouble, BedSingle, BicepsFlexed, Camera, ChevronLeft, ChevronRight, Dumbbell, Image as ImageIcon, Link2, Pause, PersonStanding, Play, Plus, RectangleHorizontal, Repeat2, Settings2, Shirt, SportShoe, Sprout, StretchHorizontal, Table2, UserRound } from "lucide-react";
import { AppView, type AppViewProps } from "../AppView";
import { DataTree, type DataTreeProps } from "../DataTree";
import { Button } from "../Button";
import { DeleteButton } from "../DeleteButton";
import { Checkbox } from "../Checkbox";
import { Textarea, type TextareaProps } from "../Textarea";
import { resolveFlatTreePath } from "../DataBrowser/DataBrowser";
import { useClientStateScope } from "../../state";
import { workspaceReplica, workspaceSyncEngine, useWorkspaceReplica, type WorkspaceReplicaScope } from "../../replica";
import { addSportKeyframe, changeSportPoseAxis, createSportExercise, defaultSportFurniture, defaultSportPose, deleteSportKeyframe, mirrorSportLimb, moveSportKeyframe, parseSportExercise, type SportExercise, type SportFurniture, type SportKeyframe, type SportPose } from "./SportExercise";
import { defaultSportMetrics, parseSportMetrics, type SportMetricValues } from "./SportMetrics";
import { saveSportMetrics } from "./SportMetricsStore";
import { sportGroupColors } from "./SportPalette";
import { defaultSportCamera, type SportCameraControls } from "./SportCamera";
import { advanceSportPlayback, interpolateSportPose } from "./SportPlayback";
import styles from "./SportApp.module.css";

const SportFigure3D = lazy(() => import("./SportFigure3D").then((module) => ({ default: module.SportFigure3D })));
const StableDataTree = memo(DataTree);
const frameEditStyle = { minWidth: "var(--button-width)" };
const fields = [
  { id: "x", label: "X", group: 1, min: -2, max: 2, step: .05 },
  { id: "y", label: "Y", group: 1, min: -2, max: 2, step: .05 },
  { id: "yaw", label: "Rotation", group: 1, min: -180, max: 180 },
  { id: "pitch", label: "Front/back tilt", group: 1, min: -90, max: 90 },
  { id: "roll", label: "Side tilt", group: 1, min: -90, max: 90 },
  { id: "height", label: "Height", group: 1, min: 0, max: 150 },
  { id: "lowerSpine", label: "Lower back bend", group: 2, min: -60, max: 90 },
  { id: "spine", label: "Upper torso bend", group: 2, min: -60, max: 90 },
  { id: "torsoTurn", label: "Mid-torso rotation", group: 2, min: -90, max: 90 },
  { id: "head", label: "Neck tilt", group: 3, min: -60, max: 60 },
  { id: "headTilt", label: "Head tilt", group: 3, min: -60, max: 60 },
  { id: "headSideTilt", label: "Head side tilt", group: 3, min: -60, max: 60 },
  { id: "headTurn", label: "Head rotation", group: 3, min: -90, max: 90 },
  { id: "leftShoulder", label: "Shoulder forward/back", group: 4, min: -90, max: 190 },
  { id: "leftShoulderSide", label: "Shoulder sideways", group: 4, min: -90, max: 90 },
  { id: "leftShoulderTurn", label: "Shoulder rotation", group: 4, min: -90, max: 90 },
  { id: "leftElbow", label: "Elbow", group: 4, min: 0, max: 150 },
  { id: "leftHandFlex", label: "Wrist bend", group: 4, min: -75, max: 75 },
  { id: "leftElbowTurn", label: "Elbow rotation", group: 4, min: -180, max: 180 },
  { id: "rightShoulder", label: "Shoulder forward/back", group: 5, min: -90, max: 190 },
  { id: "rightShoulderSide", label: "Shoulder sideways", group: 5, min: -90, max: 90 },
  { id: "rightShoulderTurn", label: "Shoulder rotation", group: 5, min: -90, max: 90 },
  { id: "rightElbow", label: "Elbow", group: 5, min: 0, max: 150 },
  { id: "rightHandFlex", label: "Wrist bend", group: 5, min: -75, max: 75 },
  { id: "rightElbowTurn", label: "Elbow rotation", group: 5, min: -180, max: 180 },
  { id: "leftHip", label: "Hip forward/back", group: 6, min: -90, max: 120 },
  { id: "leftHipSide", label: "Hip sideways", group: 6, min: -60, max: 60 },
  { id: "leftKnee", label: "Knee", group: 6, min: 0, max: 150 },
  { id: "leftKneeTurn", label: "Knee rotation", group: 6, min: -90, max: 90 },
  { id: "leftAnkle", label: "Ankle", group: 6, min: -45, max: 45 },
  { id: "rightHip", label: "Hip forward/back", group: 7, min: -90, max: 120 },
  { id: "rightHipSide", label: "Hip sideways", group: 7, min: -60, max: 60 },
  { id: "rightKnee", label: "Knee", group: 7, min: 0, max: 150 },
  { id: "rightKneeTurn", label: "Knee rotation", group: 7, min: -90, max: 90 },
  { id: "rightAnkle", label: "Ankle", group: 7, min: -45, max: 45 },
] as const;
const viewFields = [
  { id: "viewAngle", label: "Angle", min: -180, max: 180, step: 1, unit: "°" },
  { id: "viewHeight", label: "Height", min: .6, max: 3.3, step: .05, unit: " m" },
  { id: "viewZoom", label: "Zoom", min: 50, max: 180, step: 1, unit: "%" },
] as const;
const poseAxes = [...viewFields.map(({ id }) => id), ...fields.map(({ id }) => id)];
const metricFields = [
  { id: "bodyHeight", label: "Body height", min: 130, max: 220 },
  { id: "hipShoulder", label: "Hip to shoulder", min: 35, max: 80 },
  { id: "shoulderWidth", label: "Shoulder width", min: 28, max: 65 },
  { id: "hipWidth", label: "Hip width", min: 22, max: 55 },
  { id: "upperArm", label: "Upper arm", min: 18, max: 50 },
  { id: "upperLeg", label: "Upper leg", min: 25, max: 65 },
  { id: "lowerArm", label: "Lower arm", min: 18, max: 50 },
  { id: "lowerLeg", label: "Lower leg", min: 25, max: 65 },
] as const;
const groups = [
  { label: "View", icon: Camera, color: sportGroupColors.space },
  { label: "Space", icon: PersonStanding, color: sportGroupColors.space }, { label: "Torso", icon: Shirt, color: sportGroupColors.torso },
  { label: "Head", icon: UserRound, color: sportGroupColors.torso },
  { label: "Left arm", icon: BicepsFlexed, color: sportGroupColors.leftArm }, { label: "Right arm", icon: BicepsFlexed, color: sportGroupColors.rightArm },
  { label: "Left leg", icon: SportShoe, color: sportGroupColors.leftLeg }, { label: "Right leg", icon: SportShoe, color: sportGroupColors.rightLeg },
  { label: "Furniture", icon: Armchair, color: sportGroupColors.furniture },
  { label: "Body settings", icon: Settings2, color: sportGroupColors.settings },
];
const placedFurniture = ["table", "chair", "bench"] as const;
const furnitureLabels = { table: "Table", chair: "Chair", bench: "Training bench" } as const;
const furnitureIcons = { table: Table2, chair: Armchair, bench: BedSingle } as const;
const furniturePlacementFields = [
  { id: "x", label: "X", min: -2, max: 2, step: .1, unit: " m" },
  { id: "y", label: "Y", min: -2, max: 2, step: .1, unit: " m" },
  { id: "rotation", label: "Rotation", min: -180, max: 180, step: 5, unit: "°" },
] as const;
const wallBarFields = [
  { id: "x", label: "X", min: -2.4, max: 2.4, step: .05, unit: " m" },
  { id: "y", label: "Height", min: .25, max: 2.75, step: .05, unit: " m" },
  { id: "length", label: "Length", min: .4, max: 4.8, step: .1, unit: " m" },
] as const;
const demo: SportKeyframe[] = [
  { id: "demo-1", values: { ...defaultSportPose, leftElbow: 10, rightElbow: 10 } },
  { id: "demo-2", values: { ...defaultSportPose, spine: 15, leftHip: 48, rightHip: 48, leftKnee: 65, rightKnee: 65, leftAnkle: 12, rightAnkle: 12, leftShoulder: 55, rightShoulder: 55 } },
  { id: "demo-3", values: { ...defaultSportPose, spine: 25, leftHip: 75, rightHip: 75, leftKnee: 105, rightKnee: 105, leftAnkle: 20, rightAnkle: 20, leftShoulder: 80, rightShoulder: 80 } },
];
const startingPoses: readonly { label: string; icon: typeof PersonStanding; values: SportPose }[] = [
  { label: "Standing", icon: PersonStanding, values: { ...defaultSportPose } },
  { label: "Supine", icon: BedDouble, values: { ...defaultSportPose, pitch: -90 } },
  { label: "T pose", icon: StretchHorizontal, values: { ...defaultSportPose, leftShoulderSide: 72, rightShoulderSide: 72 } },
  { label: "Squat", icon: Activity, values: { ...defaultSportPose, spine: 15, leftHip: 55, rightHip: 55, leftKnee: 80, rightKnee: 80, leftAnkle: 15, rightAnkle: 15 } },
];

export type SportAppProps = Omit<AppViewProps, "children" | "title" | "accessMode"> & {
  workspaceId?: string;
  treeProps?: DataTreeProps;
  commentTextareaProps?: Omit<TextareaProps, "rows" | "value" | "onChange">;
};

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className={styles.colorField}><span>{label}</span><input type="color" value={value} aria-label={label} onChange={(event) => onChange(event.target.value)} /></label>;
}

function FurnitureNumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className={styles.slider}><span>{label}</span><output>{value.toFixed(2)} m</output><input type="range" min={min} max={max} step=".05" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function PlacedFurnitureEditor({ id, furniture, onChange }: { id: typeof placedFurniture[number]; furniture: SportFurniture; onChange: (value: SportFurniture) => void }) {
  const item = furniture[id];
  if (!item.enabled) return null;
  return <div className={styles.furnitureFields}>
    <strong>{furnitureLabels[id]}</strong>
    <ColorField label={`${furnitureLabels[id]} color`} value={item.color} onChange={(color) => onChange({ ...furniture, [id]: { ...item, color } })} />
    {furniturePlacementFields.map((field) => <label className={styles.slider} key={field.id}><span>{field.label}</span><output>{item[field.id].toFixed(field.step < 1 ? 1 : 0)}{field.unit}</output><input type="range" min={field.min} max={field.max} step={field.step} value={item[field.id]} onChange={(event) => onChange({ ...furniture, [id]: { ...item, [field.id]: Number(event.target.value) } })} /></label>)}
    {id === "table" ? ([{ id: "height", label: "Height", min: .4, max: 1.3 }, { id: "width", label: "Width", min: .5, max: 2.4 }, { id: "depth", label: "Depth", min: .35, max: 1.4 }] as const).map((field) => <FurnitureNumberField key={field.id} label={field.label} value={furniture.table[field.id]} min={field.min} max={field.max} onChange={(value) => onChange({ ...furniture, table: { ...furniture.table, [field.id]: value } })} />) : null}
    {id === "bench" ? <label className={styles.slider}><span>Backrest</span><output>{furniture.bench.backrest}°</output><input type="range" min="0" max="90" step="5" value={furniture.bench.backrest} onChange={(event) => onChange({ ...furniture, bench: { ...furniture.bench, backrest: Number(event.target.value) } })} /></label> : null}
  </div>;
}

function SportPlaybackView({ poses, selected, metrics, furniture, secondsPerKeyframe, playerTarget, loop, onLoopChange, onCameraAngleChange, onCameraReset, onCurrentKeyframeChange }: { poses: SportKeyframe[]; selected: number; metrics: SportMetricValues; furniture: SportFurniture; secondsPerKeyframe: number; playerTarget: HTMLDivElement | null; loop: boolean; onLoopChange: (enabled: boolean) => void; onCameraAngleChange: (angle: number) => void; onCameraReset: () => void; onCurrentKeyframeChange: (index: number) => void }) {
  const selectedValues = poses[selected]?.values;
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(selected);
  const currentFrame = useRef(selected);
  const pose = interpolateSportPose(poses, progress, poseAxes);
  const cameraControls: SportCameraControls = { angle: pose.viewAngle, height: pose.viewHeight, zoom: pose.viewZoom };
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPlaying(false);
      setProgress(selected);
      currentFrame.current = selected;
      onCurrentKeyframeChange(selected);
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, selectedValues, onCurrentKeyframeChange]);
  useEffect(() => {
    if (!playing) return;
    let animationFrame = 0;
    let previous = performance.now();
    let ended = false;
    const animate = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, .05);
      previous = now;
      setProgress((current) => {
        const playbackEnd = loop ? poses.length : Math.max(0, poses.length - 1);
        const next = advanceSportPlayback(current, playbackEnd, elapsed / secondsPerKeyframe, loop);
        const nearest = poses.length ? Math.round(next.progress) % poses.length : 0;
        if (nearest !== currentFrame.current) { currentFrame.current = nearest; onCurrentKeyframeChange(nearest); }
        if (next.ended) {
          ended = true;
          setPlaying(false);
        }
        return next.progress;
      });
      if (!ended) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [playing, poses.length, loop, secondsPerKeyframe, onCurrentKeyframeChange]);
  const seek = (next: number) => {
    setPlaying(false);
    setProgress(next);
    const nearest = poses.length ? Math.round(next) % poses.length : 0;
    currentFrame.current = nearest;
    onCurrentKeyframeChange(nearest);
  };
  return <>
    <Suspense fallback={<div className={styles.view} role="status">Loading 3D view…</div>}>
      <SportFigure3D pose={pose} metrics={metrics} furniture={furniture} cameraControls={cameraControls} onCameraAngleChange={onCameraAngleChange} onCameraReset={onCameraReset} />
    </Suspense>
    {playerTarget ? createPortal(<div className={styles.player}><button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => { if (progress >= (loop ? poses.length : poses.length - 1)) seek(0); setPlaying(!playing); }}>{playing ? <Pause size={20} /> : <Play size={20} />}</button><input aria-label="Playback position" type="range" min="0" max={poses.length} step="0.01" value={progress} onChange={(event) => seek(Number(event.target.value))} /><button type="button" className={loop ? styles.loopActive : undefined} aria-label={loop ? "Turn loop off" : "Turn loop on"} aria-pressed={loop} onClick={() => onLoopChange(!loop)}><Repeat2 size={18} /></button></div>, playerTarget) : null}
  </>;
}

export function SportApp({ workspaceId, treeProps, commentTextareaProps, ...viewProps }: SportAppProps) {
  const [group, setGroup] = useState(0);
  const [selected, setSelected] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SportExercise | null>(null);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const [metricsDraft, setMetricsDraft] = useState<SportMetricValues>(defaultSportMetrics);
  const [armSymmetry, setArmSymmetry] = useState(false);
  const [legSymmetry, setLegSymmetry] = useState(false);
  const [loop, setLoop] = useState(true);
  const [playerTarget, setPlayerTarget] = useState<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const pendingSave = useRef<(() => void) | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const dirty = useRef(false);
  const latestDraft = useRef<SportExercise | null>(null);
  const metricsDirty = useRef(false);
  const metricsLatest = useRef<SportMetricValues>(defaultSportMetrics);
  const metricsTimer = useRef<number | null>(null);
  const metricsPending = useRef<(() => void) | null>(null);
  const metricsSaveQueue = useRef(Promise.resolve());
  const framesRef = useRef<HTMLDivElement>(null);
  const { userId } = useClientStateScope();
  const scope = useMemo<WorkspaceReplicaScope | null>(() => workspaceId ? { userId, workspaceId } : null, [userId, workspaceId]);
  const record = useWorkspaceReplica(scope);
  const root = resolveFlatTreePath(record?.tree?.document.nodes ?? [], source);
  const nodes = record?.tree?.document.nodes ?? [];
  const metricsUserNode = root ? nodes.find((node) => node.parentId === root.id && node.localId === "_user") : undefined;
  const metricsNode = metricsUserNode ? nodes.find((node) => node.parentId === metricsUserNode.id && node.localId === "metrics") : undefined;
  const metricsNodeId = metricsNode?.id;
  const metricsContent = metricsNode ? record?.contents[metricsNode.id]?.content : undefined;
  const selectedItem = nodes.find((node) => node.id === selectedNodeId && root && isInBranch(nodes, node.id, root.id));
  const selectedItemId = selectedItem?.id;
  const editButtonProps = treeProps?.inputControlProps?.buttonProps;
  const selectedContent = selectedItem ? record?.contents[selectedItem.id]?.content : undefined;
  const poses = selectedItem ? draft?.keyframes ?? [{ id: "empty", values: defaultSportPose }] : demo;
  const pose = poses[selected]?.values ?? defaultSportPose;
  useEffect(() => {
    if (!scope || !selectedItemId) return;
    void workspaceSyncEngine.ensureContents(scope, [selectedItemId]);
  }, [selectedItemId, scope]);
  useEffect(() => {
    if (!scope || !metricsNodeId) return;
    void workspaceSyncEngine.ensureContents(scope, [metricsNodeId]);
  }, [metricsNodeId, scope]);
  useEffect(() => {
    if (metricsDirty.current) return;
    const values = parseSportMetrics(metricsContent) ?? defaultSportMetrics;
    metricsLatest.current = values;
    setMetricsDraft(values);
  }, [root?.id, metricsContent]);
  useEffect(() => {
    if (dirty.current) return;
    const parsed = parseSportExercise(selectedContent);
    setDraft(parsed);
    latestDraft.current = parsed;
  }, [selectedNodeId, selectedContent]);
  useEffect(() => () => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    if (metricsTimer.current !== null) clearTimeout(metricsTimer.current);
  }, []);
  function persistMetrics(rootId: string, values: SportMetricValues) {
    metricsSaveQueue.current = metricsSaveQueue.current.catch(() => undefined).then(async () => {
      if (!scope) return;
      try {
        await saveSportMetrics(scope, rootId, values);
        if (metricsLatest.current === values) metricsDirty.current = false;
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save body dimensions");
      }
    });
  }
  function changeMetrics(values: SportMetricValues) {
    if (!root || !scope) return;
    setMetricsDraft(values);
    metricsLatest.current = values;
    metricsDirty.current = true;
    if (metricsTimer.current !== null) window.clearTimeout(metricsTimer.current);
    metricsPending.current = () => persistMetrics(root.id, values);
    metricsTimer.current = window.setTimeout(() => {
      metricsTimer.current = null;
      metricsPending.current?.();
      metricsPending.current = null;
    }, 200);
  }
  const flushMetricsPending = useCallback(() => {
    if (metricsTimer.current !== null) window.clearTimeout(metricsTimer.current);
    metricsTimer.current = null;
    metricsPending.current?.();
    metricsPending.current = null;
  }, []);
  function persist(nodeId: string, exercise: SportExercise) {
    saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
      if (!scope) return;
      const content = JSON.stringify(exercise, null, 2);
      const snapshot = workspaceReplica.getSnapshot(scope);
      const revision = snapshot?.contents[nodeId]?.revision ?? 0;
      if (snapshot?.contents[nodeId]?.content === content) {
        if (latestDraft.current === exercise) dirty.current = false;
        return;
      }
      try {
        await workspaceSyncEngine.submit(scope, { type: "update-content", nodeId, input: {
          requestId: crypto.randomUUID(), content, expectedRevision: revision,
        }});
        if (latestDraft.current === exercise) dirty.current = false;
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save pose");
      }
    });
  }
  const flushPending = useCallback(() => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    pendingSave.current?.();
    pendingSave.current = null;
  }, []);
  const resolveSource = useCallback((nextSource: string) => {
    flushPending();
    flushMetricsPending();
    metricsDirty.current = false;
    setSource(nextSource);
  }, [flushPending, flushMetricsPending]);
  function changeExercise(exercise: SportExercise, delay = 200) {
    if (!selectedItem) return;
    setDraft(exercise);
    latestDraft.current = exercise;
    dirty.current = true;
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    pendingSave.current = () => persist(selectedItem.id, exercise);
    saveTimer.current = window.setTimeout(flushPending, delay);
  }
  function changeSelectedPose(values: SportPose, delay = 200) {
    if (!draft) return;
    changeExercise({ ...draft, keyframes: draft.keyframes.map((item, index) => index === selected ? { ...item, values } : item) }, delay);
  }
  function changeFurniture(furniture: SportFurniture) {
    if (!draft) return;
    changeExercise({ ...draft, furniture });
  }
  function setSymmetry(limb: "arm" | "leg", enabled: boolean) {
    if (limb === "arm") setArmSymmetry(enabled); else setLegSymmetry(enabled);
    if (enabled && draft) changeSelectedPose(mirrorSportLimb(draft.keyframes[selected].values, limb), 0);
  }
  const selectNode = useCallback((nodeId: string | null) => {
    flushPending();
    dirty.current = false;
    setSelectedNodeId(nodeId);
    setSelected(0);
  }, [flushPending]);
  const createExerciseContent = useCallback<NonNullable<DataTreeProps["onNodeCreated"]>>(async (node) => {
    if (!workspaceId) return;
    const exercise = createSportExercise();
    await workspaceSyncEngine.submit({ userId, workspaceId }, { type: "update-content", nodeId: node.id, input: {
      requestId: crypto.randomUUID(), content: JSON.stringify(exercise, null, 2), expectedRevision: 0,
    }});
  }, [userId, workspaceId]);
  const selectFrame = (index: number) => setSelected(index);
  const markCurrentKeyframe = useCallback((index: number) => {
    framesRef.current?.querySelectorAll<HTMLElement>("[data-keyframe-index]").forEach((button) => button.classList.toggle(styles.nearestFrame, Number(button.dataset.keyframeIndex) === index));
  }, []);
  return <AppView {...viewProps} onDataSourceResolved={resolveSource} componentName="SportApp" accessMode="read-write">
    <div className={styles.layout}>
      <div className={styles.exerciseTitle}><strong>{selectedItem?.label ?? "Squat"}</strong><span>{selectedItem ? `${poses.length} poses` : "Example · 3 poses"}</span></div>
      <SportPlaybackView poses={poses} selected={selected} metrics={metricsDraft} furniture={draft?.furniture ?? defaultSportFurniture} secondsPerKeyframe={draft?.secondsPerKeyframe ?? 1.2} playerTarget={playerTarget} loop={loop} onLoopChange={setLoop} onCameraAngleChange={(angle) => { if (draft) changeSelectedPose({ ...draft.keyframes[selected].values, viewAngle: angle }); }} onCameraReset={() => { if (draft) changeSelectedPose({ ...draft.keyframes[selected].values, viewAngle: defaultSportCamera.angle, viewHeight: defaultSportCamera.height, viewZoom: defaultSportCamera.zoom }, 0); }} onCurrentKeyframeChange={markCurrentKeyframe} />
      <div className={styles.tabLayout} role="tablist" aria-label="Joint groups">
        <div className={styles.poseTabs}>
          {groups.slice(0, 8).map(({ label, icon: Icon, color }, index) => <button key={label} type="button" role="tab" aria-selected={group === index} aria-label={label} title={label} style={{ "--sport-group-color": color } as CSSProperties} className={group === index ? styles.activeTab : styles.tab} onClick={() => setGroup(index)}><Icon size={19} /><span>{index > 3 ? (index % 2 ? "R" : "L") : ""}</span></button>)}
        </div>
        <div className={styles.utilityTabs}>
          {groups.slice(8).map(({ label, icon: Icon, color }, offset) => { const index = offset + 8; return <button key={label} type="button" role="tab" aria-selected={group === index} aria-label={label} title={label} style={{ "--sport-group-color": color } as CSSProperties} className={group === index ? styles.activeTab : styles.tab} onClick={() => setGroup(index)}><Icon size={17} /></button>; })}
        </div>
      </div>
      <div className={styles.groupLabel}>{group === 9 ? "Body dimensions · cm" : groups[group].label}</div>
      {group === 1 ? <div className={styles.startingPoses} aria-label="Starting poses">
        {startingPoses.map(({ label, icon: Icon, values }) => <DeleteButton key={label} action="reset" label={label} background="COLOR_SURFACE" armedColor="COLOR_ERROR" disabled={!selectedItem || !draft} onDelete={() => changeSelectedPose({ ...values }, 0)}><Icon size={18} /><span>{label}</span></DeleteButton>)}
      </div> : null}
      {group === 2 ? <div className={styles.symmetry} aria-label="Limb symmetry">
        <div><Checkbox checked={armSymmetry} label="Arm symmetry" disabled={!selectedItem || !draft} onChange={(enabled) => setSymmetry("arm", enabled)}><Link2 size={16} /></Checkbox><span>Arm symmetry</span></div>
        <div><Checkbox checked={legSymmetry} label="Leg symmetry" disabled={!selectedItem || !draft} onChange={(enabled) => setSymmetry("leg", enabled)}><Link2 size={16} /></Checkbox><span>Leg symmetry</span></div>
      </div> : null}
      {group === 0 ? <DeleteButton action="reset" label="all keyframe views" background="COLOR_SURFACE" armedColor="COLOR_ERROR" disabled={!selectedItem || !draft} onDelete={() => { if (!draft) return; const view = draft.keyframes[selected].values; changeExercise({ ...draft, keyframes: draft.keyframes.map((frame) => ({ ...frame, values: { ...frame.values, viewAngle: view.viewAngle, viewHeight: view.viewHeight, viewZoom: view.viewZoom } })) }, 0); }}>Reset keyframe views</DeleteButton> : null}
      <div className={styles.sliders}>
        {group === 9 ? metricFields.map((field) => <label className={styles.slider} key={field.id}><span>{field.label}</span><output>{metricsDraft[field.id]} cm</output><input type="range" min={field.min} max={field.max} value={metricsDraft[field.id]} disabled={!root || !scope} onChange={(event) => changeMetrics({ ...metricsDraft, [field.id]: Number(event.target.value) })} /></label>)
          : group === 8 ? <>
            {placedFurniture.map((id) => { const FurnitureIcon = furnitureIcons[id]; return <div className={styles.furnitureToggle} key={id}><Checkbox checked={draft?.furniture[id].enabled ?? false} label={`${furnitureLabels[id]} visible`} disabled={!draft} onChange={(enabled) => { if (!draft) return; changeFurniture({ ...draft.furniture, [id]: { ...draft.furniture[id], enabled } }); }}><FurnitureIcon size={16} /></Checkbox><span>{furnitureLabels[id]}</span></div>; })}
            <div className={styles.furnitureToggle}><Checkbox checked={draft?.furniture.dumbbells ?? false} label="Dumbbells visible" disabled={!draft} onChange={(dumbbells) => { if (draft) changeFurniture({ ...draft.furniture, dumbbells }); }}><Dumbbell size={16} /></Checkbox><span>Dumbbells</span></div>
            <div className={styles.furnitureToggle}><Checkbox checked={draft?.furniture.wallBar.enabled ?? false} label="Wall bar visible" disabled={!draft} onChange={(enabled) => { if (draft) changeFurniture({ ...draft.furniture, wallBar: { ...draft.furniture.wallBar, enabled } }); }}><StretchHorizontal size={16} /></Checkbox><span>Wall bar</span></div>
            <div className={styles.furnitureToggle}><Checkbox checked={draft?.furniture.plant.enabled ?? false} label="Plant visible" disabled={!draft} onChange={(enabled) => { if (draft) changeFurniture({ ...draft.furniture, plant: { ...draft.furniture.plant, enabled } }); }}><Sprout size={16} /></Checkbox><span>Plant</span></div>
            <div className={styles.furnitureToggle}><Checkbox checked={draft?.furniture.mat.enabled ?? false} label="Mat visible" disabled={!draft} onChange={(enabled) => { if (draft) changeFurniture({ ...draft.furniture, mat: { ...draft.furniture.mat, enabled } }); }}><RectangleHorizontal size={16} /></Checkbox><span>Mat</span></div>
            <div className={styles.furnitureToggle}><Checkbox checked={draft?.furniture.poster.enabled ?? false} label="Poster visible" disabled={!draft} onChange={(enabled) => { if (draft) changeFurniture({ ...draft.furniture, poster: { ...draft.furniture.poster, enabled } }); }}><ImageIcon size={16} /></Checkbox><span>Poster</span></div>
            {draft ? placedFurniture.map((id) => <PlacedFurnitureEditor key={id} id={id} furniture={draft.furniture} onChange={changeFurniture} />) : null}
            {draft?.furniture.dumbbells ? <div className={styles.furnitureFields}><strong>Dumbbells</strong><ColorField label="Dumbbell color" value={draft.furniture.dumbbellColor} onChange={(dumbbellColor) => changeFurniture({ ...draft.furniture, dumbbellColor })} /><label className={styles.slider}><span>Size</span><output>{draft.furniture.dumbbellSize}%</output><input type="range" min="50" max="180" step="5" value={draft.furniture.dumbbellSize} onChange={(event) => changeFurniture({ ...draft.furniture, dumbbellSize: Number(event.target.value) })} /></label></div> : null}
            {draft?.furniture.wallBar.enabled ? <div className={styles.furnitureFields}><strong>Wall bar</strong><ColorField label="Wall bar color" value={draft.furniture.wallBar.color} onChange={(color) => changeFurniture({ ...draft.furniture, wallBar: { ...draft.furniture.wallBar, color } })} />{wallBarFields.map((field) => <label className={styles.slider} key={field.id}><span>{field.label}</span><output>{draft.furniture.wallBar[field.id].toFixed(field.step < 1 ? 2 : field.step < 5 ? 1 : 0)}{field.unit}</output><input type="range" min={field.min} max={field.max} step={field.step} value={draft.furniture.wallBar[field.id]} onChange={(event) => changeFurniture({ ...draft.furniture, wallBar: { ...draft.furniture.wallBar, [field.id]: Number(event.target.value) } })} /></label>)}</div> : null}
            {draft?.furniture.plant.enabled ? <div className={styles.furnitureFields}><strong>Plant</strong><ColorField label="Plant color" value={draft.furniture.plant.color} onChange={(color) => changeFurniture({ ...draft.furniture, plant: { ...draft.furniture.plant, color } })} />{(["x", "y"] as const).map((id) => <label className={styles.slider} key={id}><span>{id.toUpperCase()}</span><output>{draft.furniture.plant[id].toFixed(2)} m</output><input type="range" min="-2.3" max="2.3" step=".05" value={draft.furniture.plant[id]} onChange={(event) => changeFurniture({ ...draft.furniture, plant: { ...draft.furniture.plant, [id]: Number(event.target.value) } })} /></label>)}</div> : null}
            {draft?.furniture.mat.enabled ? <div className={styles.furnitureFields}><strong>Mat</strong><ColorField label="Mat color" value={draft.furniture.mat.color} onChange={(color) => changeFurniture({ ...draft.furniture, mat: { ...draft.furniture.mat, color } })} />{furniturePlacementFields.map((field) => <label className={styles.slider} key={field.id}><span>{field.label}</span><output>{draft.furniture.mat[field.id].toFixed(field.step < 1 ? 1 : 0)}{field.unit}</output><input type="range" min={field.min} max={field.max} step={field.step} value={draft.furniture.mat[field.id]} onChange={(event) => changeFurniture({ ...draft.furniture, mat: { ...draft.furniture.mat, [field.id]: Number(event.target.value) } })} /></label>)}{(["width", "depth"] as const).map((id) => <FurnitureNumberField key={id} label={id === "width" ? "Width" : "Depth"} value={draft.furniture.mat[id]} min={.4} max={4.5} onChange={(value) => changeFurniture({ ...draft.furniture, mat: { ...draft.furniture.mat, [id]: value } })} />)}</div> : null}
            {draft?.furniture.poster.enabled ? <div className={styles.furnitureFields}><strong>Poster</strong><ColorField label="Poster color" value={draft.furniture.poster.color} onChange={(color) => changeFurniture({ ...draft.furniture, poster: { ...draft.furniture.poster, color } })} />{(["y", "z", "width"] as const).map((id) => <FurnitureNumberField key={id} label={id === "y" ? "Height" : id === "z" ? "Wall position" : "Width"} value={draft.furniture.poster[id]} min={id === "y" ? .5 : id === "z" ? -2.1 : .3} max={id === "y" ? 2.5 : id === "z" ? 2.1 : 2} onChange={(value) => changeFurniture({ ...draft.furniture, poster: { ...draft.furniture.poster, [id]: value } })} />)}</div> : null}
          </>
          : group === 0 ? viewFields.map((field) => <label className={styles.slider} key={field.id}><span>{field.label}</span><output>{field.id === "viewHeight" ? pose[field.id].toFixed(2) : Math.round(pose[field.id])}{field.unit}</output><input type="range" min={field.min} max={field.max} step={field.step} value={pose[field.id]} disabled={!selectedItem || !draft} onChange={(event) => { if (draft) changeSelectedPose({ ...draft.keyframes[selected].values, [field.id]: Number(event.target.value) }); }} /></label>)
          : fields.filter((field) => field.group === group).map((field) => { const position = field.id === "x" || field.id === "y"; return <label className={styles.slider} key={field.id}><span>{field.label}</span><output>{position ? (pose[field.id] ?? 0).toFixed(2) : Math.round(pose[field.id] ?? 0)}{position ? " m" : field.id === "height" ? " cm" : "°"}</output><input type="range" min={field.min} max={field.max} step={"step" in field ? field.step : 1} value={position ? pose[field.id] ?? 0 : Math.round(pose[field.id] ?? 0)} disabled={!selectedItem || !draft} onChange={(event) => { if (!draft) return; changeSelectedPose(changeSportPoseAxis(draft.keyframes[selected].values, field.id, Number(event.target.value), armSymmetry, legSymmetry)); }} /></label>; })}
      </div>
      <div ref={framesRef} className={styles.frames} aria-label="Keyframes">
        {poses.map((item, index) => <button key={item.id} type="button" data-keyframe-index={index} className={`${selected === index ? styles.activeFrame : styles.frame} ${selected === index ? styles.nearestFrame : ""}`} aria-label={`Keyframe ${index + 1}`} aria-pressed={selected === index} onClick={() => selectFrame(index)}><span>{index + 1}</span></button>)}
        <div className={styles.frameActions} aria-label="Edit keyframes">
          <Button {...editButtonProps} width="var(--button-width)" style={frameEditStyle} aria-label="Duplicate selected keyframe" disabled={!selectedItem || !draft} onClick={() => { if (!draft) return; changeExercise(addSportKeyframe(draft, selected), 0); selectFrame(selected + 1); }}><Plus size={18} /></Button>
          <DeleteButton {...treeProps?.imageDeleteButtonProps} width="var(--button-width)" style={frameEditStyle} key={poses[selected]?.id} label={`Keyframe ${selected + 1}`} disabled={!selectedItem || !draft || poses.length <= 1} onDelete={() => { if (!draft) return; changeExercise(deleteSportKeyframe(draft, selected), 0); selectFrame(Math.min(selected, poses.length - 2)); }} />
          <Button {...editButtonProps} width="var(--button-width)" style={frameEditStyle} aria-label="Move keyframe left" disabled={!selectedItem || !draft || selected <= 0} onClick={() => { if (!draft) return; changeExercise(moveSportKeyframe(draft, selected, -1), 0); selectFrame(selected - 1); }}><ChevronLeft size={18} /></Button>
          <Button {...editButtonProps} width="var(--button-width)" style={frameEditStyle} aria-label="Move keyframe right" disabled={!selectedItem || !draft || selected >= poses.length - 1} onClick={() => { if (!draft) return; changeExercise(moveSportKeyframe(draft, selected, 1), 0); selectFrame(selected + 1); }}><ChevronRight size={18} /></Button>
        </div>
      </div>
      <div ref={setPlayerTarget} />
      <label className={styles.slider}><span>Speed</span><output>{(draft?.secondsPerKeyframe ?? 1.2).toFixed(1)} s / keyframe</output><input aria-label="Seconds per keyframe" type="range" min="0.1" max="2" step="0.1" value={draft?.secondsPerKeyframe ?? 1.2} disabled={!selectedItem || !draft} onChange={(event) => { if (draft) changeExercise({ ...draft, secondsPerKeyframe: Number(event.target.value) }); }} /></label>
      <Textarea {...commentTextareaProps} rows={3} size="compact" resize="none" label="Comment" aria-label="Exercise comment" value={draft?.comment ?? ""} disabled={!selectedItem || !draft} onChange={(event) => { if (!draft) return; changeExercise({ ...draft, comment: event.target.value }); }} />
      <div className={styles.browserTitle}>Exercises</div>
      {message ? <p className={styles.note} role="status">{message}</p> : null}
      {root && workspaceId ? <StableDataTree {...treeProps} navigationSlot="sport-exercises" rootNodeId={root.id} workspaceId={workspaceId} onSelectedNodeChange={selectNode} onNodeCreated={createExerciseContent} /> : <div className={styles.empty}>Choose an exercise data source in the app settings.</div>}
    </div>
  </AppView>;
}

function isInBranch(nodes: readonly { id: string; parentId: string | null }[], nodeId: string, rootId: string): boolean {
  let current = nodes.find((node) => node.id === nodeId);
  while (current?.parentId) {
    if (current.parentId === rootId) return true;
    current = nodes.find((node) => node.id === current?.parentId);
  }
  return false;
}
