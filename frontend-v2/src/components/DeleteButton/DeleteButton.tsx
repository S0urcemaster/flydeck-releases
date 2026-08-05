import { useEffect, useRef, useState, type MouseEvent } from "react";

import { Button, type ButtonProps } from "../Button";

export type DeleteButtonProps = Omit<
  ButtonProps,
  "aria-label" | "aria-pressed" | "children" | "onClick" | "selected"
> & {
  armedColor?: string;
  label: string;
  onDelete: () => void | Promise<void>;
  timeout?: number;
};

export function DeleteButton({
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
    if (armed) {
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

  return (
    <Button
      {...buttonProps}
      componentName="DeleteButton"
      activeColor={armedColor}
      selected={armed}
      disabled={buttonProps.disabled || pending}
      aria-label={`${pending ? "Deleting" : armed ? "Confirm delete for" : "Arm delete for"} ${label}`}
      onClick={click}
    >
      ×
    </Button>
  );
}
