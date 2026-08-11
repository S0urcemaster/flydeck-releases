import { ArrowBigUp, ArrowBigUpDash } from "lucide-react";
import type { ReactNode } from "react";

import {
  LongPressButton,
  type LongPressButtonProps,
} from "../LongPressButton";
import styles from "./ShiftButton.module.css";

export type ShiftButtonMode = "lower" | "upper" | "symbols";

export type ShiftButtonProps = Omit<
  LongPressButtonProps,
  "aria-label" | "children" | "onLongPress" | "onPress" | "selected"
> & {
  label?: string;
  locked: boolean;
  mode: ShiftButtonMode;
  onCycle: () => void;
  onLock: () => void;
  symbol?: ReactNode;
};

export function ShiftButton({
  componentName = "ShiftButton",
  label,
  locked,
  mode,
  onCycle,
  onLock,
  symbol,
  ...buttonProps
}: ShiftButtonProps) {
  const ShiftIcon = mode === "symbols" ? ArrowBigUpDash : ArrowBigUp;
  return (
    <LongPressButton
      {...buttonProps}
      aria-label={label ?? shiftButtonLabel(mode, locked)}
      componentName={componentName}
      data-shift-locked={locked || undefined}
      data-shift-mode={mode}
      selected={locked || mode !== "lower"}
      onLongPress={onLock}
      onPress={onCycle}
    >
      {symbol
        ? <span>{symbol}</span>
        : <ShiftIcon className={styles.symbol} aria-hidden="true" />}
    </LongPressButton>
  );
}

function shiftButtonLabel(mode: ShiftButtonMode, locked: boolean) {
  if (locked) return `Shift locked in ${mode} layout; press to unlock`;
  if (mode === "lower") return "Shift; press for uppercase, hold to lock";
  if (mode === "upper") return "Shift uppercase; press for symbols, hold to lock";
  return "Shift symbols; press for lowercase, hold to lock";
}
