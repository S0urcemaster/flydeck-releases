import type { CSSProperties } from "react";

import { Base, resolveCssValue, type BaseStyleProps } from "../Base";
import styles from "./BackgroundLogo.module.css";

export type BackgroundLogoProps = BaseStyleProps & {
  symbol?: string;
  fontSizeFactor?: number;
  opacity?: number;
  top?: string;
};

export function BackgroundLogo({
  symbol = "𐦍",
  fontSizeFactor = 1,
  opacity = 0.06,
  top = "0",
  color = "COLOR_TEXT",
  background = "transparent",
  border = "0",
  ...baseProps
}: BackgroundLogoProps) {
  const style = {
    "--background-logo-font-size": createBackgroundLogoFontSize(fontSizeFactor),
    "--background-logo-opacity": opacity,
    "--background-logo-top": resolveCssValue(top),
  } as CSSProperties;

  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName="BackgroundLogo"
      color={color}
      background={background}
      border={border}
      style={style}
      aria-hidden="true"
    >
      {symbol}
    </Base>
  );
}

export function createBackgroundLogoFontSize(factor: number) {
  const scaled = (value: number) => Number((value * factor).toFixed(4));
  return `clamp(${scaled(14)}rem, ${scaled(72)}vw, ${scaled(28)}rem)`;
}
