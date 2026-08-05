import {
  SideModuleButton,
  type SideModuleButtonProps,
} from "../SideModuleButton";

export type HelpModuleButtonProps = SideModuleButtonProps;

export function HelpModuleButton({
  symbol,
  componentName = "HelpModuleButton",
  ...props
}: HelpModuleButtonProps) {
  return (
    <SideModuleButton
      {...props}
      componentName={componentName}
      symbol={symbol}
    />
  );
}
