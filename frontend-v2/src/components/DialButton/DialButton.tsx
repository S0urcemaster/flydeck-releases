import { useEffect, useRef, useState } from "react";

import { PressButton, type PressButtonProps } from "../PressButton";
import styles from "./DialButton.module.css";

export const DIAL_BUTTON_QUEUE_FONT_SIZE = "0.55em";
export const DIAL_BUTTON_TIMEOUT = 500;

export type DialButtonProps = Omit<
  PressButtonProps,
  "children" | "onClick" | "preserveFocus"
> & {
  dialTimeout?: number;
  queueGap?: string;
  onDial: (value: string, replacePrevious: boolean) => void;
  onDialComplete?: () => void;
  options: readonly string[];
};

export function DialButton({
  componentName = "DialButton",
  dialTimeout = DIAL_BUTTON_TIMEOUT,
  queueGap,
  onDial,
  onDialComplete,
  options,
  pressed,
  ...buttonProps
}: DialButtonProps) {
  const optionIndex = useRef(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dialActive, setDialActive] = useState(false);
  const normalizedOptions = [...new Set(options)];
  const primary = normalizedOptions[0] ?? "";
  const alternatives = normalizedOptions.slice(1).join(" ");

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  function dial() {
    if (normalizedOptions.length === 0) return;
    const replacePrevious = timer.current !== null;
    if (timer.current !== null) clearTimeout(timer.current);
    optionIndex.current = replacePrevious
      ? (optionIndex.current + 1) % normalizedOptions.length
      : 0;
    setDialActive(true);
    onDial(normalizedOptions[optionIndex.current], replacePrevious);
    timer.current = setTimeout(() => {
      timer.current = null;
      optionIndex.current = -1;
      setDialActive(false);
      onDialComplete?.();
    }, Math.max(0, dialTimeout));
  }

  return (
    <PressButton
      {...buttonProps}
      aria-label={buttonProps["aria-label"]
        ?? `Dial ${normalizedOptions.join(" ")}`}
      componentName={componentName}
      preserveFocus
      pressed={dialActive ? true : pressed}
      onClick={dial}
    >
      <span className={styles.content} style={{ gap: queueGap }}>
        <span>{primary}</span>
        {alternatives && (
          <small style={{ fontSize: DIAL_BUTTON_QUEUE_FONT_SIZE }}>
            {alternatives}
          </small>
        )}
      </span>
    </PressButton>
  );
}
