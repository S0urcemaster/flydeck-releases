import { Blocks, Bot, Database, Focus } from "lucide-react";

import { Base, type BaseStyleProps } from "../Base";
import { ModuleButton, type ModuleButtonProps } from "../ModuleButton";
import type { ModuleMenuItem } from "../ModuleMenu";
import styles from "./ModulePanel.module.css";

export const modulePanelItems = ["AGNT", "DATA", "LENS", "FUNC"] as const;
export type ModulePanelButtonProps = Omit<
  ModuleButtonProps,
  "children" | "onClick" | "selected" | "symbol"
>;

export type ModulePanelProps = BaseStyleProps & {
  activeItem: ModuleMenuItem;
  moduleButtonProps: ModulePanelButtonProps;
  onChange: (item: ModuleMenuItem) => void;
  agentEnabled?: boolean;
};

export function ModulePanel({
  activeItem,
  moduleButtonProps,
  onChange,
  agentEnabled = true,
  color,
  background,
  border,
  padding,
  margin,
  width,
  height,
}: ModulePanelProps) {
  return (
    <Base
      as="nav"
      componentName="ModulePanel"
      className={styles.root}
      aria-label="Module panel"
      color={color}
      background={background}
      border={border}
      padding={padding}
      margin={margin}
      width={width}
      height={height}
    >
      {agentEnabled && <ModuleButton
        {...moduleButtonProps}
        symbol={<Bot size="1em" strokeWidth={1.8} />}
        selected={activeItem === "AGNT"}
        onClick={() => onChange("AGNT")}
      >AGNT</ModuleButton>}
      <ModuleButton
        {...moduleButtonProps}
        symbol={<Database size="1em" strokeWidth={1.8} />}
        selected={activeItem === "DATA"}
        onClick={() => onChange("DATA")}
      >DATA</ModuleButton>
      <ModuleButton
        {...moduleButtonProps}
        symbol={<Focus size="1em" strokeWidth={1.8} />}
        selected={activeItem === "LENS"}
        onClick={() => onChange("LENS")}
      >LENS</ModuleButton>
      <ModuleButton
        {...moduleButtonProps}
        symbol={<Blocks size="1em" strokeWidth={1.8} />}
        selected={activeItem === "FUNC"}
        onClick={() => onChange("FUNC")}
      >APPS</ModuleButton>
    </Base>
  );
}
