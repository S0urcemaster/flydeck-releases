import type { CSSProperties } from "react";
import { cronMaxHours, rangeSliderToHours } from "./model";

export type CronMode = "DURA" | "DATE";
export type CronZoomMode = "OFF" | "32D" | "24H" | "12H";
export type CronScaleMode = 1 | 2 | 5;
export type CronScaleMark = { hours: number; label: string; subLabel?: string };

export const cronTimeIndicatorDiameter = 56;
export const cronScaleRadius = 120;

export const cronDialGeometryStyle = {
  "--cron-center-diameter": "200px",
  "--cron-time-indicator-diameter": `${cronTimeIndicatorDiameter}px`,
  "--cron-scale-indicator-diameter": "40px",
  "--cron-scale-radius": `${cronScaleRadius}px`,
  "--cron-scale-diameter": `${cronScaleRadius * 2}px`,
  "--cron-scale-touch-radius": "152px",
  "--cron-scale-touch-diameter": "304px",
} as CSSProperties;

const baseDurationMarks: CronScaleMark[] = [
  ...Array.from({ length: 13 }, (_, hours) => ({ hours, label: `${hours}h` })),
  { hours: 15, label: "15h" },
  { hours: 18, label: "18h" },
  { hours: 21, label: "21h" },
  { hours: 24, label: "24h" },
  { hours: 36, label: "36h" },
  ...Array.from({ length: 13 }, (_, index) => {
    const days = index + 2;
    return { hours: days * 24, label: `${days}d` };
  }),
  { hours: 504, label: "21d" },
  ...Array.from({ length: 11 }, (_, index) => {
    const months = index + 1;
    return { hours: months * 720, label: `${months}m` };
  }),
  { hours: 8760, label: "1y" },
];

export function getDurationScaleMarks(mode: CronScaleMode): CronScaleMark[] {
  if (mode === 1) return baseDurationMarks;
  const maximumMonth = mode * 12;
  const extraMarks = Array.from({ length: maximumMonth - 12 }, (_, index) => index + 13)
    .filter((month) => month % 3 === 0)
    .map((month) => ({
      hours: month === maximumMonth ? cronMaxHours * mode : month * 720,
      label: month % 12 === 0 ? `${month / 12}y` : `${month}m`,
    }));
  return [...baseDurationMarks, ...extraMarks];
}

export function getCronRangeRingMarks(maxHours: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const value = (index / 12) * 100;
    return {
      value,
      label: formatRangeRingDuration(rangeSliderToHours(value, maxHours)),
    };
  });
}

function formatRangeRingDuration(totalHours: number) {
  if (totalHours < 24) return `${Math.round(totalHours)}h`;
  const days = Math.round(totalHours / 24);
  if (days < 60) return `${days}d`;
  if (days < 330) return `${Math.round(days / 30)}m`;
  return `${Math.max(1, Math.round(days / 365))}y`;
}
