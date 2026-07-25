import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  Bot,
  CalendarClock,
  Database,
  RefreshCw,
  Repeat2,
  Send,
  Settings,
} from "lucide-react";
import {
  defaultAgentHistory,
  defaultPromptSlots,
  defaultSnippets,
  promptSlotMarks,
  type Snippet,
} from "./data/defaults";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useEditorControls } from "./hooks/useEditorControls";
import { ChatWorkspace, type ChatSubTab } from "./features/chat/ChatWorkspace";
import { DataWorkspace, dataPageSize } from "./features/data/DataWorkspace";
import { SettingsWorkspace } from "./features/settings/SettingsWorkspace";
import { TimerList, type TimerZoom } from "./features/cron/TimerList";
import { DisplayClockTime, DisplayUnit } from "./features/cron/CronDisplay";
import { TextInput } from "./components/TextInput";
import { RadialMark } from "./components/RadialMark";
import { dataApi } from "./api/data";
import { snippetsApi } from "./api/snippets";
import { cronApi } from "./api/cron";
import { healthApi } from "./api/health";
import { chatApi, formatChatSnapshot, type ChatEffort, type ChatModelTier, type ChatSnapshot } from "./api/chat";
import { runRequest } from "./api/runRequest";
import type { CronTimer } from "@flydeck/shared/cron";
import type { DataFileSummary } from "@flydeck/shared/data";
import {
  cronMaxHours,
  getDurationParts,
  getCronSnapStepHours,
  hoursToRangeSliderValue,
  rangeSliderToHours,
  snapDateToLocalStep,
} from "./features/cron/model";
import type { CharacterDialCorners, CharacterDialCornerAction } from "./components/CharacterDial";

type MainTab = "CHAT" | "DATA" | "CRON";
type CronMode = "DURA" | "DATE";
type CronZoomMode = "OFF" | "32D" | "24H" | "12H";
type CronScaleMode = 1 | 2 | 5;
type CronScaleMark = { hours: number; label: string; subLabel?: string };

const cronCenterDiameter = 200;
const cronTimeIndicatorDiameter = 56;
const cronScaleIndicatorDiameter = 40;
const cronScaleRadius = cronCenterDiameter / 2 + cronScaleIndicatorDiameter / 2;
const cronScaleTouchRadius = cronScaleRadius + 32;
const cronDialGeometryStyle = {
  "--cron-center-diameter": `${cronCenterDiameter}px`,
  "--cron-time-indicator-diameter": `${cronTimeIndicatorDiameter}px`,
  "--cron-scale-indicator-diameter": `${cronScaleIndicatorDiameter}px`,
  "--cron-scale-radius": `${cronScaleRadius}px`,
  "--cron-scale-diameter": `${cronScaleRadius * 2}px`,
  "--cron-scale-touch-radius": `${cronScaleTouchRadius}px`,
  "--cron-scale-touch-diameter": `${cronScaleTouchRadius * 2}px`,
} as CSSProperties;

const promptEditorStorageKey = "flydeck.promptEditorSlots";
const agentHistoryStorageKey = "flydeck.agentHistory";
const cronModeCountsStorageKey = "flydeck.cronModeCounts";
const uiConfigStorageKey = "flydeck.uiConfig";
const uiConfigDefaults = [
  "--MAIN--",
  "# preferred keyboard options: system, mobile, dialer",
  "preferred-keyboard : dialer",
  "",
  "--DISPLAY--",
  "# theme options: FLYDECK, GREYSCALE",
  "ui-font-size : 50",
  "ui-list-font-size : 50",
  "editor-fontsize-scale : 50",
  "theme : GREYSCALE",
  "",
  "--CHARACTER DIALER--",
  "# button options: TIME, SPACE, DIALERSIZE, DWELL, or empty",
  "dialerinput-defaultsize : small",
  "dialerinput-dwell : 0.3",
  "dialerinput-nwkey : TIME",
  "dialerinput-swkey : DIALERSIZE",
  "dialerinput-sekey : SPACE",
  "dialerinput-nekey : DWELL",
  "dialerinput-rightkey1 :",
  "dialerinput-rightkey2 :",
  "dialerinput-rightkey3 :",
  "dialerinput-rightkey4 :",
  "dialerinput-rightkey5 :",
  "",
];
const defaultUiConfig = uiConfigDefaults.join("\n");
const initiallySelectedSnippetName = defaultSnippets[1]?.name ?? null;
const cronScaleMarks: CronScaleMark[] = [
  { hours: 0, label: "0h" },
  { hours: 1, label: "1h" },
  { hours: 2, label: "2h" },
  { hours: 3, label: "3h" },
  { hours: 4, label: "4h" },
  { hours: 5, label: "5h" },
  { hours: 6, label: "6h" },
  { hours: 7, label: "7h" },
  { hours: 8, label: "8h" },
  { hours: 9, label: "9h" },
  { hours: 10, label: "10h" },
  { hours: 11, label: "11h" },
  { hours: 12, label: "12h" },
  { hours: 15, label: "15h" },
  { hours: 18, label: "18h" },
  { hours: 21, label: "21h" },
  { hours: 24, label: "24h" },
  { hours: 36, label: "36h" },
  { hours: 48, label: "2d" },
  { hours: 72, label: "3d" },
  { hours: 96, label: "4d" },
  { hours: 120, label: "5d" },
  { hours: 144, label: "6d" },
  { hours: 168, label: "7d" },
  { hours: 192, label: "8d" },
  { hours: 216, label: "9d" },
  { hours: 240, label: "10d" },
  { hours: 264, label: "11d" },
  { hours: 288, label: "12d" },
  { hours: 312, label: "13d" },
  { hours: 336, label: "14d" },
  { hours: 504, label: "21d" },
  { hours: 720, label: "1m" },
  { hours: 1440, label: "2m" },
  { hours: 2160, label: "3m" },
  { hours: 2880, label: "4m" },
  { hours: 3600, label: "5m" },
  { hours: 4320, label: "6m" },
  { hours: 5040, label: "7m" },
  { hours: 5760, label: "8m" },
  { hours: 6480, label: "9m" },
  { hours: 7200, label: "10m" },
  { hours: 7920, label: "11m" },
  { hours: 8760, label: "1y" },
];

function getDurationScaleMarks(mode: CronScaleMode): CronScaleMark[] {
  if (mode === 1) return cronScaleMarks;
  const maximumMonth = mode * 12;
  const extraMarks: CronScaleMark[] = Array.from({ length: maximumMonth - 12 }, (_, index) => index + 13)
    .filter((month) => month <= 12 || month % 3 === 0)
    .map((month) => ({
      hours: month === maximumMonth ? cronMaxHours * mode : month * 720,
      label: month % 12 === 0 ? `${month / 12}y` : `${month}m`,
    }));
  return [...cronScaleMarks, ...extraMarks];
}

function validatePromptSlots(value: unknown) {
  if (!Array.isArray(value)) return null;
  return promptSlotMarks.map((_, index) => (typeof value[index] === "string" ? value[index] : ""));
}

type CronModeCounts = Record<CronMode, number>;

function validateCronModeCounts(value: unknown): CronModeCounts | null {
  if (typeof value !== "object" || value === null) return null;
  return {
    DURA: "DURA" in value && typeof value.DURA === "number" ? value.DURA : 0,
    DATE: "DATE" in value && typeof value.DATE === "number" ? value.DATE : 0,
  };
}

