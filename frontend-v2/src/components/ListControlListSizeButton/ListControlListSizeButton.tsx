import { CycleButton, type CycleButtonProps } from "../CycleButton";

export type ListControlListSize = 4 | 7 | 10 | 15;

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
  return (
    <CycleButton
      {...buttonProps}
      componentName={componentName}
      aria-label={`List size ${listSizeLabel(pageSize)} (${pageSize} items); change to ${listSizeLabel(nextPageSize)} (${nextPageSize} items)`}
      options={["S", "M", "L", "X"]}
      value={listSizeLabel(pageSize)}
      onChange={(value) => onPageSizeChange(pageSizeForLabel(value))}
    />
  );
}

function listSizeLabel(pageSize: ListControlListSize) {
  if (pageSize === 4) return "S";
  if (pageSize === 7) return "M";
  if (pageSize === 10) return "L";
  return "X";
}

function pageSizeForLabel(label: string): ListControlListSize {
  if (label === "S") return 4;
  if (label === "M") return 7;
  if (label === "L") return 10;
  return 15;
}

export function nextListControlListSize(
  currentPageSize: ListControlListSize,
): ListControlListSize {
  if (currentPageSize === 4) return 7;
  if (currentPageSize === 7) return 10;
  if (currentPageSize === 10) return 15;
  return 4;
}
