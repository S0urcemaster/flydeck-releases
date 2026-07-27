import { useEffect, useState, type ReactNode } from "react";

type SafetyButtonProps = {
  label: string;
  disabled?: boolean;
  onConfirm: () => void;
  children: ReactNode;
  timeoutMs?: number;
};

export function SafetyButton({
  label,
  disabled = false,
  onConfirm,
  children,
  timeoutMs = 1_000,
}: SafetyButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timeout = window.setTimeout(() => setArmed(false), timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [armed, timeoutMs]);

  return (
    <button
      type="button"
      className={`safety-button ${armed ? "armed" : ""}`}
      disabled={disabled}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
      aria-label={armed ? `Confirm ${label}` : label}
      aria-pressed={armed}
      title={armed ? `Confirm ${label}` : label}
    >
      {children}
    </button>
  );
}
