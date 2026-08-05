import { Base, type BaseProps } from "../Base";
import styles from "./Textarea.module.css";

export type TextareaProps = Omit<BaseProps<"textarea">, "as"> & {
  resize?: "none" | "vertical";
  size?: "standard" | "large" | "properties" | "fill";
};

export function Textarea({
  componentName = "Textarea",
  resize = "vertical",
  size = "standard",
  className,
  ...props
}: TextareaProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;

  return (
    <Base
      {...props}
      as="textarea"
      componentName={componentName}
      className={classes}
      data-resize={resize}
      data-size={size}
    />
  );
}
