import { ModuleButton, type ModuleButtonProps } from "../ModuleButton";

export type AgentModuleButtonProps = Omit<ModuleButtonProps, "children">;

export function AgentModuleButton({
  symbol,
  ...props
}: AgentModuleButtonProps) {
  return <ModuleButton {...props} symbol={symbol}>AGNT</ModuleButton>;
}
