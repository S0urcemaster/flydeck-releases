import { useMemo, useState, type ComponentProps } from "react";

import { Button, type ButtonProps } from "../../components/Button";
import { Checkbox } from "../../components/Checkbox";
import { ColorDialer } from "../../components/ColorDialer";
import { DeleteButton } from "../../components/DeleteButton";
import { Input, type InputProps } from "../../components/Input";
import { Module, type ModuleProps } from "../../components/Module";
import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserInitialNode,
  type TreeBrowserNode,
  type TreeBrowserProps,
} from "../../components/TreeBrowser";
import {
  availableThemeVariables,
  defaultThemeConfiguration,
  type ThemeConfiguration,
  type ThemeVariableConfiguration,
} from "../../themes/themeConfiguration";
import styles from "./SettingsModule.module.css";

type SettingsTreeData =
  | { kind: "folder"; folder: "themes" | "global" | "accessibility" }
  | { kind: "theme"; themeId: string }
  | { kind: "variable"; themeId: string; name: string }
  | { kind: "boolean"; setting: "capitalLetters" };

type SettingsSelection = Exclude<SettingsTreeData, { kind: "folder" }> | null;

export type SettingsModuleProps = ModuleProps & {
  configuration: ThemeConfiguration;
  onSave: (configuration: ThemeConfiguration) => void;
  inputProps?: Omit<InputProps, "aria-label" | "onChange" | "type" | "value">;
  saveButtonProps?: Omit<ButtonProps, "children" | "onClick">;
  treeBrowserProps?: Omit<
    TreeBrowserProps<SettingsTreeData>,
    | "checkedNodeIds"
    | "model"
    | "defaultPageSize"
    | "rootPageSize"
    | "onNodeCheckedChange"
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
  const activeTheme = configuration.themes.find(({ enabled }) => enabled)
    ?? configuration.themes[0];
  const [draft, setDraft] = useState(() => structuredClone(configuration));
  const [selection, setSelection] = useState<SettingsSelection>(() => activeTheme
    ? { kind: "theme", themeId: activeTheme.id }
    : null);
  const [model] = useState(() => new TreeBrowserModel<SettingsTreeData>({
    definitionAuthority: true,
    initialTree: createSettingsTree(configuration),
    storageKey: "flydeck.settings.tree.draft",
  }));
  const checkedNodeIds = useMemo(() => createCheckedNodeIds(draft), [draft]);
  const resetAvailable = canResetSelection(draft, selection);

  const updateCheckedValue = (
    node: TreeBrowserNode<SettingsTreeData>,
    checked: boolean,
  ) => {
    const data = node.data;
    if (!data || data.kind === "folder") return;
    setDraft((current) => updateCheckedSetting(current, data, checked));
  };

  return (
    <Module
      {...props}
      className={className ? `${styles.root} ${className}` : styles.root}
      componentName="SettingsModule"
      aria-label="Settings module"
    >
      <TreeBrowser
        {...treeBrowserProps}
        browserLabel="Settings configuration"
        componentName="SettingsBrowser"
        defaultPageSize={4}
        rootPageSize={4}
        model={model}
        rootLabel="Settings"
        rootListEditable={false}
        initialSelectedPath={activeTheme
          ? ["settings:themes", `theme:${activeTheme.id}`]
          : ["settings:themes"]}
        checkedNodeIds={checkedNodeIds}
        onNodeCheckedChange={updateCheckedValue}
        onSelectedPathChange={async (selectedPath) => {
          const confirmed = await treeBrowserProps?.onSelectedPathChange?.(
            selectedPath,
          );
          if (confirmed === false) return false;
          setSelection(findSettingsSelection(configuration, selectedPath));
          return confirmed;
        }}
        renderContent={({ node }) => {
          const data = node.data;
          if (data?.kind === "boolean") {
            return (
              <BooleanValueRenderer
                checked={draft.global.accessibility.capitalLetters}
                label="Capital letters"
                onChange={(checked) => updateCheckedValue(node, checked)}
                checkboxProps={treeBrowserProps?.browserItemProps?.checkboxProps}
              />
            );
          }
          if (data?.kind !== "variable") return null;
          const variable = findVariable(draft, data.themeId, data.name);
          if (!variable) return null;
          const isColor = availableThemeVariables.some((definition) => (
            definition.name === variable.name && definition.kind === "color"
          ));
          const setValue = (value: string) => setDraft((current) => (
            updateVariableValue(current, data.themeId, variable.name, value)
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
          key={selectionKey(selection)}
          label={selectionLabel(selection)}
          onDelete={() => {
            if (!selection) return;
            const reset = resetSettingsSelection(draft, selection);
            setDraft(reset);
            onSave(structuredClone(reset));
          }}
        >
          RESET
        </DeleteButton>
        <Button {...saveButtonProps} onClick={() => onSave(structuredClone(draft))}>
          SAVE
        </Button>
      </div>
    </Module>
  );
}

function BooleanValueRenderer({
  checked,
  label,
  onChange,
  checkboxProps,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  checkboxProps?: Omit<
    ComponentProps<typeof Checkbox>,
    "checked" | "children" | "label" | "onChange"
  >;
}) {
  return (
    <div className={styles.booleanEditor}>
      <Checkbox
        {...checkboxProps}
        checked={checked}
        label={`${label}: ${checked ? "true" : "false"}`}
        onChange={onChange}
      >
        {checked ? "TRUE" : "FALSE"}
      </Checkbox>
    </div>
  );
}

export function findSettingsSelection(
  configuration: ThemeConfiguration,
  selectedPath: string[],
): SettingsSelection {
  const selectedId = selectedPath.at(-1);
  if (selectedId === "settings:global:accessibility:capital-letters") {
    return { kind: "boolean", setting: "capitalLetters" };
  }
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
  selection: SettingsSelection,
) {
  if (!selection) return false;
  if (selection.kind === "boolean") {
    return configuration.global.accessibility.capitalLetters
      !== defaultThemeConfiguration.global.accessibility.capitalLetters;
  }
  const currentTheme = configuration.themes.find(({ id }) => id === selection.themeId);
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

export function resetSettingsSelection(
  configuration: ThemeConfiguration,
  selection: Exclude<SettingsSelection, null>,
): ThemeConfiguration {
  if (selection.kind === "boolean") {
    return { ...configuration, global: structuredClone(defaultThemeConfiguration.global) };
  }
  const defaultTheme = defaultThemeConfiguration.themes.find(({ id }) => (
    id === selection.themeId
  ));
  if (!defaultTheme) return configuration;
  return {
    ...configuration,
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

export function createSettingsTree(
  configuration: ThemeConfiguration,
): TreeBrowserInitialNode<SettingsTreeData>[] {
  return [
    {
      id: "settings:themes",
      kind: "settings-folder",
      label: "Themes",
      enabled: false,
      contentEditable: false,
      contentVisible: false,
      listEditable: false,
      data: { kind: "folder", folder: "themes" },
      children: configuration.themes.map((theme) => ({
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
      })),
    },
    {
      id: "settings:global",
      kind: "settings-folder",
      label: "Global",
      enabled: false,
      contentEditable: false,
      contentVisible: false,
      listEditable: false,
      data: { kind: "folder", folder: "global" },
      children: [{
        id: "settings:global:accessibility",
        kind: "settings-folder",
        label: "Accessibility",
        enabled: false,
        contentEditable: false,
        contentVisible: false,
        listEditable: false,
        data: { kind: "folder", folder: "accessibility" },
        children: [{
          id: "settings:global:accessibility:capital-letters",
          kind: "boolean-setting",
          label: "Capital letters",
          enabled: configuration.global.accessibility.capitalLetters,
          contentEditable: true,
          contentVisible: true,
          listEditable: false,
          data: { kind: "boolean", setting: "capitalLetters" },
          children: [],
        }],
      }],
    },
  ];
}

function createCheckedNodeIds(configuration: ThemeConfiguration) {
  const checked = new Set<string>();
  for (const theme of configuration.themes) {
    if (theme.enabled) checked.add(`theme:${theme.id}`);
    for (const variable of theme.variables) {
      if (variable.enabled) checked.add(`theme:${theme.id}:variable:${variable.name}`);
    }
  }
  if (configuration.global.accessibility.capitalLetters) {
    checked.add("settings:global:accessibility:capital-letters");
  }
  return [...checked];
}

export function updateCheckedSetting(
  configuration: ThemeConfiguration,
  data: Exclude<SettingsTreeData, { kind: "folder" }>,
  checked: boolean,
): ThemeConfiguration {
  if (data.kind === "theme") {
    if (!checked) return configuration;
    return {
      ...configuration,
      themes: configuration.themes.map((theme) => ({
        ...theme,
        enabled: theme.id === data.themeId,
      })),
    };
  }
  if (data.kind === "boolean") {
    return {
      ...configuration,
      global: {
        ...configuration.global,
        accessibility: {
          ...configuration.global.accessibility,
          capitalLetters: checked,
        },
      },
    };
  }
  return {
    ...configuration,
    themes: configuration.themes.map((theme) => theme.id !== data.themeId
      ? theme
      : {
          ...theme,
          variables: theme.variables.map((variable) => variable.name === data.name
            ? { ...variable, enabled: checked }
            : variable),
        }),
  };
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
    ...configuration,
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

function selectionKey(selection: SettingsSelection) {
  if (!selection) return "no-selection";
  if (selection.kind === "boolean") return selection.setting;
  return `${selection.themeId}:${selection.kind === "variable"
    ? selection.name
    : "theme"}`;
}

function selectionLabel(selection: SettingsSelection) {
  if (!selection) return "selected setting";
  if (selection.kind === "boolean") return "Capital letters";
  return selection.kind === "variable" ? selection.name : selection.themeId;
}
