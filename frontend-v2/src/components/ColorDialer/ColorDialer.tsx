import {
  Dialer,
  type DialerCenterButtonProps,
  type DialerProps,
  type DialerSelectionPhase,
} from "../Dialer";
import styles from "./ColorDialer.module.css";

type ColorDialerOwnedProps =
  | "bottomLeftLabel"
  | "bottomRightLabel"
  | "centerButtonProps"
  | "centerLabel"
  | "getValue"
  | "innerMarker"
  | "innerScale"
  | "outerMarker"
  | "outerScale"
  | "selectionPhase"
  | "topLeftLabel"
  | "topRightLabel";

export type ColorDialerProps = Omit<
  DialerProps<string>,
  ColorDialerOwnedProps | "onValue"
> & {
  centerButtonProps?: DialerCenterButtonProps;
  onValue?: (color: string) => void;
  selectionPhase?: DialerSelectionPhase;
};

export function ColorDialer({
  centerButtonProps,
  onValue,
  selectionPhase = "release",
  ...props
}: ColorDialerProps) {
  return (
    <Dialer<string>
      {...props}
      aria-label="Color dialer"
      topLeftLabel="HUE"
      topRightLabel="USE"
      bottomLeftLabel="COARSE"
      bottomRightLabel="DETAIL"
      centerLabel={({ innerAngle, outerAngle }) => {
        const color = colorFromDialAngles(innerAngle, outerAngle);
        return `${color.slice(4, color.indexOf(" "))}°`;
      }}
      centerButtonProps={({ innerAngle, outerAngle }) => ({
        ...centerButtonProps,
        background: colorFromDialAngles(innerAngle, outerAngle),
      })}
      selectionPhase={selectionPhase}
      getValue={({ innerAngle, outerAngle }) =>
        colorFromDialAngles(innerAngle, outerAngle)}
      onValue={onValue}
      innerScale={() => (
        <span
          className={styles.scale}
          style={{
            background:
              "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          }}
        />
      )}
      outerScale={({ innerAngle }) => (
        <span
          className={styles.scale}
          style={{ background: createDetailGradient(innerAngle) }}
        />
      )}
      innerMarker={() => <span className={styles.radialPointer} />}
      outerMarker={() => <span className={styles.radialPointer} />}
    />
  );
}

export function colorFromDialAngles(
  innerAngle: number,
  outerAngle: number,
): string {
  const detailOffset = (normalizeAngle(outerAngle) / 360 * 60) - 30;
  const hue = Math.round(normalizeAngle(innerAngle + detailOffset));
  return `hsl(${hue} 80% 50%)`;
}

export function createDetailGradient(innerAngle: number): string {
  const stops = Array.from({ length: 7 }, (_, index) => {
    const dialAngle = index * 60;
    const detailOffset = (dialAngle / 360 * 60) - 30;
    const hue = Math.round(normalizeAngle(innerAngle + detailOffset));
    const color = `hsl(${hue} 80% 50%)`;
    return `${color} ${dialAngle}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function normalizeAngle(angle: number): number {
  return (angle % 360 + 360) % 360;
}
