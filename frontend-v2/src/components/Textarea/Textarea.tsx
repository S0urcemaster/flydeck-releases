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
import styles from "./Textarea.module.css";

export type TextareaProps = Omit<BaseProps<"textarea">, "as"> & {
  controlRef?: RefObject<HTMLTextAreaElement | null>;
  fontSize?: string;
  keyboard?: boolean;
  keyboardLayout?: "inline" | "block";
  label?: ReactNode;
  keyboardProps?: Omit<
    KeyboardProps,
    "fontStage" | "layout" | "onClose" | "onFontStageChange" | "targetRef"
  >;
  resize?: "none" | "vertical";
  size?: "standard" | "large" | "properties" | "fill";
};

export function Textarea({
  componentName = "Textarea",
  controlRef,
  defaultValue,
  fontSize,
  resize = "vertical",
  size = "standard",
  keyboard,
  keyboardLayout = "inline",
  keyboardProps,
  inputMode,
  label,
  className,
  margin,
  width,
  height,
  style,
  value,
  onChange,
  "aria-label": ariaLabel,
  ...props
}: TextareaProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [smartphoneKeyboardEnabled, setSmartphoneKeyboardEnabled] = useState(false);
  const [fontStage, setFontStage] = useState<InputFontStage>(
    initialKeyboardFontStage,
  );
  const [uncontrolledContentLength, setUncontrolledContentLength] = useState(
    () => textLength(defaultValue),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [controlHeight, setControlHeight] = useState<string>();
  const smartphoneKeyboardRequest = useRef(false);
  const resolvedTextareaRef = controlRef ?? textareaRef;
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
      data-size={size}
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
        ref={resolvedTextareaRef}
        as="textarea"
        componentName={componentName}
        className={styles.root}
        data-resize={resize}
        data-size={size}
        margin={keyboardLayout === "block" ? margin : "0"}
        width={keyboardLayout === "block" ? width : "100%"}
        height={keyboardLayout === "block"
          ? height
          : height === undefined || height === "unset" ? "unset" : "100%"}
        style={{ ...style, fontSize: resolveCssValue(resolvedFontSize) }}
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
          onClose={() => {
            setKeyboardVisible(false);
            setControlHeight(undefined);
            setSmartphoneKeyboardEnabled(false);
          }}
          onSmartphoneKeyboardRequest={() => {
            const target = resolvedTextareaRef.current;
            const enabled = !smartphoneKeyboardEnabled;
            setSmartphoneKeyboardEnabled(enabled);
            if (!target) return;
            target.inputMode = enabled ? inputMode ?? "text" : "none";
            smartphoneKeyboardRequest.current = true;
            target.blur();
            target.focus({ preventScroll: true });
          }}
          smartphoneKeyboardEnabled={smartphoneKeyboardEnabled}
          targetRef={resolvedTextareaRef}
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
