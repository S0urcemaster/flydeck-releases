import { createContext, useContext, type ReactNode } from "react";

import { Button, type ButtonProps } from "../Button";
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
  symbol: ReactNode;
  symbolLeft?: string;
  symbolTop?: string;
};

export function SymbolButton({
  componentName = "SymbolButton",
  symbol,
  symbolLeft,
  symbolTop,
  ...buttonProps
}: SymbolButtonProps) {
  const configuredDefaults = useContext(SymbolButtonConfigurationContext);
  return (
    <Button {...buttonProps} componentName={componentName}>
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
    </Button>
  );
}
