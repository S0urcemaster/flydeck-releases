import { Base, type BaseStyleProps } from "../Base";
import {
  SubmoduleButton,
  type SubmoduleButtonProps,
} from "../SubmoduleButton";
import styles from "./SubmodulePanel.module.css";

export type AgentSubmodule = "CHAT" | "MEMO";

export type SubmodulePanelProps<TItem extends string = AgentSubmodule> = BaseStyleProps & {
  activeItem: TItem;
  items?: readonly TItem[];
  onChange: (item: TItem) => void;
  buttonProps?: Omit<SubmoduleButtonProps, "children" | "onClick" | "selected">;
};

const defaultItems: readonly AgentSubmodule[] = ["CHAT", "MEMO"];

export function SubmodulePanel<TItem extends string = AgentSubmodule>({
  activeItem,
  items = defaultItems as readonly TItem[],
  onChange,
  buttonProps,
  color,
  background,
  border,
  padding,
  ...baseProps
}: SubmodulePanelProps<TItem>) {
  const rows = distributeSubmoduleItems(items);

  return (
    <Base
      {...baseProps}
      as="nav"
      componentName="SubmodulePanel"
      className={styles.root}
      color={color}
      background={background}
      border={border}
      padding={padding}
      aria-label="Submodule panel"
    >
      {rows.map((row, rowIndex) => (
        <div
          key={`${rowIndex}-${row.join("-")}`}
          className={styles.row}
          data-columns={row.length}
        >
          {row.map((item) => (
            <SubmoduleButton
              key={item}
              {...buttonProps}
              width="100%"
              selected={activeItem === item}
              onClick={() => onChange(item)}
            >
              {item}
            </SubmoduleButton>
          ))}
        </div>
      ))}
    </Base>
  );
}

export function distributeSubmoduleItems<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  let index = 0;
  while (index < items.length) {
    const remaining = items.length - index;
    const rowSize = remaining === 4 ? 2 : Math.min(3, remaining);
    rows.push(items.slice(index, index + rowSize));
    index += rowSize;
  }
  return rows;
}
