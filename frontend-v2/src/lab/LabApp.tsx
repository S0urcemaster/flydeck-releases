import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { AppShell } from "../components/AppShell";
import { AppStatusLine } from "../components/AppStatusLine";
import { AppTitle } from "../components/AppTitle";
import {
  Base,
  BaseConfigurationProvider,
  resolveCssValue,
} from "../components/Base";
import { BackgroundLogo } from "../components/BackgroundLogo";
import { BrowserItem } from "../components/BrowserItem";
import { BlockingDialog } from "../components/BlockingDialog";
import {
  Button,
  ButtonConfigurationProvider,
} from "../components/Button";
import { ButtonLink } from "../components/ButtonLink";
import { BrowserItemLabelButton } from "../components/BrowserItemLabelButton";
import { BrowserItemModeButton } from "../components/BrowserItemModeButton";
import { Checkbox } from "../components/Checkbox";
import { CycleButton } from "../components/CycleButton";
import { AgentModuleButton } from "../components/AgentModuleButton";
import { ConfigModuleButton } from "../components/ConfigModuleButton";
import { CronModuleButton } from "../components/CronModuleButton";
import { DataModuleButton } from "../components/DataModuleButton";
import { DataBrowser } from "../components/DataBrowser";
import { DeviceInfo } from "../components/DeviceInfo";
import { DeviceInfoButton } from "../components/DeviceInfoButton";
import { DeleteButton } from "../components/DeleteButton";
import { DialerButton } from "../components/DialerButton";
import { DialerCenterButton } from "../components/DialerCenterButton";
import { FuncModuleButton } from "../components/FuncModuleButton";
import { FunctionBrowser } from "../components/FunctionBrowser";
import { Input } from "../components/Input";
import { InputAids } from "../components/InputAids";
import { InputControl } from "../components/InputControl";
import { LoginDialog } from "../components/LoginDialog";
import { LongPressButton } from "../components/LongPressButton";
import { HelpModuleButton } from "../components/HelpModuleButton";
import type { ModuleMenuItem } from "../components/ModuleMenu";
import { ModuleMenuActions } from "../components/ModuleMenuActions";
import {
  ModulePanel,
} from "../components/ModulePanel";
import { ModuleButton } from "../components/ModuleButton";
import { MemoryBrowser } from "../components/MemoryBrowser";
import { Module } from "../components/Module";
import { ListControl } from "../components/ListControl";
import { ListControlButton } from "../components/ListControlButton";
import {
  ListControlListSizeButton,
  type ListControlListSize,
} from "../components/ListControlListSizeButton";
import { Textarea } from "../components/Textarea";
import { SynchronizationDialog } from "../components/SynchronizationDialog";
import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserInitialNode,
} from "../components/TreeBrowser";
import {
  parseComponentPropertiesConfig,
  requireComponentPropertiesConfig,
  resolveDerivedBaseProperties,
  type ComponentPropertiesConfig,
} from "../config/componentProperties";
import generatedComponentProperties from "../config/generated-component-properties.json";
import { AgentModule } from "../modules/AgentModule";
import { CronModule } from "../modules/CronModule";
import { DataModule } from "../modules/DataModule";
import { FunctionsModule } from "../modules/FunctionsModule";
import { HelpModule } from "../modules/HelpModule";
import { SettingsModule } from "../modules/SettingsModule";
import { SideModuleButton } from "../components/SideModuleButton";
import { SubmoduleButton } from "../components/SubmoduleButton";
import { SubmodulePanel } from "../components/SubmodulePanel";
import { ColorMapEditor } from "./components/ColorMapEditor";
import { CommentHighlightedTextarea } from "./components/CommentHighlightedTextarea";
import { NumberInput } from "./components/NumberInput";
import { RgbColorField } from "./components/RgbColorField";
import { TokenEditor } from "./components/TokenEditor";
import {
  defaultLabTokenValues,
  labTokenDefinitions,
  parseLabTokenValues,
  type LabTokenName,
  type LabTokenValues,
} from "./tokenDefinitions";
import {
  BasePropertyControls,
  toBaseStyleProps,
  type BaseLabPropertyName,
  type BaseLabValues,
} from "./BasePropertyControls";
import {
  defaultColorValues,
  colorDefinitions,
  flydeckV1ColorValues,
  greyscaleColorValues,
  themeColorMaps,
  parseThemeConfig,
  type ColorName,
  type ColorValues,
  type ThemeConfig,
  type ThemeColorMapId,
} from "../themes/colorDefinitions";
import generatedThemes from "../themes/generated-themes.json";
import { defaultThemeConfiguration } from "../themes/themeConfiguration";
import styles from "./LabApp.module.css";
import { clientStateStore, selectedLabComponentSlice } from "../state";

type LabStatus = {
  tone: "neutral" | "success" | "error";
  message: string;
};

type LabComponentName =
  | "Base"
  | "Button"
  | "ButtonLink"
  | "CycleButton"
  | "InputAids"
  | "LongPressButton"
  | BrowserLabComponentName
  | "DeviceInfo"
  | "ModuleMenuActions"
  | "ModulePanel"
  | "ModuleButton"
  | "SideModuleButton"
  | "SubmoduleButton"
  | "SubmodulePanel"
  | ConcreteModuleButtonName
  | ModuleComponentName
  | "Textarea"
  | "AppStatusLine"
  | "AppTitle"
  | "AppShell"
  | "ColorMapEditor"
  | "CommentHighlightedTextarea"
  | "NumberInput"
  | "RgbColorField"
  | "TokenEditor"
  | `theme:${ThemeColorMapId}`;

type ModuleComponentName =
  | "Module"
  | "AgentModule"
  | "DataModule"
  | "FunctionsModule"
  | "CronModule"
  | "HelpModule"
  | "SettingsModule";

type ConcreteModuleButtonName =
  | "AgentModuleButton"
  | "ConfigModuleButton"
  | "CronModuleButton"
  | "DataModuleButton"
  | "FuncModuleButton"
  | "HelpModuleButton";

type BrowserLabComponentName =
  | "BackgroundLogo"
  | "BlockingDialog"
  | "BrowserItem"
  | "BrowserItemLabelButton"
  | "BrowserItemModeButton"
  | "Checkbox"
  | "DataBrowser"
  | "FunctionBrowser"
  | "Input"
  | "InputControl"
  | "ListControl"
  | "ListControlButton"
  | "ListControlListSizeButton"
  | "LoginDialog"
  | "MemoryBrowser"
  | "TreeBrowser"
  | "SynchronizationDialog"
  | "DeleteButton"
  | "DialerButton"
  | "DialerCenterButton"
  | "DeviceInfoButton";

type ShellPreviewStyle = CSSProperties & {
  "--app-max-width": string;
  "--app-inset": string;
  "--app-section-gap": string;
};

type ColorPreviewStyle = CSSProperties & Record<`--color-${string}`, string>;

const labTree: TreeBrowserInitialNode[] = [{
  id: "identity",
  label: "Identity",
  enabled: true,
  children: [{
    id: "role",
    label: "Role",
    enabled: true,
    children: [],
  }],
}];
const labTreeBrowserModel = new TreeBrowserModel({
  initialTree: labTree,
  storageKey: "flydeck.lab.tree-browser.preview",
});
const labMemoryBrowserModel = new TreeBrowserModel({
  initialTree: labTree,
  storageKey: "flydeck.lab.memory-browser.preview",
});

type ShellTokenName = "appMaxWidth" | "appInset" | "appSectionGap";
const viewportWidths = [320, 360, 390, 430, 480] as const;
const appComponentNames = [
  "AgentModule",
  "AgentModuleButton",
  "AppShell",
  "AppStatusLine",
  "AppTitle",
  "Base",
  "BackgroundLogo",
  "BlockingDialog",
  "BrowserItem",
  "BrowserItemLabelButton",
  "BrowserItemModeButton",
  "Button",
  "ButtonLink",
  "Checkbox",
  "ConfigModuleButton",
  "CronModule",
  "CronModuleButton",
  "CycleButton",
  "DataBrowser",
  "DataModule",
  "DataModuleButton",
  "DeleteButton",
  "DeviceInfo",
  "DeviceInfoButton",
  "DialerButton",
  "DialerCenterButton",
  "FuncModuleButton",
  "FunctionBrowser",
  "FunctionsModule",
  "HelpModule",
  "HelpModuleButton",
  "Input",
  "InputAids",
  "InputControl",
  "ListControl",
  "ListControlButton",
  "ListControlListSizeButton",
  "LoginDialog",
  "LongPressButton",
  "MemoryBrowser",
  "Module",
  "ModuleButton",
  "ModuleMenuActions",
  "ModulePanel",
  "SettingsModule",
  "SideModuleButton",
  "SubmoduleButton",
  "SubmodulePanel",
  "SynchronizationDialog",
  "Textarea",
  "TreeBrowser",
] as const;
type AppComponentName = typeof appComponentNames[number];
const selectedAppComponentStorageKey =
  "flydeck.lab.selectedAppComponent";
const appComponentDepths: Record<
  typeof appComponentNames[number],
  0 | 1 | 2
> = {
  AgentModuleButton: 2,
  AppShell: 1,
  AppStatusLine: 2,
  AppTitle: 1,
  Base: 0,
  BackgroundLogo: 1,
  BlockingDialog: 1,
  Button: 1,
  ButtonLink: 1,
  BrowserItem: 1,
  BrowserItemLabelButton: 2,
  BrowserItemModeButton: 2,
  Checkbox: 1,
  DataBrowser: 2,
  AgentModule: 2,
  ConfigModuleButton: 2,
  CronModule: 2,
  CronModuleButton: 2,
  CycleButton: 2,
  DataModule: 2,
  DataModuleButton: 2,
  DeviceInfo: 1,
  DeviceInfoButton: 2,
  DeleteButton: 2,
  DialerButton: 2,
  DialerCenterButton: 2,
  FunctionBrowser: 2,
  Input: 1,
  InputAids: 1,
  InputControl: 1,
  ListControl: 1,
  ListControlButton: 2,
  ListControlListSizeButton: 2,
  LoginDialog: 2,
  LongPressButton: 2,
  FuncModuleButton: 2,
  FunctionsModule: 2,
  HelpModule: 2,
  HelpModuleButton: 2,
  ModulePanel: 1,
  ModuleButton: 2,
  ModuleMenuActions: 1,
  Module: 1,
  MemoryBrowser: 2,
  SettingsModule: 2,
  SideModuleButton: 2,
  SubmoduleButton: 2,
  SubmodulePanel: 1,
  SynchronizationDialog: 2,
  Textarea: 1,
  TreeBrowser: 1,
};
const moduleComponentNames: readonly ModuleComponentName[] = [
  "AgentModule",
  "CronModule",
  "DataModule",
  "FunctionsModule",
  "HelpModule",
  "Module",
  "SettingsModule",
];
const concreteModuleButtonNames: readonly ConcreteModuleButtonName[] = [
  "AgentModuleButton",
  "ConfigModuleButton",
  "CronModuleButton",
  "DataModuleButton",
  "FuncModuleButton",
  "HelpModuleButton",
];
const browserLabComponentNames: readonly BrowserLabComponentName[] = [
  "BackgroundLogo",
  "BlockingDialog",
  "BrowserItem",
  "BrowserItemLabelButton",
  "BrowserItemModeButton",
  "Checkbox",
  "DataBrowser",
  "DeleteButton",
  "DeviceInfoButton",
  "DialerButton",
  "DialerCenterButton",
  "FunctionBrowser",
  "Input",
  "InputControl",
  "ListControl",
  "ListControlButton",
  "ListControlListSizeButton",
  "LoginDialog",
  "MemoryBrowser",
  "SynchronizationDialog",
  "TreeBrowser",
];
const labComponentNames = [
  "ColorMapEditor",
  "CommentHighlightedTextarea",
  "NumberInput",
  "RgbColorField",
  "TokenEditor",
] as const;
const componentBaseDefaults: BaseLabValues = {
  color: "inherit",
  background: "inherit",
  border: "inherit",
  padding: "inherit",
  margin: "inherit",
  width: "unset",
  height: "unset",
};
const basePreviewDefaults: BaseLabValues = {
  color: "inherit",
  background: "inherit",
  border: "inherit",
  padding: "inherit",
  margin: "inherit",
  width: "unset",
  height: "unset",
};
const moduleButtonPreviewDefaults: BaseLabValues = {
  color: "COLOR_TEXT",
  background: "COLOR_SURFACE",
  border: "BORDER_STANDARD",
  padding: "0 SPACE_SM",
  margin: "0",
  width: "unset",
  height: "inherit",
};
const initialThemeConfig: ThemeConfig = parseThemeConfig(generatedThemes) ?? {
  activeTheme: "flydeck",
  themes: {
    flydeck: { ...defaultColorValues },
    "flydeck-v1": { ...flydeckV1ColorValues },
    greyscale: { ...greyscaleColorValues },
  },
  tokens: {
    flydeck: { ...defaultLabTokenValues },
    "flydeck-v1": { ...defaultLabTokenValues },
    greyscale: { ...defaultLabTokenValues },
  },
};
const storedComponentProperties = requireComponentPropertiesConfig(
  generatedComponentProperties,
);

