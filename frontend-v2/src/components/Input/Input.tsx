import { Base, resolveCssValue, type BaseProps } from "../Base";
import styles from "./Input.module.css";

export type InputProps = Omit<BaseProps<"input">, "as"> & {
  fontSize?: string;
};

export function Input({
  componentName = "Input",
  className,
  color = "COLOR_TEXT",
  background = "transparent",
  border = "BORDER_STANDARD",
  fontSize = "inherit",
  style,
  type = "text",
  ...props
}: InputProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;

  return (
    <Base
      {...props}
      as="input"
      className={classes}
      componentName={componentName}
      color={color}
      background={background}
      border={border}
      style={{ ...style, fontSize: resolveCssValue(fontSize) }}
      type={type}
    />
  );
}
