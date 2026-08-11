const moduleMenuItems = [
  "AGNT",
  "DATA",
  "FUNC",
  "CRON",
  "HELP",
  "CONFIG",
] as const;

type ModuleMenuItem = typeof moduleMenuItems[number];
export type StoredBaseProperties = {
  color: string;
  background: string;
  border: string;
  padding: string;
  margin: string;
  width: string;
  height: string;
};

type ResolvedBaseProperties = StoredBaseProperties;

export type ComponentPropertiesConfig = {
  Base: StoredBaseProperties & { showComponentName: boolean };
  BackgroundLogo: {
    symbol: string;
    fontSizeFactor: number;
    opacity: number;
    top: string;
    base: StoredBaseProperties;
  };
  Button: {
    activeColor: string;
    fontSize: string;
    fontWeight: string;
    base: StoredBaseProperties;
  };
  CompactButton: {
    fontSize: string;
    fontWeight: string;
    base: StoredBaseProperties;
  };
  Block: { base: StoredBaseProperties };
  Breadcrumb: { base: StoredBaseProperties };
  ItemList: { base: StoredBaseProperties };
  PressButton: { base: StoredBaseProperties };
  BackspaceButton: { base: StoredBaseProperties };
  LongPressButton: { base: StoredBaseProperties };
  ShiftButton: { base: StoredBaseProperties };
  CycleButton: { base: StoredBaseProperties };
  DialButton: { base: StoredBaseProperties };
  Keyboard: { base: StoredBaseProperties };
  ModuleButton: {
    symbol: string;
    base: StoredBaseProperties;
  };
  SymbolButton: {
    symbolTop: string;
    symbolLeft: string;
    base: StoredBaseProperties;
  };
  SideModuleButton: { base: StoredBaseProperties };
  HelpModuleButton: { symbol: string; base: StoredBaseProperties };
  ConfigModuleButton: { symbol: string; base: StoredBaseProperties };
  ModuleMenuActions: { base: StoredBaseProperties };
  ButtonLink: {
    href: string;
    label: string;
    base: StoredBaseProperties;
  };
  BlockingDialog: { base: StoredBaseProperties };
  LoginDialog: { base: StoredBaseProperties };
  BrowserItem: { base: StoredBaseProperties };
  BrowserItemLabelButton: {
    fontSize: string;
    fontWeight: string;
    base: StoredBaseProperties;
  };
  BrowserItemModeButton: { base: StoredBaseProperties };
  Checkbox: { activeColor: string; base: StoredBaseProperties };
  DeviceInfo: { base: StoredBaseProperties };
  DeviceInfoButton: { base: StoredBaseProperties };
  DeleteButton: { armedColor: string; base: StoredBaseProperties };
  DialerButton: { base: StoredBaseProperties };
  DialerCenterButton: { base: StoredBaseProperties };
  DialSurface: { base: StoredBaseProperties };
  Dialer: { base: StoredBaseProperties };
  ColorDialer: { base: StoredBaseProperties };
  CronDialer: {
    base: StoredBaseProperties;
    innerBackground: string;
    innerTextColor: string;
    innerPointerColor: string;
    innerFontSize: string;
    outerBackground: string;
    outerTextColor: string;
    outerPointerColor: string;
    outerFontSize: string;
  };
  MemoryBrowser: { base: StoredBaseProperties };
  TreeBrowser: { rowGap: string; base: StoredBaseProperties };
  DataBrowser: { base: StoredBaseProperties };
  AppBrowser: { base: StoredBaseProperties };
  DataTree: { base: StoredBaseProperties };
  RootInputControl: { base: StoredBaseProperties };
  ParentInput: { base: StoredBaseProperties };
  DataSourceInput: { base: StoredBaseProperties };
  ContentEditor: { base: StoredBaseProperties };
  AppView: { base: StoredBaseProperties };
  CompassApp: { base: StoredBaseProperties };
  ConfigEditor: { base: StoredBaseProperties };
  DeviceInfoView: { base: StoredBaseProperties };
  InventoryApp: { base: StoredBaseProperties };
  ShoppingListView: { base: StoredBaseProperties };
  Form: { actionWidth: string; base: StoredBaseProperties };
  FormRow: { base: StoredBaseProperties };
  Input: {
    fontSize: string;
    keyboard: boolean;
    base: StoredBaseProperties;
  };
  InputControl: { base: StoredBaseProperties };
  ListControl: { base: StoredBaseProperties };
  ListControlButton: { base: StoredBaseProperties };
  ListControlListSizeButton: {
    fontSize: string;
    fontWeight: string;
    base: StoredBaseProperties;
  };
  AppStatusLine: {
    error: boolean;
    fontSize: string;
    fontWeight: string;
    message: string;
    base: StoredBaseProperties;
  };
  AppTitle: {
    title: string;
    symbol: string;
    subtitle: string;
    fontSize: number;
    titleTop: number;
    titleLeft: number;
    flydeckTitleTop: number;
    flydeckTitleLeft: number;
    symbolFontSize: number;
    symbolTop: number;
    symbolLeft: number;
    subtitleFontSize: number;
    subtitleTop: number;
    subtitleLeft: number;
    base: StoredBaseProperties;
  };
  AppShell: {
    respectSafeArea: boolean;
    appMaxWidth: number;
    appInset: number;
    appSectionGap: number;
    base: StoredBaseProperties;
  };
  ModulePanel: {
    activeItem: ModuleMenuItem;
    base: StoredBaseProperties;
  };
  Module: { base: StoredBaseProperties };
  AgentModule: { base: StoredBaseProperties };
  DataModule: { base: StoredBaseProperties };
  FunctionsModule: { base: StoredBaseProperties };
  CronModule: { base: StoredBaseProperties };
  HelpModule: { base: StoredBaseProperties };
  SettingsModule: { base: StoredBaseProperties };
  SubmoduleButton: { base: StoredBaseProperties };
  SubmodulePanel: { base: StoredBaseProperties };
  Textarea: {
    fontSize: string;
    keyboard: boolean;
    base: StoredBaseProperties;
  };
};

