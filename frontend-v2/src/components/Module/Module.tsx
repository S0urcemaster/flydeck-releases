import { Base, type BaseProps } from "../Base";
import styles from "./Module.module.css";

export type ModuleProps = Omit<BaseProps<"section">, "as">;

export function Module({
  componentName = "Module",
  color,
  background,
  border,
  padding,
  margin,
  width,
  height,
  className,
  ...props
}: ModuleProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;

  return (
    <Base
      {...props}
      as="section"
      componentName={componentName}
      className={classes}
      color={color}
      background={background}
      border={border}
      padding={padding}
      margin={margin}
      width={width}
      height={height}
    />
  );
}
