import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { Base, type BaseStyleProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
import { Input, type InputProps } from "../Input";
import {
  Keyboard,
  initialKeyboardFontStage,
  initialTextareaFontStage,
  scaledFontSize,
  type InputFontStage,
  type TextEntryElement,
} from "../Keyboard";
import { Textarea, type TextareaProps } from "../Textarea";
import styles from "./InputControl.module.css";

let activeKeyboardOwner: symbol | null = null;
let closeActiveKeyboard: (() => void) | null = null;

export type InputControlProps = BaseStyleProps & {
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  componentName?: string;
  control?: "input" | "textarea";
  controlActions?: ReactNode;
  controlLeading?: ReactNode;
  controlRef?: RefObject<TextEntryElement | null>;
  initialValue?: string;
  inputProps?: Omit<InputProps, "controlRef" | "onChange" | "value">;
  keyboardActions?: ReactNode;
  keyboardLayout?: "inline" | "block";
  keyboardSaveVisible?: boolean;
  onChange?: (value: string) => void;
  onEditingChange?: (editing: boolean) => void;
  onSend?: (value: string) => void;
  textareaProps?: Omit<TextareaProps, "controlRef" | "onChange" | "value">;
  value?: string;
};

export function InputControl({
  buttonProps,
  componentName = "InputControl",
  control = "textarea",
  controlActions,
  controlLeading,
  controlRef,
  initialValue = "",
  inputProps,
  keyboardActions,
  keyboardLayout,
  keyboardSaveVisible = true,
  onChange,
  onEditingChange,
  onSend,
  textareaProps,
  value,
  color,
  background,
  border,
  padding,
  height,
  ...baseProps
}: InputControlProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [controlHeight, setControlHeight] = useState<string>();
  const [smartphoneKeyboardEnabled, setSmartphoneKeyboardEnabled] = useState(false);
  const [fontStage, setFontStage] = useState<InputFontStage>(
    control === "textarea" ? initialTextareaFontStage : initialKeyboardFontStage,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardOwner = useRef(Symbol("InputControl"));
  const closeKeyboardRef = useRef<() => void>(() => undefined);
  const smartphoneKeyboardRequest = useRef(false);
  const currentValue = value ?? uncontrolledValue;
  const configuredProps = control === "input" ? inputProps : textareaProps;
  const keyboardEnabled = true;
  const layout = keyboardLayout ?? configuredProps?.keyboardLayout ?? "inline";
  const keyboardProps = configuredProps?.keyboardProps;
  const keyboardExpandsControl = keyboardVisible && layout === "inline";
  const targetRef = controlRef ?? (control === "input" ? inputRef : textareaRef);
  const actions = keyboardActions === undefined && keyboardSaveVisible ? (
    <Button
      {...buttonProps}
      aria-label="Save content"
      width="100%"
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => onSend?.(currentValue)}
    >
      Save
    </Button>
  ) : keyboardActions ?? null;

  function setEditing(editing: boolean) {
    if (editing) {
      if (activeKeyboardOwner !== keyboardOwner.current) closeActiveKeyboard?.();
      activeKeyboardOwner = keyboardOwner.current;
      closeActiveKeyboard = () => closeKeyboardRef.current();
      const measuredHeight = targetRef.current?.getBoundingClientRect().height;
      if (measuredHeight && measuredHeight > 0) {
        setControlHeight(`${measuredHeight}px`);
      }
    } else {
      if (activeKeyboardOwner === keyboardOwner.current) {
        activeKeyboardOwner = null;
        closeActiveKeyboard = null;
      }
      setControlHeight(undefined);
    }
    setKeyboardVisible(editing);
    if (!editing) setSmartphoneKeyboardEnabled(false);
    onEditingChange?.(editing);
  }

  useEffect(() => {
    closeKeyboardRef.current = () => setEditing(false);
  });
  useEffect(() => () => {
    if (activeKeyboardOwner === keyboardOwner.current) {
      activeKeyboardOwner = null;
      closeActiveKeyboard = null;
    }
  }, []);

  function toggleSmartphoneKeyboard() {
    const enabled = !smartphoneKeyboardEnabled;
    setSmartphoneKeyboardEnabled(enabled);
    const target = targetRef.current;
    if (!target) return;
    target.inputMode = enabled ? configuredProps?.inputMode ?? "text" : "none";
    smartphoneKeyboardRequest.current = true;
    target.blur();
    target.focus({ preventScroll: true });
  }

  function leaveControl(event: FocusEvent<HTMLDivElement>) {
    if (smartphoneKeyboardRequest.current) {
      smartphoneKeyboardRequest.current = false;
      return;
    }
    const nextTarget = event.relatedTarget;
    if (
      !event.currentTarget.contains(nextTarget)
      && nextTarget instanceof HTMLElement
      && (nextTarget.matches("input, textarea, select") || nextTarget.isContentEditable)
    ) {
      setEditing(false);
    }
  }

  function changeValue(nextValue: string) {
    if (value === undefined) setUncontrolledValue(nextValue);
    onChange?.(nextValue);
  }

  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName={componentName}
      color={color}
      background={background}
      border={border}
      padding={padding}
      height={keyboardExpandsControl ? "unset" : height}
      style={{
        "--keyboard-entry-height": keyboardExpandsControl
          ? controlHeight
          : undefined,
      } as CSSProperties}
      data-keyboard-layout={layout}
      data-keyboard-visible={keyboardVisible || undefined}
      onBlurCapture={leaveControl}
    >
      <div className={styles.controlRow} data-leading={controlLeading
        ? "true"
        : undefined}>
      {controlLeading ? (
        <div className={styles.controlLeading}>{controlLeading}</div>
      ) : null}
      {control === "input" ? (
        <Input
          {...inputProps}
          aria-label={inputProps?.["aria-label"] ?? "Content input"}
          label={inputProps?.label ?? (control === "input" ? "Input" : "Content")}
          controlRef={inputRef}
          fontSize={scaledFontSize(
            inputProps?.fontSize,
            fontStage,
            "medium",
          )}
          inputMode={keyboardEnabled && !smartphoneKeyboardEnabled
            ? "none"
            : inputProps?.inputMode ?? "text"}
          keyboard={false}
          value={currentValue}
          onChange={(event) => changeValue(event.currentTarget.value)}
          onFocus={(event) => {
            inputProps?.onFocus?.(event);
            if (!inputProps?.readOnly && !inputProps?.disabled) setEditing(true);
          }}
        />
      ) : (
        <Textarea
          {...textareaProps}
          aria-label={textareaProps?.["aria-label"] ?? "Content input"}
          label={textareaProps?.label ?? "Content"}
          controlRef={textareaRef}
          fontSize={scaledFontSize(
            textareaProps?.fontSize,
            fontStage,
            "small",
          )}
          inputMode={keyboardEnabled && !smartphoneKeyboardEnabled
            ? "none"
            : textareaProps?.inputMode ?? "text"}
          keyboard={false}
          resize={textareaProps?.resize ?? "none"}
          size={textareaProps?.size ?? "fill"}
          value={currentValue}
          onChange={(event) => changeValue(event.currentTarget.value)}
          onFocus={(event) => {
            textareaProps?.onFocus?.(event);
            if (!textareaProps?.readOnly && !textareaProps?.disabled) setEditing(true);
          }}
        />
      )}
      {controlActions ? (
        <div className={styles.controlActions}>{controlActions}</div>
      ) : null}
      </div>
      {keyboardEnabled && keyboardVisible && (
        <Keyboard
          {...keyboardProps}
          actions={actions}
          fontStage={fontStage}
          layout={layout}
          onFontStageChange={setFontStage}
          onClose={() => setEditing(false)}
          onSmartphoneKeyboardRequest={toggleSmartphoneKeyboard}
          smartphoneKeyboardEnabled={smartphoneKeyboardEnabled}
          targetRef={targetRef}
        />
      )}
    </Base>
  );
}
