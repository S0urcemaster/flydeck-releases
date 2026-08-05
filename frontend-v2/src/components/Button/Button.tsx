import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { Base, resolveCssValue, type BaseProps } from "../Base";
import styles from "./Button.module.css";

type ButtonConfiguration = {
  activeColor?: string;
  fontSize?: string;
  fontWeight?: string;
};

const ButtonConfigurationContext = createContext<ButtonConfiguration>({});

export type ButtonConfigurationProviderProps = ButtonConfiguration & {
  children: ReactNode;
};

export function ButtonConfigurationProvider({
  activeColor,
  fontSize,
  fontWeight,
  children,
}: ButtonConfigurationProviderProps) {
  return (
    <ButtonConfigurationContext.Provider
      value={{ activeColor, fontSize, fontWeight }}
    >
      {children}
    </ButtonConfigurationContext.Provider>
  );
}

export type ButtonProps = Omit<BaseProps<"button">, "as"> & {
  activeColor?: string;
  fontSize?: string;
  fontWeight?: string;
  selected?: boolean;
  size?: "standard" | "compact";
};

export function Button({
  activeColor,
  fontSize,
  fontWeight,
  selected,
  size = "standard",
  componentName = "Button",
  type = "button",
  className,
  color = "COLOR_TEXT",
  background = "COLOR_SURFACE",
  border = "BORDER_STANDARD",
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onKeyDown,
  onKeyUp,
  onBlur,
  style,
  ...props
}: ButtonProps) {
  const configuredDefaults = useContext(ButtonConfigurationContext);
  const resolvedActiveColor =
    activeColor ?? configuredDefaults.activeColor ?? "COLOR_ACCENT_ONE";
  const resolvedFontSize =
    fontSize ?? configuredDefaults.fontSize ?? "inherit";
  const resolvedFontWeight =
    fontWeight ?? configuredDefaults.fontWeight ?? "inherit";
  const [pressed, setPressed] = useState(false);
  const classes = className ? `${styles.root} ${className}` : styles.root;

  return (
    <Base
      {...props}
      as="button"
      componentName={componentName}
      type={type}
      className={classes}
      color={selected || pressed ? "COLOR_SURFACE" : color}
      background={selected || pressed ? resolvedActiveColor : background}
      border={border}
      style={{
        ...style,
        fontSize: resolveCssValue(resolvedFontSize),
        fontWeight: resolveCssValue(resolvedFontWeight),
      }}
      aria-pressed={selected}
      data-size={size}
      onClick={(event) => {
        onClick?.(event);
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
      onPointerCancel={(event) => {
        setPressed(false);
        onPointerCancel?.(event);
      }}
      onLostPointerCapture={(event) => {
        setPressed(false);
        onLostPointerCapture?.(event);
      }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
          setPressed(true);
        }
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          setPressed(false);
        }
        onKeyUp?.(event);
      }}
      onBlur={(event) => {
        setPressed(false);
        onBlur?.(event);
      }}
    />
  );
}
