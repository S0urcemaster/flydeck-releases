import { FileText, List } from "lucide-react";

import { type SymbolButtonProps, SymbolButton } from "../SymbolButton";
import styles from "./BrowserItemModeButton.module.css";

export type BrowserItemMode = "content" | "list";

export type BrowserItemModeButtonProps = Omit<
  SymbolButtonProps,
  "aria-label" | "symbol" | "onClick"
> & {
  mode: BrowserItemMode;
  onModeChange: (mode: BrowserItemMode) => void;
};

export function BrowserItemModeButton({
  mode,
  onModeChange,
  componentName = "BrowserItemModeButton",
  className,
  ...buttonProps
}: BrowserItemModeButtonProps) {
  const nextMode = mode === "list" ? "content" : "list";

  return (
    <SymbolButton
      {...buttonProps}
      activateOnPress
      selected
      className={className ? `${styles.root} ${className}` : styles.root}
      componentName={componentName}
      aria-label={`Show ${nextMode}`}
      data-mode={mode}
      onClick={() => onModeChange(nextMode)}
      symbol={mode === "list"
        ? <List />
        : <FileText />}
    />
  );
}
