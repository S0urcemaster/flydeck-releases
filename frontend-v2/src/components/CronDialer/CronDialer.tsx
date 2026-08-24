import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  createTreeNodeLocalId,
  type TreeNodeDto,
} from "@flydeck/shared/v2";
import {
  ArrowRightFromLine,
  ArrowRightToLine,
  Clock12,
  DatabaseArrowDown,
  SearchCode,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Base, type BaseProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
import { DeleteButton, type DeleteButtonProps } from "../DeleteButton";
import type {
  DialerButtonProps,
  DialerCenterButtonProps,
} from "../Dialer";
import type { DialSurfaceProps } from "../DialSurface";
import { Form } from "../Form";
import { Input, type InputProps } from "../Input";
import { PointerButton, type PointerButtonProps } from "../PointerButton";
import { Pointer, type PointerMode, type PointerProps } from "../Pointer";
import { Textarea, type TextareaProps } from "../Textarea";
import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserNode,
  type TreeBrowserProps,
} from "../TreeBrowser";
import {
  useClientStateSlice,
  useClientStateScope,
  type ClientStateSlice,
} from "../../state";
import {
  useWorkspaceReplica,
  workspaceSyncEngine,
  type WorkspaceReplicaScope,
} from "../../replica";
import {
  cronEventsFromDataSources,
  normalizeDataPath,
  resolveCronDataSourceNodes,
  type CronDataSource,
} from "./CronDataSources";
import styles from "./CronDialer.module.css";

const hourMs = 60 * 60 * 1_000;
const dayMs = 24 * hourMs;
export const CRON_HALF_RANGES_MS = [
  hourMs,
  24 * hourMs,
  7 * dayMs,
  30 * dayMs,
  365 * dayMs,
  5 * 365 * dayMs,
] as const;
export const CRON_VERTICAL_STEPS_MS = [
  60 * 1_000,
  10 * 60 * 1_000,
  hourMs,
  12 * hourMs,
  dayMs,
  dayMs,
] as const;
export const CRON_MIN_HALF_RANGE_MS = CRON_HALF_RANGES_MS[0];
export const CRON_MAX_HALF_RANGE_MS = CRON_HALF_RANGES_MS.at(-1)!;

const markIntervals = [
  5 * 60 * 1_000,
  15 * 60 * 1_000,
  30 * 60 * 1_000,
  60 * 60 * 1_000,
  3 * 60 * 60 * 1_000,
  6 * 60 * 60 * 1_000,
  12 * 60 * 60 * 1_000,
  24 * 60 * 60 * 1_000,
  7 * 24 * 60 * 60 * 1_000,
  30 * 24 * 60 * 60 * 1_000,
  90 * 24 * 60 * 60 * 1_000,
  182.5 * 24 * 60 * 60 * 1_000,
  CRON_MAX_HALF_RANGE_MS,
] as const;

type ParkedCronWheelProps = {
  buttonProps?: DialerButtonProps;
  centerButtonProps?: DialerCenterButtonProps;
  centerFontSize?: string;
  centerFontWeight?: string;
  dialSurfaceProps?: Omit<
    DialSurfaceProps,
    "children" | "layer" | "marker" | "onTangentialInput" | "position"
  >;
  innerDiscColor?: string;
  innerGradientEnd?: string;
  innerGradientStart?: string;
  innerScaleFontSize?: string;
  innerScaleFontWeight?: string;
  outerDiscColor?: string;
  outerGradientEnd?: string;
  outerGradientStart?: string;
  outerScaleFontSize?: string;
  outerScaleFontWeight?: string;
};

export type CronDialerProps = Omit<
  BaseProps<"div">,
  "as" | "children" | "onPointerDown" | "onPointerMove" | "onPointerUp"
> & ParkedCronWheelProps & {
  eventButtonProps?: Omit<ButtonProps, "children" | "onClick">;
  eventInputProps?: Omit<
    InputProps,
    "aria-label" | "label" | "onChange" | "value"
  >;
  eventDeleteButtonProps?: Omit<
    DeleteButtonProps,
    "label" | "onDelete"
  >;
  eventTextareaProps?: Omit<
    TextareaProps,
    "aria-label" | "label" | "onChange" | "value"
  >;
  dataSourceBrowserProps?: Omit<
    TreeBrowserProps<CronDataSource>,
    | "componentName"
    | "model"
    | "onCreateNode"
    | "onDeleteNode"
    | "onMoveNode"
    | "onRenameNode"
    | "rootLabel"
  >;
  pointerProps?: Omit<PointerProps, "mode" | "position" | "shadow">;
  pointerButtonProps?: Omit<
    PointerButtonProps,
    "mode" | "primary" | "secondary"
  >;
  initialEditorOpen?: boolean;
  initialTime?: Date;
  initialHalfRangeMs?: number;
  onEventSave?: (event: CronEventEntry) => void;
  onRangeChange?: (halfRangeMs: number) => void;
  onTimeChange?: (time: Date) => void;
  workspaceId?: string;
};

export type CronEventEntry = {
  endTime: Date;
  startTime: Date;
  subtitle: string;
  text: string;
  title: string;
};

export type CronEventDraft = {
  endTime: string;
  startTime: string;
  subtitle: string;
  text: string;
  title: string;
};

export type CronStoredEvent = CronEventDraft & {
  createdAt: string;
  editable?: boolean;
  id: string;
  sourceContentRevision?: number;
  sourceNodeId?: string;
  sourceNodeRevision?: number;
};

export const cronEventDraftSlice: ClientStateSlice<CronEventDraft> = {
  name: "drafts.cronEvent",
  version: 1,
  defaultValue: {
    endTime: "",
    startTime: "",
    subtitle: "",
    text: "",
    title: "",
  },
  validate: isCronEventDraft,
};

export const cronEventsSlice: ClientStateSlice<CronStoredEvent[]> = {
  name: "events.cron",
  version: 1,
  defaultValue: [],
  validate: isCronStoredEventList,
};

type CronEndpoint = "start" | "end";
type CronEndpointMode = CronEndpoint | "off";

type TimelineMark = {
  dayTone?: "saturday" | "sunday";
  label: string;
  position: number;
  time: Date;
};

type TimelineMarkStyle = CSSProperties & {
  "--cron-mark-position": string;
};

type TimelineEventStyle = CSSProperties & {
  "--cron-event-height": string;
  "--cron-event-top": string;
};

type TimelineEndpointStyle = CSSProperties & {
  "--cron-interval-height": string;
  "--cron-interval-top": string;
};

type TimelineStyle = CSSProperties & {
  "--cron-center-font-size"?: string;
  "--cron-center-font-weight"?: string;
  "--cron-scale-font-size"?: string;
  "--cron-scale-font-weight"?: string;
};