export function parseComponentPropertiesConfig(
  input: unknown,
): ComponentPropertiesConfig | null {
  if (!isRecord(input)) {
    return null;
  }

  const baseInput = input.Base;
  const backgroundLogo = input.BackgroundLogo;
  const button = input.Button;
  const compactButton = input.CompactButton;
  const block = input.Block;
  const breadcrumb = input.Breadcrumb;
  const itemList = input.ItemList;
  const pressButton = input.PressButton;
  const backspaceButton = input.BackspaceButton;
  const longPressButton = input.LongPressButton;
  const shiftButton = input.ShiftButton;
  const cycleButton = input.CycleButton;
  const dialButton = input.DialButton;
  const keyboard = input.Keyboard;
  const moduleButton = input.ModuleButton;
  const symbolButton = input.SymbolButton;
  const sideModuleButton = input.SideModuleButton;
  const helpModuleButton = input.HelpModuleButton;
  const configModuleButton = input.ConfigModuleButton;
  const moduleMenuActions = input.ModuleMenuActions;
  const buttonLink = input.ButtonLink;
  const blockingDialog = input.BlockingDialog;
  const loginDialog = input.LoginDialog;
  const browserItem = input.BrowserItem;
  const browserItemLabelButton = input.BrowserItemLabelButton;
  const browserItemModeButton = input.BrowserItemModeButton;
  const checkbox = input.Checkbox;
  const deviceInfo = input.DeviceInfo;
  const deviceInfoButton = input.DeviceInfoButton;
  const deleteButton = input.DeleteButton;
  const dialerButton = input.DialerButton;
  const dialerCenterButton = input.DialerCenterButton;
  const dialSurface = input.DialSurface;
  const dialer = input.Dialer;
  const colorDialer = input.ColorDialer;
  const cronDialer = input.CronDialer;
  const memoryBrowser = input.MemoryBrowser;
  const treeBrowser = input.TreeBrowser;
  const dataBrowser = input.DataBrowser;
  const appBrowser = input.AppBrowser;
  const dataTree = input.DataTree;
  const rootInputControl = input.RootInputControl;
  const parentInput = input.ParentInput;
  const dataSourceInput = input.DataSourceInput;
  const contentEditor = input.ContentEditor;
  const appView = input.AppView;
  const compassApp = input.CompassApp;
  const configEditor = input.ConfigEditor;
  const deviceInfoView = input.DeviceInfoView;
  const inventoryApp = input.InventoryApp;
  const shoppingListView = input.ShoppingListView;
  const form = input.Form;
  const formRow = input.FormRow;
  const inputComponent = input.Input;
  const inputControl = input.InputControl;
  const listControl = input.ListControl;
  const listControlButton = input.ListControlButton;
  const listControlListSizeButton = input.ListControlListSizeButton;
  const appStatusLine = input.AppStatusLine;
  const appTitle = input.AppTitle;
  const appShell = input.AppShell;
  const modulePanel = input.ModulePanel;
  const module = input.Module;
  const agentModule = input.AgentModule;
  const dataModule = input.DataModule;
  const functionsModule = input.FunctionsModule;
  const cronModule = input.CronModule;
  const helpModule = input.HelpModule;
  const settingsModule = input.SettingsModule;
  const submoduleButton = input.SubmoduleButton;
  const submodulePanel = input.SubmodulePanel;
  const textarea = input.Textarea;
  const base = parseStoredBaseProperties(baseInput);

  if (
    !base
    || !isRecord(baseInput)
    || typeof baseInput.showComponentName !== "boolean"
    || !isRecord(backgroundLogo)
    || !isRecord(button)
    || !isRecord(compactButton)
    || !isRecord(block)
    || !isRecord(breadcrumb)
    || !isRecord(itemList)
    || !isRecord(pressButton)
    || !isRecord(backspaceButton)
    || !isRecord(longPressButton)
    || !isRecord(shiftButton)
    || !isRecord(cycleButton)
    || !isRecord(dialButton)
    || !isRecord(keyboard)
    || !isRecord(moduleButton)
    || !isRecord(symbolButton)
    || !isRecord(sideModuleButton)
    || !isRecord(helpModuleButton)
    || !isRecord(configModuleButton)
    || !isRecord(moduleMenuActions)
    || !isRecord(buttonLink)
    || !isRecord(blockingDialog)
    || !isRecord(loginDialog)
    || !isRecord(browserItem)
    || !isRecord(browserItemLabelButton)
    || !isRecord(browserItemModeButton)
    || !isRecord(checkbox)
    || !isRecord(deviceInfo)
    || !isRecord(deviceInfoButton)
    || !isRecord(deleteButton)
    || !isRecord(dialerButton)
    || !isRecord(dialerCenterButton)
    || !isRecord(dialSurface)
    || !isRecord(dialer)
    || !isRecord(colorDialer)
    || !isRecord(cronDialer)
    || !isRecord(memoryBrowser)
    || !isRecord(treeBrowser)
    || !isRecord(dataBrowser)
    || !isRecord(appBrowser)
    || !isRecord(dataTree)
    || !isRecord(rootInputControl)
    || !isRecord(parentInput)
    || !isRecord(dataSourceInput)
    || !isRecord(contentEditor)
    || !isRecord(appView)
    || !isRecord(compassApp)
    || !isRecord(configEditor)
    || !isRecord(deviceInfoView)
    || !isRecord(inventoryApp)
    || !isRecord(shoppingListView)
    || !isRecord(form)
    || !isRecord(formRow)
    || !isRecord(inputComponent)
    || !isRecord(inputControl)
    || !isRecord(listControl)
    || !isRecord(listControlButton)
    || !isRecord(listControlListSizeButton)
    || !isRecord(appStatusLine)
    || !isRecord(appTitle)
    || !isRecord(appShell)
    || !isRecord(modulePanel)
    || !isRecord(module)
    || !isRecord(agentModule)
    || !isRecord(dataModule)
    || !isRecord(functionsModule)
    || !isRecord(cronModule)
    || !isRecord(helpModule)
    || !isRecord(settingsModule)
    || !isRecord(submoduleButton)
    || !isRecord(submodulePanel)
    || !isRecord(textarea)
  ) {
    return null;
  }

  const buttonBase = parseStoredBaseProperties(button.base);
  const compactButtonBase = parseStoredBaseProperties(compactButton.base);
  const blockBase = parseStoredBaseProperties(block.base);
  const breadcrumbBase = parseStoredBaseProperties(breadcrumb.base);
  const itemListBase = parseStoredBaseProperties(itemList.base);
  const pressButtonBase = parseStoredBaseProperties(pressButton.base);
  const backspaceButtonBase = parseStoredBaseProperties(backspaceButton.base);
  const longPressButtonBase = parseStoredBaseProperties(longPressButton.base);
  const shiftButtonBase = parseStoredBaseProperties(shiftButton.base);
  const cycleButtonBase = parseStoredBaseProperties(cycleButton.base);
  const dialButtonBase = parseStoredBaseProperties(dialButton.base);
  const keyboardBase = parseStoredBaseProperties(keyboard.base);
  const backgroundLogoBase = parseStoredBaseProperties(backgroundLogo.base);
  const moduleButtonBase = parseStoredBaseProperties(moduleButton.base);
  const symbolButtonBase = parseStoredBaseProperties(symbolButton.base);
  const sideModuleButtonBase = parseStoredBaseProperties(sideModuleButton.base);
  const helpModuleButtonBase = parseStoredBaseProperties(helpModuleButton.base);
  const configModuleButtonBase = parseStoredBaseProperties(configModuleButton.base);
  const moduleMenuActionsBase = parseStoredBaseProperties(moduleMenuActions.base);
  const buttonLinkBase = parseStoredBaseProperties(buttonLink.base);
  const blockingDialogBase = parseStoredBaseProperties(blockingDialog.base);
  const loginDialogBase = parseStoredBaseProperties(loginDialog.base);
  const browserItemBase = parseStoredBaseProperties(browserItem.base);
  const browserItemLabelButtonBase = parseStoredBaseProperties(
    browserItemLabelButton.base,
  );
  const browserItemModeButtonBase = parseStoredBaseProperties(
    browserItemModeButton.base,
  );
  const checkboxBase = parseStoredBaseProperties(checkbox.base);
  const deviceInfoBase = parseStoredBaseProperties(deviceInfo.base);
  const deviceInfoButtonBase = parseStoredBaseProperties(deviceInfoButton.base);
  const deleteButtonBase = parseStoredBaseProperties(deleteButton.base);
  const dialerButtonBase = parseStoredBaseProperties(dialerButton.base);
  const dialerCenterButtonBase = parseStoredBaseProperties(
    dialerCenterButton.base,
  );
  const dialSurfaceBase = parseStoredBaseProperties(dialSurface.base);
  const dialerBase = parseStoredBaseProperties(dialer.base);
  const colorDialerBase = parseStoredBaseProperties(colorDialer.base);
  const cronDialerBase = parseStoredBaseProperties(cronDialer.base);
  const memoryBrowserBase = parseStoredBaseProperties(memoryBrowser.base);
  const treeBrowserBase = parseStoredBaseProperties(treeBrowser.base);
  const dataBrowserBase = parseStoredBaseProperties(dataBrowser.base);
  const appBrowserBase = parseStoredBaseProperties(appBrowser.base);
  const dataTreeBase = parseStoredBaseProperties(dataTree.base);
  const rootInputControlBase = parseStoredBaseProperties(rootInputControl.base);
  const parentInputBase = parseStoredBaseProperties(parentInput.base);
  const dataSourceInputBase = parseStoredBaseProperties(dataSourceInput.base);
  const contentEditorBase = parseStoredBaseProperties(contentEditor.base);
  const appViewBase = parseStoredBaseProperties(appView.base);
  const compassAppBase = parseStoredBaseProperties(compassApp.base);
  const configEditorBase = parseStoredBaseProperties(configEditor.base);
  const deviceInfoViewBase = parseStoredBaseProperties(deviceInfoView.base);
  const inventoryAppBase = parseStoredBaseProperties(inventoryApp.base);
  const shoppingListViewBase = parseStoredBaseProperties(shoppingListView.base);
  const formBase = parseStoredBaseProperties(form.base);
  const formRowBase = parseStoredBaseProperties(formRow.base);
  const inputBase = parseStoredBaseProperties(inputComponent.base);
  const inputControlBase = parseStoredBaseProperties(inputControl.base);
  const listControlBase = parseStoredBaseProperties(listControl.base);
  const listControlButtonBase = parseStoredBaseProperties(listControlButton.base);
  const listControlListSizeButtonBase = parseStoredBaseProperties(
    listControlListSizeButton.base,
  );
  const appStatusLineBase = parseStoredBaseProperties(appStatusLine.base);
  const titleBase = parseStoredBaseProperties(appTitle.base);
  const shellBase = parseStoredBaseProperties(appShell.base);
  const panelBase = parseStoredBaseProperties(modulePanel.base);
  const moduleBase = parseStoredBaseProperties(module.base);
  const agentModuleBase = parseStoredBaseProperties(agentModule.base);
  const dataModuleBase = parseStoredBaseProperties(dataModule.base);
  const functionsModuleBase = parseStoredBaseProperties(functionsModule.base);
  const cronModuleBase = parseStoredBaseProperties(cronModule.base);
  const helpModuleBase = parseStoredBaseProperties(helpModule.base);
  const settingsModuleBase = parseStoredBaseProperties(settingsModule.base);
  const submoduleButtonBase = parseStoredBaseProperties(submoduleButton.base);
  const submodulePanelBase = parseStoredBaseProperties(submodulePanel.base);
  const textareaBase = parseStoredBaseProperties(textarea.base);

  if (
    !backgroundLogoBase
    || !buttonBase
    || !compactButtonBase
    || !blockBase
    || !breadcrumbBase
    || !itemListBase
    || !pressButtonBase
    || !backspaceButtonBase
    || !longPressButtonBase
    || !shiftButtonBase
    || !cycleButtonBase
    || !dialButtonBase
    || !keyboardBase
    || !moduleButtonBase
    || !symbolButtonBase
    || !sideModuleButtonBase
    || !helpModuleButtonBase
    || !configModuleButtonBase
    || !moduleMenuActionsBase
    || !isSingleCharacter(moduleButton.symbol)
    || typeof symbolButton.symbolTop !== "string"
    || symbolButton.symbolTop.trim() === ""
    || isUnitlessNonZeroDimension(symbolButton.symbolTop)
    || typeof symbolButton.symbolLeft !== "string"
    || symbolButton.symbolLeft.trim() === ""
    || isUnitlessNonZeroDimension(symbolButton.symbolLeft)
    || !isSingleCharacter(helpModuleButton.symbol)
    || !isSingleCharacter(configModuleButton.symbol)
    || !buttonLinkBase
    || !blockingDialogBase
    || !loginDialogBase
    || !browserItemBase
    || !browserItemLabelButtonBase
    || !browserItemModeButtonBase
    || !checkboxBase
    || !deviceInfoBase
    || !deviceInfoButtonBase
    || !deleteButtonBase
    || !dialerButtonBase
    || !dialerCenterButtonBase
    || !dialSurfaceBase
    || !dialerBase
    || !colorDialerBase
    || !cronDialerBase
    || !memoryBrowserBase
    || !treeBrowserBase
    || !dataBrowserBase
    || !appBrowserBase
    || !dataTreeBase
    || !rootInputControlBase
    || !parentInputBase
    || !dataSourceInputBase
    || !contentEditorBase
    || !appViewBase
    || !compassAppBase
    || !configEditorBase
    || !deviceInfoViewBase
    || !inventoryAppBase
    || !shoppingListViewBase
    || !formBase
    || !formRowBase
    || !inputBase
    || !inputControlBase
    || !listControlBase
    || !listControlButtonBase
    || !listControlListSizeButtonBase
    || !appStatusLineBase
    || !titleBase
    || !shellBase
    || !panelBase
    || !moduleBase
    || !agentModuleBase
    || !dataModuleBase
    || !functionsModuleBase
    || !cronModuleBase
    || !helpModuleBase
    || !settingsModuleBase
    || !submoduleButtonBase
    || !submodulePanelBase
    || !textareaBase
    || typeof backgroundLogo.symbol !== "string"
    || Array.from(backgroundLogo.symbol).length !== 1
    || !isNumberInRange(backgroundLogo.fontSizeFactor, 0.1, 3)
    || !isNumberInRange(backgroundLogo.opacity, 0, 1)
    || typeof backgroundLogo.top !== "string"
    || backgroundLogo.top.trim() === ""
    || isUnitlessNonZeroDimension(backgroundLogo.top)
    || typeof inputComponent.fontSize !== "string"
    || inputComponent.fontSize.trim() === ""
    || isUnitlessNonZeroDimension(inputComponent.fontSize)
    || typeof inputComponent.keyboard !== "boolean"
    || typeof form.actionWidth !== "string"
    || form.actionWidth.trim() === ""
    || isUnitlessNonZeroDimension(form.actionWidth)
    || typeof textarea.fontSize !== "string"
    || textarea.fontSize.trim() === ""
    || isUnitlessNonZeroDimension(textarea.fontSize)
    || typeof textarea.keyboard !== "boolean"
    || typeof deleteButton.armedColor !== "string"
    || deleteButton.armedColor.trim() === ""
    || !isCronDialerConfig(cronDialer)
    || typeof browserItemLabelButton.fontSize !== "string"
    || browserItemLabelButton.fontSize.trim() === ""
    || isUnitlessNonZeroDimension(browserItemLabelButton.fontSize)
    || typeof browserItemLabelButton.fontWeight !== "string"
    || browserItemLabelButton.fontWeight.trim() === ""
    || typeof listControlListSizeButton.fontSize !== "string"
    || listControlListSizeButton.fontSize.trim() === ""
    || isUnitlessNonZeroDimension(listControlListSizeButton.fontSize)
    || typeof listControlListSizeButton.fontWeight !== "string"
    || listControlListSizeButton.fontWeight.trim() === ""
    || typeof appStatusLine.error !== "boolean"
    || typeof appStatusLine.fontSize !== "string"
    || appStatusLine.fontSize.trim() === ""
    || isUnitlessNonZeroDimension(appStatusLine.fontSize)
    || typeof appStatusLine.fontWeight !== "string"
    || appStatusLine.fontWeight.trim() === ""
    || typeof appStatusLine.message !== "string"
    || typeof checkbox.activeColor !== "string"
    || checkbox.activeColor.trim() === ""
    || typeof treeBrowser.rowGap !== "string"
    || treeBrowser.rowGap.trim() === ""
    || typeof buttonLink.href !== "string"
    || typeof button.activeColor !== "string"
    || button.activeColor.trim() === ""
    || typeof compactButton.fontSize !== "string"
    || compactButton.fontSize.trim() === ""
    || isUnitlessNonZeroDimension(compactButton.fontSize)
    || typeof compactButton.fontWeight !== "string"
    || compactButton.fontWeight.trim() === ""
    || typeof button.fontSize !== "string"
    || button.fontSize.trim() === ""
    || isUnitlessNonZeroDimension(button.fontSize)
    || typeof button.fontWeight !== "string"
    || button.fontWeight.trim() === ""
    || typeof buttonLink.label !== "string"
    || typeof appTitle.title !== "string"
    || typeof appTitle.symbol !== "string"
    || typeof appTitle.subtitle !== "string"
    || !isNumberInRange(appTitle.fontSize, 12, 40)
    || !isNumberInRange(appTitle.titleTop, -40, 40)
    || !isNumberInRange(appTitle.titleLeft, -40, 40)
    || !isNumberInRange(appTitle.flydeckTitleTop, -40, 40)
    || !isNumberInRange(appTitle.flydeckTitleLeft, -40, 40)
    || !isNumberInRange(appTitle.symbolFontSize, 8, 64)
    || !isNumberInRange(appTitle.symbolTop, -40, 40)
    || !isNumberInRange(appTitle.symbolLeft, -40, 40)
    || !isNumberInRange(appTitle.subtitleFontSize, 8, 32)
    || !isNumberInRange(appTitle.subtitleTop, -40, 40)
    || !isNumberInRange(appTitle.subtitleLeft, -40, 40)
    || typeof appShell.respectSafeArea !== "boolean"
    || !isNumberInRange(appShell.appMaxWidth, 320, 600)
    || !isNumberInRange(appShell.appInset, 0, 24)
    || !isNumberInRange(appShell.appSectionGap, 0, 24)
    || typeof modulePanel.activeItem !== "string"
    || !moduleMenuItems.includes(modulePanel.activeItem as ModuleMenuItem)
  ) {
    return null;
  }

  return {
    Base: {
      ...base,
      showComponentName: baseInput.showComponentName,
    },
    BackgroundLogo: {
      symbol: backgroundLogo.symbol,
      fontSizeFactor: backgroundLogo.fontSizeFactor,
      opacity: backgroundLogo.opacity,
      top: backgroundLogo.top,
      base: backgroundLogoBase,
    },
    Button: {
      activeColor: button.activeColor,
      fontSize: button.fontSize,
      fontWeight: button.fontWeight,
      base: buttonBase,
    },
    CompactButton: {
      fontSize: compactButton.fontSize,
      fontWeight: compactButton.fontWeight,
      base: compactButtonBase,
    },
    Block: { base: blockBase },
    Breadcrumb: { base: breadcrumbBase },
    ItemList: { base: itemListBase },
    PressButton: { base: pressButtonBase },
    BackspaceButton: { base: backspaceButtonBase },
    LongPressButton: { base: longPressButtonBase },
    ShiftButton: { base: shiftButtonBase },
    CycleButton: { base: cycleButtonBase },
    DialButton: { base: dialButtonBase },
    Keyboard: { base: keyboardBase },
    ModuleButton: {
      symbol: moduleButton.symbol,
      base: moduleButtonBase,
    },
    SymbolButton: {
      symbolTop: symbolButton.symbolTop,
      symbolLeft: symbolButton.symbolLeft,
      base: symbolButtonBase,
    },
    SideModuleButton: { base: sideModuleButtonBase },
    HelpModuleButton: {
      symbol: helpModuleButton.symbol,
      base: helpModuleButtonBase,
    },
    ConfigModuleButton: {
      symbol: configModuleButton.symbol,
      base: configModuleButtonBase,
    },
    ModuleMenuActions: { base: moduleMenuActionsBase },
    ButtonLink: {
      href: buttonLink.href,
      label: buttonLink.label,
      base: buttonLinkBase,
    },
    BlockingDialog: { base: blockingDialogBase },
    LoginDialog: { base: loginDialogBase },
    BrowserItem: { base: browserItemBase },
    BrowserItemLabelButton: {
      fontSize: browserItemLabelButton.fontSize,
      fontWeight: browserItemLabelButton.fontWeight,
      base: browserItemLabelButtonBase,
    },
    BrowserItemModeButton: { base: browserItemModeButtonBase },
    Checkbox: {
      activeColor: checkbox.activeColor,
      base: checkboxBase,
    },
    DeviceInfo: { base: deviceInfoBase },
    DeviceInfoButton: { base: deviceInfoButtonBase },
    DeleteButton: {
      armedColor: deleteButton.armedColor,
      base: deleteButtonBase,
    },
    DialerButton: { base: dialerButtonBase },
    DialerCenterButton: { base: dialerCenterButtonBase },
    DialSurface: { base: dialSurfaceBase },
    Dialer: { base: dialerBase },
    ColorDialer: { base: colorDialerBase },
    CronDialer: {
      base: cronDialerBase,
      innerBackground: cronDialer.innerBackground,
      innerTextColor: cronDialer.innerTextColor,
      innerPointerColor: cronDialer.innerPointerColor,
      innerFontSize: cronDialer.innerFontSize,
      outerBackground: cronDialer.outerBackground,
      outerTextColor: cronDialer.outerTextColor,
      outerPointerColor: cronDialer.outerPointerColor,
      outerFontSize: cronDialer.outerFontSize,
    },
    MemoryBrowser: { base: memoryBrowserBase },
    TreeBrowser: {
      rowGap: treeBrowser.rowGap,
      base: treeBrowserBase,
    },
    DataBrowser: { base: dataBrowserBase },
    AppBrowser: { base: appBrowserBase },
    DataTree: { base: dataTreeBase },
    RootInputControl: { base: rootInputControlBase },
    ParentInput: { base: parentInputBase },
    DataSourceInput: { base: dataSourceInputBase },
    ContentEditor: { base: contentEditorBase },
    AppView: { base: appViewBase },
    CompassApp: { base: compassAppBase },
    ConfigEditor: { base: configEditorBase },
    DeviceInfoView: { base: deviceInfoViewBase },
    InventoryApp: { base: inventoryAppBase },
    ShoppingListView: { base: shoppingListViewBase },
    Form: { actionWidth: form.actionWidth, base: formBase },
    FormRow: { base: formRowBase },
    Input: {
      fontSize: inputComponent.fontSize,
      keyboard: inputComponent.keyboard,
      base: inputBase,
    },
    InputControl: { base: inputControlBase },
    ListControl: { base: listControlBase },
    ListControlButton: { base: listControlButtonBase },
    ListControlListSizeButton: {
      fontSize: listControlListSizeButton.fontSize,
      fontWeight: listControlListSizeButton.fontWeight,
      base: listControlListSizeButtonBase,
    },
    AppStatusLine: {
      error: appStatusLine.error,
      fontSize: appStatusLine.fontSize,
      fontWeight: appStatusLine.fontWeight,
      message: appStatusLine.message,
      base: appStatusLineBase,
    },
    AppTitle: {
      title: appTitle.title,
      symbol: appTitle.symbol,
      subtitle: appTitle.subtitle,
      fontSize: appTitle.fontSize,
      titleTop: appTitle.titleTop,
      titleLeft: appTitle.titleLeft,
      flydeckTitleTop: appTitle.flydeckTitleTop,
      flydeckTitleLeft: appTitle.flydeckTitleLeft,
      symbolFontSize: appTitle.symbolFontSize,
      symbolTop: appTitle.symbolTop,
      symbolLeft: appTitle.symbolLeft,
      subtitleFontSize: appTitle.subtitleFontSize,
      subtitleTop: appTitle.subtitleTop,
      subtitleLeft: appTitle.subtitleLeft,
      base: titleBase,
    },
    AppShell: {
      respectSafeArea: appShell.respectSafeArea,
      appMaxWidth: appShell.appMaxWidth,
      appInset: appShell.appInset,
      appSectionGap: appShell.appSectionGap,
      base: shellBase,
    },
    ModulePanel: {
      activeItem: modulePanel.activeItem as ModuleMenuItem,
      base: panelBase,
    },
    Module: { base: moduleBase },
    AgentModule: { base: agentModuleBase },
    DataModule: { base: dataModuleBase },
    FunctionsModule: { base: functionsModuleBase },
    CronModule: { base: cronModuleBase },
    HelpModule: { base: helpModuleBase },
    SettingsModule: { base: settingsModuleBase },
    SubmoduleButton: { base: submoduleButtonBase },
    SubmodulePanel: { base: submodulePanelBase },
    Textarea: {
      fontSize: textarea.fontSize,
      keyboard: textarea.keyboard,
      base: textareaBase,
    },
  };
}