export function LabApp() {
  const [listControlPreviewPageSize, setListControlPreviewPageSize] =
    useState<ListControlListSize>(5);
  const [selectedComponent, setSelectedComponent] =
    useState<LabComponentName>(() => readSelectedAppComponent());
  const [selectedThemeId, setSelectedThemeId] =
    useState<ThemeColorMapId>(initialThemeConfig.activeTheme);
  const [showThemeColors, setShowThemeColors] = useState(true);
  const [title, setTitle] = useState(storedComponentProperties.AppTitle.title);
  const [appStatusLineBaseValues, setAppStatusLineBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.AppStatusLine.base);
  const [appStatusLineError, setAppStatusLineError] =
    useState(storedComponentProperties.AppStatusLine.error);
  const [appStatusLineFontSize, setAppStatusLineFontSize] =
    useState(storedComponentProperties.AppStatusLine.fontSize);
  const [appStatusLineFontWeight, setAppStatusLineFontWeight] =
    useState(storedComponentProperties.AppStatusLine.fontWeight);
  const [appStatusLineMessage, setAppStatusLineMessage] =
    useState(storedComponentProperties.AppStatusLine.message);
  const [titleSymbol, setTitleSymbol] =
    useState(storedComponentProperties.AppTitle.symbol);
  const [basePreviewValues, setBasePreviewValues] =
    useState<BaseLabValues>(storedComponentProperties.Base);
  const [showComponentName, setShowComponentName] =
    useState(storedComponentProperties.Base.showComponentName);
  const [buttonBaseValues, setButtonBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.Button.base);
  const [buttonActiveColor, setButtonActiveColor] =
    useState(storedComponentProperties.Button.activeColor);
  const [buttonFontSize, setButtonFontSize] =
    useState(storedComponentProperties.Button.fontSize);
  const [buttonFontWeight, setButtonFontWeight] =
    useState(storedComponentProperties.Button.fontWeight);
  const [longPressButtonBaseValues, setLongPressButtonBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.LongPressButton.base);
  const [cycleButtonBaseValues, setCycleButtonBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.CycleButton.base);
  const [cycleButtonPreviewValue, setCycleButtonPreviewValue] = useState("S");
  const [inputAidsBaseValues, setInputAidsBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.InputAids.base);
  const [moduleButtonBaseValues, setModuleButtonBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.ModuleButton.base);
  const [sideModuleButtonBaseValues, setSideModuleButtonBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.SideModuleButton.base);
  const [moduleButtonSymbol, setModuleButtonSymbol] =
    useState(storedComponentProperties.ModuleButton.symbol);
  const [submoduleButtonBaseValues, setSubmoduleButtonBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.SubmoduleButton.base);
  const [submodulePanelBaseValues, setSubmodulePanelBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.SubmodulePanel.base);
  const [concreteModuleButtonBaseValues, setConcreteModuleButtonBaseValues] =
    useState<Record<ConcreteModuleButtonName, BaseLabValues>>({
      AgentModuleButton: storedComponentProperties.AgentModuleButton.base,
      ConfigModuleButton: storedComponentProperties.ConfigModuleButton.base,
      CronModuleButton: storedComponentProperties.CronModuleButton.base,
      DataModuleButton: storedComponentProperties.DataModuleButton.base,
      FuncModuleButton: storedComponentProperties.FuncModuleButton.base,
      HelpModuleButton: storedComponentProperties.HelpModuleButton.base,
    });
  const [concreteModuleButtonSymbols, setConcreteModuleButtonSymbols] =
    useState<Record<ConcreteModuleButtonName, string>>({
      AgentModuleButton: storedComponentProperties.AgentModuleButton.symbol,
      ConfigModuleButton: storedComponentProperties.ConfigModuleButton.symbol,
      CronModuleButton: storedComponentProperties.CronModuleButton.symbol,
      DataModuleButton: storedComponentProperties.DataModuleButton.symbol,
      FuncModuleButton: storedComponentProperties.FuncModuleButton.symbol,
      HelpModuleButton: storedComponentProperties.HelpModuleButton.symbol,
    });
  const [textareaBaseValues, setTextareaBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.Textarea.base);
  const [textareaFontSize, setTextareaFontSize] =
    useState(storedComponentProperties.Textarea.fontSize);
  const [textareaInputAids, setTextareaInputAids] =
    useState(storedComponentProperties.Textarea.inputAids);
  const [buttonLinkBaseValues, setButtonLinkBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.ButtonLink.base);
  const [deviceInfoBaseValues, setDeviceInfoBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.DeviceInfo.base);
  const [browserComponentBaseValues, setBrowserComponentBaseValues] = useState<
    Record<BrowserLabComponentName, BaseLabValues>
  >({
    BackgroundLogo: storedComponentProperties.BackgroundLogo.base,
    BlockingDialog: storedComponentProperties.BlockingDialog.base,
    BrowserItem: storedComponentProperties.BrowserItem.base,
    BrowserItemLabelButton:
      storedComponentProperties.BrowserItemLabelButton.base,
    BrowserItemModeButton:
      storedComponentProperties.BrowserItemModeButton.base,
    Checkbox: storedComponentProperties.Checkbox.base,
    DataBrowser: storedComponentProperties.DataBrowser.base,
    FunctionBrowser: storedComponentProperties.FunctionBrowser.base,
    InputControl: storedComponentProperties.InputControl.base,
    MemoryBrowser: storedComponentProperties.MemoryBrowser.base,
    Input: storedComponentProperties.Input.base,
    ListControl: storedComponentProperties.ListControl.base,
    ListControlButton: storedComponentProperties.ListControlButton.base,
    ListControlListSizeButton:
      storedComponentProperties.ListControlListSizeButton.base,
    LoginDialog: storedComponentProperties.LoginDialog.base,
    TreeBrowser: storedComponentProperties.TreeBrowser.base,
    SynchronizationDialog:
      storedComponentProperties.SynchronizationDialog.base,
    DeleteButton: storedComponentProperties.DeleteButton.base,
    DialerButton: storedComponentProperties.DialerButton.base,
    DialerCenterButton: storedComponentProperties.DialerCenterButton.base,
    DeviceInfoButton: storedComponentProperties.DeviceInfoButton.base,
  });
  const [treeBrowserRowGap, setTreeBrowserRowGap] = useState(
    storedComponentProperties.TreeBrowser.rowGap,
  );
  const [deleteButtonArmedColor, setDeleteButtonArmedColor] = useState(
    storedComponentProperties.DeleteButton.armedColor,
  );
  const [inputFontSize, setInputFontSize] = useState(
    storedComponentProperties.Input.fontSize,
  );
  const [inputInputAids, setInputInputAids] = useState(
    storedComponentProperties.Input.inputAids,
  );
  const [browserItemLabelFontSize, setBrowserItemLabelFontSize] = useState(
    storedComponentProperties.BrowserItemLabelButton.fontSize,
  );
  const [browserItemLabelFontWeight, setBrowserItemLabelFontWeight] = useState(
    storedComponentProperties.BrowserItemLabelButton.fontWeight,
  );
  const [listSizeButtonFontSize, setListSizeButtonFontSize] = useState(
    storedComponentProperties.ListControlListSizeButton.fontSize,
  );
  const [listSizeButtonFontWeight, setListSizeButtonFontWeight] = useState(
    storedComponentProperties.ListControlListSizeButton.fontWeight,
  );
  const [backgroundLogoSymbol, setBackgroundLogoSymbol] = useState(
    storedComponentProperties.BackgroundLogo.symbol,
  );
  const [backgroundLogoFontSizeFactor, setBackgroundLogoFontSizeFactor] = useState(
    storedComponentProperties.BackgroundLogo.fontSizeFactor,
  );
  const [backgroundLogoOpacity, setBackgroundLogoOpacity] = useState(
    storedComponentProperties.BackgroundLogo.opacity,
  );
  const [backgroundLogoTop, setBackgroundLogoTop] = useState(
    storedComponentProperties.BackgroundLogo.top,
  );
  const [checkboxActiveColor, setCheckboxActiveColor] = useState(
    storedComponentProperties.Checkbox.activeColor,
  );
  const [buttonLinkLabel, setButtonLinkLabel] =
    useState(storedComponentProperties.ButtonLink.label);
  const [buttonLinkHref, setButtonLinkHref] =
    useState(storedComponentProperties.ButtonLink.href);
  const [modulePanelBaseValues, setModulePanelBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.ModulePanel.base);
  const [moduleMenuActionsBaseValues, setModuleMenuActionsBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.ModuleMenuActions.base);
  const [moduleBaseValues, setModuleBaseValues] = useState<
    Record<ModuleComponentName, BaseLabValues>
  >({
    Module: storedComponentProperties.Module.base,
    AgentModule: storedComponentProperties.AgentModule.base,
    DataModule: storedComponentProperties.DataModule.base,
    FunctionsModule: storedComponentProperties.FunctionsModule.base,
    CronModule: storedComponentProperties.CronModule.base,
    HelpModule: storedComponentProperties.HelpModule.base,
    SettingsModule: storedComponentProperties.SettingsModule.base,
  });
  const [themeValues, setThemeValues] = useState<Record<ThemeColorMapId, ColorValues>>(
    () => Object.fromEntries(themeColorMaps.map(({ id }) => [
      id,
      { ...initialThemeConfig.themes[id] },
    ])) as Record<ThemeColorMapId, ColorValues>,
  );
  const [editorValues, setEditorValues] =
    useState<ColorValues>({ ...defaultColorValues });
  const [numberInputValue, setNumberInputValue] = useState(50);
  const [panelPreviewItem, setPanelPreviewItem] = useState<ModuleMenuItem>(
    storedComponentProperties.ModulePanel.activeItem,
  );
  const [submodulePreviewItem, setSubmodulePreviewItem] =
    useState<"CHAT" | "MEMO">("MEMO");
  const [rgbPreviewValue, setRgbPreviewValue] = useState("#2468b280");
  const [subtitle, setSubtitle] = useState(storedComponentProperties.AppTitle.subtitle);
  const [titleBaseValues, setTitleBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.AppTitle.base);
  const [fontSize, setFontSize] = useState(storedComponentProperties.AppTitle.fontSize);
  const [titleTop, setTitleTop] =
    useState(storedComponentProperties.AppTitle.titleTop);
  const [titleLeft, setTitleLeft] =
    useState(storedComponentProperties.AppTitle.titleLeft);
  const [flydeckTitleTop, setFlydeckTitleTop] =
    useState(storedComponentProperties.AppTitle.flydeckTitleTop);
  const [flydeckTitleLeft, setFlydeckTitleLeft] =
    useState(storedComponentProperties.AppTitle.flydeckTitleLeft);
  const [themeTokenValues, setThemeTokenValues] = useState<
    Record<ThemeColorMapId, LabTokenValues>
  >(() => Object.fromEntries(themeColorMaps.map(({ id }) => [
    id,
    { ...initialThemeConfig.tokens[id] },
  ])) as Record<ThemeColorMapId, LabTokenValues>);
  const [symbolFontSize, setSymbolFontSize] =
    useState(storedComponentProperties.AppTitle.symbolFontSize);
  const [symbolTop, setSymbolTop] =
    useState(storedComponentProperties.AppTitle.symbolTop);
  const [symbolLeft, setSymbolLeft] =
    useState(storedComponentProperties.AppTitle.symbolLeft);
  const [subtitleFontSize, setSubtitleFontSize] =
    useState(storedComponentProperties.AppTitle.subtitleFontSize);
  const [subtitleTop, setSubtitleTop] =
    useState(storedComponentProperties.AppTitle.subtitleTop);
  const [subtitleLeft, setSubtitleLeft] =
    useState(storedComponentProperties.AppTitle.subtitleLeft);
  const [shellTokens, setShellTokens] = useState({
    appMaxWidth: storedComponentProperties.AppShell.appMaxWidth,
    appInset: storedComponentProperties.AppShell.appInset,
    appSectionGap: storedComponentProperties.AppShell.appSectionGap,
  });
  const [viewportWidth, setViewportWidth] = useState<number>(390);
  const [respectSafeArea, setRespectSafeArea] =
    useState(storedComponentProperties.AppShell.respectSafeArea);
  const [shellBaseValues, setShellBaseValues] =
    useState<BaseLabValues>(storedComponentProperties.AppShell.base);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const shellFrameRef = useRef<HTMLDivElement>(null);
  const inputAidsPreviewRef = useRef<HTMLInputElement>(null);
  const [inputAidsPreviewFontStage, setInputAidsPreviewFontStage] =
    useState<"small" | "medium" | "large">("medium");
  const [status, setStatus] = useState<LabStatus>({
    tone: "neutral",
    message: "Changes are local until APPLY is pressed.",
  });

  const shellPreviewStyle: ShellPreviewStyle = {
    "--app-max-width": `${shellTokens.appMaxWidth}px`,
    "--app-inset": `${shellTokens.appInset}px`,
    "--app-section-gap": `${shellTokens.appSectionGap}px`,
  };
  const editableTokenValues = themeTokenValues[selectedThemeId];
  const resolvedModuleButtonBaseValues = resolveDerivedBaseProperties(
    buttonBaseValues,
    moduleButtonBaseValues,
  );
  const resolvedSideModuleButtonBaseValues = resolveDerivedBaseProperties(
    resolvedModuleButtonBaseValues,
    sideModuleButtonBaseValues,
  );
  const selectedThemeComponentId = selectedComponent.startsWith("theme:")
    ? selectedComponent.slice("theme:".length) as ThemeColorMapId
    : null;

  useLayoutEffect(() => {
    const frame = shellFrameRef.current;
    setHasHorizontalOverflow(
      frame ? frame.scrollWidth > frame.clientWidth + 1 : false,
    );
  }, [selectedComponent, shellTokens, viewportWidth, respectSafeArea]);

  async function applyComponentProperties() {
    if (isApplying) {
      return;
    }

    setIsApplying(true);
    setStatus({ tone: "neutral", message: "Applying component properties…" });

    try {
      const config = buildComponentPropertiesConfig();
      const tokens = editableTokenValues;

      if (!parseComponentPropertiesConfig(config)) {
        throw new Error(
          "Component properties are invalid. Check the documented value ranges.",
        );
      }
      if (!parseLabTokenValues(tokens)) {
        throw new Error(
          "Visual token values are invalid. Check the documented value ranges.",
        );
      }

      const [propertiesResponse, themeResponse] = await Promise.all([
        fetch("/__lab/apply-component-properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        }),
        fetch("/__lab/apply-colors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activeTheme: selectedThemeId,
            themes: themeValues,
            tokens: {
              ...themeTokenValues,
              [selectedThemeId]: tokens,
            },
          }),
        }),
      ]);

      if (!propertiesResponse.ok || !themeResponse.ok) {
        const failedResponse = !propertiesResponse.ok
          ? propertiesResponse
          : themeResponse;
        throw new Error(await readResponseError(
          failedResponse,
          "Properties could not be applied.",
        ));
      }

      setStatus({
        tone: "success",
        message: "Component properties applied to the app.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error
          ? error.message
          : "Component properties could not be applied.",
      });
    } finally {
      setIsApplying(false);
    }
  }

  function buildComponentPropertiesConfig(): ComponentPropertiesConfig {
    return {
      Base: { ...basePreviewValues, showComponentName },
      BackgroundLogo: {
        symbol: backgroundLogoSymbol,
        fontSizeFactor: backgroundLogoFontSizeFactor,
        opacity: backgroundLogoOpacity,
        top: backgroundLogoTop,
        base: browserComponentBaseValues.BackgroundLogo,
      },
      Button: {
        activeColor: buttonActiveColor,
        fontSize: buttonFontSize,
        fontWeight: buttonFontWeight,
        base: buttonBaseValues,
      },
      LongPressButton: { base: longPressButtonBaseValues },
      CycleButton: { base: cycleButtonBaseValues },
      InputAids: { base: inputAidsBaseValues },
      ModuleButton: {
        symbol: moduleButtonSymbol,
        base: moduleButtonBaseValues,
      },
      SideModuleButton: { base: sideModuleButtonBaseValues },
      SubmoduleButton: { base: submoduleButtonBaseValues },
      SubmodulePanel: { base: submodulePanelBaseValues },
      AgentModuleButton: {
        symbol: concreteModuleButtonSymbols.AgentModuleButton,
        base: concreteModuleButtonBaseValues.AgentModuleButton,
      },
      ConfigModuleButton: {
        symbol: concreteModuleButtonSymbols.ConfigModuleButton,
        base: concreteModuleButtonBaseValues.ConfigModuleButton,
      },
      CronModuleButton: {
        symbol: concreteModuleButtonSymbols.CronModuleButton,
        base: concreteModuleButtonBaseValues.CronModuleButton,
      },
      DataModuleButton: {
        symbol: concreteModuleButtonSymbols.DataModuleButton,
        base: concreteModuleButtonBaseValues.DataModuleButton,
      },
      FuncModuleButton: {
        symbol: concreteModuleButtonSymbols.FuncModuleButton,
        base: concreteModuleButtonBaseValues.FuncModuleButton,
      },
      HelpModuleButton: {
        symbol: concreteModuleButtonSymbols.HelpModuleButton,
        base: concreteModuleButtonBaseValues.HelpModuleButton,
      },
      ModuleMenuActions: { base: moduleMenuActionsBaseValues },
      Textarea: {
        fontSize: textareaFontSize,
        inputAids: textareaInputAids,
        base: textareaBaseValues,
      },
      ButtonLink: {
        href: buttonLinkHref,
        label: buttonLinkLabel,
        base: buttonLinkBaseValues,
      },
      BlockingDialog: { base: browserComponentBaseValues.BlockingDialog },
      BrowserItem: { base: browserComponentBaseValues.BrowserItem },
      BrowserItemLabelButton: {
        fontSize: browserItemLabelFontSize,
        fontWeight: browserItemLabelFontWeight,
        base: browserComponentBaseValues.BrowserItemLabelButton,
      },
      BrowserItemModeButton: {
        base: browserComponentBaseValues.BrowserItemModeButton,
      },
      Checkbox: {
        activeColor: checkboxActiveColor,
        base: browserComponentBaseValues.Checkbox,
      },
      DeviceInfo: { base: deviceInfoBaseValues },
      DataBrowser: { base: browserComponentBaseValues.DataBrowser },
      FunctionBrowser: { base: browserComponentBaseValues.FunctionBrowser },
      InputControl: { base: browserComponentBaseValues.InputControl },
      MemoryBrowser: { base: browserComponentBaseValues.MemoryBrowser },
      Input: {
        fontSize: inputFontSize,
        inputAids: inputInputAids,
        base: browserComponentBaseValues.Input,
      },
      ListControl: { base: browserComponentBaseValues.ListControl },
      ListControlButton: { base: browserComponentBaseValues.ListControlButton },
      ListControlListSizeButton: {
        fontSize: listSizeButtonFontSize,
        fontWeight: listSizeButtonFontWeight,
        base: browserComponentBaseValues.ListControlListSizeButton,
      },
      LoginDialog: { base: browserComponentBaseValues.LoginDialog },
      TreeBrowser: {
        rowGap: treeBrowserRowGap,
        base: browserComponentBaseValues.TreeBrowser,
      },
      SynchronizationDialog: {
        base: browserComponentBaseValues.SynchronizationDialog,
      },
      DeleteButton: {
        armedColor: deleteButtonArmedColor,
        base: browserComponentBaseValues.DeleteButton,
      },
      DialerButton: { base: browserComponentBaseValues.DialerButton },
      DialerCenterButton: {
        base: browserComponentBaseValues.DialerCenterButton,
      },
      DeviceInfoButton: {
        base: browserComponentBaseValues.DeviceInfoButton,
      },
      AppTitle: {
        title,
        symbol: titleSymbol,
        subtitle,
        fontSize,
        titleTop,
        titleLeft,
        flydeckTitleTop,
        flydeckTitleLeft,
        symbolFontSize,
        symbolTop,
        symbolLeft,
        subtitleFontSize,
        subtitleTop,
        subtitleLeft,
        base: titleBaseValues,
      },
      AppStatusLine: {
        error: appStatusLineError,
        fontSize: appStatusLineFontSize,
        fontWeight: appStatusLineFontWeight,
        message: appStatusLineMessage,
        base: appStatusLineBaseValues,
      },
      AppShell: {
        respectSafeArea,
        appMaxWidth: shellTokens.appMaxWidth,
        appInset: shellTokens.appInset,
        appSectionGap: shellTokens.appSectionGap,
        base: shellBaseValues,
      },
      ModulePanel: {
        activeItem: panelPreviewItem,
        base: modulePanelBaseValues,
      },
      Module: { base: moduleBaseValues.Module },
      AgentModule: { base: moduleBaseValues.AgentModule },
      DataModule: { base: moduleBaseValues.DataModule },
      FunctionsModule: { base: moduleBaseValues.FunctionsModule },
      CronModule: { base: moduleBaseValues.CronModule },
      HelpModule: { base: moduleBaseValues.HelpModule },
      SettingsModule: { base: moduleBaseValues.SettingsModule },
    };
  }

  async function applyColors(activeTheme: ThemeColorMapId) {
    if (isApplying) {
      return;
    }

    setIsApplying(true);
    setStatus({ tone: "neutral", message: "Applying colors…" });

    try {
      const response = await fetch("/__lab/apply-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeTheme,
          themes: themeValues,
          tokens: themeTokenValues,
        }),
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Colors could not be applied.");
      }

      setStatus({
        tone: "success",
        message: "Color map written to generated-colors.css.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Colors could not be applied.",
      });
    } finally {
      setIsApplying(false);
    }
  }

  function resetTitlePreview() {
    const defaults = storedComponentProperties.AppTitle;
    setTitle(defaults.title);
    setTitleSymbol(defaults.symbol);
    setSubtitle(defaults.subtitle);
    setFontSize(defaults.fontSize);
    setTitleTop(defaults.titleTop);
    setTitleLeft(defaults.titleLeft);
    setFlydeckTitleTop(defaults.flydeckTitleTop);
    setFlydeckTitleLeft(defaults.flydeckTitleLeft);
    setSymbolFontSize(defaults.symbolFontSize);
    setSymbolTop(defaults.symbolTop);
    setSymbolLeft(defaults.symbolLeft);
    setSubtitleFontSize(defaults.subtitleFontSize);
    setSubtitleTop(defaults.subtitleTop);
    setSubtitleLeft(defaults.subtitleLeft);
    setTitleBaseValues({ ...defaults.base });
    setStatus({
      tone: "neutral",
      message: "Preview reset. APPLY persists the reset.",
    });
  }

  function resetShellPreview() {
    setShellTokens({
      appMaxWidth: defaultLabTokenValues.appMaxWidth,
      appInset: defaultLabTokenValues.appInset,
      appSectionGap: defaultLabTokenValues.appSectionGap,
    });
    for (const name of ["appMaxWidth", "appInset", "appSectionGap"] as const) {
      updateLabToken(name, defaultLabTokenValues[name]);
    }
    setViewportWidth(390);
    setRespectSafeArea(true);
    setShellBaseValues({ ...componentBaseDefaults });
    setStatus({
      tone: "neutral",
      message: "Shell preview reset. APPLY persists the reset.",
    });
  }

  function updateShellToken(name: ShellTokenName, value: number) {
    setShellTokens((current) => ({ ...current, [name]: value }));
  }

  function updateLabToken(name: LabTokenName, value: number | string) {
    setThemeTokenValues((current) => ({
      ...current,
      [selectedThemeId]: {
        ...current[selectedThemeId],
        [name]: value,
      },
    }));

    if (
      ["appMaxWidth", "appInset", "appSectionGap"].includes(name)
      && typeof value === "number"
    ) {
      updateShellToken(name as ShellTokenName, value);
    }
  }

  function resetLabTokens() {
    setThemeTokenValues((current) => ({
      ...current,
      [selectedThemeId]: { ...defaultLabTokenValues },
    }));
    setShellTokens({
      appMaxWidth: defaultLabTokenValues.appMaxWidth,
      appInset: defaultLabTokenValues.appInset,
      appSectionGap: defaultLabTokenValues.appSectionGap,
    });
  }

  function updateBaseValue(
    target:
      | "base"
      | "button"
      | "buttonLink"
      | "cycleButton"
      | "deviceInfo"
      | "inputAids"
      | "longPressButton"
      | "modulePanel"
      | "textarea"
      | "appStatusLine"
      | "title"
      | "shell",
    name: BaseLabPropertyName,
    value: string,
  ) {
    const update = (current: BaseLabValues) => ({ ...current, [name]: value });
    if (target === "base") {
      setBasePreviewValues(update);
    } else if (target === "button") {
      setButtonBaseValues(update);
    } else if (target === "buttonLink") {
      setButtonLinkBaseValues(update);
    } else if (target === "cycleButton") {
      setCycleButtonBaseValues(update);
    } else if (target === "deviceInfo") {
      setDeviceInfoBaseValues(update);
    } else if (target === "inputAids") {
      setInputAidsBaseValues(update);
    } else if (target === "longPressButton") {
      setLongPressButtonBaseValues(update);
    } else if (target === "modulePanel") {
      setModulePanelBaseValues(update);
    } else if (target === "textarea") {
      setTextareaBaseValues(update);
    } else if (target === "appStatusLine") {
      setAppStatusLineBaseValues(update);
    } else if (target === "title") {
      setTitleBaseValues(update);
    } else {
      setShellBaseValues(update);
    }
  }

  function updateModuleBaseValue(
    moduleName: ModuleComponentName,
    name: BaseLabPropertyName,
    value: string,
  ) {
    setModuleBaseValues((current) => ({
      ...current,
      [moduleName]: { ...current[moduleName], [name]: value },
    }));
  }

  function updateBrowserComponentBaseValue(
    componentName: BrowserLabComponentName,
    name: BaseLabPropertyName,
    value: string,
  ) {
    setBrowserComponentBaseValues((current) => ({
      ...current,
      [componentName]: { ...current[componentName], [name]: value },
    }));
  }

  function renderBrowserComponentPreview(
    componentName: BrowserLabComponentName,
  ) {
    const baseProps = toBaseStyleProps(
      componentName === "DataBrowser" || componentName === "FunctionBrowser"
        ? resolveDerivedBaseProperties(
            browserComponentBaseValues.TreeBrowser,
            browserComponentBaseValues[componentName],
          )
        : componentName === "LoginDialog"
          || componentName === "SynchronizationDialog"
        ? resolveDerivedBaseProperties(
            browserComponentBaseValues.BlockingDialog,
            browserComponentBaseValues[componentName],
          )
        : browserComponentBaseValues[componentName],
    );
    const buttonProps = {
      ...toBaseStyleProps(buttonBaseValues),
      activeColor: buttonActiveColor,
    };
    const listControlButtonProps = {
      ...buttonProps,
      ...toBaseStyleProps(resolveDerivedBaseProperties(
        buttonBaseValues,
        browserComponentBaseValues.ListControlButton,
      )),
    };
    const listControlListSizeButtonProps = {
      ...listControlButtonProps,
      ...toBaseStyleProps(resolveDerivedBaseProperties(
        resolveDerivedBaseProperties(
          buttonBaseValues,
          browserComponentBaseValues.ListControlButton,
        ),
        browserComponentBaseValues.ListControlListSizeButton,
      )),
      fontSize: listSizeButtonFontSize === "inherit"
        ? buttonFontSize
        : listSizeButtonFontSize,
      fontWeight: listSizeButtonFontWeight === "inherit"
        ? buttonFontWeight
        : listSizeButtonFontWeight,
    };
    const browserItemLabelButtonProps = {
      ...buttonProps,
      ...toBaseStyleProps(resolveDerivedBaseProperties(
        buttonBaseValues,
        browserComponentBaseValues.BrowserItemLabelButton,
      )),
      fontSize: browserItemLabelFontSize === "inherit"
        ? buttonFontSize
        : browserItemLabelFontSize,
      fontWeight: browserItemLabelFontWeight === "inherit"
        ? buttonFontWeight
        : browserItemLabelFontWeight,
    };
    const browserItemModeButtonProps = {
      ...buttonProps,
      ...toBaseStyleProps(resolveDerivedBaseProperties(
        buttonBaseValues,
        browserComponentBaseValues.BrowserItemModeButton,
      )),
    };
    const deleteButtonProps = {
      ...buttonProps,
      ...toBaseStyleProps(resolveDerivedBaseProperties(
        buttonBaseValues,
        browserComponentBaseValues.DeleteButton,
      )),
      armedColor: deleteButtonArmedColor,
      timeout: themeTokenValues[selectedThemeId].unlockButtonTimeout,
    };
    const checkboxProps = {
      ...toBaseStyleProps(resolveDerivedBaseProperties(
        buttonBaseValues,
        browserComponentBaseValues.Checkbox,
      )),
      activeColor: checkboxActiveColor,
    };
    const inputControlProps = {
      ...toBaseStyleProps(browserComponentBaseValues.InputControl),
      buttonProps,
      textareaProps: toBaseStyleProps(textareaBaseValues),
    };
    const treeChildProps = {
      browserItemProps: {
        ...toBaseStyleProps(browserComponentBaseValues.BrowserItem),
        buttonProps,
        checkboxProps,
        deleteButtonProps,
        labelButtonProps: browserItemLabelButtonProps,
        modeButtonProps: browserItemModeButtonProps,
      },
      listControlProps: {
        ...toBaseStyleProps(browserComponentBaseValues.ListControl),
        buttonProps: listControlButtonProps,
        inputProps: {
          ...toBaseStyleProps(browserComponentBaseValues.Input),
          fontSize: inputFontSize,
        },
        listSizeButtonProps: listControlListSizeButtonProps,
      },
    };

    switch (componentName) {
      case "BlockingDialog":
        return (
          <BlockingDialog
            {...baseProps}
            buttonProps={buttonProps}
            open
            viewport="container"
            title="Blocking dialog"
            onClose={() => undefined}
          >
            The current operation must be resolved before normal interaction.
          </BlockingDialog>
        );
      case "LoginDialog":
        return (
          <LoginDialog
            {...baseProps}
            buttonProps={buttonProps}
            inputProps={{
              ...toBaseStyleProps(browserComponentBaseValues.Input),
              fontSize: inputFontSize,
            }}
            open
            viewport="container"
            onLogin={() => undefined}
          />
        );
      case "SynchronizationDialog":
        return (
          <SynchronizationDialog
            {...baseProps}
            buttonProps={buttonProps}
            open
            viewport="container"
            operation="Saving DATA"
            reason="The server has not confirmed the change yet."
            onContinue={() => undefined}
          />
        );
      case "BackgroundLogo":
        return (
          <BackgroundLogo
            {...baseProps}
            symbol={backgroundLogoSymbol}
            fontSizeFactor={backgroundLogoFontSizeFactor}
            opacity={backgroundLogoOpacity}
            top={backgroundLogoTop}
          />
        );
      case "Checkbox":
        return (
          <Checkbox
            {...checkboxProps}
            checked
            label="Checkbox preview"
            onChange={() => undefined}
          />
        );
      case "Input":
        return (
          <Input
            {...baseProps}
            aria-label="Input preview"
            fontSize={inputFontSize}
            inputAids={inputInputAids}
          />
        );
      case "ListControl":
        return (
          <ListControl
            {...baseProps}
            buttonProps={listControlButtonProps}
            inputProps={toBaseStyleProps(browserComponentBaseValues.Input)}
            listSizeButtonProps={listControlListSizeButtonProps}
            itemCount={23}
            itemNames={["Alpha", "Beta"]}
            page={1}
            pageSize={listControlPreviewPageSize}
            onNew={() => undefined}
            onPageChange={() => undefined}
            onPageSizeChange={setListControlPreviewPageSize}
          />
        );
      case "ListControlListSizeButton":
        return (
          <ListControlListSizeButton
            {...listControlListSizeButtonProps}
            currentPage={2}
            pageSize={listControlPreviewPageSize}
            totalPages={3}
            onPageSizeChange={setListControlPreviewPageSize}
          />
        );
      case "ListControlButton":
        return <ListControlButton {...listControlButtonProps}>→</ListControlButton>;
      case "BrowserItem":
        return (
          <BrowserItem
            {...baseProps}
            buttonProps={buttonProps}
            checkboxProps={checkboxProps}
            deleteButtonProps={deleteButtonProps}
            labelButtonProps={browserItemLabelButtonProps}
            enabled
            label="Browser item"
            selected
            onDelete={() => undefined}
            onEnabledChange={() => undefined}
          />
        );
      case "BrowserItemLabelButton":
        return (
          <BrowserItemLabelButton
            {...browserItemLabelButtonProps}
          >
            Browser item
          </BrowserItemLabelButton>
        );
      case "BrowserItemModeButton":
        return (
          <BrowserItemModeButton
            {...browserItemModeButtonProps}
            mode="list"
            onModeChange={() => undefined}
          />
        );
      case "InputControl":
        return (
          <InputControl
            {...baseProps}
            buttonProps={buttonProps}
            textareaProps={toBaseStyleProps(textareaBaseValues)}
          />
        );
      case "MemoryBrowser":
        return (
          <MemoryBrowser
            {...baseProps}
            {...treeChildProps}
            model={labMemoryBrowserModel}
            rowGap={treeBrowserRowGap}
          />
        );
      case "TreeBrowser":
        return (
          <TreeBrowser
            {...baseProps}
            {...treeChildProps}
            model={labTreeBrowserModel}
            rowGap={treeBrowserRowGap}
            renderContent={({ height }) => (
              <InputControl {...inputControlProps} height={height} />
            )}
          />
        );
      case "DataBrowser":
        return (
          <DataBrowser
            {...baseProps}
            {...treeChildProps}
            inputControlProps={inputControlProps}
            rowGap={treeBrowserRowGap}
          />
        );
      case "FunctionBrowser":
        return (
          <FunctionBrowser
            {...baseProps}
            {...treeChildProps}
            userInputControlProps={inputControlProps}
            widgetInputControlProps={inputControlProps}
            rowGap={treeBrowserRowGap}
          />
        );
      case "DeleteButton":
        return (
          <DeleteButton
            {...deleteButtonProps}
            label="Example"
            onDelete={() => undefined}
          />
        );
      case "DialerButton":
        return (
          <DialerButton
            {...buttonProps}
            {...toBaseStyleProps(resolveDerivedBaseProperties(
              buttonBaseValues,
              browserComponentBaseValues.DialerButton,
            ))}
          >
            DIAL
          </DialerButton>
        );
      case "DialerCenterButton":
        return (
          <DialerCenterButton
            {...buttonProps}
            {...toBaseStyleProps(resolveDerivedBaseProperties(
              resolveDerivedBaseProperties(
                buttonBaseValues,
                browserComponentBaseValues.DialerButton,
              ),
              browserComponentBaseValues.DialerCenterButton,
            ))}
          >
            SET
          </DialerCenterButton>
        );
      case "DeviceInfoButton":
        return (
          <DeviceInfoButton
            {...buttonProps}
            {...toBaseStyleProps(resolveDerivedBaseProperties(
              buttonBaseValues,
              browserComponentBaseValues.DeviceInfoButton,
            ))}
          >
            DEVICEINFO
          </DeviceInfoButton>
        );
    }
  }

  function updateConcreteModuleButtonBaseValue(
    componentName: ConcreteModuleButtonName,
    name: BaseLabPropertyName,
    value: string,
  ) {
    setConcreteModuleButtonBaseValues((current) => ({
      ...current,
      [componentName]: { ...current[componentName], [name]: value },
    }));
  }

  function renderConcreteModuleButton(
    componentName: ConcreteModuleButtonName,
  ) {
    const parentProps =
      componentName === "HelpModuleButton"
        || componentName === "ConfigModuleButton"
        ? resolvedSideModuleButtonBaseValues
        : resolvedModuleButtonBaseValues;
    const props = resolveDerivedBaseProperties(
      parentProps,
      concreteModuleButtonBaseValues[componentName],
    );

    switch (componentName) {
      case "AgentModuleButton":
        return (
          <AgentModuleButton
            {...props}
            activeColor={buttonActiveColor}
            symbol={concreteModuleButtonSymbols.AgentModuleButton}
            selected
          />
        );
      case "ConfigModuleButton":
        return (
          <ConfigModuleButton
            {...props}
            activeColor={buttonActiveColor}
            symbol={concreteModuleButtonSymbols.ConfigModuleButton}
            selected
          />
        );
      case "CronModuleButton":
        return (
          <CronModuleButton
            {...props}
            activeColor={buttonActiveColor}
            symbol={concreteModuleButtonSymbols.CronModuleButton}
            selected
          />
        );
      case "DataModuleButton":
        return (
          <DataModuleButton
            {...props}
            activeColor={buttonActiveColor}
            symbol={concreteModuleButtonSymbols.DataModuleButton}
            selected
          />
        );
      case "FuncModuleButton":
        return (
          <FuncModuleButton
            {...props}
            activeColor={buttonActiveColor}
            symbol={concreteModuleButtonSymbols.FuncModuleButton}
            selected
          />
        );
      case "HelpModuleButton":
        return (
          <HelpModuleButton
            {...props}
            activeColor={buttonActiveColor}
            symbol={concreteModuleButtonSymbols.HelpModuleButton}
            selected
          />
        );
    }
  }

  function renderModulePreview(moduleName: ModuleComponentName) {
    const props = moduleName === "Module"
      ? toBaseStyleProps(moduleBaseValues.Module)
      : resolveDerivedBaseProperties(
          moduleBaseValues.Module,
          moduleBaseValues[moduleName],
        );

    switch (moduleName) {
      case "Module":
        return <Module {...props}>Module content</Module>;
      case "AgentModule":
        return (
          <AgentModule
            {...props}
            submodulePanelProps={{
              ...toBaseStyleProps(submodulePanelBaseValues),
              buttonProps: {
                ...resolveDerivedBaseProperties(
                  buttonBaseValues,
                  submoduleButtonBaseValues,
                ),
                activeColor: "COLOR_ACCENT_TWO",
              },
            }}
          />
        );
      case "DataModule":
        return <DataModule {...props} />;
      case "FunctionsModule":
        return <FunctionsModule {...props} />;
      case "CronModule":
        return (
          <CronModule
            {...props}
            dialerButtonProps={{
              activeColor: buttonActiveColor,
            }}
          />
        );
      case "HelpModule":
        return <HelpModule {...props} />;
      case "SettingsModule":
        return (
          <SettingsModule
            {...props}
            configuration={defaultThemeConfiguration}
            onSave={() => undefined}
          />
        );
    }
  }

  return (
    <BaseConfigurationProvider showComponentName={showComponentName}>
    <ButtonConfigurationProvider
      activeColor={buttonActiveColor}
      fontSize={buttonFontSize}
      fontWeight={buttonFontWeight}
    >
    <main
      className={styles.root}
      style={{
        ...createColorPreviewStyle(themeValues[selectedThemeId]),
        ...createTokenPreviewStyle(themeTokenValues[selectedThemeId]),
      }}
    >
      <header className={styles.labHeader}>
        <div>
          <p className={styles.eyebrow}>Development only</p>
          <h1 className={styles.heading}>Component Lab</h1>
        </div>
        <ButtonLink
          href="/"
          placement="viewport-edge"
          color="COLOR_TEXT"
          background="COLOR_SURFACE"
          border="BORDER_STANDARD"
          padding="0 SPACE_MD"
          margin="0"
          width="100px"
          height="50px"
        >
          APP
        </ButtonLink>
      </header>

      <p className={styles.status} data-tone={status.tone} aria-live="polite">
        {status.message}
      </p>

      <div className={styles.catalogs}>
        <nav className={styles.appCatalog} aria-label="App components">
          <h2>App components</h2>
          <div className={styles.appComponentList}>
            {appComponentNames.map((name) => (
              <Button
                type="button"
                selected={selectedComponent === name}
                color="#000000"
                background={`COLOR_COMPONENT_DEPTH_${appComponentDepths[name]}`}
                key={name}
                onClick={() => {
                  setSelectedComponent(name);
                  persistSelectedAppComponent(name);
                }}
              >
                {name}
              </Button>
            ))}
          </div>
        </nav>
        <nav className={styles.secondaryCatalog} aria-label="Lab scaffold components">
          <h2>Lab scaffold</h2>
          <div className={styles.componentList}>
            {labComponentNames.map((name) => (
              <Button
                type="button"
                selected={selectedComponent === name}
                key={name}
                onClick={() => setSelectedComponent(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </nav>
        <nav className={styles.secondaryCatalog} aria-label="Themes">
          <h2>Themes</h2>
          <div className={styles.componentList}>
            {themeColorMaps.map((theme) => {
              const selection = `theme:${theme.id}` as const;
              return (
                <Button
                  type="button"
                  selected={selectedThemeId === theme.id}
                  key={theme.id}
                  onClick={() => {
                    const selectionState = selectTheme(
                      selectedThemeId,
                      theme.id,
                      showThemeColors,
                    );
                    setSelectedThemeId(selectionState.selectedThemeId);
                    setShowThemeColors(selectionState.showColors);
                    const selectedTokens = themeTokenValues[theme.id];
                    setShellTokens({
                      appMaxWidth: selectedTokens.appMaxWidth,
                      appInset: selectedTokens.appInset,
                      appSectionGap: selectedTokens.appSectionGap,
                    });
                    setSelectedComponent(selection);
                  }}
                >
                  {theme.label}
                </Button>
              );
            })}
          </div>
          {showThemeColors && <ul
            className={styles.themeColors}
            aria-label={`${themeColorMaps.find(
              (theme) => theme.id === selectedThemeId,
            )?.label} colors`}
          >
            {(Object.keys(colorDefinitions) as ColorName[]).map((name) => (
              <li key={name}>
                <span
                  className={styles.themeColorSwatch}
                  style={{ background: themeValues[selectedThemeId][name] }}
                  aria-hidden="true"
                />
                <span>{colorDefinitions[name].label}</span>
                <code>{themeValues[selectedThemeId][name]}</code>
              </li>
            ))}
          </ul>}
        </nav>
      </div>

      {selectedComponent === "Base" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>Base</h2>
            <p className={styles.description}>Shared visual root for all components.</p>
          </div>
          <code className={styles.path}>components/Base</code>
        </div>

        <div className={styles.preview}>
          <Base
            {...toBaseStyleProps(basePreviewValues)}
            componentName="Base"
          >
            Base component
          </Base>
        </div>

        <BasePropertyControls
          componentName="Base"
          ownPropertyComments={{
            showComponentName:
              "true | false; show transparent pink component-name overlays",
          }}
          ownProperties={{ showComponentName }}
          values={basePreviewValues}
          onChange={(name, value) => updateBaseValue("base", name, value)}
          onOwnPropertyChange={(name, value) => {
            if (name === "showComponentName" && typeof value === "boolean") {
              setShowComponentName(value);
            }
          }}
        />

        <div className={styles.actions}>
          <Button
            type="button"
            onClick={() => {
              setBasePreviewValues({ ...basePreviewDefaults });
              setShowComponentName(false);
            }}
          >
            RESET
          </Button>
          <Button
            type="button"
            onClick={applyComponentProperties}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}

      {selectedComponent === "Button" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>Button</h2>
            <p className={styles.description}>Shared button control and selection state.</p>
          </div>
          <code className={styles.path}>components/Button</code>
        </div>

        <div className={styles.preview}>
          <Button
            activeColor={buttonActiveColor}
            fontSize={buttonFontSize}
            fontWeight={buttonFontWeight}
            selected
            {...toBaseStyleProps(buttonBaseValues)}
          >
            BUTTON
          </Button>
        </div>

        <BasePropertyControls
          componentName="Button"
          ownPropertyComments={{
            activeColor: "COLOR_ACCENT_ONE | COLOR_ACCENT_TWO | custom CSS value",
            fontSize: "CSS font-size value, for example 14px or 0.9rem",
            fontWeight:
              "CSS font-weight value, for example 400, 700, normal, or bold",
          }}
          ownProperties={{
            activeColor: buttonActiveColor,
            fontSize: buttonFontSize,
            fontWeight: buttonFontWeight,
          }}
          values={buttonBaseValues}
          onChange={(name, value) => updateBaseValue("button", name, value)}
          onOwnPropertyChange={(name, value) => {
            if (name === "activeColor" && typeof value === "string") {
              setButtonActiveColor(value);
            }
            if (name === "fontSize" && typeof value === "string") {
              setButtonFontSize(value);
            }
            if (name === "fontWeight" && typeof value === "string") {
              setButtonFontWeight(value);
            }
          }}
        />

        <div className={styles.actions}>
          <Button
            type="button"
            onClick={() => {
              setButtonBaseValues({ ...componentBaseDefaults });
              setButtonActiveColor("COLOR_ACCENT_ONE");
              setButtonFontSize("inherit");
              setButtonFontWeight("700");
            }}
          >
            RESET
          </Button>
          <Button
            type="button"
            onClick={applyComponentProperties}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}

      {selectedComponent === "ModuleButton" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>ModuleButton</h2>
            <p className={styles.description}>
              Button for module navigation with a character symbol.
            </p>
          </div>
          <code className={styles.path}>components/ModuleButton</code>
        </div>

        <div className={styles.preview}>
          <ModuleButton
            activeColor={buttonActiveColor}
            symbol={moduleButtonSymbol}
            selected
            {...resolvedModuleButtonBaseValues}
          >
            MODULE
          </ModuleButton>
        </div>

        <BasePropertyControls
          componentName="ModuleButton"
          ownPropertyComments={{ symbol: "exactly one Unicode character" }}
          ownProperties={{ symbol: moduleButtonSymbol }}
          inheritedPropertySections={[{
            componentName: "Button",
            comments: {
              activeColor:
                "COLOR_ACCENT_ONE | COLOR_ACCENT_TWO | custom CSS value",
            },
            properties: { activeColor: buttonActiveColor },
          }]}
          values={moduleButtonBaseValues}
          onChange={(name, value) => {
            setModuleButtonBaseValues((current) => ({
              ...current,
              [name]: value,
            }));
          }}
          onOwnPropertyChange={(name, value) => {
            if (
              name === "symbol"
              && typeof value === "string"
              && Array.from(value).length === 1
            ) {
              setModuleButtonSymbol(value);
            }
          }}
          onInheritedPropertyChange={(componentName, name, value) => {
            if (
              componentName === "Button"
              && name === "activeColor"
              && typeof value === "string"
            ) {
              setButtonActiveColor(value);
            }
          }}
        />

        <div className={styles.actions}>
          <Button
            type="button"
            onClick={() => {
              setModuleButtonBaseValues({ ...moduleButtonPreviewDefaults });
              setModuleButtonSymbol("◆");
            }}
          >
            RESET
          </Button>
          <Button
            type="button"
            onClick={applyComponentProperties}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}

      {selectedComponent === "SideModuleButton" && (
        <section className={styles.component}>
          <div className={styles.componentHeader}>
            <div>
              <h2 className={styles.componentName}>SideModuleButton</h2>
              <p className={styles.description}>
                Symbol-only side action derived from ModuleButton.
              </p>
            </div>
            <code className={styles.path}>components/SideModuleButton</code>
          </div>

          <div className={styles.preview}>
            <SideModuleButton
              {...resolvedSideModuleButtonBaseValues}
              activeColor={buttonActiveColor}
              symbol="?"
              selected
            />
          </div>

          <BasePropertyControls
            componentName="SideModuleButton"
            inheritedPropertySections={[
              {
                componentName: "ModuleButton",
                properties: { symbol: "?" },
              },
              {
                componentName: "Button",
                comments: {
                  activeColor:
                    "COLOR_ACCENT_ONE | COLOR_ACCENT_TWO | custom CSS value",
                },
                properties: { activeColor: buttonActiveColor },
              },
            ]}
            values={sideModuleButtonBaseValues}
            onChange={(name, value) =>
              setSideModuleButtonBaseValues((current) => ({
                ...current,
                [name]: value,
              }))}
            onInheritedPropertyChange={(componentName, name, value) => {
              if (
                componentName === "Button"
                && name === "activeColor"
                && typeof value === "string"
              ) {
                setButtonActiveColor(value);
              }
            }}
          />

          <div className={styles.actions}>
            <Button
              onClick={() =>
                setSideModuleButtonBaseValues({
                  ...componentBaseDefaults,
                  width: "BUTTON_WIDTH",
                })}
            >
              RESET
            </Button>
            <Button onClick={applyComponentProperties} disabled={isApplying}>
              {isApplying ? "APPLYING…" : "APPLY"}
            </Button>
          </div>
        </section>
      )}

      {selectedComponent === "SubmoduleButton" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>SubmoduleButton</h2>
            <p className={styles.description}>
              Button-derived control for subordinate module navigation.
            </p>
          </div>
          <code className={styles.path}>components/SubmoduleButton</code>
        </div>

        <div className={styles.preview}>
          <SubmoduleButton
            {...resolveDerivedBaseProperties(
              buttonBaseValues,
              submoduleButtonBaseValues,
            )}
            activeColor="COLOR_ACCENT_TWO"
            selected
          >
            MEMO
          </SubmoduleButton>
        </div>

        <BasePropertyControls
          componentName="SubmoduleButton"
          inheritedPropertySections={[{
            componentName: "Button",
            comments: {
              activeColor:
                "COLOR_ACCENT_ONE | COLOR_ACCENT_TWO | custom CSS value",
            },
            properties: {
              activeColor: "COLOR_ACCENT_TWO",
            },
          }]}
          values={submoduleButtonBaseValues}
          onChange={(name, value) => setSubmoduleButtonBaseValues((current) => ({
            ...current,
            [name]: value,
          }))}
        />

        <div className={styles.actions}>
          <Button onClick={() =>
            setSubmoduleButtonBaseValues({ ...componentBaseDefaults })}
          >
            RESET
          </Button>
          <Button onClick={applyComponentProperties} disabled={isApplying}>
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}

      {selectedComponent === "SubmodulePanel" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>SubmodulePanel</h2>
            <p className={styles.description}>
              Controlled navigation panel for subordinate modules.
            </p>
          </div>
          <code className={styles.path}>components/SubmodulePanel</code>
        </div>

        <div className={styles.preview}>
          <SubmodulePanel
            {...toBaseStyleProps(submodulePanelBaseValues)}
            activeItem={submodulePreviewItem}
            buttonProps={{
              ...resolveDerivedBaseProperties(
                buttonBaseValues,
                submoduleButtonBaseValues,
              ),
              activeColor: "COLOR_ACCENT_TWO",
            }}
            onChange={setSubmodulePreviewItem}
          />
        </div>

        <BasePropertyControls
          componentName="SubmodulePanel"
          values={submodulePanelBaseValues}
          onChange={(name, value) => setSubmodulePanelBaseValues((current) => ({
            ...current,
            [name]: value,
          }))}
        />

        <div className={styles.actions}>
          <Button onClick={() =>
            setSubmodulePanelBaseValues({ ...componentBaseDefaults })}
          >
            RESET
          </Button>
          <Button onClick={applyComponentProperties} disabled={isApplying}>
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}

      {selectedComponent === "ButtonLink" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>ButtonLink</h2>
            <p className={styles.description}>Link navigation with a button appearance.</p>
          </div>
          <code className={styles.path}>components/ButtonLink</code>
        </div>

        <div className={styles.preview}>
          <ButtonLink
            href={buttonLinkHref}
            {...toBaseStyleProps(buttonLinkBaseValues)}
          >
            {buttonLinkLabel}
          </ButtonLink>
        </div>

        <BasePropertyControls
          componentName="ButtonLink"
          ownProperties={{ href: buttonLinkHref, label: buttonLinkLabel }}
          values={buttonLinkBaseValues}
          onChange={(name, value) => updateBaseValue("buttonLink", name, value)}
          onOwnPropertyChange={(name, value) => {
            if (name === "href" && typeof value === "string") {
              setButtonLinkHref(value);
            } else if (name === "label" && typeof value === "string") {
              setButtonLinkLabel(value);
            }
          }}
        />

        <div className={styles.actions}>
          <Button
            type="button"
            onClick={() => {
              setButtonLinkBaseValues({ ...componentBaseDefaults });
              setButtonLinkHref("#button-link-preview");
              setButtonLinkLabel("EXAMPLE");
            }}
          >
            RESET
          </Button>
          <Button
            type="button"
            onClick={applyComponentProperties}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}

      {selectedComponent === "CycleButton" && (
        <section className={styles.component}>
          <div className={styles.componentHeader}>
            <div>
              <h2 className={styles.componentName}>CycleButton</h2>
              <p className={styles.description}>
                Button that advances through a dynamic ordered list of options.
              </p>
            </div>
            <code className={styles.path}>components/CycleButton</code>
          </div>
          <div className={styles.preview}>
            <CycleButton
              {...resolveDerivedBaseProperties(
                buttonBaseValues,
                cycleButtonBaseValues,
              )}
              activeColor={buttonActiveColor}
              options={["S", "M", "L"]}
              value={cycleButtonPreviewValue}
              onChange={setCycleButtonPreviewValue}
            />
          </div>
          <BasePropertyControls
            componentName="CycleButton"
            inheritedPropertySections={[{
              componentName: "Button",
              properties: {
                activeColor: buttonActiveColor,
                fontSize: buttonFontSize,
                fontWeight: buttonFontWeight,
              },
            }]}
            values={cycleButtonBaseValues}
            onChange={(name, value) => updateBaseValue("cycleButton", name, value)}
            onInheritedPropertyChange={(componentName, name, value) => {
              if (componentName !== "Button") return;
              if (name === "activeColor" && typeof value === "string") {
                setButtonActiveColor(value);
              } else if (name === "fontSize" && typeof value === "string") {
                setButtonFontSize(value);
              } else if (name === "fontWeight" && typeof value === "string") {
                setButtonFontWeight(value);
              }
            }}
          />
          <div className={styles.actions}>
            <Button onClick={() => setCycleButtonBaseValues({
              ...componentBaseDefaults,
            })}>
              RESET
            </Button>
            <Button onClick={applyComponentProperties} disabled={isApplying}>
              {isApplying ? "APPLYING…" : "APPLY"}
            </Button>
          </div>
        </section>
      )}

      {selectedComponent === "LongPressButton" && (
        <section className={styles.component}>
          <div className={styles.componentHeader}>
            <div>
              <h2 className={styles.componentName}>LongPressButton</h2>
              <p className={styles.description}>
                Button with separate short-press and configurable long-press actions.
              </p>
            </div>
            <code className={styles.path}>components/LongPressButton</code>
          </div>
          <div className={styles.preview}>
            <LongPressButton
              {...resolveDerivedBaseProperties(
                buttonBaseValues,
                longPressButtonBaseValues,
              )}
              activeColor={buttonActiveColor}
              onPress={() => setStatus({
                tone: "neutral",
                message: "Short press fired.",
              })}
              onLongPress={() => setStatus({
                tone: "neutral",
                message: "Long press fired.",
              })}
            >
              HOLD
            </LongPressButton>
          </div>
          <BasePropertyControls
            componentName="LongPressButton"
            inheritedPropertySections={[{
              componentName: "Button",
              properties: {
                activeColor: buttonActiveColor,
                fontSize: buttonFontSize,
                fontWeight: buttonFontWeight,
              },
            }]}
            values={longPressButtonBaseValues}
            onChange={(name, value) => (
              updateBaseValue("longPressButton", name, value)
            )}
            onInheritedPropertyChange={(componentName, name, value) => {
              if (componentName !== "Button") return;
              if (name === "activeColor" && typeof value === "string") {
                setButtonActiveColor(value);
              } else if (name === "fontSize" && typeof value === "string") {
                setButtonFontSize(value);
              } else if (name === "fontWeight" && typeof value === "string") {
                setButtonFontWeight(value);
              }
            }}
          />
          <div className={styles.actions}>
            <Button onClick={() => setLongPressButtonBaseValues({
              ...componentBaseDefaults,
            })}>
              RESET
            </Button>
            <Button onClick={applyComponentProperties} disabled={isApplying}>
              {isApplying ? "APPLYING…" : "APPLY"}
            </Button>
          </div>
        </section>
      )}

      {selectedComponent === "InputAids" && (
        <section className={styles.component}>
          <div className={styles.componentHeader}>
            <div>
              <h2 className={styles.componentName}>InputAids</h2>
              <p className={styles.description}>
                Cursor, clipboard, word-selection, and select-all controls.
              </p>
            </div>
            <code className={styles.path}>components/InputAids</code>
          </div>
          <div className={styles.preview}>
            <input
              ref={inputAidsPreviewRef}
              aria-label="Input aids target preview"
              defaultValue="Select a word in this preview"
            />
            <InputAids
              {...toBaseStyleProps(inputAidsBaseValues)}
              fontStage={inputAidsPreviewFontStage}
              onFontStageChange={setInputAidsPreviewFontStage}
              targetRef={inputAidsPreviewRef}
              buttonProps={{
                ...resolveDerivedBaseProperties(
                  buttonBaseValues,
                  longPressButtonBaseValues,
                ),
                activeColor: buttonActiveColor,
              }}
              cycleButtonProps={{
                ...resolveDerivedBaseProperties(
                  buttonBaseValues,
                  cycleButtonBaseValues,
                ),
                activeColor: buttonActiveColor,
              }}
            />
          </div>
          <BasePropertyControls
            componentName="InputAids"
            inheritedPropertySections={[
              {
                componentName: "CycleButton",
                properties: cycleButtonBaseValues,
              },
              {
                componentName: "LongPressButton",
                properties: longPressButtonBaseValues,
              },
            ]}
            values={inputAidsBaseValues}
            onChange={(name, value) => updateBaseValue("inputAids", name, value)}
            onInheritedPropertyChange={(componentName, name, value) => {
              if (componentName === "LongPressButton" && typeof value === "string") {
                setLongPressButtonBaseValues((current) => ({
                  ...current,
                  [name]: value,
                }));
              } else if (componentName === "CycleButton" && typeof value === "string") {
                setCycleButtonBaseValues((current) => ({
                  ...current,
                  [name]: value,
                }));
              }
            }}
          />
          <div className={styles.actions}>
            <Button onClick={() => setInputAidsBaseValues({
              ...storedComponentProperties.InputAids.base,
            })}>
              RESET
            </Button>
            <Button onClick={applyComponentProperties} disabled={isApplying}>
              {isApplying ? "APPLYING…" : "APPLY"}
            </Button>
          </div>
        </section>
      )}

      {selectedComponent === "Textarea" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>Textarea</h2>
            <p className={styles.description}>Shared multiline text control.</p>
          </div>
          <code className={styles.path}>components/Textarea</code>
        </div>

        <div className={styles.preview}>
          <Textarea
            aria-label="Textarea preview"
            defaultValue="Textarea content"
            fontSize={textareaFontSize}
            inputAids={textareaInputAids}
            {...toBaseStyleProps(textareaBaseValues)}
          />
        </div>

        <BasePropertyControls
          componentName="Textarea"
          ownPropertyComments={{
            fontSize: "small-stage CSS font-size, for example 0.82rem",
            inputAids: "show InputAids while the field is focused",
          }}
          ownProperties={{
            fontSize: textareaFontSize,
            inputAids: textareaInputAids,
          }}
          values={textareaBaseValues}
          onChange={(name, value) => updateBaseValue("textarea", name, value)}
          onOwnPropertyChange={(name, value) => {
            if (name === "fontSize" && typeof value === "string") {
              setTextareaFontSize(value);
            } else if (name === "inputAids" && typeof value === "boolean") {
              setTextareaInputAids(value);
            }
          }}
        />

        <div className={styles.actions}>
          <Button
            onClick={() => {
              setTextareaBaseValues({ ...componentBaseDefaults });
              setTextareaFontSize(storedComponentProperties.Textarea.fontSize);
              setTextareaInputAids(true);
            }}
          >
            RESET
          </Button>
          <Button onClick={applyComponentProperties} disabled={isApplying}>
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}

      {browserLabComponentNames.includes(
        selectedComponent as BrowserLabComponentName,
      ) && (() => {
        const componentName = selectedComponent as BrowserLabComponentName;
        return <section className={styles.component}>
          <div className={styles.componentHeader}>
            <div>
              <h2 className={styles.componentName}>{componentName}</h2>
              <p className={styles.description}>
                Independently configurable browser building block.
              </p>
            </div>
            <code className={styles.path}>components/{componentName}</code>
          </div>

          <div className={styles.preview}>
            {renderBrowserComponentPreview(componentName)}
          </div>

          <BasePropertyControls
            componentName={componentName}
            ownPropertyComments={componentName === "DeleteButton"
              ? { armedColor: "Armed Button active color, normally COLOR_ERROR" }
              : componentName === "ListControlListSizeButton"
              ? {
                  fontSize: "CSS font-size; inherit uses Button.fontSize",
                  fontWeight: "CSS font-weight; inherit uses Button.fontWeight",
                }
              : componentName === "BrowserItemLabelButton"
              ? {
                  fontSize: "CSS font-size; inherit uses Button.fontSize",
                  fontWeight: "CSS font-weight; inherit uses Button.fontWeight",
                }
              : componentName === "Input"
              ? {
                  fontSize: "CSS font-size value, for example 14px or 0.9rem",
                  inputAids: "show InputAids while the field is focused",
                }
              : componentName === "BackgroundLogo"
              ? {
                  symbol: "exactly one Unicode character",
                  fontSizeFactor:
                    "0.1..3; scales every value in the responsive clamp",
                  opacity: "number from 0 to 1",
                  top: "CSS position value, for example -40px, 2rem, or 10%",
                }
              : componentName === "TreeBrowser"
              ? { rowGap: "CSS gap between item rows, for example SPACE_XS or 6px" }
              : componentName === "Checkbox"
              ? {
                  activeColor:
                    "COLOR_ACCENT_ONE | COLOR_ACCENT_TWO | custom CSS value",
                }
              : undefined}
            ownProperties={componentName === "DeleteButton"
              ? { armedColor: deleteButtonArmedColor }
              : componentName === "ListControlListSizeButton"
              ? {
                  fontSize: listSizeButtonFontSize,
                  fontWeight: listSizeButtonFontWeight,
                }
              : componentName === "BrowserItemLabelButton"
              ? {
                  fontSize: browserItemLabelFontSize,
                  fontWeight: browserItemLabelFontWeight,
                }
              : componentName === "Input"
              ? { fontSize: inputFontSize, inputAids: inputInputAids }
              : componentName === "BackgroundLogo"
              ? {
                  symbol: backgroundLogoSymbol,
                  fontSizeFactor: backgroundLogoFontSizeFactor,
                  opacity: backgroundLogoOpacity,
                  top: backgroundLogoTop,
                }
              : componentName === "TreeBrowser"
              ? { rowGap: treeBrowserRowGap }
              : componentName === "Checkbox"
              ? { activeColor: checkboxActiveColor }
              : undefined}
            inheritedPropertySections={
              componentName === "Checkbox"
                || componentName === "DeleteButton"
                || componentName === "DeviceInfoButton"
                || componentName === "DialerButton"
                || componentName === "DialerCenterButton"
                || componentName === "ListControlButton"
                || componentName === "ListControlListSizeButton"
                || componentName === "BrowserItemLabelButton"
                || componentName === "BrowserItemModeButton"
              ? [{
                  componentName: "Button",
                  comments: {
                    activeColor:
                      "COLOR_ACCENT_ONE | COLOR_ACCENT_TWO | custom CSS value",
                    ...(componentName === "BrowserItemLabelButton"
                      || componentName === "ListControlListSizeButton"
                      ? {}
                      : {
                          fontSize:
                            "Inherited Button CSS font-size, for example 14px or 0.9rem",
                          fontWeight:
                            "Inherited Button CSS font-weight, for example 400 or 700",
                        }),
                  },
                  properties: {
                    activeColor: buttonActiveColor,
                    ...(componentName === "BrowserItemLabelButton"
                      || componentName === "ListControlListSizeButton"
                      ? {}
                      : {
                          fontSize: buttonFontSize,
                          fontWeight: buttonFontWeight,
                        }),
                  },
                }]
              : componentName === "DataBrowser"
                || componentName === "FunctionBrowser"
              ? [{
                  componentName: "TreeBrowser",
                  comments: {
                    rowGap:
                      "CSS gap below list controls and between item rows",
                  },
                  properties: { rowGap: treeBrowserRowGap },
                }]
              : componentName === "LoginDialog"
                || componentName === "SynchronizationDialog"
              ? [{
                  componentName: "BlockingDialog",
                  properties: browserComponentBaseValues.BlockingDialog,
                }]
              : undefined}
            values={browserComponentBaseValues[componentName]}
            onChange={(name, value) =>
              updateBrowserComponentBaseValue(componentName, name, value)}
            onOwnPropertyChange={(name, value) => {
              if (
                componentName === "DeleteButton"
                && name === "armedColor"
                && typeof value === "string"
              ) {
                setDeleteButtonArmedColor(value);
              }
              if (
                componentName === "ListControlListSizeButton"
                && name === "fontSize"
                && typeof value === "string"
              ) {
                setListSizeButtonFontSize(value);
              }
              if (
                componentName === "ListControlListSizeButton"
                && name === "fontWeight"
                && typeof value === "string"
              ) {
                setListSizeButtonFontWeight(value);
              }
              if (
                componentName === "BrowserItemLabelButton"
                && name === "fontSize"
                && typeof value === "string"
              ) {
                setBrowserItemLabelFontSize(value);
              }
              if (
                componentName === "BrowserItemLabelButton"
                && name === "fontWeight"
                && typeof value === "string"
              ) {
                setBrowserItemLabelFontWeight(value);
              }
              if (
                componentName === "Input"
                && name === "fontSize"
                && typeof value === "string"
              ) {
                setInputFontSize(value);
              }
              if (
                componentName === "Input"
                && name === "inputAids"
                && typeof value === "boolean"
              ) {
                setInputInputAids(value);
              }
              if (componentName === "BackgroundLogo") {
                if (
                  name === "symbol"
                  && typeof value === "string"
                  && Array.from(value).length === 1
                ) {
                  setBackgroundLogoSymbol(value);
                }
                if (
                  name === "fontSizeFactor"
                  && typeof value === "number"
                  && value >= 0.1
                  && value <= 3
                ) {
                  setBackgroundLogoFontSizeFactor(value);
                }
                if (
                  name === "opacity"
                  && typeof value === "number"
                  && value >= 0
                  && value <= 1
                ) {
                  setBackgroundLogoOpacity(value);
                }
                if (
                  name === "top"
                  && typeof value === "string"
                ) {
                  setBackgroundLogoTop(value);
                }
              }
              if (
                componentName === "TreeBrowser"
                && name === "rowGap"
                && typeof value === "string"
              ) {
                setTreeBrowserRowGap(value);
              }
              if (
                componentName === "Checkbox"
                && name === "activeColor"
                && typeof value === "string"
              ) {
                setCheckboxActiveColor(value);
              }
            }}
            onInheritedPropertyChange={(parentName, name, value) => {
              if (
                (
                  componentName === "Checkbox"
                  || componentName === "BrowserItemLabelButton"
                  || componentName === "BrowserItemModeButton"
                  || componentName === "DeleteButton"
                  || componentName === "DeviceInfoButton"
                  || componentName === "DialerButton"
                  || componentName === "DialerCenterButton"
                  || componentName === "ListControlButton"
                  || componentName === "ListControlListSizeButton"
                )
                && parentName === "Button"
              ) {
                if (
                  name === "activeColor"
                  && typeof value === "string"
                ) {
                  setButtonActiveColor(value);
                }
                if (
                  name === "fontSize"
                  && typeof value === "string"
                ) {
                  setButtonFontSize(value);
                }
                if (
                  name === "fontWeight"
                  && typeof value === "string"
                ) {
                  setButtonFontWeight(value);
                }
              }
              if (
                (
                  componentName === "DataBrowser"
                  || componentName === "FunctionBrowser"
                )
                && parentName === "TreeBrowser"
                && name === "rowGap"
                && typeof value === "string"
              ) {
                setTreeBrowserRowGap(value);
              }
            }}
          />

          <div className={styles.actions}>
            <Button
              onClick={() => {
                setBrowserComponentBaseValues((current) => ({
                  ...current,
                  [componentName]: { ...componentBaseDefaults },
                }));
                if (componentName === "TreeBrowser") {
                  setTreeBrowserRowGap("SPACE_XS");
                }
                if (componentName === "Checkbox") {
                  setCheckboxActiveColor("COLOR_ACCENT_TWO");
                }
                if (componentName === "Input") {
                  setInputInputAids(true);
                }
              }}
            >
              RESET
            </Button>
            <Button onClick={applyComponentProperties} disabled={isApplying}>
              {isApplying ? "APPLYING…" : "APPLY"}
            </Button>
          </div>
        </section>;
      })()}

      {selectedComponent === "DeviceInfo" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>DeviceInfo</h2>
            <p className={styles.description}>
              Passive browser and viewport diagnostics.
            </p>
          </div>
          <code className={styles.path}>components/DeviceInfo</code>
        </div>

        <div className={styles.preview}>
          <DeviceInfo
            {...toBaseStyleProps(deviceInfoBaseValues)}
            textareaProps={toBaseStyleProps(textareaBaseValues)}
          />
        </div>

        <BasePropertyControls
          componentName="DeviceInfo"
          values={deviceInfoBaseValues}
          onChange={(name, value) => updateBaseValue("deviceInfo", name, value)}
        />

        <div className={styles.actions}>
          <Button
            onClick={() => setDeviceInfoBaseValues({ ...componentBaseDefaults })}
          >
            RESET
          </Button>
          <Button onClick={applyComponentProperties} disabled={isApplying}>
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}

      {concreteModuleButtonNames.includes(
        selectedComponent as ConcreteModuleButtonName,
      ) && (() => {
        const componentName =
          selectedComponent as ConcreteModuleButtonName;

        return <section className={styles.component}>
          <div className={styles.componentHeader}>
            <div>
              <h2 className={styles.componentName}>{componentName}</h2>
              <p className={styles.description}>
                Module control with owned label and character.
              </p>
            </div>
            <code className={styles.path}>components/{componentName}</code>
          </div>

          <div className={styles.preview}>
            {renderConcreteModuleButton(componentName)}
          </div>

          <BasePropertyControls
            componentName={componentName}
            inheritedPropertySections={[
              ...(
                componentName === "HelpModuleButton"
                  || componentName === "ConfigModuleButton"
                  ? [{
                      componentName: "SideModuleButton",
                      properties: {},
                    }]
                  : []
              ),
              {
                componentName: "ModuleButton",
                comments: { symbol: "exactly one Unicode character" },
                properties: {
                  symbol: concreteModuleButtonSymbols[componentName],
                },
              },
              {
                componentName: "Button",
                comments: {
                  activeColor:
                    "COLOR_ACCENT_ONE | COLOR_ACCENT_TWO | custom CSS value",
                },
                properties: { activeColor: buttonActiveColor },
              },
            ]}
            values={concreteModuleButtonBaseValues[componentName]}
            onChange={(name, value) => {
              updateConcreteModuleButtonBaseValue(
                componentName,
                name,
                value,
              );
            }}
            onInheritedPropertyChange={(owner, name, value) => {
              if (
                owner === "ModuleButton"
                && name === "symbol"
                && typeof value === "string"
                && Array.from(value).length === 1
              ) {
                setConcreteModuleButtonSymbols((current) => ({
                  ...current,
                  [componentName]: value,
                }));
              } else if (
                owner === "Button"
                && name === "activeColor"
                && typeof value === "string"
              ) {
                setButtonActiveColor(value);
              }
            }}
          />

          <div className={styles.actions}>
            <Button
              type="button"
              onClick={applyComponentProperties}
              disabled={isApplying}
            >
              {isApplying ? "APPLYING…" : "APPLY"}
            </Button>
          </div>
        </section>;
      })()}

      {selectedComponent === "ModuleMenuActions" && (
        <section className={styles.component}>
          <div className={styles.componentHeader}>
            <div>
              <h2 className={styles.componentName}>ModuleMenuActions</h2>
              <p className={styles.description}>
                Title actions belonging to the shared module menu.
              </p>
            </div>
            <code className={styles.path}>
              components/ModuleMenuActions
            </code>
          </div>

          <div className={styles.preview}>
            <ModuleMenuActions
              {...toBaseStyleProps(moduleMenuActionsBaseValues)}
              activeItem={panelPreviewItem}
              helpButtonProps={{
                ...resolveDerivedBaseProperties(
                  resolvedSideModuleButtonBaseValues,
                  concreteModuleButtonBaseValues.HelpModuleButton,
                ),
                activeColor: buttonActiveColor,
                symbol: concreteModuleButtonSymbols.HelpModuleButton,
              }}
              configButtonProps={{
                ...resolveDerivedBaseProperties(
                  resolvedSideModuleButtonBaseValues,
                  concreteModuleButtonBaseValues.ConfigModuleButton,
                ),
                activeColor: buttonActiveColor,
                symbol: concreteModuleButtonSymbols.ConfigModuleButton,
              }}
              onChange={setPanelPreviewItem}
            />
          </div>

          <BasePropertyControls
            componentName="ModuleMenuActions"
            values={moduleMenuActionsBaseValues}
            onChange={(name, value) => {
              setModuleMenuActionsBaseValues((current) => ({
                ...current,
                [name]: value,
              }));
            }}
          />

          <div className={styles.actions}>
            <Button
              type="button"
              onClick={applyComponentProperties}
              disabled={isApplying}
            >
              {isApplying ? "APPLYING…" : "APPLY"}
            </Button>
          </div>
        </section>
      )}

      {selectedComponent === "ModulePanel" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>ModulePanel</h2>
            <p className={styles.description}>Top-level mobile feature navigation.</p>
          </div>
          <code className={styles.path}>components/ModulePanel</code>
        </div>

        <div className={styles.preview}>
          <ModulePanel
            activeItem={panelPreviewItem}
            moduleButtonProps={{
              AGNT: {
                ...resolveDerivedBaseProperties(
                  resolvedModuleButtonBaseValues,
                  concreteModuleButtonBaseValues.AgentModuleButton,
                ),
                activeColor: buttonActiveColor,
                symbol: concreteModuleButtonSymbols.AgentModuleButton,
              },
              DATA: {
                ...resolveDerivedBaseProperties(
                  resolvedModuleButtonBaseValues,
                  concreteModuleButtonBaseValues.DataModuleButton,
                ),
                activeColor: buttonActiveColor,
                symbol: concreteModuleButtonSymbols.DataModuleButton,
              },
              FUNC: {
                ...resolveDerivedBaseProperties(
                  resolvedModuleButtonBaseValues,
                  concreteModuleButtonBaseValues.FuncModuleButton,
                ),
                activeColor: buttonActiveColor,
                symbol: concreteModuleButtonSymbols.FuncModuleButton,
              },
              CRON: {
                ...resolveDerivedBaseProperties(
                  resolvedModuleButtonBaseValues,
                  concreteModuleButtonBaseValues.CronModuleButton,
                ),
                activeColor: buttonActiveColor,
                symbol: concreteModuleButtonSymbols.CronModuleButton,
              },
            }}
            onChange={setPanelPreviewItem}
            {...toBaseStyleProps(modulePanelBaseValues)}
          />
        </div>

        <BasePropertyControls
          componentName="ModulePanel"
          ownPropertyComments={{
            activeItem: "AGNT | DATA | FUNC | CRON | HELP | CONFIG",
          }}
          ownProperties={{ activeItem: panelPreviewItem }}
          values={modulePanelBaseValues}
          onChange={(name, value) => updateBaseValue("modulePanel", name, value)}
          onOwnPropertyChange={(name, value) => {
            if (
              name === "activeItem"
              && typeof value === "string"
              && [
                "AGNT",
                "DATA",
                "FUNC",
                "CRON",
                "HELP",
                "CONFIG",
              ].includes(value)
            ) {
              setPanelPreviewItem(value as ModuleMenuItem);
            }
          }}
        />

        <div className={styles.actions}>
          <Button
            type="button"
            onClick={() => {
              setPanelPreviewItem("FUNC");
              setModulePanelBaseValues({ ...componentBaseDefaults });
            }}
          >
            RESET
          </Button>
          <Button
            type="button"
            onClick={applyComponentProperties}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}

      {moduleComponentNames.includes(selectedComponent as ModuleComponentName)
        && (() => {
          const moduleName = selectedComponent as ModuleComponentName;
          const isBaseModule = moduleName === "Module";

          return <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>{moduleName}</h2>
            <p className={styles.description}>
              {isBaseModule
                ? "Shared base surface for application modules."
                : `${moduleName.replace("Module", "")} application module.`}
            </p>
          </div>
          <code className={styles.path}>
            {isBaseModule ? "components/Module" : `modules/${moduleName}`}
          </code>
        </div>

        <div className={styles.preview}>
          {renderModulePreview(moduleName)}
        </div>

        <BasePropertyControls
          componentName={moduleName}
          values={moduleBaseValues[moduleName]}
          onChange={(name, value) => updateModuleBaseValue(moduleName, name, value)}
        />

        <div className={styles.actions}>
          <Button
            type="button"
            onClick={applyComponentProperties}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>;
        })()}

      {selectedComponent === "CommentHighlightedTextarea" && (
        <section className={styles.component}>
          <div className={styles.componentHeader}>
            <div>
              <h2 className={styles.componentName}>
                CommentHighlightedTextarea
              </h2>
              <p className={styles.description}>
                Native textarea with passive comment-line highlighting.
              </p>
            </div>
            <code className={styles.path}>
              lab/components/CommentHighlightedTextarea
            </code>
          </div>

          <div className={styles.preview}>
            <CommentHighlightedTextarea
              aria-label="Comment highlight preview"
              color="COLOR_TEXT"
              background="transparent"
              border="BORDER_STANDARD"
              padding="SPACE_SM"
              margin="0"
              width="100%"
              size="properties"
              readOnly
              value={"# highlighted comment\nVALUE = 12"}
            />
          </div>
        </section>
      )}

      {selectedComponent === "ColorMapEditor" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>ColorMapEditor</h2>
            <p className={styles.description}>Desktop scaffold for editing a color map.</p>
          </div>
          <code className={styles.path}>lab/components/ColorMapEditor</code>
        </div>

        <div
          className={styles.colorMapPreview}
          style={createColorPreviewStyle(editorValues)}
        >
          <ColorMapEditor
            entries={(Object.keys(colorDefinitions) as ColorName[]).map((name) => ({
              name,
              label: colorDefinitions[name].label,
              value: editorValues[name],
            }))}
            onChange={(name, value) => {
              setEditorValues((current) => ({ ...current, [name]: value }));
            }}
          />
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            onClick={() => setEditorValues({ ...defaultColorValues })}
          >
            RESET
          </Button>
        </div>
      </section>}

      {selectedThemeComponentId && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>
              {themeColorMaps.find(
                (theme) => theme.id === selectedThemeComponentId,
              )?.label}
            </h2>
            <p className={styles.description}>Theme ColorMap</p>
          </div>
          <code className={styles.path}>themes/{selectedThemeComponentId}</code>
        </div>

        <div
          className={styles.colorMapPreview}
          style={createColorPreviewStyle(themeValues[selectedThemeComponentId])}
        >
          <ColorMapEditor
            entries={(Object.keys(colorDefinitions) as ColorName[]).map((name) => ({
              name,
              label: colorDefinitions[name].label,
              value: themeValues[selectedThemeComponentId][name],
            }))}
            onChange={(name, value) => {
              setThemeValues((current) => ({
                ...current,
                [selectedThemeComponentId]: {
                  ...current[selectedThemeComponentId],
                  [name]: value,
                },
              }));
            }}
          />
        </div>

        <TokenEditor
          values={themeTokenValues[selectedThemeComponentId]}
          onChange={updateLabToken}
        />

        <div className={styles.actions}>
          <Button
            type="button"
            onClick={() => {
              setThemeValues((current) => ({
                ...current,
                [selectedThemeComponentId]: {
                  ...initialThemeConfig.themes[selectedThemeComponentId],
                },
              }));
              resetLabTokens();
            }}
          >
            RESET
          </Button>
          <Button
            type="button"
            onClick={() => applyColors(selectedThemeComponentId)}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY TO APP"}
          </Button>
        </div>
      </section>}

      {selectedComponent === "RgbColorField" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>RgbColorField</h2>
            <p className={styles.description}>Simple desktop-only RGBA scaffold control.</p>
          </div>
          <code className={styles.path}>lab/components/RgbColorField</code>
        </div>

        <div className={styles.colorMapPreview}>
          <RgbColorField
            label="Example color"
            value={rgbPreviewValue}
            onChange={setRgbPreviewValue}
          />
        </div>

        <div className={styles.actions}>
          <Button type="button" onClick={() => setRgbPreviewValue("#2468b280")}>
            RESET
          </Button>
        </div>
      </section>}

      {selectedComponent === "NumberInput" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>NumberInput</h2>
            <p className={styles.description}>Required lab spinner with hold repeat.</p>
          </div>
          <code className={styles.path}>lab/components/NumberInput</code>
        </div>

        <div className={styles.numberInputPreview}>
          <NumberInput
            label="Example value"
            value={numberInputValue}
            min={0}
            max={100}
            onChange={setNumberInputValue}
          />
          <output>{numberInputValue}</output>
        </div>

        <div className={styles.actions}>
          <Button type="button" onClick={() => setNumberInputValue(50)}>
            RESET
          </Button>
        </div>
      </section>}

      {selectedComponent === "TokenEditor" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>TokenEditor</h2>
            <p className={styles.description}>
              Isolated editor for the selected theme tokens.
            </p>
          </div>
          <code className={styles.path}>lab/components/TokenEditor</code>
        </div>

        <TokenEditor
          values={themeTokenValues[selectedThemeId]}
          onChange={updateLabToken}
        />

        <div className={styles.actions}>
          <Button onClick={resetLabTokens}>RESET</Button>
          <Button
            onClick={() => applyColors(selectedThemeId)}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY TO APP"}
          </Button>
        </div>
      </section>}

      {selectedComponent === "AppStatusLine" && (
        <section className={styles.component}>
          <div className={styles.componentHeader}>
            <div>
              <h2 className={styles.componentName}>AppStatusLine</h2>
              <p className={styles.description}>
                Compact press control for opening application and server status.
              </p>
            </div>
            <code className={styles.path}>components/AppStatusLine</code>
          </div>

          <div className={styles.preview}>
            <AppStatusLine
              {...toColorlessBaseStyleProps(resolveDerivedBaseProperties(
                buttonBaseValues,
                appStatusLineBaseValues,
              ))}
              activeColor={buttonActiveColor}
              error={appStatusLineError}
              fontSize={appStatusLineFontSize}
              fontWeight={appStatusLineFontWeight}
              message={appStatusLineMessage}
              onClick={() => undefined}
            />
          </div>

          <BasePropertyControls
            componentName="AppStatusLine"
            excludedBaseProperties={["color"]}
            inheritedPropertySections={[{
              componentName: "Button",
              comments: {
                activeColor:
                  "COLOR_ACCENT_ONE | COLOR_ACCENT_TWO | custom CSS value",
              },
              properties: { activeColor: buttonActiveColor },
            }]}
            ownPropertyComments={{
              fontSize: "CSS font-size value, for example 0.84rem",
              fontWeight: "CSS font-weight value, for example 400",
              message: "preview text; the app supplies its current runtime status",
            }}
            ownProperties={{
              error: appStatusLineError,
              fontSize: appStatusLineFontSize,
              fontWeight: appStatusLineFontWeight,
              message: appStatusLineMessage,
            }}
            values={appStatusLineBaseValues}
            onChange={(name, value) => (
              updateBaseValue("appStatusLine", name, value)
            )}
            onInheritedPropertyChange={(componentName, name, value) => {
              if (
                componentName === "Button"
                && name === "activeColor"
                && typeof value === "string"
              ) {
                setButtonActiveColor(value);
              }
            }}
            onOwnPropertyChange={(name, value) => {
              if (name === "error" && typeof value === "boolean") {
                setAppStatusLineError(value);
              } else if (name === "fontSize" && typeof value === "string") {
                setAppStatusLineFontSize(value);
              } else if (name === "fontWeight" && typeof value === "string") {
                setAppStatusLineFontWeight(value);
              } else if (name === "message" && typeof value === "string") {
                setAppStatusLineMessage(value);
              }
            }}
          />

          <div className={styles.actions}>
            <Button
              type="button"
              onClick={() => {
                const defaults = storedComponentProperties.AppStatusLine;
                setAppStatusLineBaseValues({ ...defaults.base });
                setAppStatusLineError(defaults.error);
                setAppStatusLineFontSize(defaults.fontSize);
                setAppStatusLineFontWeight(defaults.fontWeight);
                setAppStatusLineMessage(defaults.message);
              }}
            >
              RESET
            </Button>
            <Button
              type="button"
              onClick={applyComponentProperties}
              disabled={isApplying}
            >
              {isApplying ? "APPLYING…" : "APPLY"}
            </Button>
          </div>
        </section>
      )}

      {selectedComponent === "AppTitle" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>AppTitle</h2>
            <p className={styles.description}>Application identity and optional context.</p>
          </div>
          <code className={styles.path}>components/AppTitle</code>
        </div>

        <div className={styles.preview}>
          <AppTitle
            title={title}
            symbol={titleSymbol}
            subtitle={subtitle || undefined}
            fontSize={fontSize}
            titleTop={titleTop}
            titleLeft={titleLeft}
            flydeckTitleTop={flydeckTitleTop}
            flydeckTitleLeft={flydeckTitleLeft}
            symbolFontSize={symbolFontSize}
            symbolTop={symbolTop}
            symbolLeft={symbolLeft}
            subtitleFontSize={subtitleFontSize}
            subtitleTop={subtitleTop}
            subtitleLeft={subtitleLeft}
            {...toBaseStyleProps(titleBaseValues)}
          />
        </div>

        <BasePropertyControls
          componentName="AppTitle"
          ownPropertyComments={{
            fontSize: "12..40 px",
            titleTop:
              "titleTop, titleLeft: -40..40 px; complete title and subtitle offset",
            flydeckTitleTop:
              "flydeckTitleTop, flydeckTitleLeft: -40..40 px; FLYDECK text offset",
            symbolFontSize: "8..64 px",
            subtitleFontSize: "8..32 px",
            symbolTop:
              "symbolTop, symbolLeft, subtitleTop, subtitleLeft:"
              + " -40..40 px; visual offset without layout movement",
          }}
          ownProperties={{
            title,
            symbol: titleSymbol,
            subtitle,
            fontSize,
            titleTop,
            titleLeft,
            flydeckTitleTop,
            flydeckTitleLeft,
            symbolFontSize,
            subtitleFontSize,
            symbolTop,
            symbolLeft,
            subtitleTop,
            subtitleLeft,
          }}
          values={titleBaseValues}
          onChange={(name, value) => updateBaseValue("title", name, value)}
          onOwnPropertyChange={(name, value) => {
            if (name === "title" && typeof value === "string") {
              setTitle(value);
            } else if (name === "symbol" && typeof value === "string") {
              setTitleSymbol(value);
            } else if (name === "subtitle" && typeof value === "string") {
              setSubtitle(value);
            } else if (name === "fontSize" && typeof value === "number") {
              setFontSize(value);
            } else if (name === "titleTop" && typeof value === "number") {
              setTitleTop(value);
            } else if (name === "titleLeft" && typeof value === "number") {
              setTitleLeft(value);
            } else if (
              name === "flydeckTitleTop"
              && typeof value === "number"
            ) {
              setFlydeckTitleTop(value);
            } else if (
              name === "flydeckTitleLeft"
              && typeof value === "number"
            ) {
              setFlydeckTitleLeft(value);
            } else if (name === "symbolFontSize" && typeof value === "number") {
              setSymbolFontSize(value);
            } else if (name === "symbolTop" && typeof value === "number") {
              setSymbolTop(value);
            } else if (name === "symbolLeft" && typeof value === "number") {
              setSymbolLeft(value);
            } else if (name === "subtitleFontSize" && typeof value === "number") {
              setSubtitleFontSize(value);
            } else if (name === "subtitleTop" && typeof value === "number") {
              setSubtitleTop(value);
            } else if (name === "subtitleLeft" && typeof value === "number") {
              setSubtitleLeft(value);
            }
          }}
        />

        <div className={styles.actions}>
          <Button type="button" onClick={resetTitlePreview}>RESET</Button>
          <Button
            type="button"
            onClick={applyComponentProperties}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>

      </section>}

      {selectedComponent === "AppShell" && <section className={styles.component}>
        <div className={styles.componentHeader}>
          <div>
            <h2 className={styles.componentName}>AppShell</h2>
            <p className={styles.description}>Mobile viewport and application frame.</p>
          </div>
          <code className={styles.path}>components/AppShell</code>
        </div>

        <div className={styles.viewportPicker} aria-label="Simulated viewport width">
          {viewportWidths.map((width) => (
            <Button
              size="compact"
              selected={viewportWidth === width}
              key={width}
              onClick={() => setViewportWidth(width)}
            >
              {width}
            </Button>
          ))}
        </div>

        <div className={styles.shellStage}>
          <div
            className={styles.shellFrame}
            ref={shellFrameRef}
            style={{ ...shellPreviewStyle, width: viewportWidth }}
          >
            <AppShell
              title={<AppTitle title="Flydeck" subtitle={`${viewportWidth}px viewport`} />}
              respectSafeArea={respectSafeArea}
              viewport="container"
              {...toBaseStyleProps(shellBaseValues)}
            />
          </div>
        </div>

        <p
          className={styles.overflowResult}
          data-overflow={hasHorizontalOverflow}
          aria-live="polite"
        >
          {hasHorizontalOverflow
            ? "FAIL · unintended horizontal overflow"
            : "PASS · no horizontal overflow"}
        </p>

        <BasePropertyControls
          componentName="AppShell"
          ownPropertyComments={{
            appMaxWidth: "320..600 px",
            appInset: "0..24 px",
            appSectionGap: "0..24 px",
          }}
          ownProperties={{
            respectSafeArea,
            appMaxWidth: shellTokens.appMaxWidth,
            appInset: shellTokens.appInset,
            appSectionGap: shellTokens.appSectionGap,
          }}
          values={shellBaseValues}
          onChange={(name, value) => updateBaseValue("shell", name, value)}
          onOwnPropertyChange={(name, value) => {
            if (name === "respectSafeArea" && typeof value === "boolean") {
              setRespectSafeArea(value);
            } else if (
              ["appMaxWidth", "appInset", "appSectionGap"].includes(name)
              && typeof value === "number"
            ) {
              updateShellToken(name as ShellTokenName, value);
              updateLabToken(name as ShellTokenName, value);
            }
          }}
        />

        <div className={styles.actions}>
          <Button type="button" onClick={resetShellPreview}>RESET</Button>
          <Button
            type="button"
            onClick={applyComponentProperties}
            disabled={isApplying}
          >
            {isApplying ? "APPLYING…" : "APPLY"}
          </Button>
        </div>
      </section>}
    </main>
    </ButtonConfigurationProvider>
    </BaseConfigurationProvider>
  );
}

export function readSelectedAppComponent(
  storage?: Pick<Storage, "getItem"> | null,
): AppComponentName {
  try {
    if (storage === undefined) {
      const selected = clientStateStore.get(selectedLabComponentSlice);
      return appComponentNames.find((name) => name === selected) ?? "AppTitle";
    }
    const storedName = storage?.getItem(selectedAppComponentStorageKey);
    return appComponentNames.find((name) => name === storedName) ?? "AppTitle";
  } catch {
    return "AppTitle";
  }
}

export function persistSelectedAppComponent(
  name: AppComponentName,
  storage?: Pick<Storage, "setItem"> | null,
) {
  try {
    if (storage === undefined) {
      clientStateStore.set(selectedLabComponentSlice, name);
      return;
    }
    storage?.setItem(selectedAppComponentStorageKey, name);
  } catch {
    // The lab remains usable when browser storage is unavailable.
  }
}

function createColorPreviewStyle(values: ColorValues): ColorPreviewStyle {
  return Object.fromEntries(
    (Object.keys(colorDefinitions) as ColorName[])
      .map((name) => [colorDefinitions[name].cssName, values[name]]),
  ) as ColorPreviewStyle;
}

function toColorlessBaseStyleProps(values: BaseLabValues) {
  const props = toBaseStyleProps(values);
  return {
    background: props.background,
    border: props.border,
    padding: props.padding,
    margin: props.margin,
    width: props.width,
    height: props.height,
  };
}

function createTokenPreviewStyle(values: LabTokenValues): CSSProperties {
  return Object.fromEntries(
    (Object.keys(labTokenDefinitions) as LabTokenName[]).map((name) => {
      const definition = labTokenDefinitions[name];
      const value = values[name];
      return [
        definition.cssName,
        definition.kind === "number"
          ? `${value}${definition.unit}`
          : resolveCssValue(String(value)),
      ];
    }),
  ) as CSSProperties;
}

export function selectTheme(
  selectedThemeId: ThemeColorMapId,
  nextThemeId: ThemeColorMapId,
  showColors: boolean,
) {
  return {
    selectedThemeId: nextThemeId,
    showColors: selectedThemeId === nextThemeId ? !showColors : true,
  };
}

export async function readResponseError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.text();

  if (body) {
    try {
      const result = JSON.parse(body) as { error?: unknown };
      if (typeof result.error === "string" && result.error) {
        return result.error;
      }
    } catch {
      return `${fallback} Server response: ${body.slice(0, 160)}`;
    }
  }

  return `${fallback} HTTP ${response.status}. Restart the V2 development server.`;
}
