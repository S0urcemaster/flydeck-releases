import { type CSSProperties } from "react";

import { Base, type BaseProps } from "../Base";
import styles from "./Pointer.module.css";

export type PointerMode = "start" | "browse" | "end";

export type PointerProps = Omit<BaseProps<"div">, "as" | "children"> & {
  lineWidth?: string;
  mode: PointerMode;
  position: string;
  shadow?: boolean;
  tipRadius?: string;
};

const pointerAccents: Record<PointerMode, string> = {
  start: "COLOR_ACCENT_TWO",
  browse: "COLOR_ACCENT_THREE",
  end: "COLOR_ACCENT_ONE",
};

export function Pointer({
  className,
  componentName = "Pointer",
  lineWidth,
  mode,
  position,
  shadow = false,
  style,
  tipRadius,
  ...props
}: PointerProps) {
  return (
    <Base
      {...props}
      aria-hidden={props["aria-hidden"] ?? true}
      background={pointerAccents[mode]}
      className={className ? `${styles.root} ${className}` : styles.root}
      componentName={componentName}
      data-pointer-mode={mode}
      data-shadow={shadow || undefined}
      style={{
        ...style,
        "--pointer-line-width": lineWidth,
        "--pointer-position": position,
        "--pointer-tip-radius": tipRadius,
      } as CSSProperties}
    >
      <span className={styles.dot} />
    </Base>
  );
}
