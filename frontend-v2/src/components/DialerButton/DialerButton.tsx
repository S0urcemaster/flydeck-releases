import { Button, type ButtonProps } from "../Button";

export type DialerButtonProps = ButtonProps;

export function DialerButton({
  componentName = "DialerButton",
  ...props
}: DialerButtonProps) {
  return <Button {...props} componentName={componentName} />;
}
