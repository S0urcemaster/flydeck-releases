import {
  RootInputControl,
  type RootInputControlProps,
} from "../RootInputControl";
import type { TreeBrowserRootTarget } from "../TreeBrowser";

export type ParentInputProps = Omit<
  RootInputControlProps,
  "actionLabel" | "componentName" | "onAction"
> & {
  inputLabel?: string;
  onSetParent?: (target: TreeBrowserRootTarget) => void;
};

export function ParentInput({
  inputLabel = "Parent node",
  onSetParent,
  ...rootInputProps
}: ParentInputProps) {
  return (
    <RootInputControl
      {...rootInputProps}
      actionLabel="Set Parent"
      componentName="ParentInput"
      inputLabel={inputLabel}
      onAction={(_value, target) => {
        if (target) onSetParent?.(target);
      }}
    />
  );
}
