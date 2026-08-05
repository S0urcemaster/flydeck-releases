import { ModuleButton, type ModuleButtonProps } from "../ModuleButton";

export type DataModuleButtonProps = Omit<ModuleButtonProps, "children">;

export function DataModuleButton({
  symbol,
  ...props
}: DataModuleButtonProps) {
  return <ModuleButton {...props} symbol={symbol}>DATA</ModuleButton>;
}
