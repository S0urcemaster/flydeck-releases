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
    if (line.startsWith("#### ")) {
      return <h4 key={index}>{renderInlineMarkdown(line.slice(5))}</h4>;
    }
    if (line.startsWith("### ")) {
      return <h3 key={index}>{renderInlineMarkdown(line.slice(4))}</h3>;
    }
    if (line.startsWith("## ")) {
      return <h2 key={index}>{renderInlineMarkdown(line.slice(3))}</h2>;
    }
    if (line.startsWith("# ")) {
      return <h1 key={index}>{renderInlineMarkdown(line.slice(2))}</h1>;
    }
    if (line.startsWith("> ")) {
      return <blockquote key={index}>{renderInlineMarkdown(line.slice(2))}</blockquote>;
    }
    if (!line.trim()) {
      return <div key={index} className={styles.gap} aria-hidden="true" />;
    }
    return <p key={index}>{renderInlineMarkdown(line)}</p>;
  });
}

export function renderInlineMarkdown(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*\n]+?\*\*|(?<!\w)__[^_\n]+?__(?!\w)|\*[^*\n]+?\*|(?<!\w)_[^_\n]+?_(?!\w))/g)
    .filter(Boolean)
    .map((part, index) => {
      if (
        (part.startsWith("**") && part.endsWith("**"))
        || (part.startsWith("__") && part.endsWith("__"))
      ) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (
        (part.startsWith("*") && part.endsWith("*"))
        || (part.startsWith("_") && part.endsWith("_"))
      ) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
}
