import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { AppStatusLine } from "../components/AppStatusLine";
import { AppTitle } from "../components/AppTitle";
import { BaseConfigurationProvider } from "../components/Base";
import { ButtonLink } from "../components/ButtonLink";
import { ButtonConfigurationProvider } from "../components/Button";
import { SymbolButtonConfigurationProvider } from "../components/SymbolButton";
import { BlockingDialog } from "../components/BlockingDialog";
import { LoginDialog } from "../components/LoginDialog";
import {
  ModulePanel,
} from "../components/ModulePanel";
import type { ModuleMenuItem } from "../components/ModuleMenu";
import { ModuleMenuActions } from "../components/ModuleMenuActions";
import {
  requireComponentPropertiesConfig,
  resolveBaseProperties,
  resolveDerivedBaseProperties,
} from "../config/componentProperties";
import generatedProperties from "../config/generated-component-properties.json";
import generatedThemes from "../themes/generated-themes.json";
import { AgentModule } from "../modules/AgentModule";
import { CronModule } from "../modules/CronModule";
import { DataModule } from "../modules/DataModule";
import { FunctionsModule } from "../modules/FunctionsModule";
import { HelpModule } from "../modules/HelpModule";
import { SettingsModule } from "../modules/SettingsModule";
import {
  applyThemeConfiguration,
  defaultThemeConfiguration,
  isPersistedThemeConfiguration,
  normalizeThemeConfiguration,
  resolveThemeVariables,
  type ThemeConfiguration,
} from "../themes/themeConfiguration";
import {
  isPrimaryModuleItem,
  toggleModuleAction,
  type ModuleActionItem,
  type PrimaryModuleItem,
} from "./moduleNavigation";
import {
  ClientStateScopeProvider,
  getClientDeviceId,
  getLastClientIdentity,
  setLastClientIdentity,
  useClientStateSlice,
  type ClientStateScope,
  type ClientStateSlice,
} from "../state";
import { V2ApiError, v2Api } from "../api/V2ApiClient";
import {
  useForcedOfflineMode,
  usePendingWorkspaceTransactions,
  useWorkspaceSyncActivity,
  useWorkspaceSyncStatus,
  workspaceSyncEngine,
  workspaceSyncStatusStore,
} from "../replica";

const properties = requireComponentPropertiesConfig(generatedProperties);
const generatedActiveThemeTokens = generatedThemes.tokens[
  generatedThemes.activeTheme as keyof typeof generatedThemes.tokens
];
const initialMenuItem = properties.ModulePanel.activeItem;
const initialPrimaryMenuItem: PrimaryModuleItem =
  isPrimaryModuleItem(initialMenuItem) ? initialMenuItem : "FUNC";
const clientDeviceId = getClientDeviceId();
const cachedClientIdentity = getLastClientIdentity();

