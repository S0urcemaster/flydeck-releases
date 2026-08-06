import {
  DialerButton,
  type DialerButtonProps,
} from "../DialerButton";
import styles from "./DialerCenterButton.module.css";

export type DialerCenterButtonProps = DialerButtonProps;

export function DialerCenterButton({
  componentName = "DialerCenterButton",
  className,
  ...props
}: DialerCenterButtonProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;
  return (
    <DialerButton
      {...props}
      className={classes}
      componentName={componentName}
    />
  );
}
