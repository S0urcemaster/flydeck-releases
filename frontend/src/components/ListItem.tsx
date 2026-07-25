import type { ReactNode } from "react";
import { DeleteButton } from "./DeleteButton";

type ListItemProps = {
  label: string;
  armed: boolean;
  className?: string;
  contentClassName?: string;
  contentAriaDisabled?: boolean;
  contentDisabled?: boolean;
  contentTitle?: string;
  onContentClick: () => void;
  onArmDelete: () => void;
  children: ReactNode;
};

export function ListItem({
  label,
  armed,
  className = "",
  contentClassName = "",
  contentAriaDisabled,
  contentDisabled,
  contentTitle,
  onContentClick,
  onArmDelete,
  children,
}: ListItemProps) {
  return (
    <div className={`list-item ${className}`.trim()}>
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
      <DeleteButton label={label} armed={armed} onClick={onArmDelete} />
    </div>
  );
}
