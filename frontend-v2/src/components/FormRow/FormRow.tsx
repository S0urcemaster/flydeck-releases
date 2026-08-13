import { useState, type FocusEvent, type ReactNode } from "react";

import { Block, type BlockProps } from "../Block";
import { Button, type ButtonProps } from "../Button";
import styles from "./FormRow.module.css";

export type FormRowProps = Omit<
  BlockProps,
  "children" | "componentName"
> & {
  buttonProps?: Omit<
    ButtonProps,
    "aria-label" | "children" | "disabled" | "onClick" | "width"
  >;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  newDisabled?: boolean;
  onNew?: () => void;
  onSet: () => void;
};

export function FormRow({
  buttonProps,
  children,
  disabled,
  label,
  newDisabled,
  onNew,
  onSet,
  ...baseProps
}: FormRowProps) {
  const [editing, setEditing] = useState(false);

  function leaveRow(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setEditing(false);
  }

  return (
    <Block
      {...baseProps}
      className={styles.root}
      componentName="FormRow"
      data-editing={editing || undefined}
      onBlurCapture={leaveRow}
      onFocusCapture={() => setEditing(true)}
    >
      <div className={styles.value}>{children}</div>
      {editing && <div className={styles.actions}>
        <Button
          {...buttonProps}
          aria-label={`Save ${label}`}
          disabled={disabled}
          width="100%"
          onClick={onSet}
        >
          Save
        </Button>
        {editing && onNew && (
          <Button
            {...buttonProps}
            aria-label={`New ${label}`}
            disabled={newDisabled}
            width="100%"
            onClick={onNew}
          >
            New
          </Button>
        )}
      </div>}
    </Block>
  );
}
