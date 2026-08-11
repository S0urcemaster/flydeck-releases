import { useState, type CSSProperties } from "react";

import {
  Dialer,
  type DialerCenterButtonProps,
  type DialerProps,
  type DialerSelectionPhase,
} from "../Dialer";
import type { DialTangentialInput } from "../DialSurface";
import styles from "./CronDialer.module.css";

type CronDialerOwnedProps =
  | "bottomLeftLabel"
  | "bottomRightLabel"
  | "centerButtonProps"
  | "centerLabel"
  | "getInnerAngle"
  | "getValue"
  | "initialInnerAngle"
  | "innerScale"
  | "innerMarker"
  | "onInnerInput"
  | "onOuterInput"
  | "onValue"
  | "outerAngle"
  | "initialOuterAngle"
  | "outerScale"
  | "outerMarker"
  | "selectionPhase"
  | "topLeftLabel"
  | "topRightLabel";

export type CronDialerProps = Omit<DialerProps<number>, CronDialerOwnedProps> & {
  centerButtonProps?: DialerCenterButtonProps;
  onInnerInput?: (input: DialTangentialInput) => void;
  onOuterInput?: (input: DialTangentialInput) => void;
  onValue?: (durationMinutes: number) => void;
  selectionPhase?: DialerSelectionPhase;
};

export type CronDialerScaleProps = {
  innerFontSize?: string;
  innerPointerColor?: string;
  innerTextColor?: string;
  outerFontSize?: string;
  outerPointerColor?: string;
  outerTextColor?: string;
};

const deadZoneDegrees = 5;
const scaleStartAngle = deadZoneDegrees / 2;
const scaleEndAngle = 360 - deadZoneDegrees / 2;
const minimumRangeMinutes = 60;
const maximumRangeMinutes = 5 * 365 * 24 * 60;

const cronScaleMarks = [
  { minutes: 60, label: "1h" },
  { minutes: 6 * 60, label: "6h" },
  { minutes: 24 * 60, label: "24h" },
  { minutes: 7 * 24 * 60, label: "7d" },
  { minutes: 30 * 24 * 60, label: "1m" },
  { minutes: 3 * 30 * 24 * 60, label: "3m" },
  { minutes: 365 * 24 * 60, label: "1y" },
  { minutes: 2 * 365 * 24 * 60, label: "2y" },
  { minutes: maximumRangeMinutes, label: "5y" },
] as const;

const cronOuterIntervals = [
  5, 10, 15, 30,
  60, 2 * 60, 3 * 60, 6 * 60, 12 * 60,
  24 * 60, 2 * 24 * 60, 3 * 24 * 60, 7 * 24 * 60, 14 * 24 * 60,
  30 * 24 * 60, 2 * 30 * 24 * 60, 3 * 30 * 24 * 60,
  6 * 30 * 24 * 60, 365 * 24 * 60,
] as const;

type CronMarkStyle = CSSProperties & {
  "--cron-mark-angle": string;
  "--cron-mark-opacity"?: number;
};

type CronScaleStyle = CSSProperties & {
  "--cron-pointer-color"?: string;
  "--cron-scale-color"?: string;
  "--cron-scale-font-size"?: string;
};

type CronPointerSide = "clockwise" | "counterclockwise";

