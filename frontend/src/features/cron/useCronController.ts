import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { CronTimer } from "@flydeck/shared/cron";
import { cronApi } from "../../api/cron";
import { runRequest } from "../../api/runRequest";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  cronMaxHours,
  getCronSnapStepHours,
  hoursToRangeSliderValue,
  rangeSliderToHours,
  snapDateToLocalStep,
} from "./model";
import type { CronMode, CronScaleMode, CronZoomMode } from "./dialModel";
import type { TimerZoom } from "./TimerList";

const modeCountsStorageKey = "flydeck.cronModeCounts";
type CronModeCounts = Record<CronMode, number>;

function validateModeCounts(value: unknown): CronModeCounts | null {
  if (typeof value !== "object" || value === null) return null;
  return {
    DURA: "DURA" in value && typeof value.DURA === "number" ? value.DURA : 0,
    DATE: "DATE" in value && typeof value.DATE === "number" ? value.DATE : 0,
  };
}

export function useCronController() {
  const [modeCounts, setModeCounts] = useLocalStorage<CronModeCounts>(
    modeCountsStorageKey,
    { DURA: 0, DATE: 0 },
    validateModeCounts,
  );
  const [mode, setMode] = useState<CronMode>(() => modeCounts.DATE > modeCounts.DURA ? "DATE" : "DURA");
  const [rangeValue, setRangeValue] = useState(0);
  const [hours, setHours] = useState(3);
  const [scaleMode, setScaleMode] = useState<CronScaleMode>(1);
  const [zoomMode, setZoomMode] = useState<CronZoomMode>("OFF");
  const [zoomCenterHours, setZoomCenterHours] = useState(3);
  const [title, setTitle] = useState("");
  const [titleKeyboardActive, setTitleKeyboardActive] = useState(false);
  const [timers, setTimers] = useState<CronTimer[]>([]);
  const [selectedTimerId, setSelectedTimerId] = useState<string | null>(null);
  const [timerZoom, setTimerZoom] = useState<TimerZoom>("1w");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [armedDeleteTimer, setArmedDeleteTimer] = useState(false);
  const [dateAnchor, setDateAnchor] = useState(() => new Date());
  const dialRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const titleKeyboardHostRef = useRef<HTMLDivElement>(null);
  const deletePendingRef = useRef(false);

  const scaleMaxHours = cronMaxHours * scaleMode;
  const rangeHours = rangeSliderToHours(rangeValue, scaleMaxHours);
  const zoomRangeHours = zoomMode === "12H" ? 12 : zoomMode === "24H" ? 24 : zoomMode === "32D" ? 32 * 24 : rangeHours;
  const snapStep = zoomMode === "12H" ? 5 / 60 : zoomMode === "24H" ? 15 / 60 : zoomMode === "32D" ? 24 : getCronSnapStepHours(rangeHours);
  const viewRangeHours = zoomRangeHours;
  const viewStartHours = zoomMode === "OFF" ? 0 : zoomCenterHours - zoomRangeHours / 2;
  const viewEndHours = viewStartHours + viewRangeHours;
  const targetDate = new Date(Math.round((dateAnchor.getTime() + hours * 3600 * 1000) / 60000) * 60000);
  const submitDisabled = busy || title.trim().length === 0 || (mode === "DATE" && targetDate.getTime() <= dateAnchor.getTime());

  useEffect(() => {
    let cancelled = false;
    cronApi.list()
      .then((loadedTimers) => { if (!cancelled) setTimers(loadedTimers); })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Timers could not be loaded");
      });
    return () => { cancelled = true; };
  }, []);

  function run(action: () => Promise<void>) {
    return runRequest(action, {
      setBusy,
      setError,
      fallbackError: "Timer request failed",
    });
  }

  function snapHours(value: number, snap = snapStep) {
    if (mode === "DATE") {
      if (snap >= 24) {
        const rawTarget = new Date(dateAnchor.getTime() + value * 3600000);
        const candidates = [-1, 0, 1].map((dayOffset) => {
          const candidate = new Date(rawTarget);
          candidate.setDate(rawTarget.getDate() + dayOffset);
          candidate.setHours(12, 0, 0, 0);
          return candidate.getTime();
        });
        const snappedTarget = candidates.reduce((nearest, candidate) =>
          Math.abs(candidate - rawTarget.getTime()) < Math.abs(nearest - rawTarget.getTime()) ? candidate : nearest);
        return Math.max(snap, Math.min(rangeHours, (snappedTarget - dateAnchor.getTime()) / 3600000));
      }
      const snappedTarget = snapDateToLocalStep(new Date(dateAnchor.getTime() + value * 3600000), snap);
      return Math.max(snap, Math.min(rangeHours, (snappedTarget.getTime() - dateAnchor.getTime()) / 3600000));
    }
    return Math.max(snap, Math.min(rangeHours, Math.round(value / snap) * snap));
  }

  function updateAngle(clientX: number, clientY: number) {
    const dial = dialRef.current;
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    const angle = (Math.atan2(clientY - (rect.top + rect.height / 2), clientX - (rect.left + rect.width / 2)) * 180) / Math.PI + 90;
    const normalizedAngle = (angle + 360) % 360;
    setHours(snapHours(viewStartHours + viewRangeHours * (normalizedAngle / 360)));
  }

  function updateScaleAngle(clientX: number, clientY: number) {
    const dial = dialRef.current;
    if (!dial) return;
    setZoomMode("OFF");
    const rect = dial.getBoundingClientRect();
    const angle = (Math.atan2(clientY - (rect.top + rect.height / 2), clientX - (rect.left + rect.width / 2)) * 180) / Math.PI + 90;
    setRangeValue((((angle + 360) % 360) / 360) * 100);
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateAngle(event.clientX, event.clientY);
  }

  function beginScaleDrag(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (mode === "DATE") setDateAnchor(new Date());
    updateScaleAngle(event.clientX, event.clientY);
  }

  function selectMode(nextMode: CronMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setModeCounts((current) => ({ ...current, [nextMode]: current[nextMode] + 1 }));
    if (nextMode === "DATE") setDateAnchor(new Date());
  }

  function cycleZoom() {
    setZoomMode((current) => {
      const modes: CronZoomMode[] = rangeHours >= 90 * 24 ? ["OFF", "32D", "24H", "12H"] : ["OFF", "24H", "12H"];
      const nextMode = modes[(modes.indexOf(current) + 1) % modes.length];
      if (nextMode !== "OFF") setZoomCenterHours(hours);
      return nextMode;
    });
  }

  function armDelete() {
    if (deletePendingRef.current) return;
    setArmedDeleteTimer((current) => !current);
  }

  function selectTimer(id: string) {
    const timer = timers.find((current) => current.id === id);
    if (!timer || timer.status !== "active") return;
    const now = new Date();
    const remainingHours = (new Date(timer.dueAt).getTime() - now.getTime()) / 3600000;
    if (remainingHours <= 0) return;
    setSelectedTimerId(timer.id);
    setTitle(timer.title);
    setMode("DATE");
    setDateAnchor(now);
    setHours(remainingHours);
    const nextScaleMode: CronScaleMode = remainingHours <= cronMaxHours ? 1 : remainingHours <= cronMaxHours * 2 ? 2 : 5;
    setScaleMode(nextScaleMode);
    setRangeValue(hoursToRangeSliderValue(Math.max(12, remainingHours * 1.1), cronMaxHours * nextScaleMode));
    setZoomMode("OFF");
  }

  async function selectOrDelete(id: string) {
    if (deletePendingRef.current) return;
    if (!armedDeleteTimer) {
      selectTimer(id);
      return;
    }
    deletePendingRef.current = true;
    try {
      await run(async () => {
        await cronApi.remove(id);
        setTimers((current) => current.filter((timer) => timer.id !== id));
        if (selectedTimerId === id) {
          setSelectedTimerId(null);
          setTitle("");
        }
      });
    } finally {
      deletePendingRef.current = false;
      setArmedDeleteTimer(false);
    }
  }

  async function submit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const dueAt = mode === "DURA" ? new Date(Date.now() + hours * 3600000) : targetDate;
    await run(async () => {
      const timerToUpdate = selectedTimerId;
      const timer = timerToUpdate
        ? await cronApi.update(timerToUpdate, { dueAt: dueAt.toISOString() })
        : await cronApi.create({ title: trimmedTitle, dueAt: dueAt.toISOString() });
      setTimers((current) => timerToUpdate
        ? current.map((existing) => existing.id === timerToUpdate ? timer : existing)
        : [...current, timer]);
      setSelectedTimerId(null);
      setTitle("");
    });
  }

  return {
    mode, rangeValue, hours, scaleMode, zoomMode, dateAnchor, timers, selectedTimerId,
    timerZoom, busy, error, armedDeleteTimer, title, titleKeyboardActive,
    scaleMaxHours, rangeHours, viewRangeHours, viewStartHours, viewEndHours, targetDate, submitDisabled,
    dialRef, titleRef, titleKeyboardHostRef,
    setTitle, setTitleKeyboardActive, setScaleMode, setTimerZoom,
    updateAngle, updateScaleAngle, beginDrag, beginScaleDrag, selectMode, cycleZoom,
    armDelete, selectOrDelete, submit,
  };
}

export type CronController = ReturnType<typeof useCronController>;
