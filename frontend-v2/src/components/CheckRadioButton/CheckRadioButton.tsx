import type { ReactNode } from "react";

import { Base, type BaseStyleProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
import { Checkbox, type CheckboxProps } from "../Checkbox";
import styles from "./CheckRadioButton.module.css";

export type CheckRadioButtonProps = BaseStyleProps & {
  checked: boolean;
  children: ReactNode;
  checkLabel: string;
  selectLabel: string;
  selected: boolean;
  checkboxProps?: Omit<CheckboxProps, "checked" | "label" | "onChange">;
  radioButtonProps?: Omit<
    ButtonProps,
    "aria-label" | "children" | "onClick" | "selected"
  >;
  onCheckedChange: (checked: boolean) => void;
  onSelect: () => void;
};

export function CheckRadioButton({
  checked,
  children,
  checkLabel,
  selectLabel,
  selected,
  checkboxProps,
  radioButtonProps,
  onCheckedChange,
  onSelect,
  ...baseProps
}: CheckRadioButtonProps) {
  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName="CheckRadioButton"
    >
      <Checkbox
        {...checkboxProps}
        activeColor="COLOR_ACCENT_ONE"
        checked={checked}
        className={styles.checkbox}
        label={checkLabel}
        onChange={onCheckedChange}
      />
      <Button
        {...radioButtonProps}
        activeColor="COLOR_ACCENT_TWO"
        aria-checked={selected}
        aria-label={selectLabel}
        className={styles.radio}
        role="radio"
        selected={selected}
        width="100%"
        onClick={onSelect}
      >
        {children}
      </Button>
    </Base>
  );
}
