export type ComponentLabGroup =
  | "browser"
  | "concrete-module-button"
  | "individual"
  | "module";

type ComponentDefinition<
  TParent extends string | null,
  TLabGroup extends ComponentLabGroup,
> = {
  parent: TParent;
  source: string;
  labGroup: TLabGroup;
};

function defineComponentManifest<
  const TManifest extends Record<
    string,
    ComponentDefinition<string | null, ComponentLabGroup>
  >,
>(manifest: TManifest) {
  return manifest;
}

/**
 * The authoritative application-component inventory and inheritance graph.
 *
 * `parent` describes the single public component contract inherited by the
 * component. Internal child components are intentionally not represented as
 * additional parents.
 */
export const componentManifest = defineComponentManifest({
  Base: { parent: null, source: "components/Base/Base.tsx", labGroup: "individual" },
  Button: { parent: "Base", source: "components/Button/Button.tsx", labGroup: "individual" },
  CompactButton: { parent: "Button", source: "components/CompactButton/CompactButton.tsx", labGroup: "individual" },
  PressButton: { parent: "Button", source: "components/PressButton/PressButton.tsx", labGroup: "individual" },
  BackspaceButton: { parent: "PressButton", source: "components/BackspaceButton/BackspaceButton.tsx", labGroup: "individual" },
  CycleButton: { parent: "PressButton", source: "components/CycleButton/CycleButton.tsx", labGroup: "individual" },
  DialButton: { parent: "PressButton", source: "components/DialButton/DialButton.tsx", labGroup: "individual" },
  LongPressButton: { parent: "Button", source: "components/LongPressButton/LongPressButton.tsx", labGroup: "individual" },
  ShiftButton: { parent: "LongPressButton", source: "components/ShiftButton/ShiftButton.tsx", labGroup: "individual" },
  ModuleButton: { parent: "PressButton", source: "components/ModuleButton/ModuleButton.tsx", labGroup: "individual" },
  SubmoduleButton: { parent: "PressButton", source: "components/SubmoduleButton/SubmoduleButton.tsx", labGroup: "individual" },
  AppStatusLine: { parent: "Base", source: "components/AppStatusLine/AppStatusLine.tsx", labGroup: "individual" },
  SymbolButton: { parent: "Button", source: "components/SymbolButton/SymbolButton.tsx", labGroup: "individual" },
  SideModuleButton: { parent: "SymbolButton", source: "components/SideModuleButton/SideModuleButton.tsx", labGroup: "individual" },
  ConfigModuleButton: { parent: "SideModuleButton", source: "components/ConfigModuleButton/ConfigModuleButton.tsx", labGroup: "concrete-module-button" },
  HelpModuleButton: { parent: "SideModuleButton", source: "components/HelpModuleButton/HelpModuleButton.tsx", labGroup: "concrete-module-button" },
  BrowserItemModeButton: { parent: "SymbolButton", source: "components/BrowserItemModeButton/BrowserItemModeButton.tsx", labGroup: "browser" },
  DeleteButton: { parent: "Button", source: "components/DeleteButton/DeleteButton.tsx", labGroup: "browser" },
  BrowserItemLabelButton: { parent: "Button", source: "components/BrowserItemLabelButton/BrowserItemLabelButton.tsx", labGroup: "browser" },
  Checkbox: { parent: "Button", source: "components/Checkbox/Checkbox.tsx", labGroup: "browser" },
  DeviceInfoButton: { parent: "Button", source: "components/DeviceInfoButton/DeviceInfoButton.tsx", labGroup: "browser" },
  DialerButton: { parent: "Button", source: "components/DialerButton/DialerButton.tsx", labGroup: "browser" },
  DialerCenterButton: { parent: "DialerButton", source: "components/DialerCenterButton/DialerCenterButton.tsx", labGroup: "browser" },
  ListControlButton: { parent: "Button", source: "components/ListControlButton/ListControlButton.tsx", labGroup: "browser" },
  ListControlListSizeButton: { parent: "PressButton", source: "components/ListControlListSizeButton/ListControlListSizeButton.tsx", labGroup: "browser" },

  AppShell: { parent: "Base", source: "components/AppShell/AppShell.tsx", labGroup: "individual" },
  AppTitle: { parent: "Base", source: "components/AppTitle/AppTitle.tsx", labGroup: "individual" },
  AppView: { parent: "Base", source: "components/AppView/AppView.tsx", labGroup: "individual" },
  BackgroundLogo: { parent: "Base", source: "components/BackgroundLogo/BackgroundLogo.tsx", labGroup: "browser" },
  Block: { parent: "Base", source: "components/Block/Block.tsx", labGroup: "individual" },
  BlockingDialog: { parent: "Base", source: "components/BlockingDialog/BlockingDialog.tsx", labGroup: "browser" },
  Breadcrumb: { parent: "Base", source: "components/Breadcrumb/Breadcrumb.tsx", labGroup: "individual" },
  BrowserItem: { parent: "Base", source: "components/BrowserItem/BrowserItem.tsx", labGroup: "browser" },
  ButtonLink: { parent: "Base", source: "components/ButtonLink/ButtonLink.tsx", labGroup: "individual" },
  DeviceInfo: { parent: "Base", source: "components/DeviceInfo/DeviceInfo.tsx", labGroup: "individual" },
  DialSurface: { parent: "Base", source: "components/DialSurface/DialSurface.tsx", labGroup: "individual" },
  Dialer: { parent: "Base", source: "components/Dialer/Dialer.tsx", labGroup: "individual" },
  Form: { parent: "Base", source: "components/Form/Form.tsx", labGroup: "individual" },
  FormRow: { parent: "Block", source: "components/FormRow/FormRow.tsx", labGroup: "individual" },
  Input: { parent: "Base", source: "components/Input/Input.tsx", labGroup: "browser" },
  Keyboard: { parent: "Base", source: "components/Keyboard/Keyboard.tsx", labGroup: "individual" },
  InputControl: { parent: "Base", source: "components/InputControl/InputControl.tsx", labGroup: "browser" },
  NodeIdInput: { parent: "InputControl", source: "components/NodeIdInput/NodeIdInput.tsx", labGroup: "individual" },
  ItemList: { parent: "Base", source: "components/ItemList/ItemList.tsx", labGroup: "individual" },
  ListControl: { parent: "Base", source: "components/ListControl/ListControl.tsx", labGroup: "browser" },
  Module: { parent: "Base", source: "components/Module/Module.tsx", labGroup: "module" },
  ModuleMenuActions: { parent: "Base", source: "components/ModuleMenuActions/ModuleMenuActions.tsx", labGroup: "individual" },
  ModulePanel: { parent: "Base", source: "components/ModulePanel/ModulePanel.tsx", labGroup: "individual" },
  RootInputControl: { parent: "Base", source: "components/RootInputControl/RootInputControl.tsx", labGroup: "individual" },
  ParentInput: { parent: "RootInputControl", source: "components/ParentInput/ParentInput.tsx", labGroup: "individual" },
  SubmodulePanel: { parent: "Base", source: "components/SubmodulePanel/SubmodulePanel.tsx", labGroup: "individual" },
  Textarea: { parent: "Base", source: "components/Textarea/Textarea.tsx", labGroup: "individual" },
  TreeBrowser: { parent: "Base", source: "components/TreeBrowser/TreeBrowser.tsx", labGroup: "browser" },

  LoginDialog: { parent: "BlockingDialog", source: "components/LoginDialog/LoginDialog.tsx", labGroup: "browser" },
  MemoryBrowser: { parent: "TreeBrowser", source: "components/MemoryBrowser/MemoryBrowser.tsx", labGroup: "browser" },
  DataBrowser: { parent: "TreeBrowser", source: "components/DataBrowser/DataBrowser.tsx", labGroup: "browser" },
  AppBrowser: { parent: "TreeBrowser", source: "components/AppBrowser/AppBrowser.tsx", labGroup: "browser" },
  DataTree: { parent: "DataBrowser", source: "components/DataTree/DataTree.tsx", labGroup: "individual" },
  ContentEditor: { parent: "InputControl", source: "components/TreeBrowser/ContentEditor.tsx", labGroup: "individual" },
  DataSourceInput: { parent: "RootInputControl", source: "components/DataSourceInput/DataSourceInput.tsx", labGroup: "individual" },
  ColorDialer: { parent: "Dialer", source: "components/ColorDialer/ColorDialer.tsx", labGroup: "individual" },
  CronDialer: { parent: "Dialer", source: "components/CronDialer/CronDialer.tsx", labGroup: "individual" },
  CompassApp: { parent: "AppView", source: "components/CompassApp/CompassApp.tsx", labGroup: "individual" },
  DeviceInfoView: { parent: "AppView", source: "components/DeviceInfoView/DeviceInfoView.tsx", labGroup: "individual" },
  InventoryApp: { parent: "AppView", source: "components/InventoryApp/InventoryApp.tsx", labGroup: "individual" },
  ShoppingListView: { parent: "AppView", source: "components/ShoppingListView/ShoppingListView.tsx", labGroup: "individual" },

  AgentModule: { parent: "Module", source: "modules/AgentModule/AgentModule.tsx", labGroup: "module" },
  CronModule: { parent: "Module", source: "modules/CronModule/CronModule.tsx", labGroup: "module" },
  DataModule: { parent: "Module", source: "modules/DataModule/DataModule.tsx", labGroup: "module" },
  FunctionsModule: { parent: "Module", source: "modules/FunctionsModule/FunctionsModule.tsx", labGroup: "module" },
  HelpModule: { parent: "Module", source: "modules/HelpModule/HelpModule.tsx", labGroup: "module" },
  SettingsModule: { parent: "Module", source: "modules/SettingsModule/SettingsModule.tsx", labGroup: "module" },

  ConfigEditor: { parent: "Base", source: "components/AppView/ConfigEditor.tsx", labGroup: "individual" },
} as const);

