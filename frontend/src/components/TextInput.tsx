import { forwardRef, type ComponentPropsWithoutRef } from "react";

type TextInputProps = ComponentPropsWithoutRef<"input">;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    className = "",
    type = "text",
    autoComplete = "off",
    autoCorrect = "off",
    autoCapitalize = "off",
    spellCheck = false,
    ...props
  },
  ref,
) {
  return (
    <input
      ref={ref}
      {...props}
      type={type}
      autoComplete={autoComplete}
      autoCorrect={autoCorrect}
      autoCapitalize={autoCapitalize}
      spellCheck={spellCheck}
      className={`text-input ${className}`.trim()}
    />
  );
});