export function CronDialer(allProps: CronDialerProps & CronDialerScaleProps) {
  const {
    centerButtonProps,
    innerFontSize,
    innerPointerColor,
    innerTextColor,
    onInnerInput,
    onOuterInput,
    onValue,
    outerFontSize,
    outerPointerColor,
    outerTextColor,
    selectionPhase = "release",
    ...props
  } = allProps;
  const [mode, setMode] = useState<"DATE" | "DURA">("DURA");
  const [referenceTime] = useState(() => Date.now());
  const [scaleAngle, setScaleAngle] = useState(scaleStartAngle);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [outerPointerAngle, setOuterPointerAngle] = useState(0);
  const [outerPointerAnchor, setOuterPointerAnchor] = useState({
    angle: 0,
    rangeMinutes: minimumRangeMinutes,
    side: "clockwise" as CronPointerSide,
  });
  const { onClick: onCenterClick, ...restCenterButtonProps } = centerButtonProps ?? {};

  function handleInnerInput(input: DialTangentialInput) {
    const nextRangeMinutes = getCronScaleMinutes(input.angle);
    const nextPointerAngle = getCronZoomedOuterPointer(
      outerPointerAnchor.angle,
      outerPointerAnchor.rangeMinutes,
      nextRangeMinutes,
      outerPointerAnchor.side,
    );
    setOuterPointerAngle(nextPointerAngle);
    setScaleAngle(input.angle);
    onInnerInput?.(input);
  }

  function handleOuterInput(input: DialTangentialInput) {
    const nextMinutes = getCronSelectedDurationMinutes(scaleAngle, input.angle);
    setOuterPointerAngle(input.angle);
    setSelectedMinutes(nextMinutes);
    setOuterPointerAnchor({
      angle: input.angle,
      rangeMinutes: getCronScaleMinutes(scaleAngle),
      side: input.angle > 180 ? "counterclockwise" : "clockwise",
    });
    onOuterInput?.(input);
    if (input.phase === selectionPhase) onValue?.(nextMinutes);
  }

  return (
    <Dialer<number>
      {...props}
      aria-label="Cron dialer"
      topLeftLabel="SCALE"
      topRightLabel="SEND"
      bottomLeftLabel="RANGE"
      bottomRightLabel="ZOOM"
      centerLabel={(
        <span className={styles.centerValue}>
          {mode === "DURA"
            ? formatCronDurationDisplay(selectedMinutes)
            : formatCronDate(new Date(referenceTime + selectedMinutes * 60_000))}
        </span>
      )}
      centerButtonProps={{
        ...restCenterButtonProps,
        "aria-label": `Show ${mode === "DURA" ? "date" : "duration"}`,
        onClick: (event) => {
          onCenterClick?.(event);
          setMode((current) => current === "DURA" ? "DATE" : "DURA");
        },
      }}
      getInnerAngle={getCronScaleAngle}
      initialInnerAngle={scaleStartAngle}
      outerAngle={outerPointerAngle}
      onInnerInput={handleInnerInput}
      onOuterInput={handleOuterInput}
      innerScale={() => (
        <span
          className={styles.scale}
          aria-hidden="true"
          style={scaleStyle(innerTextColor, innerFontSize)}
        >
          {cronScaleMarks.map((mark) => (
            <span
              className={styles.mark}
              key={mark.label}
              style={markStyle(getCronScaleMarkAngle(mark.minutes))}
            >
              <span className={styles.tick} />
              <span className={styles.label}>{mark.label}</span>
            </span>
          ))}
        </span>
      )}
      outerScale={({ innerAngle, outerAngle }) => (
        <span
          className={styles.scale}
          aria-hidden="true"
          style={scaleStyle(outerTextColor, outerFontSize)}
        >
          {getCronOuterScaleMarks(
            innerAngle,
            outerAngle,
            selectedMinutes,
            outerPointerAnchor.side,
          ).map((mark) => (
            <span
              className={styles.mark}
              key={mark.minutes}
              style={markStyle(mark.angle, mark.opacity)}
            >
              <span className={styles.tick} />
              <span className={styles.label}>{mark.label}</span>
            </span>
          ))}
        </span>
      )}
      innerMarker={() => (
        <span className={styles.pointer} style={pointerStyle(innerPointerColor)} />
      )}
      outerMarker={() => (
        <span className={styles.pointer} style={pointerStyle(outerPointerColor)} />
      )}
    />
  );
}

export function getCronScaleAngle(angle: number): number {
  const normalizedAngle = normalizeAngle(angle);
  if (normalizedAngle >= scaleStartAngle && normalizedAngle <= scaleEndAngle) {
    return normalizedAngle;
  }
  return normalizedAngle > 180 ? scaleEndAngle : scaleStartAngle;
}

export function getCronScaleMinutes(angle: number): number {
  const progress = (getCronScaleAngle(angle) - scaleStartAngle)
    / (scaleEndAngle - scaleStartAngle);
  return minimumRangeMinutes
    * (maximumRangeMinutes / minimumRangeMinutes) ** progress;
}

function getCronScaleMarkAngle(minutes: number): number {
  const progress = Math.log(minutes / minimumRangeMinutes)
    / Math.log(maximumRangeMinutes / minimumRangeMinutes);
  return scaleStartAngle + progress * (scaleEndAngle - scaleStartAngle);
}

export function getCronSelectedDurationMinutes(innerAngle: number, outerAngle: number) {
  const normalizedAngle = normalizeAngle(outerAngle);
  const distanceFromNorth = Math.min(normalizedAngle, 360 - normalizedAngle);
  return getCronScaleMinutes(innerAngle) * distanceFromNorth / 360;
}

export function getCronZoomedOuterPointer(
  anchorAngle: number,
  anchorRangeMinutes: number,
  nextRangeMinutes: number,
  pointerSide: CronPointerSide,
) {
  const anchorDistanceFromNorth = Math.min(anchorAngle, 360 - anchorAngle);
  const unconstrainedDistance = anchorDistanceFromNorth
    * anchorRangeMinutes / nextRangeMinutes;
  const distanceFromNorth = Math.min(
    anchorDistanceFromNorth,
    unconstrainedDistance,
  );
  const angle = pointerSide === "clockwise"
    ? distanceFromNorth
    : 360 - distanceFromNorth;
  return normalizeAngle(angle);
}

