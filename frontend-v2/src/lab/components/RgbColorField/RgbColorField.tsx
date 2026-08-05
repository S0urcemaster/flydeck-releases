import { NumberInput } from "../NumberInput";
import styles from "./RgbColorField.module.css";

export type RgbColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function RgbColorField({
  label,
  value,
  onChange,
}: RgbColorFieldProps) {
  const rgba = hexToRgba(value);

  function update(channel: keyof Rgba, channelValue: number) {
    onChange(rgbaToHex({ ...rgba, [channel]: clampChannel(channelValue) }));
  }

  return (
    <fieldset className={styles.root}>
      <legend>{label}</legend>
      <span className={styles.swatch} aria-label={`${label} preview`}>
        <span style={{ backgroundColor: value }} />
      </span>
      {(["r", "g", "b", "a"] as const).map((channel) => (
        <div className={styles.channel} key={channel}>
          <span>{channel === "a" ? "α" : channel.toUpperCase()}</span>
          <NumberInput
            label={`${label} ${channel === "a" ? "alpha" : channel.toUpperCase()}`}
            min={0}
            max={255}
            value={rgba[channel]}
            onChange={(nextValue) => update(channel, nextValue)}
          />
        </div>
      ))}
      <output>{value.toUpperCase()}</output>
    </fieldset>
  );
}

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type Rgba = Rgb & {
  a: number;
};

export function hexToRgb(value: string): Rgb {
  const normalized = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)
    ? value.slice(1, 7)
    : "000000";
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function hexToRgba(value: string): Rgba {
  const rgb = hexToRgb(value);
  const alpha = /^#[0-9a-f]{8}$/i.test(value)
    ? Number.parseInt(value.slice(7, 9), 16)
    : 255;
  return { ...rgb, a: alpha };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function rgbaToHex({ r, g, b, a }: Rgba): string {
  return `${rgbToHex({ r, g, b })}${clampChannel(a).toString(16).padStart(2, "0")}`;
}

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(255, Math.max(0, Math.round(value)));
}
