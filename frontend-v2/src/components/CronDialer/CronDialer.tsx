import { useRef, useState, type CSSProperties } from "react";

import {
  Dialer,
  signedAngleDelta,
  type DialerCenterButtonProps,
  type DialerProps,
} from "../Dialer";
import type { DialTangentialInput } from "../DialSurface";
import styles from "./CronDialer.module.css";

type OwnedDialerProps =
  | "bottomLeftLabel"
  | "bottomRightLabel"
  | "centerButtonProps"
  | "centerLabel"
  | "getInnerAngle"
  | "innerAngle"
  | "innerBackground"
  | "innerScale"
  | "interactionMode"
  | "onInnerInput"
  | "onOuterInput"
  | "outerAngle"
  | "outerBackground"
  | "outerScale"
  | "topLeftLabel"
  | "topRightLabel";

export type CronDialerProps = Omit<DialerProps, OwnedDialerProps> & {
  centerFontSize?: string;
  centerFontWeight?: string;
  centerButtonProps?: DialerCenterButtonProps;
  initialTime?: Date;
  innerDiscColor?: string;
  innerGradientEnd?: string;
  innerGradientStart?: string;
  innerScaleFontSize?: string;
  innerScaleFontWeight?: string;
  onTimeChange?: (time: Date) => void;
  outerDiscColor?: string;
  outerGradientEnd?: string;
  outerGradientStart?: string;
  outerScaleFontSize?: string;
  outerScaleFontWeight?: string;
};

const hourMinutes = 60;
const yearMinutes = 365 * 24 * hourMinutes;
const maximumRangeMinutes = 5 * yearMinutes;
const minimumZoomAngle = 0;
const maximumZoomAngle = 270;
const zoomMarks = [
  { minutes: hourMinutes, label: "1h" },
  { minutes: 24 * hourMinutes, label: "1d" },
  { minutes: 7 * 24 * hourMinutes, label: "7d" },
  { minutes: 30 * 24 * hourMinutes, label: "1m" },
  { minutes: yearMinutes, label: "1y" },
  { minutes: maximumRangeMinutes, label: "5y" },
] as const;
const zoomStepAngle = maximumZoomAngle / (zoomMarks.length - 1);
const timeIntervals = [
  5, 10, 15, 30, 60, 2 * 60, 3 * 60, 6 * 60, 12 * 60,
  24 * 60, 2 * 24 * 60, 7 * 24 * 60, 14 * 24 * 60,
  30 * 24 * 60, 3 * 30 * 24 * 60, 6 * 30 * 24 * 60, yearMinutes,
] as const;

type MarkStyle = CSSProperties & {
  "--cron-mark-angle": string;
  "--cron-label-angle": string;
};

type SegmentStyle = CSSProperties & {
  "--cron-segment-angle": string;
  "--cron-segment-rotation": string;
};

type GradientStyle = CSSProperties & {
  "--cron-gradient-end"?: string;
  "--cron-gradient-start"?: string;
};

