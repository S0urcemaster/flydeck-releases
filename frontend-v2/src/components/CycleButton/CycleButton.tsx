import { PressButton, type PressButtonProps } from "../PressButton";

export type CycleButtonProps = Omit<
  PressButtonProps,
  "children" | "onChange" | "onClick"
> & {
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
};

export function CycleButton({
  componentName = "CycleButton",
  onChange,
  options,
  value,
  ...buttonProps
}: CycleButtonProps) {
  const normalizedOptions = uniqueOptions(options);
  const selectedIndex = Math.max(0, normalizedOptions.indexOf(value));
  const selected = normalizedOptions[selectedIndex] ?? "";
  const remaining = normalizedOptions.length < 2
    ? []
    : Array.from(
        { length: normalizedOptions.length - 1 },
        (_, offset) => normalizedOptions[
          (selectedIndex + offset + 1) % normalizedOptions.length
        ],
      );
  const alternatives = remaining.join(" ");
  const label = alternatives ? `${selected} ${alternatives}` : selected;

  return (
    <PressButton
      {...buttonProps}
      aria-label={buttonProps["aria-label"] ?? label}
      componentName={componentName}
      preserveFocus
      onClick={() => {
        if (normalizedOptions.length === 0) return;
        onChange(normalizedOptions[(selectedIndex + 1) % normalizedOptions.length]);
      }}
    >
      {selected}{alternatives && <> <small>{alternatives}</small></>}
    </PressButton>
  );
}

function uniqueOptions(options: readonly string[]) {
  return [...new Set(options)];
}
