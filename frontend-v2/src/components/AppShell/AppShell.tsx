import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

export type AppShellProps = {
  title: ReactNode;
  children?: ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  return (
    <div className={styles.root}>
      {title}
      <main className={styles.content}>{children}</main>
    </div>
  );
}
