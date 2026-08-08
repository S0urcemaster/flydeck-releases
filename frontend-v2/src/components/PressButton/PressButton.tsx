import type { KeyboardEvent, PointerEvent } from "react";

import { Button, type ButtonProps } from "../Button";

export type PressButtonProps = ButtonProps & {
  preserveFocus?: boolean;
};

export function PressButton({
  componentName = "PressButton",
  preserveFocus = false,
  onClick,
  onKeyDown,
  onPointerDown,
  ...buttonProps
}: PressButtonProps) {
  function activate(
    event: KeyboardEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>,
  ) {
    onClick?.(
      event as unknown as Parameters<NonNullable<ButtonProps["onClick"]>>[0],
    );
  }

  return (
    <Button
      {...buttonProps}
      componentName={componentName}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented
          && (event.key === "Enter" || event.key === " ")
          && !event.repeat) {
          activate(event);
        }
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!event.defaultPrevented && event.isPrimary && event.button === 0) {
          activate(event);
          if (preserveFocus) event.preventDefault();
        }
      }}
    />
  );
}
