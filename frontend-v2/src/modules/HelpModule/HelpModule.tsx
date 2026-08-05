import type { ReactNode } from "react";

import manual from "../../assets/manual.md?raw";
import { Module, type ModuleProps } from "../../components/Module";
import styles from "./HelpModule.module.css";

export type HelpModuleProps = ModuleProps;

export function HelpModule({ className, ...props }: HelpModuleProps) {
  const classes = className ? `${styles.manual} ${className}` : styles.manual;
  return (
    <Module
      {...props}
      className={classes}
      componentName="HelpModule"
      aria-label="Help module"
    >
      {renderManual(manual)}
    </Module>
  );
}

export function renderManual(markdown: string): ReactNode[] {
  return markdown.split("\n").map((line, index) => {
    if (line.startsWith("### ")) {
      return <h3 key={index}>{renderBold(line.slice(4))}</h3>;
    }
    if (line.startsWith("## ")) {
      return <h2 key={index}>{renderBold(line.slice(3))}</h2>;
    }
    if (line.startsWith("# ")) {
      return <h1 key={index}>{renderBold(line.slice(2))}</h1>;
    }
    if (!line.trim()) {
      return <div key={index} className={styles.gap} aria-hidden="true" />;
    }
    return <p key={index}>{renderBold(line)}</p>;
  });
}

export function renderBold(text: string): ReactNode[] {
  return text
    .split(/(\*[^*\n]+\*)/g)
    .filter(Boolean)
    .map((part, index) => (
      part.startsWith("*") && part.endsWith("*")
        ? <strong key={index}>{part.slice(1, -1)}</strong>
        : part
    ));
}
