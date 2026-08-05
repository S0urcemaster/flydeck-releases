import {
  DialerButton,
  type DialerButtonProps,
} from "../DialerButton";

export type DialerCenterButtonProps = DialerButtonProps;

export function DialerCenterButton({
  componentName = "DialerCenterButton",
  ...props
}: DialerCenterButtonProps) {
  return <DialerButton {...props} componentName={componentName} />;
}