type Gesture = {
  axis: "pending" | "horizontal" | "vertical";
  centerTimeMs: number;
  halfRangeMs: number;
  pointerId: number;
  x: number;
  y: number;
};

export function CronDialer(props: CronDialerProps) {
  const initialHalfRangeMs = snapCronHalfRange(
    props.initialHalfRangeMs ?? CRON_MIN_HALF_RANGE_MS,
  );
  const [fallbackTime] = useState(
    () => new Date(props.initialTime?.getTime() ?? Date.now()),
  );
  const [eventDraft, setEventDraft] = useClientStateSlice(cronEventDraftSlice);
  const [events, setEvents] = useClientStateSlice(cronEventsSlice);
  const { userId } = useClientStateScope();
  const replicaScope = useMemo<WorkspaceReplicaScope | null>(() => (
    props.workspaceId ? { userId, workspaceId: props.workspaceId } : null
  ), [props.workspaceId, userId]);
  const replicaRecord = useWorkspaceReplica(replicaScope);
  const tree = replicaRecord?.tree ?? null;
  const treeNodes = tree?.document.nodes;
  const cronRoot = useMemo(() => findCronNodeByPath(
    treeNodes ?? [],
    "_system/Cron",
  ), [treeNodes]);
  const dataSourceRoot = useMemo(() => cronRoot
    ? findCronChild(treeNodes ?? [], cronRoot.id, "datasources")
    : undefined, [cronRoot, treeNodes]);
  const dataSourceNodes = useMemo(() => dataSourceRoot
    ? (treeNodes ?? [])
        .filter(({ parentId }) => parentId === dataSourceRoot.id)
        .sort(compareCronNodes)
    : [], [dataSourceRoot, treeNodes]);
  const dataSources = useMemo<CronDataSource[]>(() => dataSourceNodes.map((node) => ({
    id: node.id,
    path: node.label,
  })), [dataSourceNodes]);
  const initialStartTime = validCronDate(eventDraft.startTime) ?? fallbackTime;
  const initialEndTime = ensureCronEndAfterStart(
    initialStartTime,
    validCronDate(eventDraft.endTime),
    initialHalfRangeMs,
  );
  const [activeEndpoint, setActiveEndpoint] = useState<CronEndpointMode>("off");
  const [centerTime, setCenterTime] = useState(initialStartTime);
  const [browseTime, setBrowseTime] = useState(initialStartTime);
  const [halfRangeMs, setHalfRangeMs] = useState(initialHalfRangeMs);
  const [view, setView] = useState<"timeline" | "event" | "datasources">(
    props.initialEditorOpen ? "event" : "timeline",
  );
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const eventClickSuppressed = useRef(false);
  const eventClickSuppressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootstrappingData = useRef(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CronStoredEvent | null>(null);
  const marks = cronTimelineMarks(centerTime, halfRangeMs);
  const minorMarks = cronTimelineMinorMarks(centerTime, halfRangeMs, marks);
  const resolvedDataSourceNodes = useMemo(() => resolveCronDataSourceNodes(
    replicaRecord?.tree ?? null,
    dataSources,
  ), [dataSources, replicaRecord?.tree]);
  const dataSourceEvents = useMemo(() => cronEventsFromDataSources(
    replicaRecord?.tree ?? null,
    replicaRecord?.contents ?? {},
    dataSources,
  ), [dataSources, replicaRecord?.contents, replicaRecord?.tree]);
  const eventBlocks = cronTimelineEventBlocks(
    [...events, ...dataSourceEvents],
    centerTime,
    halfRangeMs,
  );
  const dataSourceModel = useMemo(() => new TreeBrowserModel<CronDataSource>({
    definitionAuthority: true,
    initialTree: dataSources.map((source) => ({
      id: source.id,
      label: source.path,
      localId: source.id,
      enabled: Boolean(resolveCronDataSourceNodes(
        replicaRecord?.tree ?? null,
        [source],
      ).length),
      contentEditable: true,
      contentVisible: true,
      listEditable: false,
      data: source,
      children: [],
    })),
    storageKey: "flydeck.tree.cron.datasources",
  }), [dataSources, replicaRecord?.tree]);
  const classes = props.className
    ? `${styles.root} ${props.className}`
    : styles.root;
  const baseProps = cronBaseProps(props);
  const timelineStyle: TimelineStyle = {
    ...props.style,
    "--cron-center-font-size": props.centerFontSize,
    "--cron-center-font-weight": props.centerFontWeight,
    "--cron-scale-font-size": props.outerScaleFontSize,
    "--cron-scale-font-weight": props.outerScaleFontWeight,
  };

  const startTime = validCronDate(eventDraft.startTime) ?? initialStartTime;
  const endTime = ensureCronEndAfterStart(
    startTime,
    validCronDate(eventDraft.endTime) ?? initialEndTime,
    halfRangeMs,
  );
  const endpointOverlay = cronEndpointOverlay(
    startTime,
    endTime,
    activeEndpoint,
    browseTime,
    centerTime,
    halfRangeMs,
  );

  useEffect(() => {
    if (eventDraft.startTime && eventDraft.endTime) return;
    setEventDraft((current) => ({
      ...current,
      endTime: initialEndTime.toISOString(),
      startTime: initialStartTime.toISOString(),
    }));
  }, [eventDraft.endTime, eventDraft.startTime, initialEndTime, initialStartTime, setEventDraft]);

  useEffect(() => {
    if (!replicaScope || resolvedDataSourceNodes.length === 0) return;
    void workspaceSyncEngine.ensureContents(
      replicaScope,
      resolvedDataSourceNodes.map(({ node }) => node.id),
    );
  }, [replicaScope, resolvedDataSourceNodes]);

  useEffect(() => () => {
    if (eventClickSuppressionTimer.current) {
      clearTimeout(eventClickSuppressionTimer.current);
    }
  }, []);

  useEffect(() => {
    if (!replicaScope || !tree || bootstrappingData.current) return;
    const systemRoot = findCronNodeByPath(tree.document.nodes, "_system");
    if (!systemRoot) return;
    const defaultExists = dataSourceNodes.some(
      ({ label }) => isDefaultCronPath(label),
    );
    if (cronRoot && dataSourceRoot && defaultExists) return;
    bootstrappingData.current = true;
    void ensureCronDataStructure(
      replicaScope,
      tree.document.nodes,
      tree.document.revision,
    ).catch(() => false).finally(() => {
      bootstrappingData.current = false;
    });
  }, [cronRoot, dataSourceNodes, dataSourceRoot, replicaScope, tree]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const shell = root.closest<HTMLElement>('[data-component-name="AppShell"]');
    let frame = 0;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const viewportBottom = viewport
          ? viewport.offsetTop + viewport.height
          : window.innerHeight;
        const bottomPadding = shell
          ? Number.parseFloat(getComputedStyle(shell).paddingBottom) || 0
          : 0;
        const nextHeight = cronAvailableHeight(
          viewportBottom,
          root.getBoundingClientRect().top,
          bottomPadding,
        );
        setAvailableHeight((current) => current === nextHeight
          ? current
          : nextHeight);
      });
    };

    const observer = new ResizeObserver(measure);
    if (shell) observer.observe(shell);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, []);

  function selectEndpoint(endpoint: CronEndpointMode) {
    setActiveEndpoint(endpoint);
    setCenterTime(endpoint === "start"
      ? startTime
      : endpoint === "end" ? endTime : browseTime);
  }

  function setEndpointTime(time: Date) {
    if (activeEndpoint === "off") {
      setBrowseTime(time);
      setCenterTime(time);
      props.onTimeChange?.(time);
      return;
    }
    if (activeEndpoint === "start") {
      const nextStart = keepCronStartBeforeEnd(time, startTime, endTime);
      setEventDraft((current) => ({
        ...current,
        startTime: nextStart.toISOString(),
      }));
      setCenterTime(nextStart);
      props.onTimeChange?.(nextStart);
      return;
    }
    const nextEnd = keepCronEndAfterStart(time, startTime, endTime);
    setEventDraft((current) => ({
      ...current,
      endTime: nextEnd.toISOString(),
    }));
    setCenterTime(nextEnd);
    props.onTimeChange?.(nextEnd);
  }

  function updateGesture(event: PointerEvent<HTMLDivElement>) {
    const activeGesture = gesture.current;
    if (!activeGesture || activeGesture.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaX = event.clientX - activeGesture.x;
    const deltaY = event.clientY - activeGesture.y;
    if (activeGesture.axis === "pending") {
      const activationDistance = Math.min(bounds.width, bounds.height) * 0.025;
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < activationDistance) return;
      activeGesture.axis = Math.abs(deltaX) > Math.abs(deltaY)
        ? "horizontal"
        : "vertical";
    }
    if (activeGesture.axis !== "vertical") return;
    const nextCenter = cronCenterFromVerticalDrag(
      new Date(activeGesture.centerTimeMs),
      deltaY,
      bounds.height,
      activeGesture.halfRangeMs,
    );
    setEndpointTime(nextCenter);
  }

  function finishGesture(event: PointerEvent<HTMLDivElement>) {
    const activeGesture = gesture.current;
    if (activeGesture?.pointerId !== event.pointerId) return;
    updateGesture(event);
    if (activeGesture.axis !== "pending") {
      eventClickSuppressed.current = true;
      if (eventClickSuppressionTimer.current) {
        clearTimeout(eventClickSuppressionTimer.current);
      }
      eventClickSuppressionTimer.current = setTimeout(() => {
        eventClickSuppressed.current = false;
        eventClickSuppressionTimer.current = null;
      }, 0);
    }
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function cancelGesture(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? 1 : -1;
      const snappedTime = snapCronTimeToRange(centerTime, halfRangeMs);
      const nextTime = new Date(
        snappedTime.getTime() + direction * cronVerticalStep(halfRangeMs),
      );
      setEndpointTime(nextTime);
      event.preventDefault();
    }
  }

  function changeRange(direction: "in" | "out") {
    const nextRange = cronAdjacentRange(halfRangeMs, direction);
    if (nextRange === halfRangeMs) return;
    setHalfRangeMs(nextRange);
    props.onRangeChange?.(nextRange);
  }

  function setCurrentTime() {
    const now = new Date();
    if (activeEndpoint === "off") {
      setEndpointTime(now);
      return;
    }
    const nextRange = moveCronEndpointToTime(
      startTime,
      endTime,
      activeEndpoint,
      now,
    );
    setEventDraft((current) => ({
      ...current,
      endTime: nextRange.endTime.toISOString(),
      startTime: nextRange.startTime.toISOString(),
    }));
    setCenterTime(now);
    props.onTimeChange?.(now);
  }

  async function saveEvent() {
    if (savingEvent) return;
    setSavingEvent(true);
    try {
      if (editingEvent) {
        const updatedEvent: CronStoredEvent = {
          ...editingEvent,
          endTime: endTime.toISOString(),
          startTime: startTime.toISOString(),
          subtitle: eventDraft.subtitle,
          text: eventDraft.text,
          title: eventDraft.title,
        };
        if (editingEvent.sourceNodeId) {
          if (!replicaScope || !tree) return;
          const sourceNode = tree.document.nodes.find(
            ({ id }) => id === editingEvent.sourceNodeId,
          );
          const contentDocument = replicaRecord?.contents[editingEvent.sourceNodeId];
          if (!sourceNode || !contentDocument) return;
          const label = eventDraft.title.trim() || "Event";
          if (label !== sourceNode.label) {
            await workspaceSyncEngine.submit(replicaScope, {
              type: "rename-node",
              nodeId: sourceNode.id,
              input: {
                requestId: crypto.randomUUID(),
                label,
                expectedRevision: sourceNode.revision,
              },
            });
          }
          await workspaceSyncEngine.submit(replicaScope, {
            type: "update-content",
            nodeId: sourceNode.id,
            input: {
              requestId: crypto.randomUUID(),
              content: serializeCronEvent(eventDraft, startTime, endTime),
              expectedRevision: contentDocument.revision,
            },
          });
        } else {
          setEvents((current) => current.map((event) => (
            event.id === editingEvent.id ? updatedEvent : event
          )));
        }
        props.onEventSave?.({
          endTime: new Date(endTime.getTime()),
          startTime: new Date(startTime.getTime()),
          subtitle: eventDraft.subtitle,
          text: eventDraft.text,
          title: eventDraft.title,
        });
        setEditingEvent(null);
        setView("timeline");
        return;
      }
      if (!replicaScope || !tree || !cronRoot) return;
      const siblings = tree.document.nodes
        .filter(({ parentId }) => parentId === cronRoot.id)
        .sort(compareCronNodes);
      const nodeId = createCronEventId();
      const label = eventDraft.title.trim() || "Event";
      const created = await workspaceSyncEngine.submit(replicaScope, {
        type: "create-node",
        input: {
          requestId: crypto.randomUUID(),
          nodeId,
          parentId: cronRoot.id,
          afterNodeId: siblings.at(-1)?.id ?? null,
          kind: "data-file",
          label,
          localId: createTreeNodeLocalId(
            label,
            siblings.map(({ localId }) => localId),
          ),
          expectedTreeRevision: tree.document.revision,
        },
      });
      const createdNode = created.tree?.document.nodes.find(({ id }) => id === nodeId);
      if (!createdNode) return;
      await workspaceSyncEngine.submit(replicaScope, {
        type: "update-content",
        nodeId,
        input: {
          requestId: crypto.randomUUID(),
          content: serializeCronEvent(eventDraft, startTime, endTime),
          expectedRevision: createdNode.revision,
        },
      });
      props.onEventSave?.({
        endTime: new Date(endTime.getTime()),
        startTime: new Date(startTime.getTime()),
        subtitle: eventDraft.subtitle,
        text: eventDraft.text,
        title: eventDraft.title,
      });
      setView("timeline");
    } catch {
      // Workspace synchronization exposes the error and keeps the form open.
    } finally {
      setSavingEvent(false);
    }
  }

  function openEventEditor(event: CronStoredEvent) {
    if (event.sourceNodeId && !event.editable) return;
    const eventStart = validCronDate(event.startTime);
    const eventEnd = validCronDate(event.endTime);
    if (!eventStart || !eventEnd) return;
    setEditingEvent(event);
    setEventDraft({
      endTime: event.endTime,
      startTime: event.startTime,
      subtitle: event.subtitle,
      text: event.text,
      title: event.title,
    });
    setActiveEndpoint("start");
    setCenterTime(eventStart);
    setView("event");
  }

  async function deleteEditingEvent() {
    if (!editingEvent || savingEvent) return;
    setSavingEvent(true);
    try {
      if (editingEvent.sourceNodeId) {
        if (!replicaScope || !tree) return;
        await workspaceSyncEngine.submit(replicaScope, {
          type: "delete-node",
          nodeId: editingEvent.sourceNodeId,
          input: {
            requestId: crypto.randomUUID(),
            expectedTreeRevision: tree.document.revision,
          },
        });
      } else {
        setEvents((current) => current.filter(({ id }) => id !== editingEvent.id));
      }
      setEditingEvent(null);
      setView("timeline");
    } catch {
      // Workspace synchronization exposes the error and keeps the form open.
    } finally {
      setSavingEvent(false);
    }
  }

  const createDataSource = useCallback(async (
    name: string,
    _parentId: string | null,
    afterNodeId: string | null,
  ): Promise<TreeBrowserNode<CronDataSource> | false> => {
    const path = normalizeDataPath(name);
    if (!path || !replicaScope || !tree || !dataSourceRoot) return false;
    const nodeId = createCronEventId();
    let record;
    try {
      record = await workspaceSyncEngine.submit(replicaScope, {
        type: "create-node",
        input: {
          requestId: crypto.randomUUID(),
          nodeId,
          parentId: dataSourceRoot.id,
          afterNodeId,
          kind: "data-file",
          label: path,
          localId: createTreeNodeLocalId(
            path,
            dataSourceNodes.map(({ localId }) => localId),
          ),
          expectedTreeRevision: tree.document.revision,
        },
      });
    } catch {
      return false;
    }
    const node = record.tree?.document.nodes.find(({ id }) => id === nodeId);
    if (!node) return false;
    return {
      id: node.id,
      label: node.label,
      localId: node.localId,
      enabled: false,
      contentVisible: true,
      contentEditable: true,
      listEditable: false,
      data: { id: node.id, path: node.label },
      children: [],
    };
  }, [dataSourceNodes, dataSourceRoot, replicaScope, tree]);

  const renameDataSource = useCallback(async (id: string, name: string) => {
    const path = normalizeDataPath(name);
    const node = dataSourceNodes.find((candidate) => candidate.id === id);
    if (!path || !node || !replicaScope) return false;
    try {
      return Boolean(await workspaceSyncEngine.submit(replicaScope, {
        type: "rename-node",
        nodeId: id,
        input: {
          requestId: crypto.randomUUID(),
          label: path,
          expectedRevision: node.revision,
        },
      }));
    } catch {
      return false;
    }
  }, [dataSourceNodes, replicaScope]);

  const deleteDataSource = useCallback(async (id: string) => {
    if (!replicaScope || !tree) return false;
    try {
      return Boolean(await workspaceSyncEngine.submit(replicaScope, {
        type: "delete-node",
        nodeId: id,
        input: {
          requestId: crypto.randomUUID(),
          expectedTreeRevision: tree.document.revision,
        },
      }));
    } catch {
      return false;
    }
  }, [replicaScope, tree]);

  const moveDataSource = useCallback(async (id: string, afterId: string | null) => {
    if (!replicaScope || !tree) return false;
    try {
      return Boolean(await workspaceSyncEngine.submit(replicaScope, {
        type: "move-node",
        nodeId: id,
        input: {
          requestId: crypto.randomUUID(),
          afterNodeId: afterId,
          expectedTreeRevision: tree.document.revision,
        },
      }));
    } catch {
      return false;
    }
  }, [replicaScope, tree]);

  return (
    <Base
      {...baseProps}
      aria-label={props["aria-label"] ?? "Cron"}
      background={props.background ?? props.outerDiscColor}
      className={classes}
      componentName="CronDialer"
      height={availableHeight === null
        ? "calc(100dvh - 8rem)"
        : `${availableHeight}px`}
      ref={rootRef}
      style={timelineStyle}
      width={props.width === undefined || props.width === "inherit"
        ? "100%"
        : props.width}
    >
      {view === "event" ? (
        <Form
          aria-label="Event form"
          className={styles.eventForm}
          onSubmit={saveEvent}
        >
          <div className={styles.eventMenu}>
            <span>{editingEvent ? "Edit event" : "Event"}</span>
            {editingEvent ? (
              <DeleteButton
                {...props.eventDeleteButtonProps}
                className={styles.eventDeleteButton}
                disabled={savingEvent}
                label={editingEvent.title || "Event"}
                onDelete={deleteEditingEvent}
              />
            ) : null}
            <Button
              {...props.eventButtonProps}
              activeColor="COLOR_SPEECH"
              aria-label="Close event form"
              background="COLOR_SPEECH"
              className={styles.closeButton}
              onClick={() => {
                setEditingEvent(null);
                setView("timeline");
              }}
            >
              <X aria-hidden="true" size="1em" />
            </Button>
          </div>
          <div className={styles.eventTimes}>
            <Button
              {...props.eventButtonProps}
              activeColor="COLOR_ACCENT_TWO"
              aria-label="Set start time"
              className={styles.eventTimeButton}
              onClick={() => {
                selectEndpoint("start");
                setView("timeline");
              }}
            >
              {formatCronTimelineTime(startTime)}
            </Button>
            <Button
              {...props.eventButtonProps}
              activeColor="COLOR_ACCENT_ONE"
              aria-label="Set end time"
              className={styles.eventTimeButton}
              onClick={() => {
                selectEndpoint("end");
                setView("timeline");
              }}
            >
              {formatCronTimelineTime(endTime)}
            </Button>
          </div>
          <Input
            {...props.eventInputProps}
            aria-label="Title"
            label="Title"
            value={eventDraft.title}
            onChange={(event) => setEventDraft((current) => ({
              ...current,
              title: event.currentTarget.value,
            }))}
          />
          <Input
            {...props.eventInputProps}
            aria-label="Subtitle"
            label="Subtitle"
            value={eventDraft.subtitle}
            onChange={(event) => setEventDraft((current) => ({
              ...current,
              subtitle: event.currentTarget.value,
            }))}
          />
          <Textarea
            {...props.eventTextareaProps}
            aria-label="Text"
            className={styles.eventText}
            keyboardResize="shrink"
            label="Text"
            resize="none"
            size="fill"
            value={eventDraft.text}
            onChange={(event) => setEventDraft((current) => ({
              ...current,
              text: event.currentTarget.value,
            }))}
          />
          <Button
            {...props.eventButtonProps}
            className={styles.saveButton}
            disabled={savingEvent || (editingEvent
              ? Boolean(editingEvent.sourceNodeId && (!tree || !replicaScope))
              : !cronRoot || !replicaScope)}
            type="submit"
            width="100%"
          >
            Save
          </Button>
        </Form>
      ) : view === "datasources" ? (
        <div className={styles.dataSourceView}>
          <div className={styles.eventMenu}>
            <span>Datasources</span>
            <Button
              {...props.eventButtonProps}
              activeColor="COLOR_SPEECH"
              aria-label="Close datasources"
              background="COLOR_SPEECH"
              className={styles.closeButton}
              onClick={() => setView("timeline")}
            >
              <X aria-hidden="true" size="1em" />
            </Button>
          </div>
          <TreeBrowser<CronDataSource>
            {...props.dataSourceBrowserProps}
            browserLabel="Cron datasources"
            componentName="CronDataSourceBrowser"
            menuVisible={false}
            model={dataSourceModel}
            rootLabel="datasources"
            selectionActiveColor="COLOR_ACCENT_TWO"
            canDeleteNode={(node) => !isDefaultCronPath(node.label)}
            onCreateNode={createDataSource}
            onDeleteNode={deleteDataSource}
            onMoveNode={moveDataSource}
            onRenameNode={renameDataSource}
            renderContent={({ height, node }) => (
              <Base
                as="pre"
                aria-label={`${node.label} datasource path`}
                className={styles.dataSourceContent}
                height={height}
              >
                {node.data?.path ?? node.label}
              </Base>
            )}
          />
        </div>
      ) : (
        <div className={styles.timelineView}>
          <div className={styles.timelineMenu}>
            <div className={styles.zoomControls} aria-label="Timeline controls">
              <Button
                {...props.eventButtonProps}
                aria-label="Datasources"
                className={styles.zoomButton}
                width="100%"
                onClick={() => setView("datasources")}
              >
                <DatabaseArrowDown aria-hidden="true" size="1em" />
              </Button>
              <Button
                {...props.eventButtonProps}
                aria-label="Now"
                className={styles.zoomButton}
                width="100%"
                onClick={setCurrentTime}
              >
                <Clock12 aria-hidden="true" size="1em" />
              </Button>
              <Button
                {...props.eventButtonProps}
                aria-label="Zoom out"
                className={styles.zoomButton}
                disabled={halfRangeMs === CRON_MAX_HALF_RANGE_MS}
                width="100%"
                onClick={() => changeRange("out")}
              >
                <ZoomOut aria-hidden="true" size="1em" />
              </Button>
              <Button
                {...props.eventButtonProps}
                aria-label="Zoom in"
                className={styles.zoomButton}
                disabled={halfRangeMs === CRON_MIN_HALF_RANGE_MS}
                width="100%"
                onClick={() => changeRange("in")}
              >
                <ZoomIn aria-hidden="true" size="1em" />
              </Button>
            </div>
            <div className={styles.endpointControls} aria-label="Time endpoints">
              <Button
                {...props.eventButtonProps}
                activeColor="COLOR_ACCENT_TWO"
                aria-label="Set start"
                className={styles.endpointButton}
                selected={activeEndpoint === "start"}
                width="100%"
                onClick={() => selectEndpoint("start")}
              >
                <ArrowRightFromLine aria-hidden="true" size="1em" />
              </Button>
              <Button
                {...props.eventButtonProps}
                activeColor="COLOR_ACCENT_THREE"
                aria-label="Browse without changing endpoints"
                className={styles.endpointButton}
                selected={activeEndpoint === "off"}
                width="100%"
                onClick={() => selectEndpoint("off")}
              >
                <SearchCode aria-hidden="true" size="1em" />
              </Button>
              <Button
                {...props.eventButtonProps}
                activeColor="COLOR_ACCENT_ONE"
                aria-label="Set end"
                className={styles.endpointButton}
                selected={activeEndpoint === "end"}
                width="100%"
                onClick={() => selectEndpoint("end")}
              >
                <ArrowRightToLine aria-hidden="true" size="1em" />
              </Button>
            </div>
          </div>
          <div
            aria-label="Cron timeline"
            aria-roledescription="interactive time scale"
            className={styles.timeline}
            data-time-endpoint={activeEndpoint}
            role="application"
            tabIndex={props.tabIndex ?? 0}
            onKeyDown={handleKeyDown}
            onPointerCancel={cancelGesture}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              gesture.current = {
                axis: "pending",
                centerTimeMs: centerTime.getTime(),
                halfRangeMs,
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
              };
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                updateGesture(event);
              }
            }}
            onPointerUp={finishGesture}
          >
            <div className={styles.scale} aria-hidden="true">
              <span className={styles.axis} />
              {minorMarks.map((mark) => (
                <span
                  className={styles.minorMark}
                  key={mark.time.toISOString()}
                  style={{
                    "--cron-mark-position": `${mark.position}%`,
                  } as TimelineMarkStyle}
                >
                  <span className={styles.minorTick} />
                </span>
              ))}
              {marks.map((mark) => (
                <span
                  className={styles.mark}
                  data-day-tone={mark.dayTone}
                  key={mark.time.toISOString()}
                  style={{
                    "--cron-mark-position": `${mark.position}%`,
                  } as TimelineMarkStyle}
                >
                  <span className={styles.tick} />
                  <span className={styles.markLabel}>{mark.label}</span>
                </span>
              ))}
            </div>
            <div
              aria-hidden="true"
              className={styles.intervalBand}
              style={{
                "--cron-interval-height": `${endpointOverlay.height}%`,
                "--cron-interval-top": `${endpointOverlay.top}%`,
              } as TimelineEndpointStyle}
            />
            <div className={styles.eventBlocks}>
              {eventBlocks.map((block) => (
                <button
                  aria-label={`${block.event.title || "Event"}: ${formatCronTimelineTime(block.startTime)}–${formatCronTimelineTime(block.endTime)}`}
                  className={styles.eventBlock}
                  disabled={Boolean(block.event.sourceNodeId && !block.event.editable)}
                  key={block.event.id}
                  type="button"
                  style={{
                    "--cron-event-height": `${block.height}%`,
                    "--cron-event-top": `${block.top}%`,
                  } as TimelineEventStyle}
                  onClick={() => {
                    if (eventClickSuppressed.current) {
                      eventClickSuppressed.current = false;
                      return;
                    }
                    openEventEditor(block.event);
                  }}
                >
                  <strong>{block.event.title || "Event"}</strong>
                  {block.event.subtitle && <span>{block.event.subtitle}</span>}
                </button>
              ))}
            </div>
            {endpointOverlay.shadows.map((shadow) => shadow.visible && (
              <Pointer
                {...props.pointerProps}
                key={shadow.endpoint}
                mode={shadow.endpoint}
                position={`${shadow.position}%`}
                shadow
              />
            ))}
            <Pointer
              {...props.pointerProps}
              mode={activeEndpoint === "off" ? "browse" : activeEndpoint}
              position="50%"
            />
            <PointerButton
              {...props.pointerButtonProps}
              aria-label={`Create event at ${formatCronPointerTime(centerTime)}`}
              className={styles.centerLabel}
              height="auto"
              mode={activeEndpoint === "off" ? "browse" : activeEndpoint}
              primary={formatCronPointerTime(centerTime)}
              secondary={<>± {formatCronRange(halfRangeMs)} · {formatCronGrid(halfRangeMs)}</>}
              onClick={() => {
                setEditingEvent(null);
                setView("event");
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}
    </Base>
  );
}

