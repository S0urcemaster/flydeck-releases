import { BlockingDialog, type BlockingDialogProps } from "../BlockingDialog";
import { Button } from "../Button";

export type SynchronizationDialogProps = Omit<
  BlockingDialogProps,
  "actions" | "children" | "closeLabel" | "onClose" | "title"
> & {
  operation?: string;
  reason: string;
  onContinue: () => void;
  onIgnore?: () => void;
};

export function SynchronizationDialog({
  operation,
  reason,
  onContinue,
  onIgnore,
  buttonProps,
  ...props
}: SynchronizationDialogProps) {
  return (
    <BlockingDialog
      {...props}
      buttonProps={buttonProps}
      title="Synchronization pending"
      closeLabel="Continue without synchronization"
      onClose={onContinue}
      actions={(
        <>
          {onIgnore && (
            <Button {...buttonProps} onClick={onIgnore}>IGNORE FOR 10 MIN</Button>
          )}
          <Button {...buttonProps} onClick={onContinue}>CONTINUE</Button>
        </>
      )}
    >
      {operation && <strong>{operation}</strong>}
      <span>{reason}</span>
      <small>
        When continuing, the last server-confirmed state remains authoritative.
        Unconfirmed changes are not shown as saved.
      </small>
    </BlockingDialog>
  );
}