function normalizeUiConfig(value: unknown, addMissingDefaults: boolean) {
  if (typeof value !== "string") return null;
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const configLines = lines.filter((line) => !/^--[a-z][a-z ]*--$/i.test(line) && !line.startsWith("#"));
  const parsed = configLines.map((line) => /^([a-z][a-z0-9-]*)\s*:\s*(.*)$/i.exec(line));
  if (parsed.some((entry) => !entry)) return null;
  const names = parsed.map((entry) => entry![1].toLowerCase());
  if (new Set(names).size !== names.length) return null;
  const normalizedValues = new Map<string, string>();
  for (const entry of parsed) {
    const name = entry![1].toLowerCase();
    const rawValue = entry![2].trim().toLowerCase();
    if (name === "theme-flydeck-active" || name === "theme-greyscale-active") {
      if (rawValue === "true") normalizedValues.set(name, "true");
      else if (rawValue === "" || rawValue === "false") normalizedValues.set(name, "");
      else return null;
      continue;
    }
    if (/^dialerinput-(nw|ne|sw|se)key$/.test(name) || /^dialerinput-rightkey[1-5]$/.test(name)) {
      if (rawValue === "") normalizedValues.set(name, "");
      else if (rawValue === "space") normalizedValues.set(name, "SPACE");
      else if (rawValue === "dialersize") normalizedValues.set(name, "DIALERSIZE");
      else if (rawValue === "time") normalizedValues.set(name, "TIME");
      else if (rawValue === "dwell") normalizedValues.set(name, "DWELL");
      else return null;
      continue;
    }
    if (name === "preferred-keyboard") {
      if (rawValue === "system" || rawValue === "mobile" || rawValue === "dialer") normalizedValues.set(name, rawValue);
      else return null;
      continue;
    }
    if (name === "dialerinput-defaultsize") {
      if (rawValue === "small" || rawValue === "medium" || rawValue === "large") normalizedValues.set(name, rawValue);
      else return null;
      continue;
    }
    if (name === "dialerinput-dwell") {
      if (rawValue === "off" || rawValue === "0.2" || rawValue === "0.3" || rawValue === "0.4") normalizedValues.set(name, rawValue);
      else if (rawValue === "0.5" || rawValue === "0.7") normalizedValues.set(name, "0.3");
      else return null;
      continue;
    }
    if (name === "preferred-hand") {
      if (rawValue === "right" || rawValue === "left") normalizedValues.set(name, rawValue);
      else return null;
      continue;
    }
    if (name === "theme") {
      if (rawValue === "flydeck" || rawValue === "greyscale") normalizedValues.set(name, rawValue.toUpperCase());
      else return null;
      continue;
    }
    if (!/^\d{1,3}$/.test(rawValue)) return null;
    const numericValue = Number(rawValue);
    if (numericValue < 1 || numericValue > 100) return null;
    normalizedValues.set(name, String(numericValue));
  }
  if (!normalizedValues.has("theme")) {
    const legacyFlydeck = normalizedValues.get("theme-flydeck-active") === "true";
    normalizedValues.set("theme", legacyFlydeck ? "FLYDECK" : "GREYSCALE");
  }
  normalizedValues.delete("theme-flydeck-active");
  normalizedValues.delete("theme-greyscale-active");
  normalizedValues.delete("preferred-hand");
  const migratingDwell = !normalizedValues.has("dialerinput-dwell");
  const defaultEntries = uiConfigDefaults
    .map((line) => /^([a-z][a-z0-9-]*)\s*:\s*(.*)$/i.exec(line))
    .filter((entry): entry is RegExpExecArray => entry !== null);
  for (const entry of defaultEntries) {
    const name = entry[1].toLowerCase();
    if (!normalizedValues.has(name)) {
      if (!addMissingDefaults) return null;
      normalizedValues.set(name, entry[2].trim());
    }
  }
  if (migratingDwell && normalizedValues.get("dialerinput-nekey") === "") {
    normalizedValues.set("dialerinput-nekey", "DWELL");
  }
  if ([...normalizedValues.keys()].some((name) => !defaultEntries.some((entry) => entry[1].toLowerCase() === name))) return null;
  const normalizedConfig = uiConfigDefaults.map((line) => {
    const entry = /^([a-z][a-z0-9-]*)\s*:\s*(.*)$/i.exec(line);
    if (!entry) return line;
    const name = entry[1].toLowerCase();
    return `${name} : ${normalizedValues.get(name) ?? ""}`.trimEnd();
  }).join("\n");
  return normalizedConfig;
}

function getConfigValue(config: string, name: string) {
  const entry = config.split("\n").map((line) => new RegExp(`^${name}\\s*:\\s*(.*)$`, "i").exec(line.trim())).find(Boolean);
  return entry?.[1].trim() ?? "";
}

function getCharacterDialCorners(config: string): CharacterDialCorners {
  const read = (corner: "nw" | "ne" | "sw" | "se") =>
    getConfigValue(config, `dialerinput-${corner}key`) as CharacterDialCornerAction;
  return { nw: read("nw"), ne: read("ne"), sw: read("sw"), se: read("se") };
}

function getCharacterDialRightButtons(config: string) {
  return Array.from({ length: 5 }, (_, index) =>
    getConfigValue(config, `dialerinput-rightkey${index + 1}`) as CharacterDialCornerAction);
}

function getPreferredKeyboard(config: string) {
  const value = getConfigValue(config, "preferred-keyboard");
  return value === "system" || value === "mobile" ? value : "dialer";
}

function getDialerDefaultSize(config: string) {
  const value = getConfigValue(config, "dialerinput-defaultsize");
  return value === "medium" || value === "large" ? value : "small";
}

function getDialerDefaultDwell(config: string) {
  const value = getConfigValue(config, "dialerinput-dwell");
  return value === "off" || value === "0.2" || value === "0.4" ? value : "0.3";
}

type UiNumericConfigName = "ui-font-size" | "ui-list-font-size" | "editor-fontsize-scale";

function getUiFontSize(config: string, name: UiNumericConfigName) {
  const entry = config.split("\n").map((line) => new RegExp(`^${name}\\s*:\\s*(\\d+)$`, "i").exec(line.trim())).find(Boolean);
  return entry ? Number(entry[1]) : 50;
}

function getUiFontScale(config: string, name: UiNumericConfigName) {
  const value = getUiFontSize(config, name);
  if (value <= 50) return 0.5 + ((value - 1) / 49) * 0.5;
  return 1 + ((value - 50) / 50);
}

function formatRangeRingDuration(totalHours: number) {
  if (totalHours < 24) return `${Math.round(totalHours)}h`;
  const days = Math.round(totalHours / 24);
  if (days < 60) return `${days}d`;
  if (days < 330) return `${Math.round(days / 30)}m`;
  return `${Math.max(1, Math.round(days / 365))}y`;
}

