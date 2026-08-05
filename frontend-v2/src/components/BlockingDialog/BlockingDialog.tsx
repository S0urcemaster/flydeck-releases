import { useEffect, type ReactNode } from "react";
import { Base, type BaseStyleProps } from "../Base";
import { Button, type ButtonProps } from "../Button";
import styles from "./BlockingDialog.module.css";

export type BlockingDialogProps = BaseStyleProps & {
  actions?: ReactNode;
  buttonProps?: ButtonProps;
  children?: ReactNode;
  closeLabel?: string;
  open: boolean;
  onClose?: () => void;
  title: string;
  viewport?: "screen" | "container";
};

export function BlockingDialog({
  actions,
  buttonProps,
  children,
  closeLabel = "Close dialog",
  open,
  onClose,
  title,
  viewport = "screen",
  color = "COLOR_TEXT",
  background = "COLOR_SURFACE",
  border = "BORDER_STANDARD",
  padding = "SPACE_MD",
  ...baseProps
}: BlockingDialogProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      data-component-name="BlockingDialog"
      data-viewport={viewport}
    >
      <Base
        {...baseProps}
        className={styles.dialog}
        color={color}
        background={background}
        border={border}
        padding={padding}
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocking-dialog-title"
      >
        <header className={styles.header}>
          <h2 id="blocking-dialog-title" className={styles.title}>{title}</h2>
          {onClose && (
            <Button
              {...buttonProps}
              className={styles.close}
              aria-label={closeLabel}
              onClick={onClose}
              size="compact"
            >
              ×
            </Button>
          )}
        </header>
        <div className={styles.content}>{children}</div>
        {actions && <footer className={styles.actions}>{actions}</footer>}
      </Base>
    </div>
  );
}
