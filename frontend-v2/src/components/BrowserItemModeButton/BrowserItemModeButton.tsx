import { type ButtonProps } from "../Button";
import { PressButton } from "../PressButton";

export type BrowserItemMode = "content" | "list";

export type BrowserItemModeButtonProps = Omit<
  ButtonProps,
  "aria-label" | "children" | "onClick"
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
    <PressButton
      {...buttonProps}
      componentName={componentName}
      aria-label={`Show ${nextMode}`}
      onClick={() => onModeChange(nextMode)}
    >
      {mode === "list" ? "▤" : "✎"}
    </PressButton>
  );
}