export function cronAdjacentRange(
  currentHalfRangeMs: number,
  direction: "in" | "out",
) {
  const currentRange = snapCronHalfRange(currentHalfRangeMs);
  const currentIndex = CRON_HALF_RANGES_MS.indexOf(currentRange);
  const offset = direction === "out" ? 1 : -1;
  const nextIndex = Math.max(
    0,
    Math.min(CRON_HALF_RANGES_MS.length - 1, currentIndex + offset),
  );
  return CRON_HALF_RANGES_MS[nextIndex];
}

export function cronAvailableHeight(
  viewportBottom: number,
  componentTop: number,
  bottomPadding = 0,
) {
  return Math.max(0, Math.floor(viewportBottom - componentTop - bottomPadding));
}

export function cronCenterFromVerticalDrag(
  initialCenter: Date,
  deltaY: number,
  height: number,
  halfRangeMs: number,
) {
  const safeHeight = Math.max(1, height);
  const rawTime = new Date(
    initialCenter.getTime() - deltaY / safeHeight * halfRangeMs * 2,
  );
  return snapCronTimeToRange(rawTime, halfRangeMs);
}

export function cronVerticalStep(halfRangeMs: number) {
  const range = snapCronHalfRange(halfRangeMs);
  const index = CRON_HALF_RANGES_MS.indexOf(range);
  return CRON_VERTICAL_STEPS_MS[index];
}

