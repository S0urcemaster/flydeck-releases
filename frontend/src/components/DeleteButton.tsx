import { Trash2 } from "lucide-react";

type DeleteButtonProps = {
  label: string;
  armed: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function DeleteButton({ label, armed, disabled = false, onClick }: DeleteButtonProps) {
  return (
    <button
      className={`delete-button ${armed ? "armed" : ""}`.trim()}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Delete ${label}`}
      title={`Delete ${label}`}
    >
      <Trash2 size={19} />
    </button>
  );
}
