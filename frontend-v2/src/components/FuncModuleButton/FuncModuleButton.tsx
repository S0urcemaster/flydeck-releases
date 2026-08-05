import { ModuleButton, type ModuleButtonProps } from "../ModuleButton";

export type FuncModuleButtonProps = Omit<ModuleButtonProps, "children">;

export function FuncModuleButton({
  symbol,
  ...props
}: FuncModuleButtonProps) {
  return <ModuleButton {...props} symbol={symbol}>FUNC</ModuleButton>;
}
