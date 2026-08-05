import { Base, type BaseStyleProps } from "../Base";
import {
  ConfigModuleButton,
  type ConfigModuleButtonProps,
} from "../ConfigModuleButton";
import {
  HelpModuleButton,
  type HelpModuleButtonProps,
} from "../HelpModuleButton";
import type { ModuleMenuItem } from "../ModuleMenu";
import styles from "./ModuleMenuActions.module.css";

export type ModuleMenuActionsProps = BaseStyleProps & {
  activeItem: ModuleMenuItem;
  configButtonProps: ConfigModuleButtonProps;
  helpButtonProps: HelpModuleButtonProps;
  onChange: (item: ModuleMenuItem) => void;
};

export function ModuleMenuActions({
  activeItem,
  configButtonProps,
  helpButtonProps,
  onChange,
  ...baseProps
}: ModuleMenuActionsProps) {
  return (
    <Base
      {...baseProps}
      as="nav"
      componentName="ModuleMenuActions"
      className={styles.root}
      aria-label="Module menu actions"
    >
      <HelpModuleButton
        {...helpButtonProps}
        aria-label="Help"
        selected={activeItem === "HELP"}
        onClick={() => onChange("HELP")}
      />
      <ConfigModuleButton
        {...configButtonProps}
        aria-label="Config"
        selected={activeItem === "CONFIG"}
        onClick={() => onChange("CONFIG")}
      />
    </Base>
  );
}