export function snapCronTimeToRange(time: Date, halfRangeMs: number) {
  const stepMinutes = cronVerticalStep(halfRangeMs) / 60_000;
  const range = snapCronHalfRange(halfRangeMs);
  const offsetMinutes = range === CRON_HALF_RANGES_MS[3] ? 6 * 60 : 0;
  const minutesToday = time.getHours() * 60
    + time.getMinutes()
    + time.getSeconds() / 60
    + time.getMilliseconds() / 60_000;
  const snappedMinutes = Math.round(
    (minutesToday - offsetMinutes) / stepMinutes,
  ) * stepMinutes + offsetMinutes;
  return new Date(
    time.getFullYear(),
    time.getMonth(),
    time.getDate(),
    0,
    snappedMinutes,
  );
}

export function ensureCronEndAfterStart(
  startTime: Date,
  endTime: Date | null,
  halfRangeMs: number,
) {
  if (endTime && endTime.getTime() > startTime.getTime()) return endTime;
  return new Date(startTime.getTime() + cronVerticalStep(halfRangeMs));
}

export function keepCronStartBeforeEnd(
  candidate: Date,
  currentStart: Date,
  endTime: Date,
) {
  return candidate.getTime() < endTime.getTime() ? candidate : currentStart;
}

export function keepCronEndAfterStart(
  candidate: Date,
  startTime: Date,
  currentEnd: Date,
) {
  return candidate.getTime() > startTime.getTime() ? candidate : currentEnd;
}

