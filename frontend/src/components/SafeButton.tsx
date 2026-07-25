import type { PointerEventHandler, ReactNode } from "react";

type SafeButtonProps = {
  armed: boolean;
  label: string;
  onArm: () => void;
  onConfirm: () => void;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  children: ReactNode;
};

export function SafeButton({ armed, label, onArm, onConfirm, onPointerDown, children }: SafeButtonProps) {
  return (
    <button
      type="button"
      className={`safe-button ${armed ? "armed" : ""}`}
      onPointerDown={onPointerDown}
      onClick={armed ? onConfirm : onArm}
      aria-label={armed ? `Confirm ${label}` : `Arm ${label}`}
      aria-pressed={armed}
    >
      {children}
    </button>
  );
}
