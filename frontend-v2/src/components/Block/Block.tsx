import type { ReactNode } from "react";

import { Base, type BaseProps } from "../Base";
import styles from "./Block.module.css";

export type BlockProps = Omit<BaseProps<"div">, "as" | "width"> & {
  children?: ReactNode;
};

export function Block({
  children,
  className,
  componentName = "Block",
  ...props
}: BlockProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;

  return (
    <Base
      {...props}
      className={classes}
      componentName={componentName}
      width="100%"
    >
      {children}
    </Base>
  );
}
