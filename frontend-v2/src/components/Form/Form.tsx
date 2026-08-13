import { Base, type BaseProps } from "../Base";
import styles from "./Form.module.css";

export type FormProps = Omit<BaseProps<"form">, "as">;

export function Form({
  children,
  className,
  componentName = "Form",
  onSubmit,
  ...baseProps
}: FormProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;

  return (
    <Base
      {...baseProps}
      as="form"
      className={classes}
      componentName={componentName}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
      }}
    >
      {children}
    </Base>
  );
}
