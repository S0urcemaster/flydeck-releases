import {
  SideModuleButton,
  type SideModuleButtonProps,
} from "../SideModuleButton";

export type ConfigModuleButtonProps = SideModuleButtonProps;

export function ConfigModuleButton({
  symbol,
  componentName = "ConfigModuleButton",
  ...props
}: ConfigModuleButtonProps) {
  return (
    <SideModuleButton
      {...props}
      componentName={componentName}
      symbol={symbol}
    />
  );
}