export type AppComponentName = keyof typeof componentManifest;

export type ComponentNameInLabGroup<TGroup extends ComponentLabGroup> = {
  [TName in AppComponentName]:
    typeof componentManifest[TName]["labGroup"] extends TGroup ? TName : never;
}[AppComponentName];

export const appComponentNames = (
  Object.keys(componentManifest) as AppComponentName[]
).sort((left, right) => left.localeCompare(right));

export function componentNamesInLabGroup<TGroup extends ComponentLabGroup>(
  group: TGroup,
): ComponentNameInLabGroup<TGroup>[] {
  return appComponentNames.filter((name) => (
    componentManifest[name].labGroup === group
  )) as ComponentNameInLabGroup<TGroup>[];
}

export function getComponentAncestors(name: AppComponentName) {
  const ancestors: AppComponentName[] = [];
  const visited = new Set<AppComponentName>([name]);
  let parent: string | null = componentManifest[name].parent;

  while (parent !== null) {
    if (!(parent in componentManifest)) {
      throw new Error(`Unknown parent ${parent} declared by ${name}.`);
    }
    const typedParent = parent as AppComponentName;
    if (visited.has(typedParent)) {
      throw new Error(`Component inheritance cycle detected at ${typedParent}.`);
    }
    visited.add(typedParent);
    ancestors.push(typedParent);
    parent = componentManifest[typedParent].parent;
  }

  return ancestors;
}

export function getComponentDepth(name: AppComponentName) {
  return getComponentAncestors(name).length;
}
