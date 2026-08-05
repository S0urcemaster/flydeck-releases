import { Button, type ButtonProps } from "../Button";
import styles from "./Checkbox.module.css";

export type CheckboxProps = Omit<
  ButtonProps,
  "aria-label" | "children" | "onChange" | "onClick" | "selected"
> & {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function Checkbox({
  checked,
  label,
  onChange,
  activeColor,
  componentName = "Checkbox",
  ...buttonProps
}: CheckboxProps) {
  return (
    <Button
      {...buttonProps}
      componentName={componentName}
      className={styles.root}
      activeColor={activeColor}
      selected={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.mark} aria-hidden="true">·</span>
    </Button>
  );
}
