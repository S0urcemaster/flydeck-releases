import { Button, type ButtonProps } from "../Button";

export type ListControlButtonProps = ButtonProps;

export function ListControlButton({
  componentName = "ListControlButton",
  ...props
}: ListControlButtonProps) {
  return <Button {...props} componentName={componentName} />;
}
