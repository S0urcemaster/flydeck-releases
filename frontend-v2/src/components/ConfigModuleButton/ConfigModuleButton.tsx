import { Settings } from "lucide-react";

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
  void symbol;
  return (
    <SideModuleButton
      {...props}
      componentName={componentName}
      symbol={<Settings size="1em" strokeWidth={1.8} />}
    />
  );
}
