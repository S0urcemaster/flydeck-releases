import { type MouseEvent } from "react";

import { Base, type BaseStyleProps } from "../Base";
import { type ButtonProps } from "../Button";
import {
  BrowserItemLabelButton,
  type BrowserItemLabelButtonProps,
} from "../BrowserItemLabelButton";
import {
  BrowserItemModeButton,
  type BrowserItemMode,
  type BrowserItemModeButtonProps,
} from "../BrowserItemModeButton";
import { Checkbox, type CheckboxProps } from "../Checkbox";
import {
  DeleteButton,
  type DeleteButtonProps,
} from "../DeleteButton";
import styles from "./BrowserItem.module.css";

export type BrowserItemProps = BaseStyleProps & {
  activeColor?: string;
  checked: boolean;
  editable?: boolean;
  label: string;
  itemNumber: number;
  selected?: boolean;
  onDelete: () => void | Promise<void>;
  onCheckedChange: (checked: boolean) => void;
  onSelect?: () => void;
  mode?: BrowserItemMode;
  onModeChange?: (mode: BrowserItemMode) => void;
  buttonProps?: Omit<
    ButtonProps,
    "aria-label" | "children" | "disabled" | "onClick"
  >;
  labelButtonProps?: Omit<
    BrowserItemLabelButtonProps,
    "children" | "onClick"
  >;
  modeButtonProps?: Omit<
    BrowserItemModeButtonProps,
    "mode" | "onModeChange"
  >;
  checkboxProps?: Omit<CheckboxProps, "checked" | "label" | "onChange">;
  deleteButtonProps?: Omit<
    DeleteButtonProps,
    | "label"
    | "onDelete"
  >;
};

export function BrowserItem({
  activeColor = "COLOR_ACCENT_ONE",
  checked,
  editable = true,
  label,
  itemNumber,
  selected = false,
  onDelete,
  onCheckedChange,
  onSelect,
  mode = "list",
  onModeChange,
  buttonProps,
  checkboxProps,
  deleteButtonProps,
  labelButtonProps,
  modeButtonProps,
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
              if (!event.defaultPrevented && event.isPrimary && event.button === 0) {
                onSelect?.();
              }
            }}
            onClick={(event) => {
              stopRowClick(event);
              if (event.detail === 0) onSelect?.();
            }}
          >
            {label}
          </BrowserItemLabelButton>
          {selected && (
            <div className={styles.actions} onClick={stopRowClick}>
              <BrowserItemModeButton
                {...buttonProps}
                {...modeButtonProps}
                activeColor={activeColor}
                background={background}
                disabled={!onModeChange}
                mode={mode}
                onModeChange={onModeChange ?? (() => undefined)}
              />
              <DeleteButton
                {...buttonProps}
                {...deleteButtonProps}
                background={background}
                className={styles.action}
                disabled={!editable}
                label={label}
                onDelete={onDelete}
              />
            </div>
          )}
        </Base>
  );
}
