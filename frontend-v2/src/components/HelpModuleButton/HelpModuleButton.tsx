import { CircleHelp } from "lucide-react";

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
  void symbol;
  return (
    <SideModuleButton
      {...props}
      componentName={componentName}
      symbol={<CircleHelp size="1em" strokeWidth={1.8} />}
    />
  );
}
