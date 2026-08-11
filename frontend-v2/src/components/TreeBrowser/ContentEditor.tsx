import { InputControl, type InputControlProps } from "../InputControl";

export type ContentEditorProps = InputControlProps;

export function ContentEditor({
  componentName = "ContentEditor",
  ...props
}: ContentEditorProps) {
  return <InputControl {...props} componentName={componentName} />;
}
