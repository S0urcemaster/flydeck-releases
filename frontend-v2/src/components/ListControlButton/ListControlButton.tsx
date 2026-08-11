import type { ReactNode } from "react";

import { Button, type ButtonProps } from "../Button";
import { SymbolButton } from "../SymbolButton";

export type ListControlButtonProps = ButtonProps & {
  symbol?: ReactNode;
};

export function ListControlButton({
  componentName = "ListControlButton",
  symbol,
  children,
  ...props
}: ListControlButtonProps) {
  if (symbol !== undefined) {
    return <SymbolButton {...props} componentName={componentName} symbol={symbol} />;
  }
  return <Button {...props} componentName={componentName}>{children}</Button>;
}
