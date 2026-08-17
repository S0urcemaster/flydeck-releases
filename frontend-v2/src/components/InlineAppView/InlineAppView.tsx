import { Base, type BaseStyleProps } from "../Base";
import styles from "./InlineAppView.module.css";

export type InlineAppViewProps = BaseStyleProps & {
  children?: React.ReactNode;
  componentName?: string;
};

export function InlineAppView({
  children,
  componentName = "InlineAppView",
  ...baseProps
}: InlineAppViewProps) {
  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName={componentName}
    >
      {children}
    </Base>
  );
}
