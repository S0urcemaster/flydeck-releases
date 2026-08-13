import { useState, type FocusEvent } from "react";

import { Base, type BaseStyleProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
import { Input, type InputProps } from "../Input";
import type { TreeBrowserRootTarget } from "../TreeBrowser";
import styles from "./RootInputControl.module.css";

export type RootInputControlProps = BaseStyleProps & {
  componentName?: string;
  current: TreeBrowserRootTarget;
  targets: readonly TreeBrowserRootTarget[];
  value: string;
  onChange: (value: string) => void;
  actionDisabled?: boolean;
  actionLabel?: string;
  inputLabel?: string;
  label?: string;
  onAction?: (value: string, target: TreeBrowserRootTarget | null) => void;
  buttonProps?: Omit<ButtonProps, "aria-label" | "children" | "onClick">;
  inputProps?: Omit<
    InputProps,
    "aria-label" | "color" | "onChange" | "placeholder" | "type" | "value"
  >;
};

export function RootInputControl({
  componentName = "RootInputControl",
  current,
  targets,
  value,
  onChange,
  actionDisabled,
  actionLabel,
  inputLabel = "Root node",
  label = "Root",
  onAction,
  buttonProps,
  inputProps,
  color,
  background,
  border,
  ...baseProps
}: RootInputControlProps) {
  const [editing, setEditing] = useState(false);
  const target = resolveRootTarget(current, targets, value);

  function leaveControl(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setEditing(false);
  }

  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName={componentName}
      color={color}
      background={background}
      border={border}
      data-editing={editing || undefined}
      onBlurCapture={leaveControl}
      onFocusCapture={() => setEditing(true)}
    >
      <Input
        {...inputProps}
        aria-label={inputLabel}
        label={label}
        color={target ? "COLOR_SUCCESS" : "COLOR_ERROR"}
        keyboardLayout="block"
        placeholder="Set parent path (empty for root)"
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {editing && onAction && actionLabel && (
        <Button
          {...buttonProps}
          aria-label={actionLabel}
          className={styles.action}
          disabled={actionDisabled || !target || target.id === current.id}
          onPointerDown={(event) => {
            event.preventDefault();
            buttonProps?.onPointerDown?.(event);
          }}
          onClick={() => onAction(value, target)}
        >
          {actionLabel}
        </Button>
      )}
    </Base>
  );
}

export function resolveRootTarget(
  current: TreeBrowserRootTarget,
  targets: readonly TreeBrowserRootTarget[],
  value: string,
): TreeBrowserRootTarget | null {
  if (value === current.path) return current;
  const matches = targets.filter(({ path }) => path === value);
  return matches.length === 1 && matches[0].eligible ? matches[0] : null;
}
