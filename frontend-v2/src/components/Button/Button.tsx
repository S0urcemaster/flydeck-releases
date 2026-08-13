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
  height?: string;
};

const ButtonConfigurationContext = createContext<ButtonConfiguration>({});

export type ButtonConfigurationProviderProps = ButtonConfiguration & {
  children: ReactNode;
};

export function ButtonConfigurationProvider({
  activeColor,
  fontSize,
  fontWeight,
  height,
  children,
}: ButtonConfigurationProviderProps) {
  return (
    <ButtonConfigurationContext.Provider
      value={{ activeColor, fontSize, fontWeight, height }}
    >
      {children}
    </ButtonConfigurationContext.Provider>
  );
}

export type ButtonProps = Omit<BaseProps<"button">, "as"> & {
  activeColor?: string;
  fontSize?: string;
  fontWeight?: string;
  pressed?: boolean;
  selected?: boolean;
  size?: "standard" | "compact";
};

export function Button({
  activeColor,
  fontSize,
  fontWeight,
  pressed: controlledPressed,
  selected,
  size = "standard",
  componentName = "Button",
  type = "button",
  className,
  color,
  background,
  border,
  height,
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
  const [internalPressed, setInternalPressed] = useState(false);
  const active = controlledPressed ?? Boolean(selected || internalPressed);
  const classes = className ? `${styles.root} ${className}` : styles.root;

  return (
    <Base
      {...props}
      as="button"
      componentName={componentName}
      type={type}
      className={classes}
      color={active ? "COLOR_SURFACE" : color}
      background={active ? resolvedActiveColor : background}
      border={border}
      height={height ?? configuredDefaults.height}
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
        setInternalPressed(true);
        onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        setInternalPressed(false);
        onPointerUp?.(event);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={(event) => {
        setInternalPressed(false);
        onPointerCancel?.(event);
      }}
      onLostPointerCapture={(event) => {
        setInternalPressed(false);
        onLostPointerCapture?.(event);
      }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
          setInternalPressed(true);
        }
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          setInternalPressed(false);
        }
        onKeyUp?.(event);
      }}
      onBlur={(event) => {
        setInternalPressed(false);
        onBlur?.(event);
      }}
    />
  );
}
