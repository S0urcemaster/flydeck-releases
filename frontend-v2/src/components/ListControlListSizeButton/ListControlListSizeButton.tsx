import { PressButton, type PressButtonProps } from "../PressButton";

export type ListControlListSize = 3 | 6 | 9 | 12;

export type ListControlListSizeButtonProps = Omit<
  PressButtonProps,
  "aria-label" | "children" | "onClick"
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
    <PressButton
      {...buttonProps}
      componentName={componentName}
      aria-label={`List size ${listSizeLabel(pageSize)} (${pageSize} items); change to ${listSizeLabel(nextPageSize)} (${nextPageSize} items)`}
      onClick={() => onPageSizeChange(nextPageSize)}
    >
      {listSizeLabel(pageSize)}
    </PressButton>
  );
}

function listSizeLabel(pageSize: ListControlListSize) {
  if (pageSize === 3) return "S";
  if (pageSize === 6) return "M";
  if (pageSize === 9) return "L";
  return "XL";
}

export function nextListControlListSize(
  currentPageSize: ListControlListSize,
): ListControlListSize {
  if (currentPageSize === 3) return 6;
  if (currentPageSize === 6) return 9;
  if (currentPageSize === 9) return 12;
  return 3;
}
