import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { CopyPlus, Trash2 } from "lucide-react";

import { Button, type ButtonProps } from "../Button";

export type DeleteButtonProps = Omit<
  ButtonProps,
  "aria-label" | "aria-pressed" | "children" | "onClick" | "selected"
> & {
  action?: "delete" | "reset" | "duplicate" | "run";
  armedColor?: string;
  children?: ReactNode;
  confirmation?: boolean;
  label: string;
  onDelete: () => void | Promise<void>;
  timeout?: number;
};

export function DeleteButton({
  action = "delete",
  children,
  confirmation = true,
  label,
  onDelete,
  timeout = 500,
  armedColor = "COLOR_ERROR",
  ...buttonProps
}: DeleteButtonProps) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
  }, []);

  function click(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (pendingRef.current) return;
    if (armed || !confirmation) {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      timeoutId.current = null;
      setArmed(false);
      pendingRef.current = true;
      setPending(true);
      try {
        void Promise.resolve(onDelete())
          .catch(() => undefined)
          .finally(releasePending);
      } catch {
        releasePending();
      }
      return;
    }
    setArmed(true);
    timeoutId.current = setTimeout(() => {
      timeoutId.current = null;
      setArmed(false);
    }, timeout);
  }

  function releasePending() {
    pendingRef.current = false;
    setPending(false);
  }

  const sharedButtonProps: ButtonProps = {
    ...buttonProps,
    componentName: "DeleteButton",
    activeColor: armedColor,
    background: action === "duplicate" ? "COLOR_SURFACE" : buttonProps.background,
    selected: armed,
    disabled: buttonProps.disabled || pending,
    "aria-label": `${pending
      ? action === "delete" ? "Deleting" : action === "duplicate" ? "Duplicating" : action === "run" ? "Running" : "Resetting"
      : armed ? `Confirm ${action === "run" ? "action" : action} for`
        : confirmation ? `Arm ${action === "run" ? "action" : action} for` : `${action === "delete" ? "Delete" : action === "duplicate" ? "Duplicate" : action === "run" ? "Run" : "Reset"}`} ${label}`,
    onClick: click,
  };

  return <Button {...sharedButtonProps}>{children ?? (action === "duplicate" ? <CopyPlus aria-hidden="true" /> : <Trash2 aria-hidden="true" />)}</Button>;
}
