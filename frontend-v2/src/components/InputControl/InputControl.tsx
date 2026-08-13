import {
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
  scaledFontSize,
  type InputFontStage,
  type TextEntryElement,
} from "../Keyboard";
import { Textarea, type TextareaProps } from "../Textarea";
import styles from "./InputControl.module.css";

export type InputControlProps = BaseStyleProps & {
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  componentName?: string;
  control?: "input" | "textarea";
  initialValue?: string;
  inputProps?: Omit<InputProps, "controlRef" | "onChange" | "value">;
  keyboardActions?: ReactNode;
  keyboardLayout?: "inline" | "block";
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
  initialValue = "",
  inputProps,
  keyboardActions,
  keyboardLayout,
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
    initialKeyboardFontStage,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const smartphoneKeyboardRequest = useRef(false);
  const currentValue = value ?? uncontrolledValue;
  const configuredProps = control === "input" ? inputProps : textareaProps;
  const keyboardEnabled = true;
  const layout = keyboardLayout ?? configuredProps?.keyboardLayout ?? "inline";
  const keyboardProps = configuredProps?.keyboardProps;
  const keyboardExpandsControl = keyboardVisible && layout === "inline";
  const targetRef = (control === "input" ? inputRef : textareaRef) as RefObject<
    TextEntryElement | null
  >;
  const actions = keyboardActions ?? (
    <Button
      {...buttonProps}
      aria-label="Save content"
      width="100%"
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => onSend?.(currentValue)}
    >
      Save
    </Button>
  );

  function setEditing(editing: boolean) {
    if (editing) {
      const measuredHeight = targetRef.current?.getBoundingClientRect().height;
      if (measuredHeight && measuredHeight > 0) {
        setControlHeight(`${measuredHeight}px`);
      }
    } else {
      setControlHeight(undefined);
    }
    setKeyboardVisible(editing);
    if (!editing) setSmartphoneKeyboardEnabled(false);
    onEditingChange?.(editing);
  }

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
    if (!event.currentTarget.contains(event.relatedTarget)) setEditing(false);
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
            setEditing(true);
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
            setEditing(true);
          }}
        />
      )}
      {keyboardEnabled && keyboardVisible && (
        <Keyboard
          {...keyboardProps}
          actions={actions}
          fontStage={fontStage}
          layout={layout}
          onFontStageChange={setFontStage}
          onSmartphoneKeyboardRequest={toggleSmartphoneKeyboard}
          smartphoneKeyboardEnabled={smartphoneKeyboardEnabled}
          targetRef={targetRef}
        />
      )}
    </Base>
  );
}
