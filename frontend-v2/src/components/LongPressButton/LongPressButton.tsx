import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { Button, type ButtonProps } from "../Button";

export type LongPressButtonProps = Omit<
  ButtonProps,
  | "onBlur"
  | "onClick"
  | "onKeyDown"
  | "onKeyUp"
  | "onLostPointerCapture"
  | "onPointerCancel"
  | "onPointerDown"
  | "onPointerUp"
> & {
  longPressTimeout?: number;
  onLongPress: () => void | Promise<void>;
  onPress: () => void | Promise<void>;
};

export function LongPressButton({
  componentName = "LongPressButton",
  disabled,
  longPressTimeout,
  onLongPress,
  onPress,
  ...buttonProps
}: LongPressButtonProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const longTriggered = useRef(false);
  const suppressClick = useRef(false);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  function begin(element: HTMLButtonElement) {
    if (disabled || active.current) return;
    active.current = true;
    longTriggered.current = false;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!active.current) return;
      longTriggered.current = true;
      void onLongPress();
    }, resolveLongPressTimeout(element, longPressTimeout));
  }

  function finish() {
    if (!active.current) return;
    active.current = false;
    clearTimer();
    if (!longTriggered.current) void onPress();
  }

  function cancel() {
    active.current = false;
    longTriggered.current = false;
    suppressClick.current = false;
    clearTimer();
  }

  function clearTimer() {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
  }

  return (
    <Button
      {...buttonProps}
      componentName={componentName}
      disabled={disabled}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        if (!disabled) void onPress();
      }}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        suppressClick.current = true;
        begin(event.currentTarget);
      }}
      onPointerUp={(event: PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary || event.button !== 0) return;
        finish();
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={() => {
        if (active.current) cancel();
      }}
      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
          suppressClick.current = true;
          begin(event.currentTarget);
        }
      }}
      onKeyUp={(event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter" || event.key === " ") finish();
      }}
      onBlur={cancel}
    />
  );
}

export function resolveLongPressTimeout(
  element: Element | null,
  explicitTimeout?: number,
) {
  if (explicitTimeout !== undefined) return Math.max(0, explicitTimeout);
  if (element && typeof getComputedStyle === "function") {
    const cssValue = getComputedStyle(element)
      .getPropertyValue("--long-press-timeout")
      .trim();
    const match = cssValue.match(/^(\d+(?:\.\d+)?)(ms|s)$/);
    if (match) {
      const value = Number(match[1]);
      return match[2] === "s" ? value * 1_000 : value;
    }
  }
  return 500;
}
