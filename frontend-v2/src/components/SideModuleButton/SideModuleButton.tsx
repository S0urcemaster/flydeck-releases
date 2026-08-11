import {
  SymbolButton,
  type SymbolButtonProps,
} from "../SymbolButton";

export type SideModuleButtonProps = SymbolButtonProps;

export function SideModuleButton({
  componentName = "SideModuleButton",
  symbol,
  ...props
}: SideModuleButtonProps) {
  return (
    <SymbolButton {...props} componentName={componentName} symbol={symbol} />
  );
}