export function moveCronEndpointToTime(
  startTime: Date,
  endTime: Date,
  endpoint: CronEndpoint,
  targetTime: Date,
) {
  const duration = Math.max(1, endTime.getTime() - startTime.getTime());
  if (endpoint === "start") {
    return {
      startTime: targetTime,
      endTime: targetTime.getTime() < endTime.getTime()
        ? endTime
        : new Date(targetTime.getTime() + duration),
    };
  }
  return {
    startTime: targetTime.getTime() > startTime.getTime()
      ? startTime
      : new Date(targetTime.getTime() - duration),
    endTime: targetTime,
  };
}

export function cronTimelineMarks(
  centerTime: Date,
  halfRangeMs: number,
): TimelineMark[] {
  const range = clampCronHalfRange(halfRangeMs);
  if (range === CRON_HALF_RANGES_MS[4]) {
    return cronMonthlyTimelineMarks(centerTime, range);
  }
  if (range === CRON_MAX_HALF_RANGE_MS) {
    return cronYearlyTimelineMarks(centerTime, range);
  }
  const fullRange = range * 2;
  const interval = range === CRON_HALF_RANGES_MS[2]
    ? dayMs
    : markIntervals.find((candidate) => fullRange / candidate <= 10)
      ?? markIntervals.at(-1)!;
  const start = centerTime.getTime() - range;
  const end = centerTime.getTime() + range;
  const first = firstCronMarkAtOrAfter(start, interval);
  const marks: TimelineMark[] = [];
  for (let time = first; time <= end; time += interval) {
    const date = new Date(time);
    marks.push({
      dayTone: cronDateMarkTone(date, range),
      label: formatCronMark(date, range),
      position: (time - start) / fullRange * 100,
      time: date,
    });
  }
  return marks;
}

