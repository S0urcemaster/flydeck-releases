import type { ReactNode } from "react";

import { Base, type BaseStyleProps } from "../Base";
import styles from "./ButtonLink.module.css";

export type ButtonLinkProps = BaseStyleProps & {
  children: ReactNode;
  href: string;
  placement?: "inline" | "app-edge" | "viewport-edge";
};

export function ButtonLink({
  children,
  href,
  placement = "inline",
  color,
  background,
  border,
  padding,
  margin,
  width,
  height,
}: ButtonLinkProps) {
  return (
    <Base
      as="a"
      className={styles.root}
      componentName="ButtonLink"
      color={color}
      background={background}
      border={border}
      padding={padding}
      margin={margin}
      width={width}
      height={height}
      data-placement={placement}
      href={href}
    >
      {children}
    </Base>
  );
}
