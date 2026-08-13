import { treeNodeLocalIdSchema } from "@flydeck/shared/v2";

import {
  InputControl,
  type InputControlProps,
} from "../InputControl";

type NodeIdInputControlProps = Omit<
  InputControlProps,
  | "componentName"
  | "control"
  | "keyboardLayout"
  | "onChange"
  | "onSend"
  | "value"
>;

export type NodeIdInputProps = NodeIdInputControlProps & {
  available: (value: string) => boolean;
  disabled?: boolean;
  savedValue: string;
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void | Promise<void>;
};

export function normalizeNodeId(value: string) {
  return value.toLowerCase();
}

export function NodeIdInput({
  available,
  buttonProps,
  disabled = false,
  inputProps,
  savedValue,
  value,
  onChange,
  onSave,
  ...inputControlProps
}: NodeIdInputProps) {
  const valid = treeNodeLocalIdSchema.safeParse(value).success
    && available(value);

  return (
    <InputControl
      {...inputControlProps}
      buttonProps={{
        ...buttonProps,
        disabled: disabled
          || buttonProps?.disabled
          || !valid
          || value === savedValue,
      }}
      componentName="NodeIdInput"
      control="input"
      inputProps={{
        ...inputProps,
        "aria-label": inputProps?.["aria-label"] ?? "Item ID",
        label: inputProps?.label ?? "ID",
        maxLength: 12,
        placeholder: inputProps?.placeholder ?? "ID",
      }}
      keyboardLayout="block"
      value={value}
      onChange={(nextValue) => onChange(normalizeNodeId(nextValue))}
      onSend={(nextValue) => {
        if (!disabled && valid && nextValue !== savedValue) {
          void onSave(nextValue);
        }
      }}
    />
  );
}
