import { ModuleButton, type ModuleButtonProps } from "../ModuleButton";

export type CronModuleButtonProps = Omit<ModuleButtonProps, "children">;

export function CronModuleButton({
  symbol,
  ...props
}: CronModuleButtonProps) {
  return <ModuleButton {...props} symbol={symbol}>CRON</ModuleButton>;
}
