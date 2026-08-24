import { useState, type CSSProperties, type ReactNode } from "react";

import { Base, resolveCssValue, type BaseProps } from "../Base";
import styles from "./PointerButton.module.css";

export type PointerButtonMode = "start" | "browse" | "end";

export type PointerButtonProps = Omit<
  BaseProps<"button">,
  "as" | "background" | "children" | "padding"
> & {
  deltaY?: string;
  mode: PointerButtonMode;
  padding?: string;
  primary: ReactNode;
  primaryFontSize?: string;
  secondary: ReactNode;
  secondaryFontSize?: string;
};

export function PointerButton({
  className,
  componentName = "PointerButton",
  deltaY,
  mode,
  padding,
  primary,
  primaryFontSize,
  secondary,
  secondaryFontSize,
  style,
  type = "button",
  onBlur,
  onKeyDown,
  onKeyUp,
  onLostPointerCapture,
  onPointerCancel,
  onPointerDown,
  onPointerUp,
  ...props
}: PointerButtonProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Base
      {...props}
      as="button"
      className={className ? `${styles.root} ${className}` : styles.root}
      componentName={componentName}
      data-pointer-mode={mode}
      data-pressed={pressed || undefined}
      style={{
        ...style,
        "--pointer-button-delta-y": resolveCssValue(deltaY),
        "--pointer-button-padding": resolveCssValue(padding),
        "--pointer-button-primary-font-size": resolveCssValue(primaryFontSize),
        "--pointer-button-secondary-font-size": resolveCssValue(
          secondaryFontSize,
        ),
      } as CSSProperties}
      type={type}
      onBlur={(event) => {
        setPressed(false);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
          setPressed(true);
        }
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") setPressed(false);
        onKeyUp?.(event);
      }}
      onLostPointerCapture={(event) => {
        setPressed(false);
        onLostPointerCapture?.(event);
      }}
      onPointerCancel={(event) => {
        setPressed(false);
        onPointerCancel?.(event);
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(true);
        onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        setPressed(false);
        onPointerUp?.(event);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
    >
      <strong className={styles.primary}>{primary}</strong>
      <span className={styles.secondary}>{secondary}</span>
    </Base>
  );
}
