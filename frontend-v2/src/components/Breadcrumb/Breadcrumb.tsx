import { Base, type BaseStyleProps } from "../Base";
import {
  CompactButton,
  type CompactButtonProps,
} from "../CompactButton";
import styles from "./Breadcrumb.module.css";

export type BreadcrumbItem = {
  hasChildren: boolean;
  id: string;
  label: string;
};

export type BreadcrumbProps = BaseStyleProps & {
  buttonProps?: Omit<
    CompactButtonProps,
    | "aria-current"
    | "aria-label"
    | "children"
    | "hasChildren"
    | "onClick"
    | "selected"
  >;
  currentId: string;
  emptyLabel?: string;
  items: readonly BreadcrumbItem[];
  onSelect: (id: string) => void;
};

export function Breadcrumb({
  buttonProps,
  currentId,
  emptyLabel = "root",
  items,
  onSelect,
  ...baseProps
}: BreadcrumbProps) {
  return (
    <Base
      {...baseProps}
      as="nav"
      aria-label="Breadcrumb"
      className={styles.root}
      componentName="Breadcrumb"
    >
      {items.length === 0 && (
        <CompactButton
          {...buttonProps}
          aria-label={emptyLabel}
          border="1px dashed COLOR_BORDER"
          disabled
        >
          {emptyLabel}
        </CompactButton>
      )}
      {items.map((item) => (
        <CompactButton
          {...buttonProps}
          aria-current={item.id === currentId ? "page" : undefined}
          aria-label={`Open ${item.label}`}
          hasChildren={item.hasChildren}
          key={item.id}
          selected={item.id === currentId}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </CompactButton>
      ))}
    </Base>
  );
}
