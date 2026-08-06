import { useState } from "react";

import { Button, type ButtonProps } from "../../components/Button";
import { ColorDialer } from "../../components/ColorDialer";
import { DeleteButton } from "../../components/DeleteButton";
import { Input, type InputProps } from "../../components/Input";
import { Module, type ModuleProps } from "../../components/Module";
import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserInitialNode,
  type TreeBrowserModelSnapshotNode,
  type TreeBrowserProps,
} from "../../components/TreeBrowser";
import {
  availableThemeVariables,
  defaultThemeConfiguration,
  type ThemeConfiguration,
  type ThemeVariableConfiguration,
} from "../../themes/themeConfiguration";
import styles from "./SettingsModule.module.css";

type ThemeTreeData =
  | { kind: "theme"; themeId: string }
  | { kind: "variable"; themeId: string; name: string };

type ThemeSelection = ThemeTreeData | null;

export type SettingsModuleProps = ModuleProps & {
  configuration: ThemeConfiguration;
  onSave: (configuration: ThemeConfiguration) => void;
  inputProps?: Omit<InputProps, "aria-label" | "onChange" | "type" | "value">;
  saveButtonProps?: Omit<ButtonProps, "children" | "onClick">;
  treeBrowserProps?: Omit<
    TreeBrowserProps<ThemeTreeData>,
    | "model"
    | "defaultPageSize"
    | "rootPageSize"
    | "onTreeChange"
    | "renderContent"
    | "rootListEditable"
  >;
};

export function SettingsModule({
  configuration,
  onSave,
  inputProps,
  saveButtonProps,
  treeBrowserProps,
  className,
  ...props
}: SettingsModuleProps) {
  const [draft, setDraft] = useState(() => structuredClone(configuration));
  const [selection, setSelection] = useState<ThemeSelection>(null);
  const [model] = useState(() => new TreeBrowserModel<ThemeTreeData>({
    definitionAuthority: true,
    initialTree: createThemeTree(configuration),
    storageKey: "flydeck.settings.theme-tree.draft",
  }));
  const classes = className ? `${styles.root} ${className}` : styles.root;
  const resetAvailable = canResetSelection(draft, selection);

  return (
    <Module
      {...props}
      className={classes}
      componentName="SettingsModule"
      aria-label="Settings module"
    >
      <TreeBrowser
        {...treeBrowserProps}
        browserLabel="Theme configuration"
        componentName="ThemeBrowser"
        defaultPageSize={10}
        rootPageSize={5}
        model={model}
        rootListEditable={false}
        onSelectedPathChange={async (selectedPath) => {
          const confirmed = await treeBrowserProps?.onSelectedPathChange?.(
            selectedPath,
          );
          if (confirmed === false) return false;
          setSelection(findThemeSelection(configuration, selectedPath));
          return confirmed;
        }}
        onTreeChange={(nodes) => setDraft((current) => (
          applyEnabledState(current, nodes)
        ))}
        renderContent={({ node }) => {
          if (node.data?.kind !== "variable") return null;
          const variable = findVariable(draft, node.data.themeId, node.data.name);
          if (!variable) return null;
          const isColor = availableThemeVariables.some((definition) => (
            definition.name === variable.name && definition.kind === "color"
          ));
          const setValue = (value: string) => setDraft((current) => (
            updateVariableValue(
              current,
              node.data!.themeId,
              variable.name,
              value,
            )
          ));
          return (
            <div className={styles.variableEditor}>
              <Input
                {...inputProps}
                aria-label={`${variable.name} value`}
                type="text"
                value={variable.value}
                onChange={(event) => setValue(event.currentTarget.value)}
              />
              {isColor && (
                <ColorDialer
                  className={styles.colorDialer}
                  value={variable.value}
                  onValue={setValue}
                />
              )}
            </div>
          );
        }}
      />
      <div className={styles.actions}>
        <DeleteButton
          {...saveButtonProps}
          action="reset"
          disabled={!resetAvailable}
          key={selection
            ? `${selection.themeId}:${selection.kind === "variable"
              ? selection.name
              : "theme"}`
            : "no-selection"}
          label={selection?.kind === "variable"
            ? selection.name
            : selection?.themeId ?? "selected theme value"}
          onDelete={() => {
            if (!selection) return;
            const resetConfiguration = resetThemeSelection(draft, selection);
            setDraft(resetConfiguration);
            onSave(structuredClone(resetConfiguration));
          }}
        >
          RESET
        </DeleteButton>
        <Button
          {...saveButtonProps}
          onClick={() => onSave(structuredClone(draft))}
        >
          SAVE
        </Button>
      </div>
    </Module>
  );
}

