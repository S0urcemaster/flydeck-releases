import type { ReactNode } from "react";

import { type ButtonProps } from "../Button";
import { PressButton } from "../PressButton";
import styles from "./ModuleButton.module.css";

export type ModuleButtonProps = Omit<ButtonProps, "children"> & {
  children: ReactNode;
  symbol: string;
};

export function ModuleButton({
  children,
  componentName = "ModuleButton",
  symbol,
  ...props
}: ModuleButtonProps) {
  return (
    <PressButton {...props} className={styles.root} componentName={componentName}>
      <span className={styles.symbol} aria-hidden="true">{symbol}</span>
      {children !== "" && <span className={styles.label}>{children}</span>}
    </PressButton>
  );
}
