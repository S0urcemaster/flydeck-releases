import type { ComponentPropsWithoutRef } from "react";

type TextInputProps = ComponentPropsWithoutRef<"input">;

export function TextInput({ className = "", type = "text", ...props }: TextInputProps) {
  return <input {...props} type={type} className={`text-input ${className}`.trim()} />;
}
