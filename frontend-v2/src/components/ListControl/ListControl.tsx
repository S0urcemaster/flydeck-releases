import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";

import { Base, type BaseStyleProps } from "../Base";
import { DeleteButton, type DeleteButtonProps } from "../DeleteButton";
import { Checkbox, type CheckboxProps } from "../Checkbox";
import {
  BrowserItemModeButton,
  type BrowserItemMode,
  type BrowserItemModeButtonProps,
} from "../BrowserItemModeButton";
import type { InputProps } from "../Input";
import { InputControl } from "../InputControl";
import {
  ListControlButton,
  type ListControlButtonProps,
} from "../ListControlButton";
import {
  type ListControlListSize,
  type ListControlListSizeButtonProps,
} from "../ListControlListSizeButton";
import styles from "./ListControl.module.css";

function oppositeTreeAccent(activeColor: string) {
  if (activeColor === "COLOR_ACCENT_ONE") return "COLOR_ACCENT_TWO";
  if (activeColor === "COLOR_ACCENT_TWO") return "COLOR_ACCENT_ONE";
  return activeColor;
}

type ListControlTextInputProps = Omit<
  InputProps,
  | "aria-label"
  | "onBlur"
  | "onChange"
  | "onFocus"
  | "onKeyDown"
  | "type"
  | "value"
>;

export type ListControlProps = BaseStyleProps & {
  activeColor?: string;
  showPageButtons?: boolean;
  showModeButton?: boolean;
  initialView?: "default" | "new";
  itemCount: number;
  itemLimit?: number;
  itemNames?: readonly string[];
  newItemCount?: number;
  selectedName?: string;
  newDisabled?: boolean;
  onNew?: (name: string) => void | Promise<void>;
  page: number;
  pageSize: ListControlListSize;
  onPageChange: (page: number) => void;
  childPageSize: ListControlListSize;
  onChildPageSizeChange: (pageSize: ListControlListSize) => void;
  moveDownDisabled?: boolean;
  moveUpDisabled?: boolean;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  mode?: BrowserItemMode;
  onModeChange?: (mode: BrowserItemMode) => void;
  buttonProps?: Omit<
    ListControlButtonProps,
    "aria-label" | "symbol" | "disabled" | "onClick"
  >;
  listSizeButtonProps?: Omit<
    ListControlListSizeButtonProps,
    | "currentPage"
    | "onPageSizeChange"
    | "pageSize"
    | "totalPages"
  >;
  modeButtonProps?: Omit<
    BrowserItemModeButtonProps,
    "mode" | "onModeChange"
  >;
  inputProps?: ListControlTextInputProps;
  newButtonProps?: Omit<
    ListControlButtonProps,
    "aria-label" | "symbol" | "disabled" | "onClick"
  >;
};

export function ListControl({
  activeColor = "COLOR_ACCENT_ONE",
  showPageButtons = true,
  showModeButton = false,
  initialView = "default",
  itemCount,
  itemLimit,
  itemNames = [],
  newItemCount = itemCount,
  selectedName,
  newDisabled = false,
  onNew,
  page,
  pageSize,
  onPageChange,
  childPageSize,
  onChildPageSizeChange,
  moveDownDisabled = true,
  moveUpDisabled = true,
  onMoveDown,
  onMoveUp,
  mode = "list",
  onModeChange,
  buttonProps,
  listSizeButtonProps,
  modeButtonProps,
  inputProps,
  newButtonProps,
  color,
  background,
  border,
  ...baseProps
}: ListControlProps) {
  const [newView, setNewView] = useState<{
    selectedName?: string;
    visible: boolean;
  }>({
    selectedName,
    visible: initialView === "new",
  });
  const newVisible = newView.visible
    && newView.selectedName === selectedName
    && !newDisabled;
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  // Page-size switching is intentionally parked while the tree menu is rebuilt.
  void childPageSize;
  void onChildPageSizeChange;
  void listSizeButtonProps;

  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName="ListControl"
      color={color}
      background={background}
      border={border}
      aria-label={selectedName
        ? `List controls for ${selectedName}`
        : `${pageSize} items per page`}
      data-view={newVisible ? "new" : "default"}
    >
      {newVisible ? (
        <div className={styles.input}>
          <ListControlInput
            activeColor={activeColor}
            buttonProps={buttonProps}
            editable={!newDisabled}
            inputProps={inputProps}
            itemCount={newItemCount}
            itemLimit={itemLimit}
            itemNames={itemNames}
            newButtonProps={newButtonProps}
            onEditingChange={(editing) => {
              if (!editing) setNewView({ visible: false });
            }}
            onNew={onNew}
          />
        </div>
      ) : (
        <>
          <ListControlButton
            {...buttonProps}
            aria-label={selectedName
              ? `Create child in ${selectedName}`
              : "Create root item"}
            background="COLOR_SURFACE"
            activeColor={activeColor}
            className={styles.label}
            disabled={newDisabled || !onNew}
            padding="0"
            selected={newVisible}
            width="100%"
            onClick={() => setNewView({ selectedName, visible: true })}
          >
            <span className={styles.labelText}>{selectedName ?? ""}</span>
            <Base
              as="span"
              componentName="Base"
              className={styles.newItemLabel}
              color={oppositeTreeAccent(activeColor)}
              aria-hidden="true"
            >
              +
            </Base>
          </ListControlButton>
          <div className={styles.actions}>
        <ListControlButton
          {...buttonProps}
          disabled={moveUpDisabled}
          aria-label="Move selected item up"
          onClick={onMoveUp}
          symbol={<ChevronUp aria-hidden="true" />}
        />
        <ListControlButton
          {...buttonProps}
          disabled={moveDownDisabled}
          aria-label="Move selected item down"
          onClick={onMoveDown}
          symbol={<ChevronDown aria-hidden="true" />}
        />
        {showPageButtons && (
          <>
            <ListControlButton
              {...buttonProps}
              componentName="ListControlButton"
              disabled={safePage === 0}
              aria-label="Previous page"
              onClick={() => onPageChange(safePage - 1)}
              symbol={<ChevronLeft aria-hidden="true" />}
            />
            <ListControlButton
              {...buttonProps}
              componentName="ListControlButton"
              disabled={safePage === pageCount - 1}
              aria-label="Next page"
              onClick={() => onPageChange(safePage + 1)}
              symbol={<ChevronRight aria-hidden="true" />}
            />
          </>
        )}
        {showModeButton && onModeChange ? (
          <BrowserItemModeButton
            {...buttonProps}
            {...modeButtonProps}
            activeColor={oppositeTreeAccent(activeColor)}
            mode={mode}
            onModeChange={onModeChange}
          />
        ) : null}
          </div>
        </>
      )}
    </Base>
  );
}

