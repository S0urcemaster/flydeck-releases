import { PressButton, type PressButtonProps } from "../PressButton";

export type ListControlListSize = 3 | 5 | 9;

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
  return (
    <PressButton
      {...buttonProps}
      componentName={componentName}
      aria-label={`List size ${pageSize}; change to ${nextListControlListSize(pageSize)}`}
      onClick={() => onPageSizeChange(nextListControlListSize(pageSize))}
    >
      {pageSize}
    </PressButton>
  );
}

export function nextListControlListSize(
  currentPageSize: ListControlListSize,
): ListControlListSize {
  if (currentPageSize === 3) return 5;
  if (currentPageSize === 5) return 9;
  return 3;
}
