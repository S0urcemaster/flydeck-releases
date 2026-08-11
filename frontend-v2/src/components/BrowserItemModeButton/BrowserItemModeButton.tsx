import { FileText, List } from "lucide-react";

import { type SymbolButtonProps, SymbolButton } from "../SymbolButton";

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
  ...buttonProps
}: BrowserItemModeButtonProps) {
  const nextMode = mode === "list" ? "content" : "list";

  return (
    <SymbolButton
      {...buttonProps}
      componentName={componentName}
      aria-label={`Show ${nextMode}`}
      onClick={() => onModeChange(nextMode)}
      symbol={mode === "list"
        ? <List />
        : <FileText />}
    />
  );
}
