import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Delete } from "lucide-react";

import { PressButton, type PressButtonProps } from "../PressButton";
import styles from "./BackspaceButton.module.css";

export type BackspaceButtonProps = Omit<
  PressButtonProps,
  "aria-label" | "children" | "onClick" | "preserveFocus"
> & {
  onPress: () => void;
  repeatDelay?: number;
  repeatInterval?: number;
};

export function BackspaceButton({
  componentName = "BackspaceButton",
  disabled,
  onBlur,
  onKeyDown,
  onKeyUp,
  onLostPointerCapture,
  onPointerCancel,
  onPointerDown,
  onPointerUp,
  onPress,
  repeatDelay = 400,
  repeatInterval = 75,
  ...buttonProps
}: BackspaceButtonProps) {
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => stopRepeat, []);

  function startRepeat() {
    if (disabled || delayTimer.current !== null || intervalTimer.current !== null) {
      return;
    }
    delayTimer.current = setTimeout(() => {
      delayTimer.current = null;
      onPress();
      intervalTimer.current = setInterval(onPress, Math.max(1, repeatInterval));
    }, Math.max(0, repeatDelay));
  }

  function stopRepeat() {
    if (delayTimer.current !== null) clearTimeout(delayTimer.current);
    if (intervalTimer.current !== null) clearInterval(intervalTimer.current);
    delayTimer.current = null;
    intervalTimer.current = null;
  }

  return (
    <PressButton
      {...buttonProps}
      aria-label="Backspace"
      componentName={componentName}
      disabled={disabled}
      preserveFocus
      onClick={onPress}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        onPointerDown?.(event);
        if (!event.defaultPrevented && event.isPrimary && event.button === 0) {
          startRepeat();
        }
      }}
      onPointerUp={(event: PointerEvent<HTMLButtonElement>) => {
        stopRepeat();
        onPointerUp?.(event);
      }}
      onPointerCancel={(event: PointerEvent<HTMLButtonElement>) => {
        stopRepeat();
        onPointerCancel?.(event);
      }}
      onLostPointerCapture={(event: PointerEvent<HTMLButtonElement>) => {
        stopRepeat();
        onLostPointerCapture?.(event);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented
          && !event.repeat
          && (event.key === "Enter" || event.key === " ")) {
          startRepeat();
        }
      }}
      onKeyUp={(event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter" || event.key === " ") stopRepeat();
        onKeyUp?.(event);
      }}
      onBlur={(event) => {
        stopRepeat();
        onBlur?.(event);
      }}
    >
      <Delete className={styles.symbol} aria-hidden="true" />
    </PressButton>
  );
}
