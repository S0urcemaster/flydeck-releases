import { PressButton, type PressButtonProps } from "../PressButton";
import styles from "./CycleButton.module.css";

export const CYCLE_BUTTON_QUEUE_FONT_SIZE = "0.55em";

export type CycleButtonProps = Omit<
  PressButtonProps,
  "children" | "onChange" | "onClick"
> & {
  onChange: (value: string) => void;
  onPress?: (value: string) => void;
  options: readonly string[];
  value: string;
};

export function CycleButton({
  componentName = "CycleButton",
  onChange,
  onPress,
  options,
  value,
  ...buttonProps
}: CycleButtonProps) {
  const normalizedOptions = uniqueOptions(options);
  const selectedIndex = Math.max(0, normalizedOptions.indexOf(value));
  const selected = normalizedOptions[selectedIndex] ?? "";
  const remaining = normalizedOptions.length < 2
    ? []
    : Array.from(
        { length: normalizedOptions.length - 1 },
        (_, offset) => normalizedOptions[
          (selectedIndex + offset + 1) % normalizedOptions.length
        ],
      );
  const alternatives = remaining.join(" ");
  const label = alternatives ? `${selected} ${alternatives}` : selected;

  return (
    <PressButton
      {...buttonProps}
      aria-label={buttonProps["aria-label"] ?? label}
      componentName={componentName}
      preserveFocus
      onClick={() => {
        if (normalizedOptions.length === 0) return;
        onPress?.(selected);
        onChange(normalizedOptions[(selectedIndex + 1) % normalizedOptions.length]);
      }}
    >
      <span className={styles.content}>
        <span>{selected}</span>
        {alternatives && (
          <small style={{ fontSize: CYCLE_BUTTON_QUEUE_FONT_SIZE }}>
            {alternatives}
          </small>
        )}
      </span>
    </PressButton>
  );
}

function uniqueOptions(options: readonly string[]) {
  return [...new Set(options)];
}
