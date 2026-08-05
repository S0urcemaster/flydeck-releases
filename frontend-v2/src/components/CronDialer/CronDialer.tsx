import {
  Dialer,
  type DialerProps,
} from "../Dialer";
import type { CSSProperties } from "react";
import styles from "./CronDialer.module.css";

type CronDialerOwnedProps =
  | "bottomLeftLabel"
  | "bottomRightLabel"
  | "centerLabel"
  | "getInnerAngle"
  | "initialInnerAngle"
  | "innerMarker"
  | "innerScale"
  | "topLeftLabel"
  | "topRightLabel";

export type CronDialerProps = Omit<DialerProps, CronDialerOwnedProps>;

export const cronDurationMarks = [
  "12h",
  "24h",
  "2d",
  "3d",
  "5d",
  "7d",
  "14d",
  "21d",
  "1m",
  "2m",
  "3m",
  "6m",
  "9m",
  "1y",
  "2y",
  "3y",
  "4y",
  "5y",
] as const;

const cronDurationAngleStep = 360 / (cronDurationMarks.length + 1);

type CronMarkStyle = CSSProperties & {
  "--cron-mark-angle": string;
};

export function CronDialer(props: CronDialerProps) {
  return (
    <Dialer
      {...props}
      aria-label="Cron dialer"
      topLeftLabel="SCALE"
      topRightLabel="SEND"
      bottomLeftLabel="RANGE"
      bottomRightLabel="ZOOM"
      centerLabel="SET"
      getInnerAngle={getCronDurationAngle}
      initialInnerAngle={getCronDurationMarkAngle(0)}
      innerScale={({ innerAngle }) => (
        <span className={styles.durationScale} aria-hidden="true">
          {cronDurationMarks.map((label, index) => {
            const angle = getCronDurationMarkAngle(index);
            const isSelected = angle === innerAngle;

            return (
              <span
                className={styles.durationMark}
                data-selected={isSelected || undefined}
                key={label}
                style={{
                  "--cron-mark-angle": `${angle}deg`,
                } as CronMarkStyle}
              >
                <span className={styles.tick} />
                <span className={styles.markLabel}>{label}</span>
              </span>
            );
          })}
        </span>
      )}
      innerMarker={() => <span className={styles.illuminatedPointer} />}
    />
  );
}

export function getCronDurationAngle(angle: number): number {
  const normalizedAngle = (angle % 360 + 360) % 360;
  const markNumber = Math.round(normalizedAngle / cronDurationAngleStep);

  if (markNumber <= 0) {
    return getCronDurationMarkAngle(0);
  }

  if (markNumber > cronDurationMarks.length) {
    return getCronDurationMarkAngle(cronDurationMarks.length - 1);
  }

  return getCronDurationMarkAngle(markNumber - 1);
}

export function getCronDurationMarkAngle(index: number): number {
  return (index + 1) * cronDurationAngleStep;
}