export function cronTimelineMinorMarks(
  centerTime: Date,
  halfRangeMs: number,
  majorMarks = cronTimelineMarks(centerTime, halfRangeMs),
) {
  const range = clampCronHalfRange(halfRangeMs);
  const start = centerTime.getTime() - range;
  const marks: Pick<TimelineMark, "position" | "time">[] = [];
  const divisions = range === CRON_MIN_HALF_RANGE_MS ? 3 : 2;
  for (let index = 1; index < majorMarks.length; index += 1) {
    const previousTime = majorMarks[index - 1].time.getTime();
    const nextTime = majorMarks[index].time.getTime();
    for (let division = 1; division < divisions; division += 1) {
      const time = Math.round(
        previousTime + (nextTime - previousTime) * division / divisions,
      );
      marks.push({
        position: (time - start) / (range * 2) * 100,
        time: new Date(time),
      });
    }
  }
  return marks;
}

export function cronTimelineEventBlocks(
  events: readonly CronStoredEvent[],
  centerTime: Date,
  halfRangeMs: number,
) {
  const range = clampCronHalfRange(halfRangeMs);
  const start = centerTime.getTime() - range;
  const end = centerTime.getTime() + range;
  const fullRange = range * 2;
  return [...events]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .flatMap((event) => {
      const eventStart = validCronDate(event.startTime);
      const eventEnd = validCronDate(event.endTime);
      if (!eventStart || !eventEnd
        || eventEnd.getTime() <= start
        || eventStart.getTime() >= end) {
        return [];
      }
      const visibleStart = Math.max(start, eventStart.getTime());
      const visibleEnd = Math.min(end, eventEnd.getTime());
      return [{
        endTime: eventEnd,
        event,
        height: (visibleEnd - visibleStart) / fullRange * 100,
        startTime: eventStart,
        top: (visibleStart - start) / fullRange * 100,
      }];
    });
}