export function getCronOuterScaleMarks(
  innerAngle: number,
  outerAngle: number,
  selectedMinutes: number,
  pointerSide: CronPointerSide = outerAngle > 180
    ? "counterclockwise"
    : "clockwise",
) {
  const rangeMinutes = getCronScaleMinutes(innerAngle);
  const intervalMinutes = getCronOuterIntervalMinutes(rangeMinutes);
  const firstIndex = Math.max(
    0,
    Math.floor((selectedMinutes - rangeMinutes) / intervalMinutes),
  );
  const lastIndex = Math.ceil(
    (selectedMinutes + rangeMinutes) / intervalMinutes,
  );

  return Array.from(
    { length: lastIndex - firstIndex + 1 },
    (_, offset) => (firstIndex + offset) * intervalMinutes,
  ).map((minutes) => {
    const angle = getCronOuterMarkAngle(
      minutes,
      rangeMinutes,
      outerAngle,
      selectedMinutes,
      pointerSide,
    );
    return {
      angle,
      minutes,
      label: formatCronDuration(minutes),
      opacity: getCronMarkOpacity(angle),
    };
  }).filter((mark) => mark.angle >= 0 && mark.angle <= 360);
}

export function getCronOuterMarkAngle(
  minutes: number,
  rangeMinutes: number,
  pointerAngle: number,
  selectedMinutes: number,
  pointerSide: CronPointerSide = pointerAngle > 180
    ? "counterclockwise"
    : "clockwise",
) {
  const direction = pointerSide === "clockwise" ? 1 : -1;
  return pointerAngle
    + direction * (minutes - selectedMinutes) / rangeMinutes * 360;
}

export function getCronOuterIntervalMinutes(rangeMinutes: number) {
  const targetInterval = rangeMinutes / 12;
  return cronOuterIntervals.reduce((closest, interval) => (
    Math.abs(Math.log(interval / targetInterval))
      < Math.abs(Math.log(closest / targetInterval))
      ? interval
      : closest
  ));
}

function getCronMarkOpacity(angle: number) {
  const fadeAngle = 18;
  const distanceToNorth = Math.min(Math.abs(angle), Math.abs(360 - angle));
  return Math.min(1, distanceToNorth / fadeAngle);
}

function markStyle(angle: number, opacity?: number): CronMarkStyle {
  return {
    "--cron-mark-angle": `${angle}deg`,
    "--cron-mark-opacity": opacity,
  };
}

function scaleStyle(color?: string, fontSize?: string): CronScaleStyle | undefined {
  if (!color && !fontSize) return undefined;
  return {
    "--cron-scale-color": color,
    "--cron-scale-font-size": fontSize,
  };
}

function pointerStyle(color?: string): CronScaleStyle | undefined {
  return color ? { "--cron-pointer-color": color } : undefined;
}

function normalizeAngle(angle: number) {
  return (angle % 360 + 360) % 360;
}

function formatCronDuration(minutes: number) {
  const roundedMinutes = Math.round(minutes);
  if (roundedMinutes < 60) return `${roundedMinutes}m`;

  const hours = roundedMinutes / 60;
  if (hours < 24) {
    return Number.isInteger(hours)
      ? `${hours}h`
      : `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
  }

  const days = hours / 24;
  if (days < 60) {
    return Number.isInteger(days)
      ? `${days}d`
      : `${Math.floor(days)}d${Math.round((days % 1) * 24)}h`;
  }

  const months = days / 30;
  if (months < 12) return `${Math.round(months)}m`;

  const years = days / 365;
  return Number.isInteger(years) ? `${years}y` : `${years.toFixed(1)}y`;
}

export function formatCronDurationDisplay(minutes: number) {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const minutesPerDay = 24 * 60;
  const minutesPerMonth = 30 * minutesPerDay;
  const minutesPerYear = 365 * minutesPerDay;
  const years = Math.floor(totalMinutes / minutesPerYear);
  const afterYears = totalMinutes % minutesPerYear;
  const months = Math.floor(afterYears / minutesPerMonth);
  const afterMonths = afterYears % minutesPerMonth;
  const days = Math.floor(afterMonths / minutesPerDay);
  const afterDays = afterMonths % minutesPerDay;
  const hours = Math.floor(afterDays / 60);
  const remainingMinutes = afterDays % 60;

  return `${threeDigits(years)}.${twoDigits(months)}.${twoDigits(days)} ${twoDigits(hours)}:${twoDigits(remainingMinutes)}`;
}

export function formatCronDate(date: Date) {
  return `${threeDigits(date.getFullYear() % 1_000)}.${twoDigits(date.getMonth() + 1)}.${twoDigits(date.getDate())} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function threeDigits(value: number) {
  return String(value).padStart(3, "0");
}
