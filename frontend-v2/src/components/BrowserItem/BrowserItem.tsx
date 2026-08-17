import { type MouseEvent } from "react";

import { Base, type BaseStyleProps } from "../Base";
import { type ButtonProps } from "../Button";
import {
  BrowserItemLabelButton,
  type BrowserItemLabelButtonProps,
} from "../BrowserItemLabelButton";
import { Checkbox, type CheckboxProps } from "../Checkbox";
import styles from "./BrowserItem.module.css";

export type BrowserItemProps = BaseStyleProps & {
  activeColor?: string;
  checked: boolean;
  label: string;
  itemNumber: number;
  selected?: boolean;
  onCheckedChange: (checked: boolean) => void;
  onSelect?: () => void;
  buttonProps?: Omit<
    ButtonProps,
    "aria-label" | "children" | "disabled" | "onClick"
  >;
  labelButtonProps?: Omit<
    BrowserItemLabelButtonProps,
    "children" | "onClick"
  >;
  checkboxProps?: Omit<CheckboxProps, "checked" | "label" | "onChange">;
};

export function BrowserItem({
  activeColor = "COLOR_ACCENT_ONE",
  checked,
  label,
  itemNumber,
  selected = false,
  onCheckedChange,
  onSelect,
  buttonProps,
  checkboxProps,
  labelButtonProps,
  color,
  background,
  border,
  ...baseProps
}: BrowserItemProps) {
  function stopRowClick(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
        <Base
          {...baseProps}
          className={styles.root}
          componentName="BrowserItem"
          color={color}
          background={background}
          border={border}
          onClick={(event) => {
            if ((event.target as Element).closest("button")) return;
            onSelect?.();
          }}
        >
          <div onClick={stopRowClick}>
            <Checkbox
              {...checkboxProps}
              activeColor={activeColor}
              background={background}
              checked={checked}
              label={`${checked ? "Deselect" : "Select"} ${label} for actions`}
              onChange={onCheckedChange}
            >
              {itemNumber}
            </Checkbox>
          </div>
          <BrowserItemLabelButton
            {...buttonProps}
            {...labelButtonProps}
            activeColor={activeColor}
            background={background}
            selected={selected}
            onPointerDown={(event) => {
              const configuredPointerDown = labelButtonProps?.onPointerDown
                ?? buttonProps?.onPointerDown;
              configuredPointerDown?.(event);
              stopRowClick(event);
            }}
            onClick={(event) => {
              stopRowClick(event);
              if (!event.defaultPrevented) onSelect?.();
            }}
          >
            {label}
          </BrowserItemLabelButton>
        </Base>
  );
}