export function findThemeSelection(
  configuration: ThemeConfiguration,
  selectedPath: string[],
): ThemeSelection {
  const selectedId = selectedPath.at(-1);
  if (!selectedId) return null;
  for (const theme of configuration.themes) {
    if (selectedId === `theme:${theme.id}`) {
      return { kind: "theme", themeId: theme.id };
    }
    for (const variable of theme.variables) {
      if (selectedId === `theme:${theme.id}:variable:${variable.name}`) {
        return { kind: "variable", themeId: theme.id, name: variable.name };
      }
    }
  }
  return null;
}

export function canResetSelection(
  configuration: ThemeConfiguration,
  selection: ThemeSelection,
) {
  if (!selection) return false;
  const currentTheme = configuration.themes.find(({ id }) => (
    id === selection.themeId
  ));
  const defaultTheme = defaultThemeConfiguration.themes.find(({ id }) => (
    id === selection.themeId
  ));
  if (!currentTheme || !defaultTheme) return false;
  if (selection.kind === "variable") {
    return currentTheme.variables.find(({ name }) => name === selection.name)?.value
      !== defaultTheme.variables.find(({ name }) => name === selection.name)?.value;
  }
  return currentTheme.variables.some((variable) => (
    variable.value !== defaultTheme.variables.find(({ name }) => (
      name === variable.name
    ))?.value
  ));
}

export function resetThemeSelection(
  configuration: ThemeConfiguration,
  selection: Exclude<ThemeSelection, null>,
): ThemeConfiguration {
  const defaultTheme = defaultThemeConfiguration.themes.find(({ id }) => (
    id === selection.themeId
  ));
  if (!defaultTheme) return configuration;
  return {
    themes: configuration.themes.map((theme) => {
      if (theme.id !== selection.themeId) return theme;
      return {
        ...theme,
        variables: theme.variables.map((variable) => {
          if (selection.kind === "variable" && variable.name !== selection.name) {
            return variable;
          }
          const defaultVariable = defaultTheme.variables.find(({ name }) => (
            name === variable.name
          ));
          return defaultVariable && defaultVariable.value !== variable.value
            ? { ...variable, value: defaultVariable.value }
            : variable;
        }),
      };
    }),
  };
}

export function createThemeTree(
  configuration: ThemeConfiguration,
): TreeBrowserInitialNode<ThemeTreeData>[] {
  return configuration.themes.map((theme) => ({
    id: `theme:${theme.id}`,
    kind: "theme",
    label: theme.label,
    enabled: theme.enabled,
    contentEditable: false,
    contentVisible: false,
    listEditable: false,
    data: { kind: "theme", themeId: theme.id },
    children: theme.variables.map((variable) => ({
      id: `theme:${theme.id}:variable:${variable.name}`,
      kind: "theme-variable",
      label: variable.name,
      enabled: variable.enabled,
      contentVisible: true,
      listEditable: false,
      data: { kind: "variable", themeId: theme.id, name: variable.name },
      children: [],
    })),
  }));
}

function applyEnabledState(
  configuration: ThemeConfiguration,
  nodes: readonly TreeBrowserModelSnapshotNode<ThemeTreeData>[],
) {
  let changed = false;
  const nextThemes = configuration.themes.map((theme) => {
    const themeNode = nodes.find((node) => (
      node.data?.kind === "theme" && node.data.themeId === theme.id
    ));
    if (!themeNode) return theme;
    const variables = theme.variables.map((variable) => {
      const variableNode = themeNode.children.find((node) => (
        node.data?.kind === "variable" && node.data.name === variable.name
      ));
      const enabled = variableNode?.enabled ?? variable.enabled;
      if (enabled === variable.enabled) return variable;
      changed = true;
      return { ...variable, enabled };
    });
    if (themeNode.enabled === theme.enabled && variables === theme.variables) return theme;
    if (themeNode.enabled !== theme.enabled) changed = true;
    return { ...theme, enabled: themeNode.enabled, variables };
  });
  return changed ? { themes: nextThemes } : configuration;
}

function findVariable(
  configuration: ThemeConfiguration,
  themeId: string,
  name: string,
): ThemeVariableConfiguration | undefined {
  return configuration.themes.find(({ id }) => id === themeId)
    ?.variables.find((variable) => variable.name === name);
}

function updateVariableValue(
  configuration: ThemeConfiguration,
  themeId: string,
  name: string,
  value: string,
): ThemeConfiguration {
  return {
    themes: configuration.themes.map((theme) => theme.id !== themeId
      ? theme
      : {
          ...theme,
          variables: theme.variables.map((variable) => variable.name === name
            ? { ...variable, value }
            : variable),
        }),
  };
}
