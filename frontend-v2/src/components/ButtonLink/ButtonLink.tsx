import type { ReactNode } from "react";

import styles from "./ButtonLink.module.css";

export type ButtonLinkProps = {
  children: ReactNode;
  href: string;
  placement?: "inline" | "app-edge";
};

export function ButtonLink({
  children,
  href,
  placement = "inline",
}: ButtonLinkProps) {
  return (
    <a className={styles.root} data-placement={placement} href={href}>
      {children}
    </a>
  );
}