export type ListControlInputProps = {
  activeColor?: string;
  background?: string;
  buttonProps?: ListControlProps["buttonProps"];
  checked?: boolean;
  checkboxProps?: Omit<CheckboxProps, "checked" | "label" | "onChange">;
  deleteButtonProps?: Omit<
    DeleteButtonProps,
    "disabled" | "label" | "onDelete"
  >;
  deleteEnabled?: boolean;
  deleteLabel?: string;
  editable?: boolean;
  inputProps?: ListControlTextInputProps;
  itemCount: number;
  itemLimit?: number;
  itemNames: readonly string[];
  itemNumber?: number;
  newButtonProps?: Omit<
    ListControlButtonProps,
    "aria-label" | "symbol" | "disabled" | "onClick"
  >;
  onNew?: (name: string) => void | Promise<void>;
  onCheckedChange?: (checked: boolean) => void;
  onDelete?: () => void | Promise<void>;
  onRename?: (name: string) => void;
  onEditingChange?: (editing: boolean) => void;
  selectedName?: string;
};

export function ListControlInput({
  activeColor,
  background,
  buttonProps,
  checked,
  checkboxProps,
  deleteButtonProps,
  deleteEnabled = false,
  deleteLabel,
  editable = true,
  inputProps,
  itemCount,
  itemLimit,
  itemNames,
  itemNumber,
  newButtonProps,
  onNew,
  onCheckedChange,
  onDelete,
  onRename,
  onEditingChange,
  selectedName,
}: ListControlInputProps) {
  const [draft, setDraft] = useState({
    selectedName,
    value: selectedName ?? "",
  });
  const draftName = draft.selectedName === selectedName
    ? draft.value
    : selectedName ?? "";
  const normalizedName = draftName.trim();
  const canCreate = Boolean(
    editable
    && itemCount < (itemLimit ?? Infinity)
    && onNew
    && canCreateListName(itemNames, normalizedName),
  );
  const canRename = Boolean(
    editable
    && onRename
    && selectedName
    && normalizedName
    && normalizedName.toLocaleLowerCase()
      !== selectedName.trim().toLocaleLowerCase()
    && !containsListName(itemNames, normalizedName),
  );

  function createItem() {
    if (!canCreate || !onNew) return;
    onNew(normalizedName);
    setDraft({ selectedName, value: "" });
  }

  function renameItem() {
    if (!canRename || !onRename) return;
    onRename(normalizedName);
  }

  return (
    <InputControl
      control="input"
      controlActions={selectedName ? (
        <DeleteButton
          {...buttonProps}
          {...deleteButtonProps}
          disabled={!deleteEnabled || !deleteLabel || !onDelete}
          label={deleteLabel ?? selectedName}
          onDelete={onDelete ?? (() => undefined)}
        />
      ) : null}
      controlLeading={selectedName && checked !== undefined && itemNumber
        && onCheckedChange ? (
          <Checkbox
            {...checkboxProps}
            activeColor={activeColor}
            background={background}
            checked={checked}
            label={`${checked ? "Deselect" : "Select"} ${selectedName} for actions`}
            onChange={onCheckedChange}
          >
            {itemNumber}
          </Checkbox>
        ) : null}
      keyboardLayout="block"
      value={draftName}
      onChange={(value) => setDraft({ selectedName, value })}
      inputProps={{
        ...inputProps,
        autoFocus: selectedName ? false : true,
        "aria-label": selectedName ? "Item name" : "New item name",
        label: "",
        type: "text",
        disabled: !editable,
        onKeyDown: (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (selectedName) renameItem();
            else createItem();
          }
        },
      }}
      onEditingChange={onEditingChange}
      keyboardActions={selectedName ? (
        <ListControlButton
          {...buttonProps}
          disabled={!canRename}
          aria-label="Rename selected item"
          width="100%"
          onPointerDown={(event) => event.preventDefault()}
          onClick={renameItem}
        >
          SAVE
        </ListControlButton>
      ) : (
          <ListControlButton
            {...buttonProps}
            {...newButtonProps}
            disabled={!canCreate}
            aria-label="Create new item"
            width="100%"
            onPointerDown={(event) => event.preventDefault()}
            onClick={createItem}
          >
            NEW
          </ListControlButton>
      )}
    />
  );
}

export function containsListName(
  names: readonly string[],
  candidate: string,
): boolean {
  const normalizedCandidate = candidate.trim().toLocaleLowerCase();
  return names.some(
    (name) => name.trim().toLocaleLowerCase() === normalizedCandidate,
  );
}

export function canCreateListName(
  itemNames: readonly string[],
  candidate: string,
) {
  const normalizedCandidate = candidate.trim();
  return normalizedCandidate !== ""
    && !containsListName(itemNames, normalizedCandidate);
}
