import { Base, type BaseStyleProps } from "../Base";
import {
  CompactButton,
  type CompactButtonProps,
} from "../CompactButton";
import styles from "./ItemList.module.css";

export type ItemListItem = {
  hasChildren: boolean;
  id: string;
  label: string;
};

export type ItemListProps = BaseStyleProps & {
  buttonProps?: Omit<
    CompactButtonProps,
    "aria-label" | "children" | "hasChildren" | "onClick" | "selected"
  >;
  items: readonly ItemListItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function ItemList({
  buttonProps,
  items,
  selectedId,
  onSelect,
  ...baseProps
}: ItemListProps) {
  return (
    <Base
      {...baseProps}
      as="nav"
      aria-label="Items"
      className={styles.root}
      componentName="ItemList"
    >
      {items.map((item) => (
        <CompactButton
          {...buttonProps}
          aria-label={`Select ${item.label}`}
          hasChildren={item.hasChildren}
          key={item.id}
          selected={item.id === selectedId}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </CompactButton>
      ))}
    </Base>
  );
}
