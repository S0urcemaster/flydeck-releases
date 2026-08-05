import {
  ModuleButton,
  type ModuleButtonProps,
} from "../ModuleButton";

export type SideModuleButtonProps = Omit<ModuleButtonProps, "children">;

export function SideModuleButton({
  componentName = "SideModuleButton",
  symbol,
  ...props
}: SideModuleButtonProps) {
  return (
    <ModuleButton {...props} componentName={componentName} symbol={symbol}>
      {""}
    </ModuleButton>
  );
}
