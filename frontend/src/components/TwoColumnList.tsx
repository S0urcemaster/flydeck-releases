import type { ReactNode } from "react";
import { ListItem } from "./ListItem";

export type TwoColumnListEntry = {
  key: string;
  label: string;
  content?: ReactNode;
  selected?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  delete?: {
    armed: boolean;
    disabled?: boolean;
    onArm: () => void;
  };
};

type TwoColumnListProps = {
  entries: TwoColumnListEntry[];
  ariaLabel: string;
  className?: string;
};

export function TwoColumnList({ entries, ariaLabel, className = "" }: TwoColumnListProps) {
  return (
    <div className={`two-column-list ${className}`.trim()} aria-label={ariaLabel}>
      {entries.map((entry) => entry.delete ? (
        <ListItem
          key={entry.key}
          label={entry.label}
          armed={entry.delete.armed}
          className="two-column-list-item"
          contentClassName={entry.selected ? "active" : ""}
          contentDisabled={entry.disabled}
          contentTitle={entry.title}
          deleteDisabled={entry.delete.disabled}
          onContentClick={entry.onClick}
          onArmDelete={entry.delete.onArm}
        >
          {entry.content ?? <>{entry.label}{entry.invalid && <span className="invalid-file-mark" aria-label=" invalid"> !</span>}</>}
        </ListItem>
      ) : (
        <button
          key={entry.key}
          type="button"
          className={`two-column-list-entry ${entry.selected ? "active" : ""}`.trim()}
          onClick={entry.onClick}
          disabled={entry.disabled}
          title={entry.title}
        >
          {entry.content ?? <>{entry.label}{entry.invalid && <span className="invalid-file-mark" aria-label=" invalid"> !</span>}</>}
        </button>
      ))}
    </div>
  );
}
