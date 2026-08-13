import { PressButton, type PressButtonProps } from "../PressButton";
import styles from "./SubmoduleButton.module.css";

export type SubmoduleButtonProps = PressButtonProps;

export function SubmoduleButton({
  activeColor = "COLOR_ACCENT_TWO",
  className,
  ...props
}: SubmoduleButtonProps) {
  return (
    <PressButton
      {...props}
      activeColor={activeColor}
      className={className ? `${styles.root} ${className}` : styles.root}
      componentName="SubmoduleButton"
    />
  );
}
