import { Base, type BaseStyleProps } from "../Base";
import { AgentModuleButton } from "../AgentModuleButton";
import { CronModuleButton } from "../CronModuleButton";
import { DataModuleButton } from "../DataModuleButton";
import { FuncModuleButton } from "../FuncModuleButton";
import type { ModuleMenuItem } from "../ModuleMenu";
import styles from "./ModulePanel.module.css";

export const modulePanelItems = ["AGNT", "DATA", "FUNC", "CRON"] as const;
export type ModulePanelButtonProps = BaseStyleProps & {
  activeColor: string;
  symbol: string;
};

export type ModulePanelProps = BaseStyleProps & {
  activeItem: ModuleMenuItem;
  moduleButtonProps: Record<
    typeof modulePanelItems[number],
    ModulePanelButtonProps
  >;
  onChange: (item: ModuleMenuItem) => void;
};

export function ModulePanel({
  activeItem,
  moduleButtonProps,
  onChange,
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
      <AgentModuleButton
        {...moduleButtonProps.AGNT}
        selected={activeItem === "AGNT"}
        onClick={() => onChange("AGNT")}
      />
      <DataModuleButton
        {...moduleButtonProps.DATA}
        selected={activeItem === "DATA"}
        onClick={() => onChange("DATA")}
      />
      <FuncModuleButton
        {...moduleButtonProps.FUNC}
        selected={activeItem === "FUNC"}
        onClick={() => onChange("FUNC")}
      />
      <CronModuleButton
        {...moduleButtonProps.CRON}
        selected={activeItem === "CRON"}
        onClick={() => onChange("CRON")}
      />
    </Base>
  );
}