export function requireComponentPropertiesConfig(
  input: unknown,
): ComponentPropertiesConfig {
  const config = parseComponentPropertiesConfig(input);
  if (!config) {
    throw new Error("Invalid generated component properties.");
  }
  return config;
}

export function resolveBaseProperties(
  componentValues: StoredBaseProperties,
): ResolvedBaseProperties {
  return { ...componentValues };
}

export function resolveDerivedBaseProperties(
  parentValues: StoredBaseProperties,
  componentValues: StoredBaseProperties,
): ResolvedBaseProperties {
  return {
    color: inheritFromParent(componentValues.color, parentValues.color),
    background: inheritFromParent(componentValues.background, parentValues.background),
    border: inheritFromParent(componentValues.border, parentValues.border),
    padding: inheritFromParent(componentValues.padding, parentValues.padding),
    margin: inheritFromParent(componentValues.margin, parentValues.margin),
    width: inheritFromParent(componentValues.width, parentValues.width),
    height: inheritFromParent(componentValues.height, parentValues.height),
  };
}

function inheritFromParent(value: string, parentValue: string): string {
  return value === "inherit" ? parentValue : value;
}

function isCronDialerConfig(
  input: Record<string, unknown>,
): input is Record<
  "innerBackground" | "innerTextColor" | "innerPointerColor" | "innerFontSize"
    | "outerBackground" | "outerTextColor" | "outerPointerColor" | "outerFontSize",
  string
> {
  return [
    "innerBackground",
    "innerTextColor",
    "innerPointerColor",
    "outerBackground",
    "outerTextColor",
    "outerPointerColor",
    "innerFontSize",
    "outerFontSize",
  ].every((name) => (
    typeof input[name] === "string" && input[name].trim() !== ""
  )) && !isUnitlessNonZeroDimension(input.innerFontSize as string)
    && !isUnitlessNonZeroDimension(input.outerFontSize as string);
}

function parseStoredBaseProperties(input: unknown): StoredBaseProperties | null {
  if (!isRecord(input)) {
    return null;
  }

  for (const name of ["color", "background", "border", "padding", "margin", "width", "height"]) {
    if (typeof input[name] !== "string" || input[name].trim() === "") {
      return null;
    }
  }

  if (isUnitlessNonZeroDimension(input.height as string)) {
    return null;
  }

  return input as StoredBaseProperties;
}

function isUnitlessNonZeroDimension(value: string): boolean {
  const trimmed = value.trim();
  return trimmed !== "0" && /^-?(?:\d+|\d*\.\d+)$/.test(trimmed);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isSingleCharacter(value: unknown): value is string {
  return typeof value === "string" && Array.from(value).length === 1;
}
