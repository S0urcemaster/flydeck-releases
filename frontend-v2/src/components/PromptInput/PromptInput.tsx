import { InputControl, type InputControlProps } from "../InputControl";

export type PromptInputProps = InputControlProps;

export function PromptInput(props: PromptInputProps) {
  return (
    <InputControl
      {...props}
      componentName="PromptInput"
      control="textarea"
    />
  );
}
