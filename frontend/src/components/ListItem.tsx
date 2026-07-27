import type { ReactNode } from "react";
import { DeleteButton } from "./DeleteButton";

type ListItemProps = {
  label: string;
  armed?: boolean;
  className?: string;
  contentClassName?: string;
  contentAriaDisabled?: boolean;
  contentDisabled?: boolean;
  contentTitle?: string;
  deleteDisabled?: boolean;
  onContentClick: () => void;
  onArmDelete?: () => void;
  children: ReactNode;
};

export function ListItem({
  label,
  armed = false,
  className = "",
  contentClassName = "",
  contentAriaDisabled,
  contentDisabled,
  contentTitle,
  deleteDisabled = false,
  onContentClick,
  onArmDelete,
  children,
}: ListItemProps) {
  return (
    <div className={`list-item ${onArmDelete ? "has-delete" : ""} ${className}`.trim()}>
      <button
        className={`list-item-content ${contentClassName} ${armed ? "delete-armed" : ""}`.trim()}
        type="button"
        onClick={onContentClick}
        aria-disabled={contentAriaDisabled}
        disabled={contentDisabled}
        title={contentTitle}
      >
        {children}
      </button>
      {onArmDelete && <DeleteButton label={label} armed={armed} disabled={deleteDisabled} onClick={onArmDelete} />}
    </div>
  );
}
