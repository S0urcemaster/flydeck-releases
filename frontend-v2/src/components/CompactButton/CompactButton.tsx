import { Button, type ButtonProps } from "../Button";
import styles from "./CompactButton.module.css";

export type CompactButtonProps = ButtonProps & {
  hasChildren?: boolean;
};

export function CompactButton({
  border,
  className,
  componentName = "CompactButton",
  hasChildren = false,
  ...props
}: CompactButtonProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;
  return (
    <Button
      {...props}
      border={hasChildren ? "2px solid COLOR_BORDER" : border}
      className={classes}
      componentName={componentName}
      data-has-children={hasChildren || undefined}
      size="compact"
    />
  );
}
