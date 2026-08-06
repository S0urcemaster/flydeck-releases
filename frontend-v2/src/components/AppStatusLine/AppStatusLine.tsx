import { PressButton, type PressButtonProps } from "../PressButton";
import styles from "./AppStatusLine.module.css";

export type AppStatusLineProps = Omit<
  PressButtonProps,
  "children" | "color"
> & {
  error?: boolean;
  message: string;
};

export function AppStatusLine({
  error = false,
  message,
  background = "transparent",
  border = "0",
  fontSize = "0.84rem",
  fontWeight = "400",
  ...buttonProps
}: AppStatusLineProps) {
  return (
    <PressButton
      {...buttonProps}
      className={styles.root}
      componentName="AppStatusLine"
      background={background}
      border={border}
      color={error ? "COLOR_ERROR" : "COLOR_SUCCESS"}
      fontSize={fontSize}
      fontWeight={error ? "700" : fontWeight}
      title={message}
      aria-label={`Open server status: ${message}`}
    >
      {message}
    </PressButton>
  );
}
