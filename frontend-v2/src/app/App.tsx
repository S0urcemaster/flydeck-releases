import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "../components/AppShell";
import { AppTitle } from "../components/AppTitle";
import { BaseConfigurationProvider } from "../components/Base";
import { ButtonLink } from "../components/ButtonLink";
import { ButtonConfigurationProvider } from "../components/Button";
import { BlockingDialog } from "../components/BlockingDialog";
import { LoginDialog } from "../components/LoginDialog";
import { SynchronizationDialog } from "../components/SynchronizationDialog";
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
  isPrimaryModuleItem,
  toggleModuleAction,
  type ModuleActionItem,
  type PrimaryModuleItem,
} from "./moduleNavigation";
import { useClientStateSlice, type ClientStateSlice } from "../state";
import { V2ApiError, v2Api } from "../api/V2ApiClient";

const properties = requireComponentPropertiesConfig(generatedProperties);
const activeThemeTokens = generatedThemes.tokens[
  generatedThemes.activeTheme as keyof typeof generatedThemes.tokens
];
const initialMenuItem = properties.ModulePanel.activeItem;
const initialPrimaryMenuItem: PrimaryModuleItem =
  isPrimaryModuleItem(initialMenuItem) ? initialMenuItem : "FUNC";
const synchronizationIgnoreKey = "flydeck:v2:synchronization-ignore-until";
const synchronizationIgnoreDuration = 10 * 60 * 1_000;

