import { useRef, useState, type CSSProperties } from "react";

import { Base, resolveCssValue, type BaseProps } from "../Base";
import {
  InputAids,
  scaledFontSize,
  type InputAidsProps,
  type InputFontStage,
} from "../InputAids";
import styles from "./Input.module.css";

export type InputProps = Omit<BaseProps<"input">, "as"> & {
  fontSize?: string;
  inputAids?: boolean;
  inputAidsProps?: Omit<
    InputAidsProps,
    "fontStage" | "onFontStageChange" | "targetRef"
  >;
};

export function Input({
  componentName = "Input",
  className,
  color = "COLOR_TEXT",
  background = "transparent",
  border = "BORDER_STANDARD",
  fontSize = "inherit",
  inputAids = true,
  inputAidsProps,
  margin,
  width,
  height,
  style,
  type = "text",
  ...props
}: InputProps) {
  const [aidsVisible, setAidsVisible] = useState(false);
  const [fontStage, setFontStage] = useState<InputFontStage>("medium");
  const inputRef = useRef<HTMLInputElement>(null);
  const classes = className ? `${styles.control} ${className}` : styles.control;
  const controlStyle: CSSProperties = {
    width: optionalCssDimension(width),
    height: optionalCssDimension(height),
    margin: resolveCssValue(margin),
  };

  return (
    <div
      className={classes}
      data-aids-visible={aidsVisible || undefined}
      style={controlStyle}
      onFocusCapture={() => setAidsVisible(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setAidsVisible(false);
        }
      }}
    >
      <Base
        {...props}
        ref={inputRef}
        as="input"
        className={styles.root}
        componentName={componentName}
        color={color}
        background={background}
        border={border}
        margin="0"
        width="100%"
        height={height === undefined || height === "unset" ? "unset" : "100%"}
        style={{
          ...style,
          fontSize: resolveCssValue(scaledFontSize(fontSize, fontStage, "medium")),
        }}
        type={type}
      />
      {inputAids && aidsVisible && (
        <InputAids
          {...inputAidsProps}
          fontStage={fontStage}
          onFontStageChange={setFontStage}
          showDateTimeButton={false}
          targetRef={inputRef}
        />
      )}
    </div>
  );
}

function optionalCssDimension(value: string | undefined) {
  return value === undefined || value === "unset" ? undefined : resolveCssValue(value);
}
