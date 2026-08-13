import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";

import { Base, type BaseStyleProps } from "../Base";
import type { InputProps } from "../Input";
import { InputControl } from "../InputControl";
import {
  ListControlButton,
  type ListControlButtonProps,
} from "../ListControlButton";
import {
  ListControlListSizeButton,
  type ListControlListSize,
  type ListControlListSizeButtonProps,
} from "../ListControlListSizeButton";
import styles from "./ListControl.module.css";

export type ListControlProps = BaseStyleProps & {
  editable?: boolean;
  itemCount: number;
  itemLimit?: number;
  itemNames: readonly string[];
  selectedName?: string;
  page: number;
  pageSize: ListControlListSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: ListControlListSize) => void;
  onNew?: (name: string) => void;
  onRename?: (name: string) => void;
  moveDownDisabled?: boolean;
  moveUpDisabled?: boolean;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  buttonProps?: Omit<
    ListControlButtonProps,
    "aria-label" | "symbol" | "disabled" | "onClick"
  >;
  inputProps?: Omit<
    InputProps,
    | "aria-label"
    | "onBlur"
    | "onChange"
    | "onFocus"
    | "onKeyDown"
    | "type"
    | "value"
  >;
  listSizeButtonProps?: Omit<
    ListControlListSizeButtonProps,
    | "currentPage"
    | "onPageSizeChange"
    | "pageSize"
    | "totalPages"
  >;
  newButtonProps?: Omit<
    ListControlButtonProps,
    "aria-label" | "symbol" | "disabled" | "onClick"
  >;
};

export function ListControl({
  editable = true,
  itemCount,
  itemLimit,
  itemNames,
  selectedName,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onNew,
  onRename,
  moveDownDisabled = true,
  moveUpDisabled = true,
  onMoveDown,
  onMoveUp,
  buttonProps,
  inputProps,
  listSizeButtonProps,
  newButtonProps,
  color,
  background,
  border,
  ...baseProps
}: ListControlProps) {
  const [draft, setDraft] = useState({
    selectedName,
    value: selectedName ?? "",
  });
  const [inputFocused, setInputFocused] = useState(false);
  const draftName = draft.selectedName === selectedName
    ? draft.value
    : selectedName ?? "";
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const safePage = Math.min(page, pageCount - 1);
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
    <Base
      {...baseProps}
      className={styles.root}
      componentName="ListControl"
      color={color}
      background={background}
      border={border}
      aria-label={`${pageSize} items per page`}
    >
      <ListControlListSizeButton
        {...buttonProps}
        {...listSizeButtonProps}
        className={styles.status}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
      <InputControl
        control="input"
        keyboardLayout="block"
        value={draftName}
        onChange={(value) => setDraft({
          selectedName,
          value,
        })}
        onEditingChange={setInputFocused}
        inputProps={{
          ...inputProps,
          "aria-label": "New item name",
          label: "Name",
          className: styles.input,
          type: "text",
          disabled: !editable,
          onKeyDown: (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              createItem();
            }
          },
        }}
        keyboardActions={(
          <>
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
          </>
        )}
      />
      <div className={styles.actions}>
        {!inputFocused && (
          <>
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
      </div>
    </Base>
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
