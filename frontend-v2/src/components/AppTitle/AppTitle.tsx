import type { CSSProperties, ReactNode } from "react";
import { Base, type BaseStyleProps } from "../Base";
import styles from "./AppTitle.module.css";

export type AppTitleProps = BaseStyleProps & {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  fontSize?: number;
  titleTop?: number;
  titleLeft?: number;
  flydeckTitleTop?: number;
  flydeckTitleLeft?: number;
  symbolFontSize?: number;
  symbolTop?: number;
  symbolLeft?: number;
  subtitleFontSize?: number;
  subtitleTop?: number;
  subtitleLeft?: number;
};

type AppTitleStyle = CSSProperties & {
  "--app-title-font-size"?: string;
  "--app-title-top"?: string;
  "--app-title-left"?: string;
  "--app-title-text-top"?: string;
  "--app-title-text-left"?: string;
  "--app-title-symbol-font-size"?: string;
  "--app-title-symbol-top"?: string;
  "--app-title-symbol-left"?: string;
  "--app-title-subtitle-font-size"?: string;
  "--app-title-subtitle-top"?: string;
  "--app-title-subtitle-left"?: string;
};

export function AppTitle({
  title,
  subtitle,
  action,
  fontSize,
  titleTop,
  titleLeft,
  flydeckTitleTop,
  flydeckTitleLeft,
  symbolFontSize,
  symbolTop,
  symbolLeft,
  subtitleFontSize,
  subtitleTop,
  subtitleLeft,
  color,
  background,
  border,
  padding,
  margin,
  width,
  height,
}: AppTitleProps) {
  const style: AppTitleStyle = {
    "--app-title-font-size": toPixels(fontSize),
    "--app-title-top": toPixels(titleTop),
    "--app-title-left": toPixels(titleLeft),
    "--app-title-text-top": toPixels(flydeckTitleTop),
    "--app-title-text-left": toPixels(flydeckTitleLeft),
    "--app-title-symbol-font-size": toPixels(symbolFontSize),
    "--app-title-symbol-top": toPixels(symbolTop),
    "--app-title-symbol-left": toPixels(symbolLeft),
    "--app-title-subtitle-font-size": toPixels(subtitleFontSize),
    "--app-title-subtitle-top": toPixels(subtitleTop),
    "--app-title-subtitle-left": toPixels(subtitleLeft),
  };

  return (
    <Base
      as="header"
      className={styles.root}
      componentName="AppTitle"
      color={color}
      background={background}
      border={border}
      padding={padding}
      margin={margin}
      width={width}
      height={height}
      style={style}
    >
      <div className={styles.identity}>
        <h1 className={styles.title}>
          <span className={styles.mark} aria-hidden="true">𐦍</span>
          <span className={styles.titleText}>{title}</span>
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.actions}>{action}</div>}
    </Base>
  );
}

function toPixels(value: number | undefined): string | undefined {
  return value === undefined ? undefined : `${value}px`;
}
