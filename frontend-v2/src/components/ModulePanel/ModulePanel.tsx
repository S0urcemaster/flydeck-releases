import { useState } from "react";
import { Blocks, Bot, Database, DatabaseZap } from "lucide-react";

import { Base, type BaseStyleProps } from "../Base";
import { ModuleButton, type ModuleButtonProps } from "../ModuleButton";
import { CycleButton } from "../CycleButton";
import type { ModuleMenuItem } from "../ModuleMenu";
import styles from "./ModulePanel.module.css";

export const modulePanelItems = ["AGNT", "DATA", "DATB", "FUNC"] as const;
const dataCycleItems = ["DATB", "DATC", "DATD"] as const;
export type ModulePanelButtonProps = Omit<
  ModuleButtonProps,
  "children" | "onClick" | "selected" | "symbol"
>;

export type ModulePanelProps = BaseStyleProps & {
  activeItem: ModuleMenuItem;
  moduleButtonProps: ModulePanelButtonProps;
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
  const activeDataCycleItem = dataCycleItems.find((item) => item === activeItem);
  const [retainedDataCycleItem, setRetainedDataCycleItem] = useState<
    typeof dataCycleItems[number]
  >(activeDataCycleItem ?? "DATB");
  const dataCycleItem = activeDataCycleItem ?? retainedDataCycleItem;

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
      <ModuleButton
        {...moduleButtonProps}
        symbol={<Bot size="1em" strokeWidth={1.8} />}
        selected={activeItem === "AGNT"}
        onClick={() => onChange("AGNT")}
      >AGNT</ModuleButton>
      <ModuleButton
        {...moduleButtonProps}
        symbol={<Database size="1em" strokeWidth={1.8} />}
        selected={activeItem === "DATA"}
        onClick={() => onChange("DATA")}
      >DATA</ModuleButton>
      <CycleButton
        {...moduleButtonProps}
        aria-label={`Data navigation slot ${dataCycleItem.slice(-1)}`}
        options={dataCycleItems}
        selected={Boolean(activeDataCycleItem)}
        showAlternatives={false}
        symbol={<DatabaseZap size="1em" strokeWidth={1.8} />}
        value={dataCycleItem}
        onPress={(current) => {
          if (!activeDataCycleItem) onChange(current as ModuleMenuItem);
        }}
        onChange={(next) => {
          const item = next as typeof dataCycleItems[number];
          setRetainedDataCycleItem(item);
          if (activeDataCycleItem) onChange(item);
        }}
      />
      <ModuleButton
        {...moduleButtonProps}
        symbol={<Blocks size="1em" strokeWidth={1.8} />}
        selected={activeItem === "FUNC"}
        onClick={() => onChange("FUNC")}
      >APPS</ModuleButton>
    </Base>
  );
}
