import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ListTree,
  Search,
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
  ListControlListSizeButton,
  type ListControlListSize,
  type ListControlListSizeButtonProps,
} from "../ListControlListSizeButton";
import styles from "./ListControl.module.css";

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
  initialView?: "default" | "search";
  itemCount: number;
  selectedName?: string;
  searchValue?: string;
  searchDisabled?: boolean;
  searchActive?: boolean;
  searchEnabled?: boolean;
  searchLocked?: boolean;
  searchDescendants?: boolean;
  onSearchChange?: (value: string) => void;
  onSearchEnabledChange?: (enabled: boolean) => void;
  onSearchDescendantsChange?: (enabled: boolean) => void;
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
  searchInputProps?: ListControlTextInputProps;
};

export function ListControl({
  activeColor = "COLOR_ACCENT_ONE",
  showPageButtons = true,
  showModeButton = false,
  initialView = "default",
  itemCount,
  selectedName,
  searchValue = "",
  searchDisabled = false,
  searchActive,
  searchEnabled = true,
  searchLocked = false,
  searchDescendants = true,
  onSearchChange,
  onSearchEnabledChange,
  onSearchDescendantsChange,
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
  searchInputProps,
  color,
  background,
  border,
  ...baseProps
}: ListControlProps) {
  const [searchView, setSearchView] = useState<{
    selectedName?: string;
    visible: boolean;
  }>({
    selectedName,
    visible: initialView === "search",
  });
  const searchVisible = searchView.visible
    && searchView.selectedName === selectedName
    && !searchDisabled;
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const safePage = Math.min(page, pageCount - 1);

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
      data-view={searchVisible ? "search" : "default"}
    >
      {searchVisible ? (
        <div className={styles.searchInput}>
          <InputControl
            control="input"
            keyboardActions={null}
            keyboardLayout="block"
            onEditingChange={(editing) => {
              if (!editing) setSearchView({ visible: false });
            }}
            value={searchValue}
            onChange={onSearchChange}
            inputProps={{
              ...searchInputProps,
              autoFocus: true,
              "aria-label": `Search children of ${selectedName ?? "selected item"}`,
              label: "Search",
              type: "search",
              disabled: searchDisabled || searchLocked,
            }}
            controlActions={(
              <>
                <Checkbox
                  {...buttonProps}
                  activeColor={activeColor}
                  checked={searchEnabled}
                  disabled={searchDisabled
                    || searchLocked
                    || !searchValue.trim()
                    || !onSearchEnabledChange}
                  label="Search filter"
                  onPointerDown={(event) => event.preventDefault()}
                  onChange={(checked) => onSearchEnabledChange?.(checked)}
                >
                  <Search aria-hidden="true" />
                </Checkbox>
                <Checkbox
                  {...buttonProps}
                  activeColor={activeColor}
                  checked={searchDescendants}
                  disabled={searchDisabled
                    || searchLocked
                    || !onSearchDescendantsChange}
                  label="Search descendants"
                  onPointerDown={(event) => event.preventDefault()}
                  onChange={(checked) => onSearchDescendantsChange?.(checked)}
                >
                  <ListTree aria-hidden="true" />
                </Checkbox>
                <ListControlListSizeButton
                  {...buttonProps}
                  {...listSizeButtonProps}
                  pageSize={childPageSize}
                  onPageSizeChange={(nextPageSize) => {
                    onChildPageSizeChange(nextPageSize);
                    if (mode === "content") onModeChange?.("list");
                  }}
                />
              </>
            )}
          />
        </div>
      ) : (
        <>
          <ListControlButton
            {...buttonProps}
            aria-label={selectedName
              ? `Search children of ${selectedName}`
              : "No selected item"}
            background="COLOR_SURFACE"
            activeColor={activeColor}
            className={styles.label}
            disabled={!selectedName || searchDisabled || searchLocked}
            padding="0"
            selected={searchActive
              ?? (searchEnabled && Boolean(searchValue.trim()))}
            width="100%"
            onClick={() => setSearchView({ selectedName, visible: true })}
          >
            <span className={styles.labelText}>{selectedName ?? ""}</span>
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
  onNew?: (name: string) => void;
  onCheckedChange?: (checked: boolean) => void;
  onDelete?: () => void | Promise<void>;
  onRename?: (name: string) => void;
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
        autoFocus: false,
        "aria-label": "New item name",
        label: "",
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
