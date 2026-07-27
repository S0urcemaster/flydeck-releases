import type { ReactNode } from "react";
import styles from "./AppTitle.module.css";

export type AppTitleProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function AppTitle({ title, subtitle, action }: AppTitleProps) {
  return (
    <header className={styles.root}>
      <div className={styles.row}>
        <h1 className={styles.title}>
          <span className={styles.mark} aria-hidden="true">𐦍</span>
          {title}
        </h1>
        {action}
      </div>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  );
}
