import generatedThemes from "./generated-themes.json";
import {
  colorDefinitions,
  themeColorMaps,
  type ColorName,
  type ThemeColorMapId,
} from "./colorDefinitions";
import {
  labTokenDefinitions,
  type LabTokenName,
} from "../lab/tokenDefinitions";

export type ThemeVariableConfiguration = {
  name: string;
  value: string;
  enabled: boolean;
};

export type ThemeConfigurationEntry = {
  id: ThemeColorMapId;
  label: string;
  enabled: boolean;
  variables: ThemeVariableConfiguration[];
};

export type ThemeConfiguration = {
  themes: ThemeConfigurationEntry[];
};

export const availableThemeVariables = [
  ...(Object.keys(colorDefinitions) as ColorName[]).map((name) => ({
    key: name,
    name: colorDefinitions[name].cssName,
    kind: "color" as const,
  })),
  ...(Object.keys(labTokenDefinitions) as LabTokenName[]).map((name) => ({
    key: name,
    name: labTokenDefinitions[name].cssName,
    kind: "token" as const,
  })),
].sort((left, right) => left.name.localeCompare(right.name));

export const defaultThemeConfiguration: ThemeConfiguration = {
  themes: themeColorMaps.map(({ id, label }) => ({
    id,
    label,
    enabled: id === generatedThemes.activeTheme,
    variables: availableThemeVariables.map((variable) => ({
      name: variable.name,
      value: defaultVariableValue(id, variable),
      enabled: true,
    })),
  })),
};

export function resolveThemeVariables(configuration: ThemeConfiguration) {
  const resolved: Record<string, string> = {};
  for (const theme of configuration.themes) {
    if (!theme.enabled) continue;
    for (const variable of theme.variables) {
      if (variable.enabled) resolved[variable.name] = variable.value;
    }
  }
  return resolved;
}

export function applyThemeConfiguration(
  configuration: ThemeConfiguration,
  style: Pick<CSSStyleDeclaration, "removeProperty" | "setProperty">,
) {
  for (const { name } of availableThemeVariables) style.removeProperty(name);
  for (const [name, value] of Object.entries(resolveThemeVariables(configuration))) {
    style.setProperty(name, value);
  }
}

export function isThemeConfiguration(value: unknown): value is ThemeConfiguration {
  return isThemeConfigurationForIds(
    value,
    themeColorMaps.map(({ id }) => id),
  );
}

export function isPersistedThemeConfiguration(
  value: unknown,
): value is ThemeConfiguration {
  return isThemeConfiguration(value)
    || isLegacyThemeConfigurationForIds(
      value,
      themeColorMaps.map(({ id }) => id),
    )
    || isLegacyThemeConfigurationForIds(value, ["flydeck", "greyscale"]);
}

export function normalizeThemeConfiguration(
  configuration: ThemeConfiguration,
): ThemeConfiguration {
  return {
    themes: defaultThemeConfiguration.themes.map((defaultTheme) => {
      const existing = configuration.themes.find(({ id }) => (
        id === defaultTheme.id
      ));
      return existing
        ? {
            ...existing,
            label: defaultTheme.label,
            variables: defaultTheme.variables.map((defaultVariable) => {
              const current = existing.variables.find(({ name }) => (
                name === defaultVariable.name
              ));
              if (current) return current;
              if (defaultVariable.name === "--space") {
                const legacySpace = existing.variables.find(({ name }) => (
                  name === "--space-unit" || name === "--space-xs"
                ));
                if (legacySpace) return { ...legacySpace, name: "--space" };
              }
              return structuredClone(defaultVariable);
            }),
          }
        : structuredClone(defaultTheme);
    }),
  };
}

function isThemeConfigurationForIds(
  value: unknown,
  themeIds: readonly string[],
): value is ThemeConfiguration {
  if (!isRecord(value) || !Array.isArray(value.themes)) return false;
  const expectedThemeIds = new Set(themeIds);
  if (value.themes.length !== expectedThemeIds.size) return false;
  const seenThemeIds = new Set<string>();
  const expectedVariables = new Set(availableThemeVariables.map(({ name }) => name));
  for (const theme of value.themes) {
    if (!isRecord(theme)
      || typeof theme.id !== "string"
      || !expectedThemeIds.has(theme.id as ThemeColorMapId)
      || seenThemeIds.has(theme.id)
      || typeof theme.label !== "string"
      || typeof theme.enabled !== "boolean"
      || !Array.isArray(theme.variables)
      || theme.variables.length !== expectedVariables.size) return false;
    seenThemeIds.add(theme.id);
    const seenVariables = new Set<string>();
    for (const variable of theme.variables) {
      if (!isRecord(variable)
        || typeof variable.name !== "string"
        || !expectedVariables.has(variable.name)
        || seenVariables.has(variable.name)
        || typeof variable.value !== "string"
        || typeof variable.enabled !== "boolean") return false;
      seenVariables.add(variable.name);
    }
  }
  return true;
}

function isLegacyThemeConfigurationForIds(
  value: unknown,
  themeIds: readonly string[],
): value is ThemeConfiguration {
  if (!isRecord(value) || !Array.isArray(value.themes)) return false;
  const expectedThemeIds = new Set(themeIds);
  if (value.themes.length !== expectedThemeIds.size) return false;
  const currentVariables = new Set(availableThemeVariables.map(({ name }) => name));
  const legacySpaces = new Set([
    "--app-title-font-size",
    "--space-unit",
    "--space-xs",
    "--space-sm",
    "--space-md",
    "--space-lg",
  ]);
  const allowedVariables = new Set([...currentVariables, ...legacySpaces]);
  const requiredVariables = [...currentVariables].filter((name) => (
    name !== "--item-color"
    && name !== "--long-press-timeout"
    && name !== "--space"
  ));
  const seenThemeIds = new Set<string>();
  for (const theme of value.themes) {
    if (!isRecord(theme)
      || typeof theme.id !== "string"
      || !expectedThemeIds.has(theme.id)
      || seenThemeIds.has(theme.id)
      || typeof theme.label !== "string"
      || typeof theme.enabled !== "boolean"
      || !Array.isArray(theme.variables)) return false;
    seenThemeIds.add(theme.id);
    const seenVariables = new Set<string>();
    for (const variable of theme.variables) {
      if (!isRecord(variable)
        || typeof variable.name !== "string"
        || !allowedVariables.has(variable.name)
        || seenVariables.has(variable.name)
        || typeof variable.value !== "string"
        || typeof variable.enabled !== "boolean") return false;
      seenVariables.add(variable.name);
    }
    if (requiredVariables.some((name) => !seenVariables.has(name))) return false;
    if (!seenVariables.has("--space") && !seenVariables.has("--space-unit")) {
      return false;
    }
  }
  return true;
}

function defaultVariableValue(
  themeId: ThemeColorMapId,
  variable: typeof availableThemeVariables[number],
) {
  if (variable.kind === "color") {
    return generatedThemes.themes[themeId][variable.key as ColorName];
  }
  const tokenName = variable.key as LabTokenName;
  const definition = labTokenDefinitions[tokenName];
  const value = generatedThemes.tokens[themeId][tokenName];
  return definition.kind === "number"
    ? `${value}${definition.unit}`
    : resolveTokenReferences(String(value));
}

function resolveTokenReferences(value: string) {
  return value.replace(
    /\b[A-Z][A-Z0-9_]*\b/g,
    (token) => `var(--${token.toLowerCase().replace(/_/g, "-")})`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