export function cronEndpointOverlay(
  startTime: Date,
  endTime: Date,
  activeEndpoint: CronEndpointMode,
  browseTime: Date,
  centerTime: Date,
  halfRangeMs: number,
) {
  const range = clampCronHalfRange(halfRangeMs);
  const position = (time: Date) => (
    time.getTime() - (centerTime.getTime() - range)
  ) / (range * 2) * 100;
  const startPosition = position(startTime);
  const endPosition = position(endTime);
  const browsePosition = position(browseTime);
  const visibleStart = Math.max(0, Math.min(100, startPosition));
  const visibleEnd = Math.max(0, Math.min(100, endPosition));
  const shadowEndpoints: CronEndpointMode[] = activeEndpoint === "off"
    ? ["start", "end"]
    : activeEndpoint === "start" ? ["off", "end"] : ["start", "off"];
  return {
    height: Math.abs(visibleEnd - visibleStart),
    shadows: shadowEndpoints.map((endpoint) => {
      const endpointPosition = endpoint === "start"
        ? startPosition
        : endpoint === "end" ? endPosition : browsePosition;
      return {
        endpoint: (endpoint === "off" ? "browse" : endpoint) as PointerMode,
        position: endpointPosition,
        visible: endpointPosition >= 0 && endpointPosition <= 100,
      };
    }),
    top: Math.min(visibleStart, visibleEnd),
  };
}

