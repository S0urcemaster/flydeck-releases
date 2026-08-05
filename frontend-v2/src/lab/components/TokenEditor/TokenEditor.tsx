import { useEffect, useRef, useState } from "react";

import { CommentHighlightedTextarea } from "../CommentHighlightedTextarea";
import {
  labTokenDefinitions,
  type LabTokenName,
  type LabTokenValues,
} from "../../tokenDefinitions";
import styles from "./TokenEditor.module.css";

export type TokenEditorProps = {
  values: LabTokenValues;
  onChange: (name: LabTokenName, value: number | string) => void;
};

export function TokenEditor({ values, onChange }: TokenEditorProps) {
  const serializedValues = renderTokenText(values);
  const emittedValues = useRef<string | null>(null);
  const [text, setText] = useState(serializedValues);

  useEffect(() => {
    if (serializedValues === emittedValues.current) {
      emittedValues.current = null;
      return;
    }
    setText(serializedValues);
  }, [serializedValues]);

  function update(nextText: string) {
    setText(nextText);
    const parsed = parseTokenText(nextText, values);
    emittedValues.current = renderTokenText(parsed);

    for (const name of Object.keys(parsed) as LabTokenName[]) {
      if (parsed[name] !== values[name]) {
        onChange(name, parsed[name]);
      }
    }
  }

  return (
    <fieldset className={styles.root}>
      <legend>Generated design tokens</legend>
      <CommentHighlightedTextarea
        aria-label="Generated design tokens"
        color="COLOR_TEXT"
        background="transparent"
        border="BORDER_STANDARD"
        padding="SPACE_SM"
        margin="0"
        width="100%"
        size="properties"
        spellCheck={false}
        value={text}
        onChange={(event) => update(event.target.value)}
      />
    </fieldset>
  );
}

export function renderTokenText(values: LabTokenValues): string {
  return (Object.keys(labTokenDefinitions) as LabTokenName[])
    .map((name) => {
      const definition = labTokenDefinitions[name];
      const comment = definition.kind === "number"
        ? `${definition.min}..${definition.max} ${definition.unit}`
        : definition.description;
      return [
        `# ${definition.label}: ${comment}`,
        `${toPublicName(definition.cssName)} = ${
          definition.kind === "number"
            ? `${values[name]}${definition.unit}`
            : String(values[name])
        }`,
      ].join("\n");
    })
    .join("\n");
}

export function parseTokenText(
  text: string,
  fallback: LabTokenValues,
): LabTokenValues {
  const parsed = { ...fallback };
  const names = Object.keys(labTokenDefinitions) as LabTokenName[];
  const namesByPublicName = Object.fromEntries(
    names.map((name) => [
      toPublicName(labTokenDefinitions[name].cssName),
      name,
    ]),
  ) as Record<string, LabTokenName>;

  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (!match) {
      continue;
    }

    const name = namesByPublicName[match[1]];
    if (!name) {
      continue;
    }

    try {
      const definition = labTokenDefinitions[name];
      const rawValue = match[2].trim();
      const value = definition.kind === "number"
        ? parseNumberTokenValue(rawValue, definition.unit)
        : parseStringTokenValue(rawValue);
      if (typeof value === typeof fallback[name]) {
        Object.assign(parsed, { [name]: value });
      }
    } catch {
      // Keep the last valid value while the line is being edited.
    }
  }

  return parsed;
}

function parseNumberTokenValue(value: string, unit: string): number {
  const numberText = unit && value.endsWith(unit)
    ? value.slice(0, -unit.length).trim()
    : value;
  const parsed = Number(numberText);
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid numeric token value.");
  }
  return parsed;
}

function parseStringTokenValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === "string") {
      return parsed;
    }
  }
  return value;
}

function toPublicName(cssName: string): string {
  return cssName.slice(2).replace(/-/g, "_").toUpperCase();
}