export function CronDialer({
  className,
  centerFontSize,
  centerFontWeight,
  centerButtonProps,
  initialTime = new Date(),
  innerDiscColor,
  innerGradientEnd,
  innerGradientStart,
  innerScaleFontSize,
  innerScaleFontWeight,
  onTimeChange,
  outerDiscColor,
  outerGradientEnd,
  outerGradientStart,
  outerScaleFontSize,
  outerScaleFontWeight,
  width,
  ...dialerProps
}: CronDialerProps) {
  const [zoomAngle, setZoomAngle] = useState(minimumZoomAngle);
  const [timeAngle, setTimeAngle] = useState(0);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const selectedTimeRef = useRef(selectedTime);
  const lastTimeAngle = useRef<number | null>(null);
  const rangeMinutes = cronRangeMinutes(zoomAngle);
  const timeSegment = cronTimeSegment(selectedTime, rangeMinutes);
  const classes = className ? `${styles.root} ${className}` : styles.root;

  function changeTime(input: DialTangentialInput) {
    if (input.phase === "press" || lastTimeAngle.current === null) {
      lastTimeAngle.current = input.angle;
      setTimeAngle(input.angle);
      return;
    }
    const angleDelta = signedAngleDelta(lastTimeAngle.current, input.angle);
    const nextTime = new Date(
      selectedTimeRef.current.getTime()
      + angleDelta * rangeMinutes / 360 * 60_000,
    );
    lastTimeAngle.current = input.angle;
    selectedTimeRef.current = nextTime;
    setSelectedTime(nextTime);
    setTimeAngle(input.angle);
    onTimeChange?.(nextTime);
    if (input.phase === "release") lastTimeAngle.current = null;
  }

  return (
    <Dialer
      {...dialerProps}
      aria-label="Cron dialer"
      bottomLeftLabel="RANGE"
      bottomRightLabel="ZOOM"
      centerButtonProps={{
        ...centerButtonProps,
        fontSize: centerFontSize ?? centerButtonProps?.fontSize,
        fontWeight: centerFontWeight ?? centerButtonProps?.fontWeight,
      }}
      centerLabel={formatCronTime(selectedTime)}
      className={classes}
      getInnerAngle={(angle) => Math.max(
        minimumZoomAngle,
        Math.min(maximumZoomAngle, angle),
      )}
      innerAngle={zoomAngle}
      innerBackground={innerDiscColor}
      interactionMode="wheel"
      outerAngle={timeAngle}
      outerBackground={outerDiscColor}
      topLeftLabel="SCALE"
      topRightLabel="SEND"
      width={width === undefined || width === "inherit" ? "100%" : width}
      onInnerInput={(input) => setZoomAngle(input.angle)}
      onOuterInput={changeTime}
      innerScale={({ innerAngle }) => (
        <span
          className={styles.scale}
          aria-hidden="true"
          style={{
            fontSize: innerScaleFontSize,
            fontWeight: innerScaleFontWeight,
          }}
        >
          <span
            className={styles.zoomSegments}
            style={gradientStyle(innerGradientStart, innerGradientEnd)}
          />
          {zoomMarks.map((mark, index) => {
            const angle = index * zoomStepAngle;
            return (
              <span
                className={styles.mark}
                key={mark.label}
                style={markStyle(angle, innerAngle)}
              >
                <span className={styles.tick} />
                <span className={styles.label}>{mark.label}</span>
              </span>
            );
          })}
        </span>
      )}
      outerScale={({ outerAngle }) => (
        <span
          className={styles.scale}
          aria-hidden="true"
          style={{
            fontSize: outerScaleFontSize,
            fontWeight: outerScaleFontWeight,
          }}
        >
          {timeSegment && (
            <span
              className={styles.timeSegment}
              style={{
                ...segmentStyle(
                  outerAngle + timeSegment.startAngle,
                  timeSegment.sweepAngle,
                ),
                ...gradientStyle(outerGradientStart, outerGradientEnd),
              }}
            />
          )}
          {cronTimeMarks(selectedTime, rangeMinutes).map((mark) => {
            const angle = outerAngle
              + (mark.time.getTime() - selectedTime.getTime())
              / 60_000 / rangeMinutes * 360;
            return (
              <span
                className={styles.mark}
                key={mark.time.toISOString()}
                style={markStyle(angle, outerAngle)}
              >
                <span className={styles.tick} />
                {mark.label && (
                  <span className={styles.label}>{mark.label}</span>
                )}
              </span>
            );
          })}
        </span>
      )}
    />
  );
}

export function cronRangeMinutes(angle: number) {
  const clampedAngle = Math.max(minimumZoomAngle, Math.min(maximumZoomAngle, angle));
  const segmentIndex = Math.min(
    zoomMarks.length - 2,
    Math.floor(clampedAngle / zoomStepAngle),
  );
  const start = zoomMarks[segmentIndex].minutes;
  const end = zoomMarks[segmentIndex + 1].minutes;
  const progress = (clampedAngle - segmentIndex * zoomStepAngle) / zoomStepAngle;
  return start * (end / start) ** progress;
}

export function cronZoomAngle(minutes: number) {
  const clampedMinutes = Math.max(hourMinutes, Math.min(maximumRangeMinutes, minutes));
  const upperIndex = zoomMarks.findIndex((mark) => clampedMinutes <= mark.minutes);
  if (upperIndex <= 0) return minimumZoomAngle;
  const start = zoomMarks[upperIndex - 1].minutes;
  const end = zoomMarks[upperIndex].minutes;
  const progress = Math.log(clampedMinutes / start) / Math.log(end / start);
  return (upperIndex - 1 + progress) * zoomStepAngle;
}

