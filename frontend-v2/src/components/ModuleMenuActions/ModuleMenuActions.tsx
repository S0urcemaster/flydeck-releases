import { WifiOff } from "lucide-react";

import { Base, type BaseStyleProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
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
  offlineButtonProps: Omit<ButtonProps, "children" | "onClick" | "selected">;
  forcedOfflineMode: boolean;
  offline: boolean;
  pendingTransactions: number;
  onChange: (item: ModuleMenuItem) => void;
  onOfflineModeChange: (offline: boolean) => void;
};

export function ModuleMenuActions({
  activeItem,
  configButtonProps,
  helpButtonProps,
  offlineButtonProps,
  forcedOfflineMode,
  offline,
  pendingTransactions,
  onChange,
  onOfflineModeChange,
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
      <Button
        {...offlineButtonProps}
        aria-label={offline
          ? `${forcedOfflineMode ? "Offline test mode: on" : "Offline: no connection"}, ${pendingTransactions} pending transactions`
          : "Offline test mode: off"}
        selected={offline}
        onClick={() => onOfflineModeChange(!forcedOfflineMode)}
      >
        {offline
          ? pendingTransactions
          : <WifiOff size="1em" strokeWidth={1.8} aria-hidden="true" />}
      </Button>
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
