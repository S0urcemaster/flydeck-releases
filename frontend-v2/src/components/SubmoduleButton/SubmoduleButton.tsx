import { type ButtonProps } from "../Button";
import { PressButton } from "../PressButton";

export type SubmoduleButtonProps = ButtonProps;

export function SubmoduleButton({
  activeColor = "COLOR_ACCENT_TWO",
  ...props
}: SubmoduleButtonProps) {
  return (
    <PressButton
      {...props}
      activeColor={activeColor}
      componentName="SubmoduleButton"
    />
  );
}