export function cronTimeMarks(selectedTime: Date, rangeMinutes: number) {
  const interval = timeIntervals.find((candidate) => (
    rangeMinutes / candidate <= 14
  )) ?? timeIntervals.at(-1)!;
  const selectedMinutes = selectedTime.getTime() / 60_000;
  const first = Math.ceil((selectedMinutes - rangeMinutes / 2) / interval) * interval;
  const last = selectedMinutes + rangeMinutes / 2;
  const marks = [];
  const labels = new Set<string>();
  for (let minutes = first; minutes <= last; minutes += interval) {
    const time = new Date(minutes * 60_000);
    const label = formatCronMark(time, rangeMinutes);
    marks.push({ time, label: labels.has(label) ? "" : label });
    labels.add(label);
  }
  return marks;
}

export function cronTimeSegment(
  selectedTime: Date,
  rangeMinutes: number,
) {
  const period = rangeMinutes >= yearMinutes
    ? "year"
    : rangeMinutes >= 30 * 24 * 60
      ? "month"
      : rangeMinutes >= 7 * 24 * 60
        ? "week"
        : rangeMinutes >= 24 * 60
          ? "day"
          : "hour";

  const start = currentPeriodStart(selectedTime, period);
  const end = periodEnd(start, period);
  const startMinutes = (start.getTime() - selectedTime.getTime()) / 60_000;
  const endMinutes = (end.getTime() - selectedTime.getTime()) / 60_000;
  return {
    end,
    period,
    start,
    startAngle: startMinutes / rangeMinutes * 360,
    sweepAngle: (endMinutes - startMinutes) / rangeMinutes * 360,
  };
}

export function formatCronTime(time: Date) {
  const year = String(time.getFullYear()).slice(-3).padStart(3, "0");
  const month = String(time.getMonth() + 1).padStart(2, "0");
  const day = String(time.getDate()).padStart(2, "0");
  const hour = String(time.getHours()).padStart(2, "0");
  const minute = String(time.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} ${hour}:${minute}`;
}

function formatCronMark(time: Date, rangeMinutes: number) {
  if (rangeMinutes <= 24 * 60) {
    return `${String(time.getHours()).padStart(2, "0")}:${String(
      time.getMinutes(),
    ).padStart(2, "0")}`;
  }
  if (rangeMinutes <= yearMinutes) {
    return `${String(time.getDate()).padStart(2, "0")}.${String(
      time.getMonth() + 1,
    ).padStart(2, "0")}`;
  }
  return String(time.getFullYear());
}

function markStyle(angle: number, selectionAngle: number): MarkStyle {
  return {
    "--cron-mark-angle": `${angle}deg`,
    "--cron-label-angle": `${selectionAngle - angle}deg`,
  };
}

function segmentStyle(rotation: number, sweepAngle: number): SegmentStyle {
  return {
    "--cron-segment-angle": `${sweepAngle}deg`,
    "--cron-segment-rotation": `${rotation}deg`,
  };
}

function gradientStyle(start?: string, end?: string): GradientStyle {
  return {
    "--cron-gradient-end": end,
    "--cron-gradient-start": start,
  };
}

function currentPeriodStart(
  time: Date,
  period: "hour" | "day" | "week" | "month" | "year",
) {
  if (period === "year") return new Date(time.getFullYear(), 0, 1);
  if (period === "month") return new Date(time.getFullYear(), time.getMonth(), 1);
  if (period === "hour") {
    return new Date(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      time.getHours(),
    );
  }
  const start = new Date(time.getFullYear(), time.getMonth(), time.getDate());
  if (period === "week") {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  }
  return start;
}

function periodEnd(
  start: Date,
  period: "hour" | "day" | "week" | "month" | "year",
) {
  if (period === "year") return new Date(start.getFullYear() + 1, 0, 1);
  if (period === "month") return new Date(start.getFullYear(), start.getMonth() + 1, 1);
  if (period === "hour") {
    return new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      start.getHours() + 1,
    );
  }
  const days = period === "week" ? 7 : 1;
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + days);
}
