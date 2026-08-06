import { useState } from "react";

import {
  Dialer,
  type DialerCenterButtonProps,
  type DialerProps,
} from "../Dialer";
import styles from "./ColorDialer.module.css";

type ColorMode = "SAT" | "LIGHT" | "ALPHA";

type HslaColor = {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
};

type ColorDialerOwnedProps =
  | "bottomLeftLabel"
  | "bottomRightLabel"
  | "centerButtonProps"
  | "centerLabel"
  | "getValue"
  | "initialInnerAngle"
  | "initialOuterAngle"
  | "innerAngle"
  | "innerMarker"
  | "innerScale"
  | "onInnerInput"
  | "onOuterInput"
  | "outerAngle"
  | "outerMarker"
  | "outerScale"
  | "showCornerButtons"
  | "topLeftLabel"
  | "topRightLabel";

export type ColorDialerProps = Omit<
  DialerProps<string>,
  ColorDialerOwnedProps | "onValue"
> & {
  centerButtonProps?: DialerCenterButtonProps;
  onValue?: (color: string) => void;
  value?: string;
};

const defaultColor: HslaColor = {
  hue: 0,
  saturation: 80,
  lightness: 50,
  alpha: 1,
};

const modes: ColorMode[] = ["SAT", "LIGHT", "ALPHA"];

export function ColorDialer({
  centerButtonProps,
  className,
  onValue,
  value,
  ...props
}: ColorDialerProps) {
  const [dialerState, setDialerState] = useState(() => ({
    color: parseHexColor(value) ?? defaultColor,
    sourceValue: value,
  }));
  const [mode, setMode] = useState<ColorMode>("SAT");
  if (value !== dialerState.sourceValue) {
    setDialerState({
      color: parseHexColor(value) ?? dialerState.color,
      sourceValue: value,
    });
  }
  const color = dialerState.color;
  const classes = className ? `${styles.root} ${className}` : styles.root;
  const modeValue = getModeValue(color, mode);
  const hexColor = hslaToHex(color);
  const {
    onClick: onCenterClick,
    ...restCenterButtonProps
  } = centerButtonProps ?? {};

  function updateColor(nextColor: HslaColor) {
    const nextValue = hslaToHex(nextColor);
    setDialerState({ color: nextColor, sourceValue: nextValue });
    onValue?.(nextValue);
  }

  return (
    <Dialer<string>
      {...props}
      className={classes}
      aria-label="Color dialer"
      topLeftLabel=""
      topRightLabel=""
      bottomLeftLabel=""
      bottomRightLabel=""
      showCornerButtons={false}
      innerAngle={color.hue}
      outerAngle={percentToAngle(modeValue)}
      centerLabel={null}
      centerButtonProps={{
        ...restCenterButtonProps,
        "aria-label": `Change color setting; current setting ${mode}`,
        background: createTransparencyPreview(hexColor),
        onClick: (event) => {
          setMode((current) => modes[(modes.indexOf(current) + 1) % modes.length]);
          onCenterClick?.(event);
        },
      }}
      onInnerInput={(input) => updateColor({
        ...color,
        hue: Math.round(normalizeAngle(input.angle)) % 360,
      })}
      onOuterInput={(input) => updateColor(
        setModeValue(color, mode, angleToPercent(input.angle)),
      )}
      innerScale={() => (
        <span
          className={styles.scale}
          style={{
            background:
              "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          }}
        />
      )}
      outerScale={() => (
        <span
          className={styles.scale}
          style={{ background: createModeGradient(color, mode) }}
        />
      )}
      innerMarker={() => <span className={styles.radialPointer} />}
      outerMarker={() => <span className={styles.radialPointer} />}
    />
  );
}

export function parseHexColor(value: string | undefined): HslaColor | null {
  if (!value || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) return null;
  const red = Number.parseInt(value.slice(1, 3), 16) / 255;
  const green = Number.parseInt(value.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(value.slice(5, 7), 16) / 255;
  const alpha = value.length === 9
    ? Number.parseInt(value.slice(7, 9), 16) / 255
    : 1;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const difference = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;

  if (difference !== 0) {
    if (max === red) hue = ((green - blue) / difference) % 6;
    else if (max === green) hue = (blue - red) / difference + 2;
    else hue = (red - green) / difference + 4;
    hue = normalizeAngle(hue * 60);
  }

  const saturation = difference === 0
    ? 0
    : difference / (1 - Math.abs(2 * lightness - 1));
  return {
    hue,
    saturation: saturation * 100,
    lightness: lightness * 100,
    alpha,
  };
}

export function hslaToHex(color: HslaColor): string {
  const saturation = clamp(color.saturation, 0, 100) / 100;
  const lightness = clamp(color.lightness, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSection = normalizeAngle(color.hue) / 60;
  const intermediate = chroma * (1 - Math.abs(hueSection % 2 - 1));
  const [redPart, greenPart, bluePart] = hueSection < 1 ? [chroma, intermediate, 0]
    : hueSection < 2 ? [intermediate, chroma, 0]
      : hueSection < 3 ? [0, chroma, intermediate]
        : hueSection < 4 ? [0, intermediate, chroma]
          : hueSection < 5 ? [intermediate, 0, chroma]
            : [chroma, 0, intermediate];
  const match = lightness - chroma / 2;
  return `#${toHex(redPart + match)}${toHex(greenPart + match)}${toHex(bluePart + match)}${toHex(clamp(color.alpha, 0, 1))}`;
}

export function createModeGradient(color: HslaColor, mode: ColorMode): string {
  const stops = Array.from({ length: 13 }, (_, index) => {
    const percent = index / 12 * 100;
    const nextColor = setModeValue(color, mode, percent);
    return `${toHsla(nextColor)} ${index * 30}deg`;
  });
  const gradient = `conic-gradient(${stops.join(", ")})`;
  return mode === "ALPHA"
    ? `${gradient}, ${checkerboard}`
    : gradient;
}

function getModeValue(color: HslaColor, mode: ColorMode) {
  if (mode === "SAT") return color.saturation;
  if (mode === "LIGHT") return color.lightness;
  return color.alpha * 100;
}

function setModeValue(
  color: HslaColor,
  mode: ColorMode,
  percent: number,
): HslaColor {
  if (mode === "SAT") return { ...color, saturation: percent };
  if (mode === "LIGHT") return { ...color, lightness: percent };
  return { ...color, alpha: percent / 100 };
}

function angleToPercent(angle: number) {
  return Math.round(normalizeAngle(angle) / 360 * 100);
}

function percentToAngle(percent: number) {
  return clamp(percent, 0, 100) / 100 * 359.999;
}

function toHsla(color: HslaColor) {
  return `hsl(${color.hue} ${color.saturation}% ${color.lightness}% / ${color.alpha})`;
}

function createTransparencyPreview(color: string) {
  return `linear-gradient(${color}, ${color}), ${checkerboard}`;
}

const checkerboard = "conic-gradient(#b8b8b8 25%, #fff 0 50%, #b8b8b8 0 75%, #fff 0) 0 / 12px 12px";

function toHex(value: number) {
  return Math.round(value * 255).toString(16).padStart(2, "0");
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAngle(angle: number): number {
  return (angle % 360 + 360) % 360;
}
