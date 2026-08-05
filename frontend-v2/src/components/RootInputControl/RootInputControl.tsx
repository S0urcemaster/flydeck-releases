import { Base, type BaseStyleProps } from "../Base";
import { Input, type InputProps } from "../Input";
import type { TreeBrowserRootTarget } from "../TreeBrowser";
import styles from "./RootInputControl.module.css";

export type RootInputControlProps = BaseStyleProps & {
  current: TreeBrowserRootTarget;
  targets: readonly TreeBrowserRootTarget[];
  value: string;
  onChange: (value: string) => void;
  inputProps?: Omit<
    InputProps,
    "aria-label" | "color" | "onChange" | "placeholder" | "type" | "value"
  >;
};

export function RootInputControl({
  current,
  targets,
  value,
  onChange,
  inputProps,
  color = "COLOR_TEXT",
  background = "COLOR_SURFACE",
  border = "BORDER_STANDARD",
  ...baseProps
}: RootInputControlProps) {
  const target = resolveRootTarget(current, targets, value);

  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName="RootInputControl"
      color={color}
      background={background}
      border={border}
    >
      <Input
        {...inputProps}
        aria-label="Root node"
        color={target ? "COLOR_SUCCESS" : "COLOR_ERROR"}
        placeholder="Set parent node (empty for root)"
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </Base>
  );
}

export function resolveRootTarget(
  current: TreeBrowserRootTarget,
  targets: readonly TreeBrowserRootTarget[],
  value: string,
): TreeBrowserRootTarget | null {
  if (value === current.label) return current;
  const matches = targets.filter(({ label }) => label === value);
  return matches.length === 1 && matches[0].eligible ? matches[0] : null;
}
