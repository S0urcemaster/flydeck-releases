import { Base, resolveCssValue, type BaseProps } from "../Base";
import styles from "./AppStatusLine.module.css";

export type AppStatusLineProps = Omit<
  BaseProps<"output">,
  "children" | "color"
> & {
  error?: boolean;
  fontSize?: string;
  fontWeight?: string;
  offline?: boolean;
  message: string;
};

export function AppStatusLine({
  error = false,
  offline = false,
  message,
  background,
  border,
  fontSize,
  fontWeight,
  style,
  ...baseProps
}: AppStatusLineProps) {
  return (
    <Base
      {...baseProps}
      as="output"
      className={styles.root}
      componentName="AppStatusLine"
      background={background}
      border={border}
      color={offline
        ? "COLOR_ACCENT_ONE"
        : error ? "COLOR_ERROR" : "COLOR_SUCCESS"}
      role="status"
      aria-live="polite"
      style={{
        ...style,
        fontSize: resolveCssValue(fontSize),
        fontWeight: error ? "700" : fontWeight,
      }}
      title={message}
      aria-label={`Server status: ${message}`}
    >
      {message}
    </Base>
  );
}
