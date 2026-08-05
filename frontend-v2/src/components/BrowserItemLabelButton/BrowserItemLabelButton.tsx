import { Button, type ButtonProps } from "../Button";
import styles from "./BrowserItemLabelButton.module.css";

export type BrowserItemLabelButtonProps = ButtonProps;

export function BrowserItemLabelButton({
  className,
  componentName = "BrowserItemLabelButton",
  ...props
}: BrowserItemLabelButtonProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;
  return (
    <Button
      {...props}
      className={classes}
      componentName={componentName}
    />
  );
}
