import { createContext, useContext, type ReactNode } from "react";

import { Button, type ButtonProps } from "../Button";
import { PressButton } from "../PressButton";
import { resolveCssValue } from "../Base";
import styles from "./SymbolButton.module.css";

type SymbolButtonConfiguration = {
  symbolLeft?: string;
  symbolTop?: string;
};

const SymbolButtonConfigurationContext = createContext<SymbolButtonConfiguration>({});

export type SymbolButtonConfigurationProviderProps = SymbolButtonConfiguration & {
  children: ReactNode;
};

export function SymbolButtonConfigurationProvider({
  children,
  symbolLeft,
  symbolTop,
}: SymbolButtonConfigurationProviderProps) {
  return (
    <SymbolButtonConfigurationContext.Provider value={{ symbolLeft, symbolTop }}>
      {children}
    </SymbolButtonConfigurationContext.Provider>
  );
}

export type SymbolButtonProps = Omit<ButtonProps, "children"> & {
  activateOnPress?: boolean;
  symbol: ReactNode;
  symbolLeft?: string;
  symbolTop?: string;
};

export function SymbolButton({
  activateOnPress = false,
  componentName = "SymbolButton",
  symbol,
  symbolLeft,
  symbolTop,
  ...buttonProps
}: SymbolButtonProps) {
  const configuredDefaults = useContext(SymbolButtonConfigurationContext);
  const ButtonComponent = activateOnPress ? PressButton : Button;
  return (
    <ButtonComponent {...buttonProps} componentName={componentName}>
      <span
        className={styles.symbol}
        aria-hidden="true"
        style={{
          left: resolveCssValue(symbolLeft ?? configuredDefaults.symbolLeft ?? "-1px"),
          top: resolveCssValue(symbolTop ?? configuredDefaults.symbolTop ?? "2px"),
        }}
      >
        {symbol}
      </span>
    </ButtonComponent>
  );
}