export function App() {
  const [accessGate, setAccessGate] = useState<
    "checking" | "ready" | "login" | "synchronization" | "bypassed"
  >("checking");
  const [accessReason, setAccessReason] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>();
  const synchronizationIgnoredUntil = useRef(readSynchronizationIgnoredUntil());
  const [activeMenuItem, setActiveMenuItem] = useClientStateSlice(
    activeMenuItemSlice,
  );
  const [previousPrimaryMenuItem, setPreviousPrimaryMenuItem] =
    useClientStateSlice(previousPrimaryMenuItemSlice);
  const titleBase = resolveBaseProperties(properties.AppTitle.base);
  const backgroundLogoBase = resolveBaseProperties(
    properties.BackgroundLogo.base,
  );
  const shellBase = resolveBaseProperties(properties.AppShell.base);
  const panelBase = resolveBaseProperties(properties.ModulePanel.base);
  const buttonBase = resolveBaseProperties(properties.Button.base);
  const moduleButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.ModuleButton.base,
  );
  const submoduleButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.SubmoduleButton.base,
  );
  const submodulePanelBase = resolveBaseProperties(
    properties.SubmodulePanel.base,
  );
  const chatModuleButtonBase = resolveDerivedBaseProperties(
    moduleButtonBase,
    properties.AgentModuleButton.base,
  );
  const dataModuleButtonBase = resolveDerivedBaseProperties(
    moduleButtonBase,
    properties.DataModuleButton.base,
  );
  const funcModuleButtonBase = resolveDerivedBaseProperties(
    moduleButtonBase,
    properties.FuncModuleButton.base,
  );
  const cronModuleButtonBase = resolveDerivedBaseProperties(
    moduleButtonBase,
    properties.CronModuleButton.base,
  );
  const sideModuleButtonBase = resolveDerivedBaseProperties(
    moduleButtonBase,
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
  const treeBrowserBase = resolveBaseProperties(properties.TreeBrowser.base);
  const dataBrowserBase = resolveDerivedBaseProperties(
    treeBrowserBase,
    properties.DataBrowser.base,
  );
  const functionBrowserBase = resolveDerivedBaseProperties(
    treeBrowserBase,
    properties.FunctionBrowser.base,
  );
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
  const listControlBase = resolveBaseProperties(properties.ListControl.base);
  const listControlButtonBase = resolveDerivedBaseProperties(
    buttonBase,
    properties.ListControlButton.base,
  );
  const listControlListSizeButtonBase = resolveDerivedBaseProperties(
    listControlButtonBase,
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
  const textareaBase = resolveBaseProperties(properties.Textarea.base);
  const sharedInputControlProps = {
    ...inputControlBase,
    buttonProps: {
      ...buttonBase,
      activeColor: properties.Button.activeColor,
    },
    textareaProps: textareaBase,
  };
  const sharedTreeChildProps = {
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
      },
      deleteButtonProps: {
        ...deleteButtonBase,
        armedColor: properties.DeleteButton.armedColor,
        timeout: activeThemeTokens.unlockButtonTimeout,
      },
    },
    listControlProps: {
      ...listControlBase,
      buttonProps: {
        ...listControlButtonBase,
        activeColor: properties.Button.activeColor,
      },
      inputProps: {
        ...inputBase,
        fontSize: properties.Input.fontSize,
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
  const synchronizationDialogBase = resolveDerivedBaseProperties(
    blockingDialogBase,
    properties.SynchronizationDialog.base,
  );

  const showSynchronizationError = useCallback((reason: string) => {
    if (Date.now() < synchronizationIgnoredUntil.current) return;
    setAccessReason(reason);
    setAccessGate("synchronization");
  }, []);

  const ignoreSynchronization = useCallback(() => {
    const ignoredUntil = Date.now() + synchronizationIgnoreDuration;
    synchronizationIgnoredUntil.current = ignoredUntil;
    try {
      window.localStorage.setItem(synchronizationIgnoreKey, String(ignoredUntil));
    } catch {
      // The in-memory deadline still applies when storage is unavailable.
    }
    setAccessGate("bypassed");
  }, []);

  useEffect(() => {
    let active = true;
    const waitingTimer = window.setTimeout(() => {
      if (!active) return;
      if (Date.now() < synchronizationIgnoredUntil.current) {
        setAccessGate("bypassed");
      } else {
        setAccessReason(
          "The server has not confirmed the session and workspace within one second.",
        );
        setAccessGate("synchronization");
      }
    }, 1_000);
    void v2Api.session().then((session) => {
      if (!active) return;
      window.clearTimeout(waitingTimer);
      if (session.authenticated && session.workspaces[0]) {
        setWorkspaceId(session.workspaces[0].id);
        setAccessGate("ready");
      }
      else if (session.loginRequired) setAccessGate("login");
      else {
        showSynchronizationError("No local default user is configured on the server.");
      }
    }).catch((error: unknown) => {
      if (!active) return;
      window.clearTimeout(waitingTimer);
      if (Date.now() < synchronizationIgnoredUntil.current) {
        setAccessGate("bypassed");
      } else {
        showSynchronizationError(
          error instanceof Error ? error.message : "The server is not reachable.",
        );
      }
    });
    return () => {
      active = false;
      window.clearTimeout(waitingTimer);
    };
  }, [showSynchronizationError]);

  async function login(loginName: string, password: string) {
    setLoginPending(true);
    setAccessReason("");
    try {
      const session = await v2Api.login({ loginName, password });
      if (session.authenticated && session.workspaces[0]) {
        setWorkspaceId(session.workspaces[0].id);
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
    <BaseConfigurationProvider
      showComponentName={properties.Base.showComponentName}
    >
    <ButtonConfigurationProvider
      activeColor={properties.Button.activeColor}
      fontSize={properties.Button.fontSize}
      fontWeight={properties.Button.fontWeight}
    >
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
        || accessGate === "synchronization"
      }
      title={(
        <AppTitle
          {...titleBase}
          title={properties.AppTitle.title}
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
          action={(
            <>
              <ModuleMenuActions
                {...moduleMenuActionsBase}
                activeItem={activeMenuItem}
                helpButtonProps={{
                  ...helpModuleButtonBase,
                  activeColor: properties.Button.activeColor,
                  symbol: properties.HelpModuleButton.symbol,
                }}
                configButtonProps={{
                  ...configModuleButtonBase,
                  activeColor: properties.Button.activeColor,
                  symbol: properties.ConfigModuleButton.symbol,
                }}
                onChange={toggleActionModule}
              />
              {import.meta.env.DEV && (
                  <ButtonLink
                    {...buttonLinkBase}
                    href={properties.ButtonLink.href}
                    placement="app-edge"
                  >
                    {properties.ButtonLink.label}
                  </ButtonLink>
              )}
            </>
          )}
        />
      )}
    >
      <ModulePanel
        {...panelBase}
        activeItem={activeMenuItem}
        moduleButtonProps={{
          AGNT: {
            ...chatModuleButtonBase,
            activeColor: properties.Button.activeColor,
            symbol: properties.AgentModuleButton.symbol,
          },
          DATA: {
            ...dataModuleButtonBase,
            activeColor: properties.Button.activeColor,
            symbol: properties.DataModuleButton.symbol,
          },
          FUNC: {
            ...funcModuleButtonBase,
            activeColor: properties.Button.activeColor,
            symbol: properties.FuncModuleButton.symbol,
          },
          CRON: {
            ...cronModuleButtonBase,
            activeColor: properties.Button.activeColor,
            symbol: properties.CronModuleButton.symbol,
          },
        }}
        onChange={selectPrimaryModule}
      />
      {activeMenuItem === "AGNT" && (
        <AgentModule
          {...chatModuleBase}
          inputControlProps={sharedInputControlProps}
          treeBrowserProps={{
            ...treeBrowserBase,
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
            ...dataBrowserBase,
            inputControlProps: sharedInputControlProps,
            workspaceId,
            onSynchronizationError: showSynchronizationError,
            rowGap: properties.TreeBrowser.rowGap,
            ...sharedTreeChildProps,
          }}
        />
      )}
      {activeMenuItem === "FUNC" && (
        <FunctionsModule
          {...functionsModuleBase}
          functionBrowserProps={{
            ...functionBrowserBase,
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
        />
      )}
      {activeMenuItem === "HELP" && <HelpModule {...helpModuleBase} />}
      {activeMenuItem === "CONFIG" && (
        <SettingsModule {...settingsModuleBase} />
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
      inputProps={{ ...inputBase, fontSize: properties.Input.fontSize }}
      open={accessGate === "login"}
      pending={loginPending}
      error={accessReason || undefined}
      onLogin={login}
    />
    <SynchronizationDialog
      {...synchronizationDialogBase}
      buttonProps={buttonBase}
      open={accessGate === "synchronization"}
      operation="Checking session and server state"
      reason={accessReason || "The server has not confirmed its state yet."}
      onContinue={() => setAccessGate("bypassed")}
      onIgnore={ignoreSynchronization}
    />
    </ButtonConfigurationProvider>
    </BaseConfigurationProvider>
  );
}

function readSynchronizationIgnoredUntil() {
  try {
    const value = Number(window.localStorage.getItem(synchronizationIgnoreKey));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
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
