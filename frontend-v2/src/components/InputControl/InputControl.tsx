import { useState } from "react";

import { Base, type BaseStyleProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
import { Textarea, type TextareaProps } from "../Textarea";
import styles from "./InputControl.module.css";

export type InputControlProps = BaseStyleProps & {
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  initialValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (value: string) => void;
  textareaProps?: Omit<TextareaProps, "onChange" | "value">;
};

export function InputControl({
  buttonProps,
  initialValue = "",
  value,
  onChange,
  onSend,
  textareaProps,
  color = "COLOR_TEXT",
  background = "COLOR_SURFACE",
  border = "BORDER_STANDARD",
  padding = "SPACE_XS",
  ...baseProps
}: InputControlProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);
  const currentValue = value ?? uncontrolledValue;

  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName="InputControl"
      color={color}
      background={background}
      border={border}
      padding={padding}
    >
      <Textarea
        {...textareaProps}
        aria-label="Content input"
        resize={textareaProps?.resize ?? "none"}
        size={textareaProps?.size ?? "fill"}
        value={currentValue}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          if (value === undefined) setUncontrolledValue(nextValue);
          onChange?.(nextValue);
        }}
      />
      <Button
        {...buttonProps}
        aria-label="Send content"
        onClick={() => onSend?.(currentValue)}
      >
        SEND
      </Button>
    </Base>
  );
}
