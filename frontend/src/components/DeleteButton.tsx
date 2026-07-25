import { Trash2 } from "lucide-react";

type DeleteButtonProps = {
  label: string;
  armed: boolean;
  onClick: () => void;
};

export function DeleteButton({ label, armed, onClick }: DeleteButtonProps) {
  return (
    <button
      className={`delete-button ${armed ? "armed" : ""}`.trim()}
      type="button"
      onClick={onClick}
      aria-label={`Delete ${label}`}
      title={`Delete ${label}`}
    >
      <Trash2 size={19} />
    </button>
  );
}