function formatDateParts(date: Date) {
  return {
    day: new Intl.DateTimeFormat("de-DE", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("de-DE", { month: "2-digit" }).format(date),
  };
}

function getHoursUntil(target: Date, now: Date) {
  return (target.getTime() - now.getTime()) / 3600000;
}

function formatClockHour(date: Date) {
  const hour = date.getHours();
  return String(hour === 0 ? 24 : hour);
}

function getDateScaleMarks(now: Date, maxHours: number) {
  const marks: CronScaleMark[] = [{ hours: 0, label: "now" }];
  const rangeEnd = now.getTime() + maxHours * 3600 * 1000;
  const nextFullHour = new Date(now);
  nextFullHour.setHours(nextFullHour.getHours() + 1, 0, 0, 0);
  const nextMonthStart = new Date(now);
  nextMonthStart.setDate(1);
  nextMonthStart.setHours(0, 0, 0, 0);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

  const hourCursor = new Date(nextFullHour);
  for (let index = 0; index < 12; index += 1) {
    marks.push({ hours: getHoursUntil(hourCursor, now), label: formatClockHour(hourCursor) });
    hourCursor.setHours(hourCursor.getHours() + 1);
  }

  const dayTimeMarks = [6, 9, 12, 18, 24];
  const dayCursor = new Date(now);
  dayCursor.setHours(0, 0, 0, 0);
  for (let dayOffset = 0; dayOffset <= 1; dayOffset += 1) {
    for (const hour of dayTimeMarks) {
      const markDate = new Date(dayCursor);
      markDate.setDate(dayCursor.getDate() + dayOffset);
      markDate.setHours(hour === 24 ? 0 : hour, 0, 0, 0);
      if (hour === 24) markDate.setDate(markDate.getDate() + 1);
      const hours = getHoursUntil(markDate, now);
      if (hours > 12) {
        marks.push({ hours, label: hour === 24 ? "24" : String(hour) });
      }
    }
  }
  for (let dayOffset = 2; dayOffset <= 7; dayOffset += 1) {
    const markDate = new Date(dayCursor);
    markDate.setDate(dayCursor.getDate() + dayOffset);
    markDate.setHours(12, 0, 0, 0);
    const hours = getHoursUntil(markDate, now);
    if (hours > 0) {
      marks.push({ hours, label: "12" });
    }
  }

  const dateCursor = new Date(now);
  dateCursor.setHours(0, 0, 0, 0);
  dateCursor.setDate(dateCursor.getDate() + 1);
  for (let dayOffset = 1; dayOffset <= 30; dayOffset += 1) {
    const markDate = new Date(dateCursor);
    markDate.setDate(dateCursor.getDate() + dayOffset - 1);
    const daysSinceNextMonthStart = Math.floor((markDate.getTime() - nextMonthStart.getTime()) / 86400000);
    if (daysSinceNextMonthStart >= 0 && (daysSinceNextMonthStart === 0 || daysSinceNextMonthStart % 3 !== 0)) continue;
    const hours = getHoursUntil(markDate, now);
    const dateParts = formatDateParts(markDate);
    marks.push({ hours, label: dateParts.day, subLabel: dateParts.month });
  }

  const cursor = new Date(nextMonthStart);

  while (cursor.getTime() <= rangeEnd) {
    const hours = (cursor.getTime() - now.getTime()) / 3600000;
    marks.push({
      hours,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const uniqueMarks = new Map<number, CronScaleMark>();
  for (const mark of marks) {
    if (mark.hours < 0 || mark.hours > maxHours) continue;
    uniqueMarks.set(Math.round(mark.hours * 60), mark);
  }

  return [...uniqueMarks.values()]
    .sort((a, b) => a.hours - b.hours);
}

function snapCronHoursToStep(hours: number, step: number, rangeHours: number, mode: CronMode, anchor: Date) {
  if (mode === "DATE") {
    if (step >= 24) {
      const rawTarget = new Date(anchor.getTime() + hours * 3600000);
      const noonCandidates = [-1, 0, 1].map((dayOffset) => {
        const candidate = new Date(rawTarget);
        candidate.setDate(rawTarget.getDate() + dayOffset);
        candidate.setHours(12, 0, 0, 0);
        return candidate.getTime();
      });
      const snappedTarget = noonCandidates.reduce((nearest, candidate) =>
        Math.abs(candidate - rawTarget.getTime()) < Math.abs(nearest - rawTarget.getTime()) ? candidate : nearest,
      );
      const snappedDateHours = (snappedTarget - anchor.getTime()) / 3600000;
      return Math.max(step, Math.min(rangeHours, snappedDateHours));
    }

    const rawTarget = new Date(anchor.getTime() + hours * 3600000);
    const snappedTarget = snapDateToLocalStep(rawTarget, step);
    const snappedDateHours = (snappedTarget.getTime() - anchor.getTime()) / 3600000;
    return Math.max(step, Math.min(rangeHours, snappedDateHours));
  }

  const snappedHours = Math.round(hours / step) * step;
  return Math.max(step, Math.min(rangeHours, snappedHours));
}

function getCronZoomHourMarks(startHours: number, rangeHours: number, mode: CronMode, anchor: Date): CronScaleMark[] {
  if (rangeHours > 24) {
    if (mode === "DATE") {
      const viewStart = new Date(anchor.getTime() + startHours * 3600000);
      const viewEndTime = anchor.getTime() + (startHours + rangeHours) * 3600000;
      const dayCursor = new Date(viewStart);
      dayCursor.setHours(12, 0, 0, 0);
      if (dayCursor.getTime() < viewStart.getTime()) dayCursor.setDate(dayCursor.getDate() + 1);

      const marks: CronScaleMark[] = [];
      while (dayCursor.getTime() <= viewEndTime) {
        const dateParts = formatDateParts(dayCursor);
        marks.push({
          hours: getHoursUntil(dayCursor, anchor),
          label: dateParts.day,
          subLabel: dateParts.month,
        });
        dayCursor.setDate(dayCursor.getDate() + 1);
      }
      return marks;
    }

    return Array.from({ length: 33 }, (_, index) => ({
      hours: startHours + index * 24,
      label: `${index === 16 ? 0 : index - 16}d`,
    }));
  }

  if (mode === "DATE") {
    const viewStart = new Date(anchor.getTime() + startHours * 3600000);
    const viewEndTime = anchor.getTime() + (startHours + rangeHours) * 3600000;
    const hourCursor = new Date(viewStart);
    hourCursor.setHours(hourCursor.getHours() + 1, 0, 0, 0);
    if (hourCursor.getTime() - 3600000 >= viewStart.getTime()) {
      hourCursor.setHours(hourCursor.getHours() - 1);
    }

    const marks: CronScaleMark[] = [];
    while (hourCursor.getTime() <= viewEndTime) {
      if (hourCursor.getTime() >= viewStart.getTime()) {
        marks.push({
          hours: getHoursUntil(hourCursor, anchor),
          label: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23" }).format(hourCursor),
        });
      }
      hourCursor.setHours(hourCursor.getHours() + 1);
    }
    return marks;
  }

  const halfRange = rangeHours / 2;
  return Array.from({ length: Math.round(rangeHours) + 1 }, (_, index) => {
    const relativeHours = index - halfRange;
    const hours = startHours + halfRange + relativeHours;
    return {
      hours,
      label: relativeHours === 0 ? "0h" : `${relativeHours > 0 ? "+" : ""}${relativeHours}h`,
    };
  });
}

function getCronRangeRingMarks(maxHours: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const value = (index / 12) * 100;
    return {
      value,
      label: formatRangeRingDuration(rangeSliderToHours(value, maxHours)),
    };
  });
}

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiConfig, setUiConfig] = useLocalStorage(uiConfigStorageKey, defaultUiConfig, (value) => normalizeUiConfig(value, true));
  const [uiConfigDraft, setUiConfigDraft] = useState(uiConfig);
  const [activeTab, setActiveTab] = useState<MainTab>("CHAT");
  const [chatSubTab, setChatSubTab] = useState<ChatSubTab>("PROM");
  const [activePromptSlot, setActivePromptSlot] = useState(0);
  const [promptSlots, setPromptSlots] = useLocalStorage(promptEditorStorageKey, defaultPromptSlots, validatePromptSlots);
  const [snippets, setSnippets] = useState<Snippet[]>(defaultSnippets);
  const [showAgentView, setShowAgentView] = useState(false);
  const [agentHistory, setAgentHistory] = useLocalStorage(agentHistoryStorageKey, defaultAgentHistory, (value) =>
    typeof value === "string" ? value : null,
  );
  const [chatRun, setChatRun] = useState<ChatSnapshot["activeRun"]>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [serverVital, setServerVital] = useState<boolean | null>(null);
  const [chatEffort, setChatEffort] = useState<ChatEffort>("FAST");
  const [chatModelTier, setChatModelTier] = useState<ChatModelTier>("ECON");
  const [snippetName, setSnippetName] = useState(() => snippets[1]?.name ?? "");
  const [snippetText, setSnippetText] = useState(() => snippets[1]?.text ?? "");
  const [selectedSnippetName, setSelectedSnippetName] = useState<string | null>(initiallySelectedSnippetName);
  const [armedDeleteSnippet, setArmedDeleteSnippet] = useState<string | null>(null);
  const [editingSnippetName, setEditingSnippetName] = useState<string | null>(initiallySelectedSnippetName);
  const [snippetBusy, setSnippetBusy] = useState(false);
  const [snippetError, setSnippetError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, string[]>>({});
  const [dataFiles, setDataFiles] = useState<DataFileSummary[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [linePage, setLinePage] = useState(0);
  const [dataText, setDataText] = useState("");
  const [dataNewFileName, setDataNewFileName] = useState("");
  const [armedDeleteFile, setArmedDeleteFile] = useState<string | null>(null);
  const [armedDeleteLine, setArmedDeleteLine] = useState<number | null>(null);
  const [dataBusy, setDataBusy] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [cronModeCounts, setCronModeCounts] = useLocalStorage<CronModeCounts>(
    cronModeCountsStorageKey,
    { DURA: 0, DATE: 0 },
    validateCronModeCounts,
  );
  const [cronMode, setCronMode] = useState<CronMode>(() => cronModeCounts.DATE > cronModeCounts.DURA ? "DATE" : "DURA");
  const [cronRangeValue, setCronRangeValue] = useState(0);
  const [cronHours, setCronHours] = useState(3);
  const [cronScaleMode, setCronScaleMode] = useState<CronScaleMode>(1);
  const [cronZoomMode, setCronZoomMode] = useState<CronZoomMode>("OFF");
  const [cronZoomCenterHours, setCronZoomCenterHours] = useState(3);
  const [cronTitle, setCronTitle] = useState("");
  const [cronTimers, setCronTimers] = useState<CronTimer[]>([]);
  const [selectedTimerId, setSelectedTimerId] = useState<string | null>(null);
  const [timerZoom, setTimerZoom] = useState<TimerZoom>("1w");
  const [cronBusy, setCronBusy] = useState(false);
  const [cronError, setCronError] = useState<string | null>(null);
  const [armedDeleteTimer, setArmedDeleteTimer] = useState<string | null>(null);
  const [cronDateAnchor, setCronDateAnchor] = useState(() => new Date());
  const chatRef = useRef<HTMLTextAreaElement>(null);
  const agentScrollTopRef = useRef(0);
  const lastAgentOutputRef = useRef("");
  const scrollAgentToEndRef = useRef(false);
  const dataRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLTextAreaElement>(null);
  const cronDialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = getConfigValue(uiConfig, "theme").toLowerCase() === "flydeck" ? "flydeck" : "greyscale";
  }, [uiConfig]);

  const activeRef = settingsOpen ? settingsRef : activeTab === "DATA" ? dataRef : chatRef;
  const chatText = promptSlots[activePromptSlot];
  const activeChatText = showAgentView && chatSubTab === "PROM" ? agentHistory : chatText;
  const chatBusy = chatRun?.status === "queued" || chatRun?.status === "running";

  useLayoutEffect(() => {
    if (activeTab !== "CHAT" || chatSubTab !== "PROM" || !showAgentView) return;
    const frame = requestAnimationFrame(() => {
      if (chatRef.current) chatRef.current.scrollTop = agentScrollTopRef.current;
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, chatSubTab, showAgentView]);

  useLayoutEffect(() => {
    if (activeTab !== "CHAT" || chatSubTab !== "PROM" || !showAgentView || !scrollAgentToEndRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (!chatRef.current) return;
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
      agentScrollTopRef.current = chatRef.current.scrollTop;
      scrollAgentToEndRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, agentHistory, chatSubTab, showAgentView]);

  const applyChatSnapshot = useCallback((snapshot: ChatSnapshot) => {
    const output = snapshot.activeRun?.output ?? "";
    if (output && output !== lastAgentOutputRef.current) scrollAgentToEndRef.current = true;
    lastAgentOutputRef.current = output;
    setChatRun(snapshot.activeRun);
    setAgentHistory(formatChatSnapshot(snapshot));
    setChatError(snapshot.activeRun?.error ?? null);
  }, [setAgentHistory]);

  useEffect(() => {
    let cancelled = false;
    void chatApi.read()
      .then((snapshot) => { if (!cancelled) applyChatSnapshot(snapshot); })
      .catch((error: unknown) => { if (!cancelled) setChatError(error instanceof Error ? error.message : "Chat could not be loaded"); });
    const events = new EventSource(chatApi.eventsUrl);
    events.addEventListener("snapshot", (event) => {
      if (!cancelled) applyChatSnapshot(JSON.parse((event as MessageEvent<string>).data) as ChatSnapshot);
    });
    events.onerror = () => {
      if (!cancelled) setChatError((current) => current ?? "Live connection interrupted; reconnecting …");
    };
    return () => {
      cancelled = true;
      events.close();
    };
  }, [applyChatSnapshot]);

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const health = await healthApi.read();
        if (!cancelled) setServerVital(health.status === "ok");
      } catch {
        if (!cancelled) setServerVital(false);
      }
    };
    void checkHealth();
    const interval = window.setInterval(() => void checkHealth(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      setDataBusy(true);
      try {
        const files = await dataApi.list();
        if (cancelled) return;
        setDataFiles(files);
        const names = files.filter((file) => file.valid).map((file) => file.name);
        setData(Object.fromEntries(names.map((name) => [name, []])));
        const firstFile = names[0] ?? "";
        setSelectedFile(firstFile);
        if (firstFile) {
          const file = await dataApi.read(firstFile);
          if (!cancelled) setData((current) => ({ ...current, [file.name]: file.entries }));
        }
      } catch (error) {
        if (!cancelled) setDataError(error instanceof Error ? error.message : "Data could not be loaded");
      } finally {
        if (!cancelled) setDataBusy(false);
      }
    }
    void loadInitialData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    cronApi.list()
      .then((timers) => { if (!cancelled) setCronTimers(timers); })
      .catch((error: unknown) => {
        if (!cancelled) setCronError(error instanceof Error ? error.message : "Timers could not be loaded");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    snippetsApi.list()
      .then((loadedSnippets) => {
        if (cancelled) return;
        setSnippets(loadedSnippets);
        const selected = loadedSnippets.find((snippet) => snippet.name === initiallySelectedSnippetName) ?? loadedSnippets[0];
        setEditingSnippetName(selected?.name ?? null);
        setSelectedSnippetName(selected?.name ?? null);
        setSnippetName(selected?.name ?? "");
        setSnippetText(selected?.text ?? "");
      })
      .catch((error: unknown) => {
        if (!cancelled) setSnippetError(error instanceof Error ? error.message : "Snippets could not be loaded");
      });
    return () => { cancelled = true; };
  }, []);

  function updateChatText(nextText: string | ((current: string) => string)) {
    setPromptSlots((currentSlots) =>
      currentSlots.map((slotText, index) => {
        if (index !== activePromptSlot) return slotText;
        return typeof nextText === "function" ? nextText(slotText) : nextText;
      }),
    );
  }

  const { moveCursor, selectWord, dictate, dictating } = useEditorControls(activeRef, (nextValue) => {
    if (settingsOpen) {
      setUiConfigDraft(nextValue);
    } else if (activeTab === "DATA") {
      setDataText(nextValue);
    } else if (chatSubTab === "SNIP") {
      setSnippetText(nextValue);
    } else if (showAgentView) {
      setAgentHistory(nextValue);
    } else {
      updateChatText(nextValue);
    }
  });

  function closeSettings() {
    const nextConfig = normalizeUiConfig(uiConfigDraft, false);
    if (nextConfig) setUiConfig(nextConfig);
    setUiConfigDraft(nextConfig ?? uiConfig);
    setSettingsOpen(false);
  }

  function toggleSettings() {
    if (settingsOpen) closeSettings();
    else {
      setUiConfigDraft(uiConfig);
      setSettingsOpen(true);
    }
  }

  async function sendPrompt() {
    if (chatSubTab === "SNIP") return;
    const promptText = chatText.trim();
    if (!promptText || chatBusy) return;
    setShowAgentView(true);
    setChatError(null);
    try {
      const run = await chatApi.start(promptText, crypto.randomUUID(), chatEffort, chatModelTier);
      setChatRun(run);
      applyChatSnapshot(await chatApi.read());
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Chat request failed");
    }
  }

  async function cancelChatRun() {
    if (!chatRun || !chatBusy) return;
    try {
      await chatApi.cancel(chatRun.id);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Chat could not be stopped");
    }
  }

  async function saveSnippet() {
    const nextName = snippetName.trim();
    if (!nextName) return;
    await runSnippetRequest(async () => {
      const updatesSelectedSnippet = editingSnippetName === nextName;
      const savedSnippet = updatesSelectedSnippet
        ? await snippetsApi.update(editingSnippetName, { text: snippetText })
        : await snippetsApi.create({ name: nextName, text: snippetText });
      setSnippets((current) => updatesSelectedSnippet
        ? current.map((snippet) => snippet.name === editingSnippetName ? savedSnippet : snippet)
        : [...current, savedSnippet]);
      setEditingSnippetName(savedSnippet.name);
      setSelectedSnippetName(savedSnippet.name);
      setArmedDeleteSnippet(null);
    });
  }

  function armDeleteSnippet(name: string) {
    setArmedDeleteSnippet((current) => (current === name ? null : name));
  }

  async function confirmDeleteSnippet(name: string) {
    if (armedDeleteSnippet !== name) {
      setArmedDeleteSnippet(null);
      setSnippetName(name);
      setSnippetText(snippets.find((snippet) => snippet.name === name)?.text ?? "");
      setEditingSnippetName(name);
      setSelectedSnippetName(name);
      return;
    }
    await runSnippetRequest(async () => {
      await snippetsApi.remove(name);
      setSnippets((current) => current.filter((snippet) => snippet.name !== name));
      if (editingSnippetName === name) {
        setSnippetName("");
        setSnippetText("");
        setEditingSnippetName(null);
      }
      if (selectedSnippetName === name) setSelectedSnippetName(null);
      setArmedDeleteSnippet(null);
    });
  }

  async function runSnippetRequest(action: () => Promise<void>) {
    await runRequest(action, {
      setBusy: setSnippetBusy,
      setError: setSnippetError,
      fallbackError: "Snippet request failed",
    });
  }

  function selectLine(index: number) {
    setArmedDeleteLine(null);
    setSelectedLine(index);
    setDataText(data[selectedFile][index]);
    requestAnimationFrame(() => dataRef.current?.focus());
  }

  async function saveDataLine() {
    if (!selectedFile) return;
    const lines = data[selectedFile] ?? [];
    await runDataRequest(async () => {
      const file = selectedLine === null
        ? await dataApi.appendEntry(selectedFile, { text: dataText })
        : await dataApi.replaceEntry(selectedFile, selectedLine, { text: dataText });
      setData((current) => ({ ...current, [file.name]: file.entries }));
      if (selectedLine === null) setLinePage(Math.floor(lines.length / dataPageSize));
      setSelectedLine(null);
      setDataText("");
    });
  }

  function startNewLine() {
    setArmedDeleteLine(null);
    setSelectedLine(null);
    setDataText("");
    requestAnimationFrame(() => dataRef.current?.focus());
  }

  function armDeleteFile(file: string) {
    if (dataFiles.find((entry) => entry.name === file)?.valid) {
      setSelectedFile(file);
      setLinePage(0);
      setSelectedLine(null);
      setDataText("");
    }
    setArmedDeleteFile((current) => (current === file ? null : file));
    setArmedDeleteLine(null);
  }

  function armDeleteLine(index: number) {
    setArmedDeleteLine((current) => (current === index ? null : index));
  }

  async function confirmDeleteLine(index: number) {
    if (armedDeleteLine !== index) {
      selectLine(index);
      return;
    }
    await runDataRequest(async () => {
      const file = await dataApi.removeEntry(selectedFile, index);
      setData((current) => ({ ...current, [file.name]: file.entries }));
      setArmedDeleteLine(null);
      setSelectedLine(null);
      setDataText("");
      setLinePage((current) => Math.min(current, Math.max(0, Math.ceil(file.entries.length / dataPageSize) - 1)));
    });
  }

  async function confirmDeleteFile(file: string) {
    if (armedDeleteFile !== file) {
      await selectFile(file);
      return;
    }
    await runDataRequest(async () => {
      await dataApi.remove(file);
      setArmedDeleteFile(null);
      await reloadData(file);
    });
  }

  async function selectFile(file: string) {
    setSelectedFile(file);
    setLinePage(0);
    setSelectedLine(null);
    setDataText("");
    setArmedDeleteFile(null);
    setArmedDeleteLine(null);
    setDataError(null);
    try {
      const loadedFile = await dataApi.read(file);
      setData((current) => ({ ...current, [loadedFile.name]: loadedFile.entries }));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Data request failed");
    }
  }

  async function reloadData(excludedFile?: string) {
    const files = await dataApi.list();
    const remainingFiles = files.filter((file) => file.name !== excludedFile);
    setDataFiles(remainingFiles);
    const names = remainingFiles.filter((file) => file.valid).map((file) => file.name);
    const nextSelectedFile = names.includes(selectedFile) ? selectedFile : names[0] ?? "";
    setData(Object.fromEntries(names.map((name) => [name, data[name] ?? []])));
    setSelectedFile(nextSelectedFile);
    if (nextSelectedFile) {
      const file = await dataApi.read(nextSelectedFile);
      setData((current) => ({ ...current, [file.name]: file.entries }));
    }
    setLinePage(0);
    setSelectedLine(null);
    setDataText("");
  }

  async function createDataFile(name: string, title: string) {
    return runDataRequest(async () => {
      const file = await dataApi.create({ name, title });
      setData((current) => ({ ...current, [file.name]: file.entries }));
      setDataFiles((current) => [...current.filter((entry) => entry.name !== file.name), {
        name: file.name,
        title: file.title,
        entryCount: file.entries.length,
        modifiedAt: file.modifiedAt,
        valid: true,
        error: null,
      }].sort((left, right) => left.name.localeCompare(right.name, "de")));
      setSelectedFile(file.name);
      setLinePage(0);
      setSelectedLine(null);
      setDataText("");
      setArmedDeleteFile(null);
      setArmedDeleteLine(null);
    });
  }

  async function runDataRequest(action: () => Promise<void>) {
    return runRequest(action, {
      setBusy: setDataBusy,
      setError: setDataError,
      fallbackError: "Data request failed",
    });
  }

  function updateCronAngle(clientX: number, clientY: number) {
    const dial = cronDialRef.current;
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const nextAngle = (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI + 90;
    const normalizedAngle = (nextAngle + 360) % 360;
    const nextHours = cronViewStartHours + cronViewRangeHours * (normalizedAngle / 360);
    setCronHours(snapCronHours(nextHours));
  }

  function updateCronScaleAngle(clientX: number, clientY: number) {
    const dial = cronDialRef.current;
    if (!dial) return;
    setCronZoomMode("OFF");
    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const nextAngle = (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI + 90;
    const normalizedAngle = (nextAngle + 360) % 360;
    setCronRangeValue((normalizedAngle / 360) * 100);
  }

  function beginCronDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateCronAngle(event.clientX, event.clientY);
  }

  function beginCronScaleDrag(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    anchorCronDateScale();
    updateCronScaleAngle(event.clientX, event.clientY);
  }

  function anchorCronDateScale() {
    if (cronMode === "DATE") {
      setCronDateAnchor(new Date());
    }
  }

  function selectCronMode(mode: CronMode) {
    if (mode === cronMode) return;

    setCronMode(mode);
    setCronModeCounts((currentCounts) => ({
      ...currentCounts,
      [mode]: currentCounts[mode] + 1,
    }));
    if (mode === "DATE") {
      setCronDateAnchor(new Date());
    }
  }

  function snapCronHours(hours: number, snap = cronSnapStep) {
    return snapCronHoursToStep(hours, snap, cronRangeHours, cronMode, cronDateAnchor);
  }

  function cycleCronZoom() {
    setCronZoomMode((current) => {
      const modes: CronZoomMode[] = cronRangeHours >= 90 * 24
        ? ["OFF", "32D", "24H", "12H"]
        : ["OFF", "24H", "12H"];
      const currentIndex = modes.indexOf(current);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      if (nextMode !== "OFF") setCronZoomCenterHours(cronHours);
      return nextMode;
    });
  }

  function armDeleteCronTimer(id: string) {
    setArmedDeleteTimer((current) => (current === id ? null : id));
  }

  async function confirmDeleteCronTimer(id: string) {
    if (armedDeleteTimer !== id) {
      setArmedDeleteTimer(null);
      selectCronTimer(id);
      return;
    }
    await runCronRequest(async () => {
      await cronApi.remove(id);
      setCronTimers((currentTimers) => currentTimers.filter((timer) => timer.id !== id));
      if (selectedTimerId === id) {
        setSelectedTimerId(null);
        setCronTitle("");
      }
      setArmedDeleteTimer(null);
    });
  }

  async function createCronTimer() {
    const title = cronTitle.trim();
    if (!title) return;
    const dueAt = cronMode === "DURA"
      ? new Date(Date.now() + cronHours * 3600000)
      : cronTargetDate;
    await runCronRequest(async () => {
      const matchingTimer = cronTimers.find((timer) => timer.title.toLowerCase() === title.toLowerCase());
      const timerToUpdate = selectedTimerId ?? matchingTimer?.id ?? null;
      const timer = timerToUpdate
        ? await cronApi.update(timerToUpdate, { dueAt: dueAt.toISOString() })
        : await cronApi.create({ title, dueAt: dueAt.toISOString() });
      setCronTimers((current) => timerToUpdate
        ? current.map((existing) => existing.id === timerToUpdate ? timer : existing)
        : [...current, timer]);
      setSelectedTimerId(null);
      setCronTitle("");
    });
  }

  function selectCronTimer(id: string) {
    const timer = cronTimers.find((current) => current.id === id);
    if (!timer || timer.status !== "active") return;
    const now = new Date();
    const remainingHours = (new Date(timer.dueAt).getTime() - now.getTime()) / 3600000;
    if (remainingHours <= 0) return;
    setSelectedTimerId(timer.id);
    setCronTitle(timer.title);
    setCronMode("DATE");
    setCronDateAnchor(now);
    setCronHours(remainingHours);
    const scaleMode: CronScaleMode = remainingHours <= cronMaxHours ? 1 : remainingHours <= cronMaxHours * 2 ? 2 : 5;
    setCronScaleMode(scaleMode);
    setCronRangeValue(hoursToRangeSliderValue(Math.max(12, remainingHours * 1.1), cronMaxHours * scaleMode));
    setCronZoomMode("OFF");
  }

  async function runCronRequest(action: () => Promise<void>) {
    await runRequest(action, {
      setBusy: setCronBusy,
      setError: setCronError,
      fallbackError: "Timer request failed",
    });
  }

  const trimmedSnippetName = snippetName.trim();
  const updatesSelectedSnippet = editingSnippetName === trimmedSnippetName;
  const selectedSnippet = editingSnippetName
    ? snippets.find((snippet) => snippet.name === editingSnippetName)
    : undefined;
  const snippetHasChanges = selectedSnippet
    ? trimmedSnippetName !== selectedSnippet.name || snippetText !== selectedSnippet.text
    : trimmedSnippetName.length > 0;
  const snippetNameExists = snippets.some((snippet) =>
    snippet.name.toLowerCase() === trimmedSnippetName.toLowerCase() &&
    !(updatesSelectedSnippet && snippet.name === editingSnippetName),
  );
  const canSendSnippet = chatSubTab !== "SNIP" || (
    !snippetBusy && trimmedSnippetName.length > 0 && !snippetNameExists && snippetHasChanges
  );
  const canSendPrompt = chatSubTab !== "PROM" || (!showAgentView && !chatBusy && chatText.trim().length > 0);
  const cronScaleMaxHours = cronMaxHours * cronScaleMode;
  const cronRangeHours = rangeSliderToHours(cronRangeValue, cronScaleMaxHours);
  const cronZoomRangeHours = cronZoomMode === "12H" ? 12 : cronZoomMode === "24H" ? 24 : cronZoomMode === "32D" ? 32 * 24 : cronRangeHours;
  const cronSnapStep = cronZoomMode === "12H" ? 5 / 60 : cronZoomMode === "24H" ? 15 / 60 : cronZoomMode === "32D" ? 24 : getCronSnapStepHours(cronRangeHours);
  const cronViewRangeHours = cronZoomRangeHours;
  const cronViewStartHours = cronZoomMode === "OFF" ? 0 : cronZoomCenterHours - cronZoomRangeHours / 2;
  const cronViewEndHours = cronViewStartHours + cronViewRangeHours;
  const cronFraction = Math.min(1, Math.max(0, (cronHours - cronViewStartHours) / cronViewRangeHours));
  const cronNeedleRotation = `rotate(${cronFraction * 360}deg)`;
  const cronScaleRotation = `rotate(${cronRangeValue * 3.6}deg)`;
  const cronTargetDateMs = Math.round((cronDateAnchor.getTime() + cronHours * 3600 * 1000) / 60000) * 60000;
  const cronTargetDate = new Date(cronTargetDateMs);
  const visibleCronMarks =
    cronZoomMode !== "OFF"
      ? getCronZoomHourMarks(cronViewStartHours, cronViewRangeHours, cronMode, cronDateAnchor)
      : cronMode === "DURA"
        ? getDurationScaleMarks(cronScaleMode).filter((mark) => mark.hours >= cronViewStartHours && mark.hours <= cronViewEndHours)
        : getDateScaleMarks(cronDateAnchor, cronScaleMaxHours).filter((mark) => mark.hours >= cronViewStartHours && mark.hours <= cronViewEndHours);
  const durationParts = getDurationParts(cronHours);
  const scaleParts = getDurationParts(cronRangeHours);
  const displayScaleParts = {
    ...scaleParts,
    days: scaleParts.years === 0 && scaleParts.months === 0 && scaleParts.days === 0 ? 1 : scaleParts.days,
  };
  const targetDateParts = {
    years: cronTargetDate.getFullYear() % 100,
    months: cronTargetDate.getMonth() + 1,
    days: cronTargetDate.getDate(),
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(cronTargetDate).slice(0, 2).toUpperCase(),
    hours: cronTargetDate.getHours(),
    minutes: cronTargetDate.getMinutes(),
  };
  const activeError = settingsOpen
    ? null
    : activeTab === "DATA"
      ? dataError
      : activeTab === "CRON"
        ? cronError
        : chatSubTab === "SNIP"
          ? snippetError ?? chatError
          : chatError;
  const statusMessage = activeError
    ? `Flydon: ${activeError}`
    : serverVital === false
      ? "Flydon is not responding"
      : chatBusy
        ? "Flydon is working ..."
        : chatRun?.status === "completed"
          ? chatRun.prompt.startsWith("/") || !chatRun.output.trim()
            ? "Last chat run status: completed"
            : "Flydon has responded · last chat run status: completed"
          : serverVital === true
            ? "Flydon seems vital"
            : "Contacting Flydon ...";
  const statusIsError = Boolean(activeError) || serverVital === false;
  const editorFontScale = getUiFontScale(uiConfig, "editor-fontsize-scale");
  const characterDialCorners = getCharacterDialCorners(uiConfig);
  const characterDialRightButtons = getCharacterDialRightButtons(uiConfig);
  const preferredKeyboard = getPreferredKeyboard(uiConfig);
  const dialerDefaultSize = getDialerDefaultSize(uiConfig);
  const dialerDefaultDwell = getDialerDefaultDwell(uiConfig);

  return (
    <main
      className="app-shell"
      style={{
        "--ui-font-size": `${getUiFontScale(uiConfig, "ui-font-size")}rem`,
        "--ui-list-font-size": `${getUiFontScale(uiConfig, "ui-list-font-size")}rem`,
        "--editor-font-size-medi": `${1.08 + 0.16 * editorFontScale}rem`,
        "--editor-font-size-big": `${1.08 + 0.52 * editorFontScale}rem`,
        "--agent-editor-font-size-medi": `${0.94 + 0.14 * editorFontScale}rem`,
        "--agent-editor-font-size-big": `${0.94 + 0.51 * editorFontScale}rem`,
      } as CSSProperties}
    >
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <span className="brand-mark">𐦍</span> Flydeck <span>Workspace Console</span>
          </p>
          <p className={`status-line ${statusIsError ? "error" : ""}`} role="status">{statusMessage}</p>
        </div>
        <div className="top-actions">
          <button className="icon-button reload" aria-label="Reload" title="Reload" onClick={() => {
            if (activeTab === "DATA") void runDataRequest(() => reloadData());
            else window.location.reload();
          }}>
            <RefreshCw size={23} />
          </button>
          <button className={`icon-button settings ${settingsOpen ? "active" : ""}`} aria-label="Settings" title="Settings" onClick={toggleSettings}>
            <Settings size={23} />
          </button>
        </div>
      </header>

      <div className="ui-font-scope">
      {settingsOpen ? (
        <SettingsWorkspace
          value={uiConfigDraft}
          textareaRef={settingsRef}
          onChange={setUiConfigDraft}
          onSelectWord={selectWord}
          onMoveCursor={moveCursor}
          onDictate={dictate}
          dictating={dictating}
          onSave={closeSettings}
          characterDialCorners={characterDialCorners}
          preferredKeyboard={preferredKeyboard}
          dialerDefaultSize={dialerDefaultSize}
          characterDialRightButtons={characterDialRightButtons}
          dialerDefaultDwell={dialerDefaultDwell}
        />
      ) : <>
      <nav className="main-tabs" aria-label="Main sections">
        {(["CHAT", "DATA", "CRON"] as const).map((tab) => (
          <button key={tab} className={tab === activeTab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab === "CHAT" && <Bot size={20} />}
            {tab === "DATA" && <Database size={20} />}
            {tab === "CRON" && <CalendarClock size={20} />}
            <span>{tab}</span>
          </button>
        ))}
      </nav>

      {activeTab === "CHAT" && (
        <ChatWorkspace
          subTab={chatSubTab}
          snippets={snippets}
          armedDeleteSnippet={armedDeleteSnippet}
          snippetName={snippetName}
          snippetText={snippetText}
          selectedSnippetName={selectedSnippetName}
          activePromptSlot={activePromptSlot}
          activeText={activeChatText}
          showAgentView={showAgentView}
          chatRef={chatRef}
          submitDisabled={!canSendSnippet || !canSendPrompt}
          agentBusy={chatBusy}
          chatEffort={chatEffort}
          chatModelTier={chatModelTier}
          characterDialCorners={characterDialCorners}
          preferredKeyboard={preferredKeyboard}
          dialerDefaultSize={dialerDefaultSize}
          characterDialRightButtons={characterDialRightButtons}
          dialerDefaultDwell={dialerDefaultDwell}
          onSubTabChange={setChatSubTab}
          onSnippetClick={(snippet) => {
            if (chatSubTab === "SNIP") {
              setSelectedSnippetName(snippet.name);
              void confirmDeleteSnippet(snippet.name);
            } else {
              setShowAgentView(false);
              updateChatText((current) => `${current}${snippet.text}\n`);
            }
          }}
          onArmDeleteSnippet={armDeleteSnippet}
          onSnippetNameChange={setSnippetName}
          onTextChange={(text) => {
            if (chatSubTab === "SNIP") setSnippetText(text);
            else if (showAgentView) setAgentHistory(text);
            else updateChatText(text);
          }}
          onPromptSlotChange={(index) => {
            setActivePromptSlot(index);
            setShowAgentView(false);
          }}
          onToggleAgentView={() => setShowAgentView((current) => !current)}
          onCancelAgent={() => void cancelChatRun()}
          onAgentScroll={(scrollTop) => { agentScrollTopRef.current = scrollTop; }}
          onCycleChatEffort={() => setChatEffort((current) => current === "FAST" ? "MEDI" : current === "MEDI" ? "DEEP" : "FAST")}
          onCycleChatModelTier={() => setChatModelTier((current) => current === "ECON" ? "MEDI" : current === "MEDI" ? "HIGH" : "ECON")}
          onSelectWord={selectWord}
          onMoveCursor={moveCursor}
          onClear={() => {
            if (chatSubTab === "SNIP") {
              setSnippetName("");
              setSnippetText("");
              setEditingSnippetName(null);
            } else if (showAgentView) setShowAgentView(false);
            else updateChatText("");
          }}
          onDictate={dictate}
          dictating={dictating}
          onSubmit={chatSubTab === "PROM" ? () => void sendPrompt() : () => void saveSnippet()}
        />
      )}

      {activeTab === "DATA" && (
        <DataWorkspace
          data={data}
          files={dataFiles}
          selectedFile={selectedFile}
          armedDeleteFile={armedDeleteFile}
          armedDeleteLine={armedDeleteLine}
          selectedLine={selectedLine}
          dataText={dataText}
          newFileName={dataNewFileName}
          dataRef={dataRef}
          page={linePage}
          onPageChange={setLinePage}
          onArmDelete={armDeleteFile}
          onSelectOrDelete={confirmDeleteFile}
          onSelectLine={selectLine}
          onArmDeleteLine={armDeleteLine}
          onSelectOrDeleteLine={(index) => void confirmDeleteLine(index)}
          onTextChange={setDataText}
          onNewFileNameChange={setDataNewFileName}
          onSelectWord={selectWord}
          onMoveCursor={moveCursor}
          onClear={startNewLine}
          onDictate={dictate}
          dictating={dictating}
          onSubmit={() => void saveDataLine()}
          onCreateFile={createDataFile}
          isBusy={dataBusy}
          characterDialCorners={characterDialCorners}
          preferredKeyboard={preferredKeyboard}
          dialerDefaultSize={dialerDefaultSize}
          characterDialRightButtons={characterDialRightButtons}
          dialerDefaultDwell={dialerDefaultDwell}
        />
      )}

      {activeTab === "CRON" && (
        <section className="workspace cron-panel" aria-label="Cron workspace">
          <TextInput
            aria-label="Cron job title"
            value={cronTitle}
            onChange={(event) => setCronTitle(event.target.value)}
            placeholder="Cron job title"
            readOnly={selectedTimerId !== null}
          />

          <div className="cron-stage">
            <div className="cron-corner-controls" aria-label="Cron controls">
              <button
                className="cron-corner-button scale-mode"
                type="button"
                onClick={() => setCronScaleMode((current) => current === 1 ? 2 : current === 2 ? 5 : 1)}
              >
                <Repeat2 size={16} /> SCAL {cronScaleMode}y
              </button>
              <button
                className="cron-corner-button send primary"
                type="button"
                onClick={() => void createCronTimer()}
                disabled={cronBusy || cronTitle.trim().length === 0 || (cronMode === "DATE" && cronTargetDate.getTime() <= Date.now())}
              >
                <Send size={20} /> SEND
              </button>
              <button
                className={`cron-corner-button magnify ${cronZoomMode !== "OFF" ? "active" : ""}`}
                type="button"
                onClick={cycleCronZoom}
                aria-label="Zoom time scale"
                title="Zoom time scale"
              >
                {cronZoomMode === "OFF" ? "ZOOM" : cronZoomMode.toLowerCase()} <Repeat2 size={16} />
              </button>
              <button
                className="cron-corner-button list-range"
                type="button"
                onClick={() => setTimerZoom((current) => current === "1w" ? "1m" : current === "1m" ? "1y" : current === "1y" ? "5y" : "1w")}
              >
                <Repeat2 size={16} /> RANG {timerZoom}
              </button>
            </div>
            <div
            ref={cronDialRef}
            className="cron-dial"
            style={cronDialGeometryStyle}
            aria-label="Set time value"
            role="slider"
            aria-valuemin={1}
            aria-valuemax={Math.round(cronRangeHours * 3600)}
            aria-valuenow={Math.round(cronHours * 3600)}
          >
            <div
              className="cron-time-ring"
              onPointerDown={beginCronDrag}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) updateCronAngle(event.clientX, event.clientY);
              }}
            />
            {visibleCronMarks.map((mark) => {
              const angle = ((mark.hours - cronViewStartHours) / cronViewRangeHours) * 360;
              const distanceToZero = mark.hours === 0 ? 90 : Math.min(angle, 360 - angle);
              const opacity = mark.hours === 0 ? 1 : Math.min(1, distanceToZero / 34);

              return (
                <RadialMark
                  key={`${mark.label}-${mark.subLabel ?? ""}-${mark.hours}`}
                  className="cron-label"
                  angle={angle}
                  radius={{ percent: 50, pixels: -cronTimeIndicatorDiameter / 2 }}
                  opacity={opacity}
                >
                  {mark.subLabel ? (
                    <>
                      <span>{mark.label}</span>
                      <span>{mark.subLabel}</span>
                    </>
                  ) : (
                    mark.label
                  )}
                </RadialMark>
              );
            })}
            <div className="cron-time-dot" style={{ transform: cronNeedleRotation }}>
              <span />
            </div>
            <div
              className="cron-scale-ring"
              onPointerDown={beginCronScaleDrag}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) updateCronScaleAngle(event.clientX, event.clientY);
              }}
            />
            <div
              className="cron-scale-dot"
              style={{ transform: cronScaleRotation }}
            >
              <span />
            </div>
            {getCronRangeRingMarks(cronScaleMaxHours).map((mark) => {
              const angle = mark.value * 3.6;

              return (
                <RadialMark key={`${mark.label}-${mark.value}`} className="cron-range-label" angle={angle} radius={{ pixels: cronScaleRadius }}>
                  {mark.label}
                </RadialMark>
              );
            })}
            <div
              className="cron-center cron-display"
            >
              <button
                className="cron-mode-touch"
                type="button"
                aria-label={`Switch from ${cronMode} to ${cronMode === "DURA" ? "DATE" : "DURA"}`}
                onClick={() => selectCronMode(cronMode === "DURA" ? "DATE" : "DURA")}
              />
              <div className="cron-mode-label">{cronMode}</div>
              <div className="display-row scale-row">
                <DisplayUnit value={displayScaleParts.years} unit="y" />
                <DisplayUnit value={displayScaleParts.months} unit="m" />
                <DisplayUnit value={displayScaleParts.days} unit="d" />
              </div>
              <div className="value-stack">
                {cronMode === "DATE" ? (
                  <>
                    <div className="display-row value-row">
                      <DisplayUnit value={targetDateParts.years} unit="y" />
                      <DisplayUnit value={targetDateParts.months} unit="m" />
                      <DisplayUnit value={targetDateParts.days} unit="d" />
                    </div>
                    <div className="display-row value-row time-row">
                      <DisplayClockTime hours={targetDateParts.hours} minutes={targetDateParts.minutes} />
                      <span className="weekday-display">{targetDateParts.weekday}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="display-row value-row">
                      <DisplayUnit value={durationParts.years} unit="y" />
                      <DisplayUnit value={durationParts.months} unit="m" />
                      <DisplayUnit value={durationParts.days} unit="d" />
                    </div>
                    <div className="display-row value-row time-row">
                      <DisplayClockTime hours={durationParts.hours} minutes={durationParts.minutes} />
                    </div>
                  </>
                )}
              </div>
              <div className="cron-logo">Digi Craft</div>
            </div>
          </div>
          </div>
          <TimerList timers={cronTimers} armedTimer={armedDeleteTimer} selectedTimer={selectedTimerId} onSelectOrDelete={(id) => void confirmDeleteCronTimer(id)} onArmDelete={armDeleteCronTimer} zoom={timerZoom} />
        </section>
      )}
      </>}
      </div>
    </main>
  );
}
