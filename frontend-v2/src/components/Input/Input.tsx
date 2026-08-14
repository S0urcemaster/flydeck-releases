import {
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

import { Base, resolveCssValue, type BaseProps } from "../Base";
import {
  Keyboard,
  initialKeyboardFontStage,
  scaledFontSize,
  type KeyboardProps,
  type InputFontStage,
} from "../Keyboard";
import styles from "./Input.module.css";

export type InputProps = Omit<BaseProps<"input">, "as"> & {
  controlRef?: RefObject<HTMLInputElement | null>;
  fontSize?: string;
  keyboard?: boolean;
  keyboardLayout?: "inline" | "block";
  label?: ReactNode;
  keyboardProps?: Omit<
    KeyboardProps,
    "fontStage" | "layout" | "onFontStageChange" | "targetRef"
  >;
};

export function Input({
  componentName = "Input",
  className,
  controlRef,
  color,
  background,
  border,
  fontSize,
  keyboard,
  keyboardLayout = "inline",
  keyboardProps,
  defaultValue,
  inputMode,
  label,
  margin,
  width,
  height,
  style,
  type = "text",
  value,
  onChange,
  "aria-label": ariaLabel,
  ...props
}: InputProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [smartphoneKeyboardEnabled, setSmartphoneKeyboardEnabled] = useState(false);
  const [fontStage, setFontStage] = useState<InputFontStage>(
    initialKeyboardFontStage,
  );
  const [uncontrolledContentLength, setUncontrolledContentLength] = useState(
    () => textLength(defaultValue),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [controlHeight, setControlHeight] = useState<string>();
  const smartphoneKeyboardRequest = useRef(false);
  const resolvedInputRef = controlRef ?? inputRef;
  const classes = className ? `${styles.control} ${className}` : styles.control;
  const keyboardExpandsControl = keyboardVisible && keyboardLayout === "inline";
  const resolvedFontSize = scaledFontSize(fontSize, fontStage, "medium");
  const visibleLabel = label ?? ariaLabel;
  const contentLength = value === undefined
    ? uncontrolledContentLength
    : textLength(value);
  const controlStyle = {
    width: optionalCssDimension(width),
    height: keyboardExpandsControl ? undefined : optionalCssDimension(height),
    margin: resolveCssValue(margin),
    "--keyboard-entry-height": keyboardExpandsControl
      ? controlHeight
      : undefined,
  } as CSSProperties;

  return (
    <div
      ref={wrapperRef}
      className={classes}
      data-keyboard-layout={keyboardLayout}
      data-keyboard-visible={keyboardVisible || undefined}
      style={keyboardLayout === "block" ? undefined : controlStyle}
      onFocusCapture={() => {
        if (!keyboardVisible) {
          const measuredHeight = wrapperRef.current?.getBoundingClientRect().height;
          if (measuredHeight && measuredHeight > 0) {
            setControlHeight(`${measuredHeight}px`);
          }
        }
        setKeyboardVisible(true);
      }}
      onBlurCapture={(event) => {
        if (smartphoneKeyboardRequest.current) {
          smartphoneKeyboardRequest.current = false;
          return;
        }
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setKeyboardVisible(false);
          setControlHeight(undefined);
          setSmartphoneKeyboardEnabled(false);
        }
      }}
    >
      <Base
        {...props}
        ref={resolvedInputRef}
        as="input"
        className={styles.root}
        componentName={componentName}
        color={color}
        background={background}
        border={border}
        margin={keyboardLayout === "block" ? margin : "0"}
        width={keyboardLayout === "block" ? width : "100%"}
        height={keyboardLayout === "block"
          ? height
          : height === undefined || height === "unset" ? "unset" : "100%"}
        style={{
          ...style,
          fontSize: resolveCssValue(resolvedFontSize),
        }}
        aria-label={ariaLabel}
        inputMode={keyboard
          ? smartphoneKeyboardEnabled ? inputMode ?? "text" : "none"
          : inputMode}
        defaultValue={defaultValue}
        value={value}
        onChange={(event) => {
          setUncontrolledContentLength(event.currentTarget.value.length);
          onChange?.(event);
        }}
        type={type}
      />
      {visibleLabel && contentLength <= 8 && (
        <span
          aria-hidden="true"
          className={styles.label}
          style={{ fontSize: resolveCssValue(resolvedFontSize) }}
        >
          {visibleLabel}
        </span>
      )}
      {keyboard && keyboardVisible && (
        <Keyboard
          {...keyboardProps}
          fontStage={fontStage}
          layout={keyboardLayout}
          onFontStageChange={setFontStage}
          onSmartphoneKeyboardRequest={() => {
            const target = resolvedInputRef.current;
            const enabled = !smartphoneKeyboardEnabled;
            setSmartphoneKeyboardEnabled(enabled);
            if (!target) return;
            target.inputMode = enabled ? inputMode ?? "text" : "none";
            smartphoneKeyboardRequest.current = true;
            target.blur();
            target.focus({ preventScroll: true });
          }}
          smartphoneKeyboardEnabled={smartphoneKeyboardEnabled}
          targetRef={resolvedInputRef}
        />
      )}
    </div>
  );
}

function optionalCssDimension(value: string | undefined) {
  return value === undefined || value === "unset" ? undefined : resolveCssValue(value);
}

function textLength(value: unknown) {
  return value === undefined || value === null ? 0 : String(value).length;
}