function cronMonthlyTimelineMarks(centerTime: Date, range: number) {
  const start = centerTime.getTime() - range;
  const end = centerTime.getTime() + range;
  const startTime = new Date(start);
  let cursor = new Date(startTime.getFullYear(), startTime.getMonth(), 1);
  if (cursor.getTime() < start) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  const marks: TimelineMark[] = [];
  while (cursor.getTime() <= end) {
    const time = new Date(cursor);
    marks.push({
      label: formatCronMonthMark(time),
      position: (time.getTime() - start) / (range * 2) * 100,
      time,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return marks;
}

function cronYearlyTimelineMarks(centerTime: Date, range: number) {
  const start = centerTime.getTime() - range;
  const end = centerTime.getTime() + range;
  const startTime = new Date(start);
  let cursor = new Date(startTime.getFullYear(), 0, 1);
  if (cursor.getTime() < start) {
    cursor = new Date(cursor.getFullYear() + 1, 0, 1);
  }
  const marks: TimelineMark[] = [];
  while (cursor.getTime() <= end) {
    const time = new Date(cursor);
    marks.push({
      label: String(time.getFullYear()),
      position: (time.getTime() - start) / (range * 2) * 100,
      time,
    });
    cursor = new Date(cursor.getFullYear() + 1, 0, 1);
  }
  return marks;
}

export function formatCronTimelineTime(time: Date) {
  const year = String(time.getFullYear()).slice(-3).padStart(3, "0");
  const month = String(time.getMonth() + 1).padStart(2, "0");
  const day = String(time.getDate()).padStart(2, "0");
  const hour = String(time.getHours()).padStart(2, "0");
  const minute = String(time.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} · ${hour}:${minute}`;
}

function formatCronPointerTime(time: Date) {
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return `${weekdays[time.getDay()]} ${formatCronTimelineTime(time)}`;
}

export function formatCronRange(halfRangeMs: number) {
  const range = snapCronHalfRange(halfRangeMs);
  if (range === CRON_HALF_RANGES_MS[0]) return "1 h";
  if (range === CRON_HALF_RANGES_MS[1]) return "24 h";
  if (range === CRON_HALF_RANGES_MS[2]) return "7 d";
  if (range === CRON_HALF_RANGES_MS[3]) return "1 m";
  if (range === CRON_HALF_RANGES_MS[4]) return "1 y";
  return "5 y";
}

export function formatCronGrid(halfRangeMs: number) {
  const step = cronVerticalStep(halfRangeMs);
  if (step === CRON_VERTICAL_STEPS_MS[0]) return "1m";
  if (step === CRON_VERTICAL_STEPS_MS[1]) return "10m";
  if (step === CRON_VERTICAL_STEPS_MS[2]) return "1h";
  if (step === CRON_VERTICAL_STEPS_MS[3]) return "12h";
  return "1d";
}

function clampCronHalfRange(value: number) {
  return Math.max(
    CRON_MIN_HALF_RANGE_MS,
    Math.min(CRON_MAX_HALF_RANGE_MS, value),
  );
}

function formatCronMark(time: Date, halfRangeMs: number) {
  if (halfRangeMs === CRON_HALF_RANGES_MS[1]) {
    if (time.getHours() === 0 && time.getMinutes() === 0) {
      return formatCronMarkDate(time);
    }
    return formatCronMarkTime(time);
  }
  if (halfRangeMs <= 12 * 60 * 60 * 1_000) {
    return formatCronMarkTime(time);
  }
  if (halfRangeMs <= 120 * 24 * 60 * 60 * 1_000) {
    return formatCronMarkDate(time);
  }
  return `${String(time.getMonth() + 1).padStart(2, "0")}.${String(
    time.getFullYear(),
  ).slice(-2)}`;
}

function cronDateMarkTone(time: Date, halfRangeMs: number) {
  const isDateMark = halfRangeMs === CRON_HALF_RANGES_MS[1]
    ? time.getHours() === 0 && time.getMinutes() === 0
    : halfRangeMs > 12 * hourMs && halfRangeMs <= 120 * dayMs;
  if (!isDateMark) return undefined;
  if (time.getDay() === 6) return "saturday";
  if (time.getDay() === 0) return "sunday";
  return undefined;
}

function firstCronMarkAtOrAfter(start: number, interval: number) {
  if (interval > dayMs) return Math.ceil(start / interval) * interval;
  const startTime = new Date(start);
  const localDayStart = new Date(
    startTime.getFullYear(),
    startTime.getMonth(),
    startTime.getDate(),
  ).getTime();
  return localDayStart + Math.ceil((start - localDayStart) / interval) * interval;
}

function formatCronMarkTime(time: Date) {
  return `${String(time.getHours()).padStart(2, "0")}:${String(
    time.getMinutes(),
  ).padStart(2, "0")}`;
}

function formatCronMarkDate(time: Date) {
  return `${String(time.getDate()).padStart(2, "0")}.${String(
    time.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function formatCronMonthMark(time: Date) {
  if (time.getMonth() === 0) return String(time.getFullYear());
  return [
    "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
  ][time.getMonth()];
}

function snapCronHalfRange(value: number) {
  return CRON_HALF_RANGES_MS.reduce((closest, candidate) => (
    Math.abs(Math.log(value / candidate))
      < Math.abs(Math.log(value / closest))
      ? candidate
      : closest
  ));
}

function validCronDate(value: string) {
  if (!value) return null;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? null : time;
}

function isCronEventDraft(value: unknown): value is CronEventDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as Partial<CronEventDraft>;
  return typeof draft.endTime === "string"
    && typeof draft.startTime === "string"
    && typeof draft.subtitle === "string"
    && typeof draft.text === "string"
    && typeof draft.title === "string";
}

function isCronStoredEventList(value: unknown): value is CronStoredEvent[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!isCronEventDraft(entry)) return false;
    const event = entry as Partial<CronStoredEvent>;
    const startTime = validCronDate(event.startTime ?? "");
    const endTime = validCronDate(event.endTime ?? "");
    return typeof event.createdAt === "string"
      && validCronDate(event.createdAt) !== null
      && typeof event.id === "string"
      && event.id.length > 0
      && startTime !== null
      && endTime !== null
      && endTime.getTime() > startTime.getTime();
  });
}

function createCronEventId() {
  if (typeof globalThis.crypto !== "undefined"
    && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `cron-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function ensureCronDataStructure(
  scope: WorkspaceReplicaScope,
  initialNodes: readonly TreeNodeDto[],
  initialRevision: number,
) {
  let nodes = [...initialNodes];
  let revision = initialRevision;
  const systemRoot = findCronNodeByPath(nodes, "_system");
  if (!systemRoot) return false;
  const userCommandId = crypto.randomUUID();

  async function ensureNode(
    parentId: string,
    label: string,
    localId: string,
  ) {
    const existing = findCronChild(nodes, parentId, localId)
      ?? findCronChild(nodes, parentId, label);
    if (existing) return existing;
    const siblings = nodes
      .filter((node) => node.parentId === parentId)
      .sort(compareCronNodes);
    const nodeId = createCronEventId();
    const record = await workspaceSyncEngine.submit(scope, {
      type: "create-node",
      input: {
        requestId: crypto.randomUUID(),
        nodeId,
        parentId,
        afterNodeId: siblings.at(-1)?.id ?? null,
        kind: "data-file",
        label,
        localId,
        expectedTreeRevision: revision,
      },
    }, userCommandId);
    if (!record.tree) return null;
    nodes = [...record.tree.document.nodes];
    revision = record.tree.document.revision;
    return nodes.find(({ id }) => id === nodeId) ?? null;
  }

  const cron = await ensureNode(systemRoot.id, "Cron", "cron");
  if (!cron) return false;
  const dataSources = await ensureNode(cron.id, "datasources", "datasources");
  if (!dataSources) return false;
  const defaultSource = nodes.find((node) => (
    node.parentId === dataSources.id
    && isDefaultCronPath(node.label)
  ));
  if (!defaultSource) {
    await ensureNode(dataSources.id, "_system/Cron", "default");
  }
  return true;
}

function findCronNodeByPath(nodes: readonly TreeNodeDto[], path: string) {
  let parentId: string | null = null;
  let current: TreeNodeDto | undefined;
  for (const segment of path.split("/").filter(Boolean)) {
    current = nodes.find((node) => node.parentId === parentId && (
      node.localId.toLocaleLowerCase() === segment.toLocaleLowerCase()
      || node.label.toLocaleLowerCase() === segment.toLocaleLowerCase()
    ));
    if (!current) return undefined;
    parentId = current.id;
  }
  return current;
}

function findCronChild(
  nodes: readonly TreeNodeDto[],
  parentId: string,
  name: string,
) {
  const normalized = name.toLocaleLowerCase();
  return nodes.find((node) => node.parentId === parentId && (
    node.localId.toLocaleLowerCase() === normalized
    || node.label.toLocaleLowerCase() === normalized
  ));
}

function compareCronNodes(left: TreeNodeDto, right: TreeNodeDto) {
  return left.position - right.position || left.id.localeCompare(right.id);
}

function isDefaultCronPath(path: string) {
  return normalizeDataPath(path).toLocaleLowerCase() === "_system/cron";
}

function serializeCronEvent(
  draft: CronEventDraft,
  startTime: Date,
  endTime: Date,
) {
  return [
    `start: ${startTime.toISOString()}`,
    `end: ${endTime.toISOString()}`,
    draft.subtitle ? `subtitle: ${draft.subtitle}` : "",
    "",
    draft.text,
  ].join("\n").trimEnd();
}

function cronBaseProps(props: CronDialerProps): BaseProps<"div"> {
  const baseProps = { ...props } as Record<string, unknown>;
  const ownedProps: (keyof CronDialerProps)[] = [
    "buttonProps",
    "centerButtonProps",
    "centerFontSize",
    "centerFontWeight",
    "dialSurfaceProps",
    "eventButtonProps",
    "eventDeleteButtonProps",
    "dataSourceBrowserProps",
    "eventInputProps",
    "eventTextareaProps",
    "initialEditorOpen",
    "initialHalfRangeMs",
    "initialTime",
    "innerDiscColor",
    "innerGradientEnd",
    "innerGradientStart",
    "innerScaleFontSize",
    "innerScaleFontWeight",
    "onEventSave",
    "onRangeChange",
    "onTimeChange",
    "pointerProps",
    "pointerButtonProps",
    "workspaceId",
    "outerDiscColor",
    "outerGradientEnd",
    "outerGradientStart",
    "outerScaleFontSize",
    "outerScaleFontWeight",
  ];
  ownedProps.forEach((name) => delete baseProps[name]);
  return baseProps as BaseProps<"div">;
}
