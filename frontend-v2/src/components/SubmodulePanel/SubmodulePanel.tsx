import { Base, type BaseStyleProps } from "../Base";
import {
  SubmoduleButton,
  type SubmoduleButtonProps,
} from "../SubmoduleButton";
import styles from "./SubmodulePanel.module.css";

export type AgentSubmodule = "CHAT" | "MEMO";

export type SubmodulePanelProps = BaseStyleProps & {
  activeItem: AgentSubmodule;
  items?: readonly AgentSubmodule[];
  onChange: (item: AgentSubmodule) => void;
  buttonProps?: Omit<SubmoduleButtonProps, "children" | "onClick" | "selected">;
};

export function SubmodulePanel({
  activeItem,
  items = ["CHAT", "MEMO"],
  onChange,
  buttonProps,
  color = "inherit",
  background = "transparent",
  border = "0",
  padding = "0",
  ...baseProps
}: SubmodulePanelProps) {
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
      {items.map((item) => (
        <SubmoduleButton
          key={item}
          {...buttonProps}
          selected={activeItem === item}
          onClick={() => onChange(item)}
        >
          {item}
        </SubmoduleButton>
      ))}
    </Base>
  );
}
