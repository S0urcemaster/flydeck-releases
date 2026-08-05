import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  baseBackgrounds,
  baseBorders,
  baseColors,
  baseSpaces,
  baseSizes,
  type BaseStyleProps,
} from "../components/Base";
import { CommentHighlightedTextarea } from "./components/CommentHighlightedTextarea";
import styles from "./BasePropertyControls.module.css";

export const baseLabPropertyDefinitions = [
  { name: "color", label: "Color", options: baseColors },
  { name: "background", label: "Background", options: baseBackgrounds },
  { name: "border", label: "Border", options: baseBorders },
  { name: "padding", label: "Padding", options: baseSpaces },
  { name: "margin", label: "Margin", options: baseSpaces },
  { name: "width", label: "Width", options: baseSizes },
  { name: "height", label: "Height", options: baseSizes },
] as const;

export type BaseLabPropertyName =
  typeof baseLabPropertyDefinitions[number]["name"];

export type BaseLabValues = Record<
  BaseLabPropertyName,
  string
>;

export type BasePropertyControlsProps = {
  componentName?: string;
  inheritedPropertySections?: Array<{
    componentName: string;
    comments?: Record<string, string>;
    properties: Record<string, string | number | boolean>;
  }>;
  ownPropertyComments?: Record<string, string>;
  ownProperties?: Record<string, string | number | boolean>;
  values: BaseLabValues;
  onChange: (name: BaseLabPropertyName, value: string) => void;
  onInheritedPropertyChange?: (
    componentName: string,
    name: string,
    value: string | number | boolean,
  ) => void;
  onOwnPropertyChange?: (name: string, value: string | number | boolean) => void;
};

export function BasePropertyControls({
  componentName,
  inheritedPropertySections = [],
  ownPropertyComments = {},
  ownProperties = {},
  values,
  onChange,
  onInheritedPropertyChange,
  onOwnPropertyChange,
}: BasePropertyControlsProps) {
  const serializedValues = renderPropertyText(
    componentName,
    ownProperties,
    values,
    ownPropertyComments,
    inheritedPropertySections,
  );
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
    const parsed = parseBasePropertyText(nextText, values);
    const parsedOwnProperties = parseOwnProperties(nextText, ownProperties);
    const parsedInheritedSections = inheritedPropertySections.map((section) => ({
      ...section,
      properties: parseOwnProperties(nextText, section.properties),
    }));
    const nextSerializedValues = renderPropertyText(
      componentName,
      parsedOwnProperties,
      parsed,
      ownPropertyComments,
      parsedInheritedSections,
    );
    emittedValues.current = nextSerializedValues;

    for (const [name, value] of Object.entries(parsedOwnProperties)) {
      if (value !== ownProperties[name]) {
        onOwnPropertyChange?.(name, value);
      }
    }

    for (const section of parsedInheritedSections) {
      for (const [name, value] of Object.entries(section.properties)) {
        const previousSection = inheritedPropertySections.find(
          (candidate) => candidate.componentName === section.componentName,
        );
        if (value !== previousSection?.properties[name]) {
          onInheritedPropertyChange?.(
            section.componentName,
            name,
            value,
          );
        }
      }
    }

    for (const definition of baseLabPropertyDefinitions) {
      if (parsed[definition.name] !== values[definition.name]) {
        onChange(definition.name, parsed[definition.name]);
      }
    }
  }

  return (
    <fieldset className={styles.inheritedProperties}>
      <legend>Properties</legend>
      <CommentHighlightedTextarea
        aria-label="Inherited Base properties"
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

export function renderBasePropertyText(values: BaseLabValues): string {
  return [
    "# inherited: Base",
    `# color: ${baseColors.join(" | ")} | custom CSS value`,
    `# background: ${baseBackgrounds.join(" | ")} | custom CSS value`,
    `# border: ${baseBorders.join(" | ")} | custom CSS value`,
    `# padding, margin: ${baseSpaces.join(" | ")} | custom CSS value`,
    `color = ${values.color}`,
    `background = ${values.background}`,
    `border = ${values.border}`,
    `padding = ${values.padding}`,
    `margin = ${values.margin}`,
    `width = ${values.width}`,
    `height = ${values.height}`,
  ].join("\n");
}

export function renderPropertyText(
  componentName: string | undefined,
  ownProperties: Record<string, string | number | boolean>,
  baseValues: BaseLabValues,
  ownPropertyComments: Record<string, string> = {},
  inheritedPropertySections: BasePropertyControlsProps["inheritedPropertySections"] = [],
): string {
  const ownLines = componentName
    ? [
        `# component: ${componentName}`,
        ...Object.entries(ownProperties).flatMap(([name, value]) => [
          ...(ownPropertyComments[name] ? [`# ${name}: ${ownPropertyComments[name]}`] : []),
          `${name} = ${formatOwnPropertyValue(value)}`,
        ]),
        "",
      ]
    : [];

  const inheritedLines = inheritedPropertySections.flatMap((section) => [
    `# inherited: ${section.componentName}`,
    ...Object.entries(section.properties).flatMap(([name, value]) => [
      ...(section.comments?.[name]
        ? [`# ${name}: ${section.comments[name]}`]
        : []),
      `${name} = ${formatOwnPropertyValue(value)}`,
    ]),
    "",
  ]);

  return [
    ...ownLines,
    ...inheritedLines,
    renderBasePropertyText(baseValues),
  ].join("\n");
}

export function parseBasePropertyText(
  text: string,
  fallback: BaseLabValues,
): BaseLabValues {
  const parsed = { ...fallback };

  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([a-zA-Z]+)\s*=\s*(.+?)\s*$/);
    if (!match) {
      continue;
    }

    const name = match[1] as BaseLabPropertyName;
    const value = match[2].trim();
    if (
      baseLabPropertyDefinitions.some((definition) => definition.name === name)
      && value !== ""
    ) {
      parsed[name] = value;
    }
  }

  return parsed;
}

export function parseOwnProperties(
  text: string,
  fallback: Record<string, string | number | boolean>,
) {
  const parsed = { ...fallback };

  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([a-zA-Z][a-zA-Z0-9]*)\s*=\s*(.+?)\s*$/);
    if (!match || !(match[1] in fallback)) {
      continue;
    }

    try {
      const rawValue = match[2].trim();
      const fallbackValue = fallback[match[1]];
      const value = typeof fallbackValue === "string"
        ? parseStringPropertyValue(rawValue)
        : JSON.parse(rawValue) as unknown;
      if (
        typeof value === typeof fallbackValue
        && (
          typeof value === "string"
          || typeof value === "number"
          || typeof value === "boolean"
        )
      ) {
        parsed[match[1]] = value;
      }
    } catch {
      // Keep the last valid value while the line is being edited.
    }
  }

  return parsed;
}

function formatOwnPropertyValue(value: string | number | boolean): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function parseStringPropertyValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "string" ? parsed : value;
  }
  return value;
}

export function toBaseStyleProps(values: BaseLabValues): BaseStyleProps {
  return { ...values };
}
