import { PressButton, type PressButtonProps } from "../PressButton";

export type SubmoduleButtonProps = PressButtonProps;

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
