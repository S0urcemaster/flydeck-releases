import { createContext, useContext } from "react";

import { Base, type BaseProps } from "../Base";
import styles from "./Form.module.css";

const FormActionWidthContext = createContext<string | undefined>(undefined);

export type FormProps = Omit<BaseProps<"form">, "as"> & {
  actionWidth?: string;
};

export function Form({
  actionWidth,
  children,
  className,
  componentName = "Form",
  onSubmit,
  ...baseProps
}: FormProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;

  return (
    <FormActionWidthContext.Provider value={actionWidth}>
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
    </FormActionWidthContext.Provider>
  );
}

export function useFormActionWidth() {
  return useContext(FormActionWidthContext);
}
