import { useEffect, useRef } from "react";

import { PressButton, type PressButtonProps } from "../PressButton";

export type DialButtonProps = Omit<
  PressButtonProps,
  "children" | "onClick" | "preserveFocus"
> & {
  dialTimeout?: number;
  onDial: (value: string, replacePrevious: boolean) => void;
  onDialComplete?: () => void;
  options: readonly string[];
};

export function DialButton({
  componentName = "DialButton",
  dialTimeout = 800,
  onDial,
  onDialComplete,
  options,
  ...buttonProps
}: DialButtonProps) {
  const optionIndex = useRef(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    onDial(normalizedOptions[optionIndex.current], replacePrevious);
    timer.current = setTimeout(() => {
      timer.current = null;
      optionIndex.current = -1;
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
      onClick={dial}
    >
      {primary}{alternatives && <> <small>{alternatives}</small></>}
    </PressButton>
  );
}