export function App() {
  const workspaceSyncStatus = useWorkspaceSyncStatus();
  const workspaceSyncActivity = useWorkspaceSyncActivity();
  const forcedOfflineMode = useForcedOfflineMode();
  const pendingWorkspaceTransactions = usePendingWorkspaceTransactions();
  const offline = workspaceSyncStatus.state === "offline";
  const replicaError = workspaceSyncStatus.state === "error"
    ? workspaceSyncStatus.reason
    : "";
  const [accessGate, setAccessGate] = useState<
    "checking" | "ready" | "login" | "bypassed"
  >("checking");
  const [accessReason, setAccessReason] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(
    cachedClientIdentity?.userId,
  );
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(
    cachedClientIdentity?.workspaceId,
  );
  const clientStateScope = useMemo<ClientStateScope>(() => ({
    userId: userId ?? "anonymous",
    workspaceId: workspaceId ?? "default",
    deviceId: clientDeviceId,
  }), [userId, workspaceId]);
  const [activeMenuItem, setActiveMenuItem] = useClientStateSlice(
    activeMenuItemSlice,
    clientStateScope,
  );
  const [previousPrimaryMenuItem, setPreviousPrimaryMenuItem] =
    useClientStateSlice(previousPrimaryMenuItemSlice, clientStateScope);
  const [persistedThemeConfiguration, setThemeConfiguration] = useClientStateSlice(
    themeConfigurationSlice,
    clientStateScope,
  );
  const themeConfiguration = normalizeThemeConfiguration(
    persistedThemeConfiguration,
  );
  const effectiveThemeVariables = resolveThemeVariables(themeConfiguration);
  const unlockButtonTimeout = parseCssMilliseconds(
    effectiveThemeVariables["--unlock-button-timeout"],
  ) ?? generatedActiveThemeTokens.unlockButtonTimeout;
  const listControlOrientation: "top" | "bottom" =
    effectiveThemeVariables["--listcontrol-orientation"] === "top"
      ? "top"
      : "bottom";
  const titleBase = resolveBaseProperties(properties.AppTitle.base);
  const backgroundLogoBase = resolveBaseProperties(
    properties.BackgroundLogo.base,
  );
  const shellBase = resolveBaseProperties(properties.AppShell.base);
  const panelBase = resolveBaseProperties(properties.ModulePanel.base);
  const buttonBase = resolveBaseProperties(properties.Button.base);
  const compactButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.CompactButton.base,
  );
  const compactButtonProps = {
    ...compactButtonBase,
    activeColor: properties.Button.activeColor,
    fontSize: properties.CompactButton.fontSize === "inherit"
      ? properties.Button.fontSize
      : properties.CompactButton.fontSize,
    fontWeight: properties.CompactButton.fontWeight === "inherit"
      ? properties.Button.fontWeight
      : properties.CompactButton.fontWeight,
  };
  const pressButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.PressButton.base,
  );
  const backspaceButtonBase = resolveDerivedBaseProperties(
    pressButtonBase,
    properties.BackspaceButton.base,
  );
  const longPressButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.LongPressButton.base,
  );
  const shiftButtonBase = resolveDerivedBaseProperties(
    longPressButtonBase,
    properties.ShiftButton.base,
  );
  const cycleButtonBase = resolveDerivedBaseProperties(
    pressButtonBase,
    properties.CycleButton.base,
  );
  const dialButtonBase = resolveDerivedBaseProperties(
    pressButtonBase,
    properties.DialButton.base,
  );
  const keyboardBase = resolveBaseProperties(properties.Keyboard.base);
  const keyboardProps = {
    ...keyboardBase,
    buttonHeight: properties.Keyboard.buttonHeight,
    backspaceButtonProps: backspaceButtonBase,
    buttonProps: longPressButtonBase,
    cycleButtonProps: cycleButtonBase,
    dialButtonProps: dialButtonBase,
    shiftButtonProps: shiftButtonBase,
    smartphoneButtonProps: buttonBase,
  };
  const resolvedAppStatusLineBase = resolveBaseProperties(
    properties.AppStatusLine.base,
  );
  const appStatusLineBase = withoutColor(resolvedAppStatusLineBase);
  const moduleButtonBase = resolveDerivedBaseProperties(
    pressButtonBase,
    properties.ModuleButton.base,
  );
  const symbolButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.SymbolButton.base,
  );
  const submoduleButtonBase = resolveDerivedBaseProperties(
    pressButtonBase,
    properties.SubmoduleButton.base,
  );
  const submodulePanelBase = resolveBaseProperties(
    properties.SubmodulePanel.base,
  );
  const sideModuleButtonBase = resolveDerivedBaseProperties(
    symbolButtonBase,
    properties.SideModuleButton.base,
  );
  const helpModuleButtonBase = resolveDerivedBaseProperties(
    sideModuleButtonBase,
    properties.HelpModuleButton.base,
  );
  const configModuleButtonBase = resolveDerivedBaseProperties(
    sideModuleButtonBase,
    properties.ConfigModuleButton.base,
  );
  const moduleMenuActionsBase = resolveBaseProperties(
    properties.ModuleMenuActions.base,
  );
  const chatModuleBase = resolveDerivedBaseProperties(
    properties.Module.base,
    properties.AgentModule.base,
  );
  const dataModuleBase = resolveDerivedBaseProperties(
    properties.Module.base,
    properties.DataModule.base,
  );
  const functionsModuleBase = resolveDerivedBaseProperties(
    properties.Module.base,
    properties.FunctionsModule.base,
  );
  const deleteButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.DeleteButton.base,
  );
  const dialerButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.DialerButton.base,
  );
  const dialerCenterButtonBase = resolveDerivedBaseProperties(
    dialerButtonBase,
    properties.DialerCenterButton.base,
  );
  const dialSurfaceBase = resolveBaseProperties(properties.DialSurface.base);
  const dialerBase = resolveBaseProperties(properties.Dialer.base);
  const cronDialerBase = resolveDerivedBaseProperties(
    dialerBase,
    properties.CronDialer.base,
  );
  const dialerProps = {
    ...cronDialerBase,
    centerFontSize: properties.CronDialer.centerFontSize,
    centerFontWeight: properties.CronDialer.centerFontWeight,
    dialSurfaceProps: dialSurfaceBase,
    innerDiscColor: properties.CronDialer.innerDiscColor,
    innerGradientEnd: properties.CronDialer.innerGradientEnd,
    innerGradientStart: properties.CronDialer.innerGradientStart,
    innerScaleFontSize: properties.CronDialer.innerScaleFontSize,
    innerScaleFontWeight: properties.CronDialer.innerScaleFontWeight,
    outerDiscColor: properties.CronDialer.outerDiscColor,
    outerGradientEnd: properties.CronDialer.outerGradientEnd,
    outerGradientStart: properties.CronDialer.outerGradientStart,
    outerScaleFontSize: properties.CronDialer.outerScaleFontSize,
    outerScaleFontWeight: properties.CronDialer.outerScaleFontWeight,
  };
  const treeBrowserBase = resolveBaseProperties(properties.TreeBrowser.base);
  const dataBrowserBase = resolveDerivedBaseProperties(
    treeBrowserBase,
    properties.DataBrowser.base,
  );
  const appBrowserBase = resolveDerivedBaseProperties(
    treeBrowserBase,
    properties.AppBrowser.base,
  );
  const memoryBrowserBase = resolveDerivedBaseProperties(
    treeBrowserBase,
    properties.MemoryBrowser.base,
  );
  const dataTreeBase = resolveDerivedBaseProperties(
    dataBrowserBase,
    properties.DataTree.base,
  );
  const appViewBase = resolveBaseProperties(properties.AppView.base);
  const compassAppBase = resolveDerivedBaseProperties(
    appViewBase,
    properties.CompassApp.base,
  );
  const deviceInfoViewBase = resolveDerivedBaseProperties(
    appViewBase,
    properties.DeviceInfoView.base,
  );
  const inventoryAppBase = resolveDerivedBaseProperties(
    appViewBase,
    properties.InventoryApp.base,
  );
  const shoppingListViewBase = resolveDerivedBaseProperties(
    appViewBase,
    properties.ShoppingListView.base,
  );
  const configEditorBase = resolveBaseProperties(properties.ConfigEditor.base);
  const formBase = resolveBaseProperties(properties.Form.base);
  const blockBase = resolveBaseProperties(properties.Block.base);
  const formRowBase = resolveDerivedBaseProperties(
    blockBase,
    properties.FormRow.base,
  );
  const breadcrumbBase = resolveBaseProperties(properties.Breadcrumb.base);
  const itemListBase = resolveBaseProperties(properties.ItemList.base);
  const browserItemBase = resolveBaseProperties(properties.BrowserItem.base);
  const browserItemLabelButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.BrowserItemLabelButton.base,
  );
  const browserItemLabelButtonProps = {
    ...browserItemLabelButtonBase,
    fontSize: properties.BrowserItemLabelButton.fontSize === "inherit"
      ? properties.Button.fontSize
      : properties.BrowserItemLabelButton.fontSize,
    fontWeight: properties.BrowserItemLabelButton.fontWeight === "inherit"
      ? properties.Button.fontWeight
      : properties.BrowserItemLabelButton.fontWeight,
  };
  const browserItemModeButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.BrowserItemModeButton.base,
  );
  const checkboxBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.Checkbox.base,
  );
  const inputBase = resolveBaseProperties(properties.Input.base);
  const configuredInputProps = {
    ...inputBase,
    fontSize: properties.Input.fontSize,
    keyboard: properties.Input.keyboard,
    keyboardProps,
  };
  const listControlBase = resolveBaseProperties(properties.ListControl.base);
  const listControlButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.ListControlButton.base,
  );
  const listControlListSizeButtonBase = resolveDerivedBaseProperties(
    pressButtonBase,
    properties.ListControlListSizeButton.base,
  );
  const listControlListSizeButtonProps = {
    ...listControlListSizeButtonBase,
    fontSize: properties.ListControlListSizeButton.fontSize === "inherit"
      ? properties.Button.fontSize
      : properties.ListControlListSizeButton.fontSize,
    fontWeight: properties.ListControlListSizeButton.fontWeight === "inherit"
      ? properties.Button.fontWeight
      : properties.ListControlListSizeButton.fontWeight,
  };
  const inputControlBase = resolveBaseProperties(properties.InputControl.base);
  const nodeIdInputBase = resolveDerivedBaseProperties(
    inputControlBase,
    properties.NodeIdInput.base,
  );
  const contentEditorBase = resolveDerivedBaseProperties(
    inputControlBase,
    properties.ContentEditor.base,
  );
  const rootInputControlBase = resolveBaseProperties(
    properties.RootInputControl.base,
  );
  const parentInputBase = resolveDerivedBaseProperties(
    rootInputControlBase,
    properties.ParentInput.base,
  );
  const dataSourceInputBase = resolveDerivedBaseProperties(
    rootInputControlBase,
    properties.DataSourceInput.base,
  );
  const textareaBase = resolveBaseProperties(properties.Textarea.base);
  const deviceInfoBase = resolveBaseProperties(properties.DeviceInfo.base);
  const configuredTextareaProps = {
    ...textareaBase,
    fontSize: properties.Textarea.fontSize,
    keyboard: properties.Textarea.keyboard,
    keyboardProps,
  };
  const sharedInputControlProps = {
    ...inputControlBase,
    buttonProps: {
      ...buttonBase,
      activeColor: properties.Button.activeColor,
    },
    inputProps: configuredInputProps,
    textareaProps: configuredTextareaProps,
  };
  const sharedTreeChildProps = {
    listControlOrientation,
    browserItemProps: {
      ...browserItemBase,
      buttonProps: {
        ...buttonBase,
        activeColor: properties.Button.activeColor,
      },
      labelButtonProps: browserItemLabelButtonProps,
      modeButtonProps: browserItemModeButtonBase,
      checkboxProps: {
        ...checkboxBase,
        activeColor: properties.Checkbox.activeColor,
        fontSize: properties.Checkbox.fontSize === "inherit"
          ? properties.Button.fontSize
          : properties.Checkbox.fontSize,
      },
      deleteButtonProps: {
        ...deleteButtonBase,
        armedColor: properties.DeleteButton.armedColor,
        timeout: unlockButtonTimeout,
      },
    },
    listControlProps: {
      ...listControlBase,
      buttonProps: {
        ...listControlButtonBase,
        activeColor: properties.Button.activeColor,
      },
      inputProps: {
        ...configuredInputProps,
      },
      listSizeButtonProps: listControlListSizeButtonProps,
    },
  };
  const cronModuleBase = resolveDerivedBaseProperties(
    properties.Module.base,
    properties.CronModule.base,
  );
  const helpModuleBase = resolveDerivedBaseProperties(
    properties.Module.base,
    properties.HelpModule.base,
  );
  const settingsModuleBase = resolveDerivedBaseProperties(
    properties.Module.base,
    properties.SettingsModule.base,
  );
  const buttonLinkBase = resolveBaseProperties(properties.ButtonLink.base);
  const blockingDialogBase = resolveBaseProperties(
    properties.BlockingDialog.base,
  );
  const loginDialogBase = resolveDerivedBaseProperties(
    blockingDialogBase,
    properties.LoginDialog.base,
  );
  const reportSynchronizationError = useCallback((reason: string) => {
    setAccessReason(reason);
  }, []);

  useEffect(() => {
    applyThemeConfiguration(themeConfiguration, document.documentElement.style);
  }, [themeConfiguration]);

  useEffect(() => {
    if (!userId || !workspaceId) return;
    workspaceSyncEngine.register({ userId, workspaceId });
  }, [userId, workspaceId]);

  useEffect(() => {
    let active = true;
    const waitingTimer = window.setTimeout(() => {
      if (!active) return;
      if (!cachedClientIdentity) {
        setAccessReason(
          "The server has not confirmed the session and workspace within one second.",
        );
      }
      setAccessGate("bypassed");
    }, 1_000);
    void v2Api.session().then((session) => {
      if (!active) return;
      window.clearTimeout(waitingTimer);
      if (session.authenticated && session.workspaces[0]) {
        setAccessReason("");
        setUserId(session.user.id);
        setWorkspaceId(session.workspaces[0].id);
        setLastClientIdentity({
          userId: session.user.id,
          workspaceId: session.workspaces[0].id,
        });
        setAccessGate("ready");
      }
      else if (session.loginRequired) setAccessGate("login");
      else {
        reportSynchronizationError(
          "No local default user is configured on the server.",
        );
        setAccessGate("bypassed");
      }
    }).catch((error: unknown) => {
      if (!active) return;
      window.clearTimeout(waitingTimer);
      reportSynchronizationError(
        error instanceof Error ? error.message : "The server is not reachable.",
      );
      setAccessGate("bypassed");
    });
    return () => {
      active = false;
      window.clearTimeout(waitingTimer);
    };
  }, [reportSynchronizationError]);

  async function login(loginName: string, password: string) {
    setLoginPending(true);
    setAccessReason("");
    try {
      const session = await v2Api.login({ loginName, password });
      if (session.authenticated && session.workspaces[0]) {
        setAccessReason("");
        setUserId(session.user.id);
        setWorkspaceId(session.workspaces[0].id);
        setLastClientIdentity({
          userId: session.user.id,
          workspaceId: session.workspaces[0].id,
        });
        setAccessGate("ready");
      } else {
        setAccessGate("login");
      }
    } catch (error) {
      setAccessReason(
        error instanceof V2ApiError
          ? loginErrorMessage(error)
          : "The sign-in request could not be processed.",
      );
    } finally {
      setLoginPending(false);
    }
  }

  const statusMessage = replicaError
    || accessReason
    || workspaceSyncActivity?.message
    || (offline ? "Offline" : "Online");
  const statusIsError = !offline && Boolean(replicaError || accessReason);
  const statusIsActivity = !statusIsError && Boolean(workspaceSyncActivity);

  function selectPrimaryModule(item: ModuleMenuItem) {
    if (!isPrimaryModuleItem(item)) {
      return;
    }

    setPreviousPrimaryMenuItem(item);
    setActiveMenuItem(item);
  }

  function toggleActionModule(item: ModuleMenuItem) {
    if (item !== "HELP" && item !== "CONFIG") {
      return;
    }

    setActiveMenuItem((activeItem) => toggleModuleAction(
      activeItem,
      item as ModuleActionItem,
      previousPrimaryMenuItem,
    ));
  }

  return (
    <ClientStateScopeProvider scope={clientStateScope}>
    <BaseConfigurationProvider
      showComponentName={properties.Base.showComponentName}
    >
    <ButtonConfigurationProvider
      activeColor={properties.Button.activeColor}
      fontSize={properties.Button.fontSize}
      fontWeight={properties.Button.fontWeight}
    >
    <SymbolButtonConfigurationProvider
      symbolTop={properties.SymbolButton.symbolTop}
      symbolLeft={properties.SymbolButton.symbolLeft}
    >
    {import.meta.env.DEV && (
      <ButtonLink
        {...buttonLinkBase}
        href={properties.ButtonLink.href}
        placement="app-edge"
      >
        {properties.ButtonLink.label}
      </ButtonLink>
    )}
    <AppShell
      {...shellBase}
      backgroundLogoProps={{
        ...backgroundLogoBase,
        symbol: properties.BackgroundLogo.symbol,
        fontSizeFactor: properties.BackgroundLogo.fontSizeFactor,
        opacity: properties.BackgroundLogo.opacity,
        top: properties.BackgroundLogo.top,
      }}
      respectSafeArea={properties.AppShell.respectSafeArea}
      interactionBlocked={
        accessGate === "checking"
        || accessGate === "login"
      }
      title={(
        <AppTitle
          {...titleBase}
          offline={offline}
          title={properties.AppTitle.title}
          symbol={properties.AppTitle.symbol}
          subtitle={properties.AppTitle.subtitle}
          fontSize={properties.AppTitle.fontSize}
          titleTop={properties.AppTitle.titleTop}
          titleLeft={properties.AppTitle.titleLeft}
          flydeckTitleTop={properties.AppTitle.flydeckTitleTop}
          flydeckTitleLeft={properties.AppTitle.flydeckTitleLeft}
          symbolFontSize={properties.AppTitle.symbolFontSize}
          symbolTop={properties.AppTitle.symbolTop}
          symbolLeft={properties.AppTitle.symbolLeft}
          subtitleFontSize={properties.AppTitle.subtitleFontSize}
          subtitleTop={properties.AppTitle.subtitleTop}
          subtitleLeft={properties.AppTitle.subtitleLeft}
          status={(
            <AppStatusLine
              {...appStatusLineBase}
              activity={statusIsActivity}
              error={statusIsError}
              offline={offline}
              fontSize={properties.AppStatusLine.fontSize}
              fontWeight={properties.AppStatusLine.fontWeight}
              message={statusMessage}
            />
          )}
          action={(
            <ModuleMenuActions
              {...moduleMenuActionsBase}
              activeItem={activeMenuItem}
              offlineButtonProps={{
                ...sideModuleButtonBase,
                activeColor: properties.Button.activeColor,
              }}
              forcedOfflineMode={forcedOfflineMode}
              offline={offline}
              pendingTransactions={pendingWorkspaceTransactions}
              helpButtonProps={{
                ...helpModuleButtonBase,
                activeColor: properties.Button.activeColor,
                symbol: properties.HelpModuleButton.symbol,
                symbolTop: properties.SymbolButton.symbolTop,
                symbolLeft: properties.SymbolButton.symbolLeft,
              }}
              configButtonProps={{
                ...configModuleButtonBase,
                activeColor: properties.Button.activeColor,
                symbol: properties.ConfigModuleButton.symbol,
                symbolTop: properties.SymbolButton.symbolTop,
                symbolLeft: properties.SymbolButton.symbolLeft,
              }}
              onChange={toggleActionModule}
              onOfflineModeChange={(forced) => {
                workspaceSyncStatusStore.setForcedOffline(forced);
                if (!forced) workspaceSyncEngine.retryRegistered();
              }}
            />
          )}
        />
      )}
    >
      <ModulePanel
        {...panelBase}
        activeItem={activeMenuItem}
        moduleButtonProps={{
          ...moduleButtonBase,
          activeColor: properties.Button.activeColor,
        }}
        onChange={selectPrimaryModule}
      />
      {activeMenuItem === "AGNT" && (
        <AgentModule
          {...chatModuleBase}
          inputControlProps={sharedInputControlProps}
          treeBrowserProps={{
            ...memoryBrowserBase,
            rowGap: properties.TreeBrowser.rowGap,
            ...sharedTreeChildProps,
          }}
          submodulePanelProps={{
            ...submodulePanelBase,
            buttonProps: {
              ...submoduleButtonBase,
              activeColor: "COLOR_ACCENT_TWO",
            },
          }}
        />
      )}
      {activeMenuItem === "DATA" && (
        <DataModule
          {...dataModuleBase}
          dataBrowserProps={{
            ...dataTreeBase,
            contentEditorProps: {
              ...sharedInputControlProps,
              ...contentEditorBase,
            },
            inputControlProps: sharedInputControlProps,
            nodeIdInputProps: {
              ...nodeIdInputBase,
              buttonProps: sharedInputControlProps.buttonProps,
              inputProps: configuredInputProps,
            },
            parentInputProps: {
              ...parentInputBase,
              buttonProps: {
                ...buttonBase,
                activeColor: properties.Button.activeColor,
              },
              inputProps: configuredInputProps,
            },
            workspaceId,
            onSynchronizationError: reportSynchronizationError,
            rowGap: properties.TreeBrowser.rowGap,
            ...sharedTreeChildProps,
          }}
        />
      )}
      {activeMenuItem === "FUNC" && (
        <FunctionsModule
          {...functionsModuleBase}
          workspaceId={workspaceId}
          appTabPanelProps={{
            ...submodulePanelBase,
            buttonProps: {
              ...submoduleButtonBase,
              activeColor: "COLOR_ACCENT_TWO",
            },
          }}
          appViewConfigButtonProps={{
            ...configModuleButtonBase,
            activeColor: properties.Button.activeColor,
            symbolTop: properties.SymbolButton.symbolTop,
            symbolLeft: properties.SymbolButton.symbolLeft,
          }}
          appViewConfigEditorProps={{
            ...configEditorBase,
            dataSourceButtonProps: {
              ...buttonBase,
              activeColor: properties.Button.activeColor,
            },
            dataSourceBaseProps: dataSourceInputBase,
            dataSourceInputProps: configuredInputProps,
          }}
          appViewButtonProps={{
            ...buttonBase,
            activeColor: properties.Button.activeColor,
          }}
          compassAppBaseProps={compassAppBase}
          deviceInfoProps={{
            ...deviceInfoBase,
            textareaProps: configuredTextareaProps,
          }}
          deviceInfoViewBaseProps={deviceInfoViewBase}
          inventoryAppBaseProps={inventoryAppBase}
          inventoryBreadcrumbProps={breadcrumbBase}
          inventoryCompactButtonProps={compactButtonProps}
          inventoryFormProps={formBase}
          inventoryFormRowProps={formRowBase}
          inventoryInputProps={configuredInputProps}
          inventoryParentInputProps={{
            ...parentInputBase,
            buttonProps: {
              ...buttonBase,
              activeColor: properties.Button.activeColor,
            },
            inputProps: configuredInputProps,
          }}
          inventoryItemListProps={itemListBase}
          inventoryNodeIdInputProps={{
            ...nodeIdInputBase,
            buttonProps: sharedInputControlProps.buttonProps,
            inputProps: configuredInputProps,
          }}
          inventoryTextareaProps={configuredTextareaProps}
          shoppingListViewBaseProps={shoppingListViewBase}
          appBrowserProps={{
            ...appBrowserBase,
            userInputControlProps: sharedInputControlProps,
            widgetInputControlProps: sharedInputControlProps,
            rowGap: properties.TreeBrowser.rowGap,
            ...sharedTreeChildProps,
          }}
        />
      )}
      {activeMenuItem === "CRON" && (
        <CronModule
          {...cronModuleBase}
          dialerButtonProps={{
            ...dialerButtonBase,
            activeColor: properties.Button.activeColor,
          }}
          dialerCenterButtonProps={dialerCenterButtonBase}
          dialerProps={dialerProps}
        />
      )}
      {activeMenuItem === "HELP" && <HelpModule {...helpModuleBase} />}
      {activeMenuItem === "CONFIG" && (
        <SettingsModule
          {...settingsModuleBase}
          configuration={themeConfiguration}
          inputProps={configuredInputProps}
          saveButtonProps={{
            ...buttonBase,
            activeColor: properties.Button.activeColor,
          }}
          treeBrowserProps={{
            ...treeBrowserBase,
            rowGap: properties.TreeBrowser.rowGap,
            ...sharedTreeChildProps,
          }}
          onSave={setThemeConfiguration}
        />
      )}
    </AppShell>
    <BlockingDialog
      {...blockingDialogBase}
      buttonProps={buttonBase}
      open={accessGate === "checking"}
      title="Loading server state"
    >
      Flydeck is checking the session and workspace permissions.
    </BlockingDialog>
    <LoginDialog
      {...loginDialogBase}
      buttonProps={buttonBase}
      inputProps={configuredInputProps}
      open={accessGate === "login"}
      pending={loginPending}
      error={accessReason || undefined}
      onLogin={login}
    />
    </SymbolButtonConfigurationProvider>
    </ButtonConfigurationProvider>
    </BaseConfigurationProvider>
    </ClientStateScopeProvider>
  );
}

