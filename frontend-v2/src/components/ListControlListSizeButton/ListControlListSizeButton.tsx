import { PressButton, type PressButtonProps } from "../PressButton";

export type ListControlListSize = 3 | 5 | 10;

export type ListControlListSizeButtonProps = Omit<
  PressButtonProps,
  "aria-label" | "children" | "onClick"
> & {
  currentPage: number;
  pageSize: ListControlListSize;
  totalPages: number;
  onPageSizeChange: (pageSize: ListControlListSize) => void;
};

export function ListControlListSizeButton({
  currentPage,
  pageSize,
  totalPages,
  onPageSizeChange,
  componentName = "ListControlListSizeButton",
  ...buttonProps
}: ListControlListSizeButtonProps) {
  return (
    <PressButton
      {...buttonProps}
      componentName={componentName}
      aria-label={`List size ${pageSize}; change to ${nextListControlListSize(pageSize)}`}
      onClick={() => onPageSizeChange(nextListControlListSize(pageSize))}
    >
      {currentPage}/{totalPages}
    </PressButton>
  );
}

export function nextListControlListSize(
  currentPageSize: ListControlListSize,
): ListControlListSize {
  if (currentPageSize === 3) return 5;
  if (currentPageSize === 5) return 10;
  return 3;
}
