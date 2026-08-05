import { Base, type BaseStyleProps } from "../Base";
import styles from "./FunctionView.module.css";

export type FunctionViewProps = BaseStyleProps & {
  children?: React.ReactNode;
  componentName?: string;
  title: string;
};

export function FunctionView({
  children,
  componentName = "FunctionView",
  title,
  background = "COLOR_SURFACE",
  border = "BORDER_STANDARD",
  padding = "SPACE_XS",
  ...baseProps
}: FunctionViewProps) {
  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName={componentName}
      background={background}
      border={border}
      padding={padding}
    >
      <div className={styles.title}>{title}</div>
      <div className={styles.content}>{children}</div>
    </Base>
  );
}
