import { CycleButton, type CycleButtonProps } from "../CycleButton";

export type ListControlListSize = 1 | 2 | 4 | 7 | 10 | 15;

export type ListControlListSizeButtonProps = Omit<
  CycleButtonProps,
  "aria-label" | "onChange" | "onPress" | "options" | "value"
> & {
  pageSize: ListControlListSize;
  onPageSizeChange: (pageSize: ListControlListSize) => void;
};

export function ListControlListSizeButton({
  pageSize,
  onPageSizeChange,
  componentName = "ListControlListSizeButton",
  ...buttonProps
}: ListControlListSizeButtonProps) {
  const nextPageSize = nextListControlListSize(pageSize);
  const label = String(pageSize);
  return (
    <CycleButton
      {...buttonProps}
      componentName={componentName}
      aria-label={`List size ${pageSize} items; change to ${nextPageSize} items`}
      options={["1", "2", "4", "7", "10", "15"]}
      selectedLabel={`Listsize ${pageSize}`}
      value={label}
      width="100%"
      onChange={(value) => onPageSizeChange(pageSizeForLabel(value))}
    />
  );
}

function pageSizeForLabel(label: string): ListControlListSize {
  if (label === "1") return 1;
  if (label === "2") return 2;
  if (label === "4") return 4;
  if (label === "7") return 7;
  if (label === "10") return 10;
  return 15;
}

export function nextListControlListSize(
  currentPageSize: ListControlListSize,
): ListControlListSize {
  if (currentPageSize === 1) return 2;
  if (currentPageSize === 2) return 4;
  if (currentPageSize === 4) return 7;
  if (currentPageSize === 7) return 10;
  if (currentPageSize === 10) return 15;
  return 1;
}
