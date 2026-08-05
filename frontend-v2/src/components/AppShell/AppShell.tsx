import type { CSSProperties, ReactNode } from "react";
import {
  Base,
  resolveCssValue,
  type BaseStyleProps,
} from "../Base";
import {
  BackgroundLogo,
  type BackgroundLogoProps,
} from "../BackgroundLogo";
import styles from "./AppShell.module.css";

export type AppShellProps = BaseStyleProps & {
  title: ReactNode;
  children?: ReactNode;
  respectSafeArea?: boolean;
  viewport?: "screen" | "container";
  backgroundLogoProps?: BackgroundLogoProps;
  interactionBlocked?: boolean;
};

export function AppShell({
  title,
  children,
  respectSafeArea = true,
  viewport = "screen",
  backgroundLogoProps,
  interactionBlocked = false,
  color,
  background,
  border,
  padding,
  margin,
  width,
  height,
}: AppShellProps) {
  const shellStyle = {
    "--app-shell-padding": resolveCssValue(padding),
  } as CSSProperties;

  return (
    <Base
      as="div"
      className={styles.root}
      componentName="AppShell"
      color={color}
      background={background}
      border={border}
      style={shellStyle}
      margin={margin}
      width={width}
      height={height}
      data-safe-area={respectSafeArea}
      data-viewport={viewport}
      inert={interactionBlocked || undefined}
      aria-hidden={interactionBlocked || undefined}
    >
      <div className={styles.backgroundLayer} aria-hidden="true">
        <BackgroundLogo {...backgroundLogoProps} />
      </div>
      <div className={styles.title}>{title}</div>
      <main className={styles.content}>{children}</main>
    </Base>
  );
}
