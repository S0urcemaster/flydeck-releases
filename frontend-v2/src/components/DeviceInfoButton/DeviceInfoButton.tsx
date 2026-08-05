import { Button, type ButtonProps } from "../Button";

export type DeviceInfoButtonProps = ButtonProps;

export function DeviceInfoButton({
  componentName = "DeviceInfoButton",
  ...props
}: DeviceInfoButtonProps) {
  return <Button {...props} componentName={componentName} />;
}
