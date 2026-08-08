import { useRef, useState, type CSSProperties } from "react";

import { Base, resolveCssValue, type BaseProps } from "../Base";
import {
  InputAids,
  scaledFontSize,
  type InputAidsProps,
  type InputFontStage,
} from "../InputAids";
import styles from "./Textarea.module.css";

export type TextareaProps = Omit<BaseProps<"textarea">, "as"> & {
  fontSize?: string;
  inputAids?: boolean;
  inputAidsProps?: Omit<
    InputAidsProps,
    "fontStage" | "onFontStageChange" | "targetRef"
  >;
  resize?: "none" | "vertical";
  size?: "standard" | "large" | "properties" | "fill";
};

export function Textarea({
  componentName = "Textarea",
  fontSize = "0.82rem",
  resize = "vertical",
  size = "standard",
  inputAids = true,
  inputAidsProps,
  className,
  margin,
  width,
  height,
  ...props
}: TextareaProps) {
  const [aidsVisible, setAidsVisible] = useState(false);
  const [fontStage, setFontStage] = useState<InputFontStage>("small");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      data-size={size}
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
        ref={textareaRef}
        as="textarea"
        componentName={componentName}
        className={styles.root}
        data-resize={resize}
        data-size={size}
        margin="0"
        width="100%"
        height={height === undefined || height === "unset" ? "unset" : "100%"}
        style={{
          ...props.style,
          fontSize: resolveCssValue(scaledFontSize(fontSize, fontStage, "small")),
        }}
      />
      {inputAids && aidsVisible && (
        <InputAids
          {...inputAidsProps}
          fontStage={fontStage}
          onFontStageChange={setFontStage}
          showDateTimeButton
          targetRef={textareaRef}
        />
      )}
    </div>
  );
}

function optionalCssDimension(value: string | undefined) {
  return value === undefined || value === "unset" ? undefined : resolveCssValue(value);
}