function withoutColor<T extends { color: string }>(values: T): Omit<T, "color"> {
  const copy = { ...values };
  delete (copy as Partial<T>).color;
  return copy;
}

function loginErrorMessage(error: V2ApiError) {
  switch (error.response.error) {
    case "INVALID_CREDENTIALS": return "The user name or password is incorrect.";
    case "SERVICE_UNAVAILABLE": return "The server is temporarily unavailable.";
    default: return "The sign-in request could not be processed.";
  }
}

const activeMenuItemSlice: ClientStateSlice<ModuleMenuItem> = {
  name: "navigation.activeModule",
  version: 1,
  defaultValue: initialMenuItem,
  validate: (value): value is ModuleMenuItem => (
    typeof value === "string"
      && ["AGNT", "DATA", "FUNC", "CRON", "HELP", "CONFIG"].includes(value)
  ),
};

const previousPrimaryMenuItemSlice: ClientStateSlice<PrimaryModuleItem> = {
  name: "navigation.previousPrimaryModule",
  version: 1,
  defaultValue: initialPrimaryMenuItem,
  validate: (value): value is PrimaryModuleItem => (
    value === "AGNT" || value === "DATA" || value === "FUNC" || value === "CRON"
  ),
};

const themeConfigurationSlice: ClientStateSlice<ThemeConfiguration> = {
  name: "configuration.themes",
  version: 1,
  defaultValue: defaultThemeConfiguration,
  validate: isPersistedThemeConfiguration,
};

function parseCssMilliseconds(value: string | undefined) {
  if (!value) return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(ms|s)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  return match[2] === "s" ? amount * 1_000 : amount;
}
