import { useEffect, useState } from "react";

import { useClientStateSlice, type ClientStateSlice } from "../../state";
import { Base, type BaseStyleProps } from "../Base";
import {
  ConfigModuleButton,
  type ConfigModuleButtonProps,
} from "../ConfigModuleButton";
import { ConfigEditor, type ConfigEditorProps } from "./ConfigEditor";
import styles from "./AppView.module.css";

export type AppAccessMode = "read" | "read-write";

type PersistedAppView = {
  dataSource: string;
};

type PersistedAppViews = Record<string, PersistedAppView>;

export type AppViewProps = BaseStyleProps & {
  accessMode?: AppAccessMode;
  children?: React.ReactNode;
  componentName?: string;
  configButtonProps?: Omit<ConfigModuleButtonProps, "symbol" | "onClick">;
  configEditorProps?: Omit<
    ConfigEditorProps,
    "dataSource" | "dataSourceStatus" | "onDataSourceChange"
  >;
  dataSource?: string;
  defaultDataSource?: string;
  onConfig?: () => void;
  onDataSourceChange?: (dataSource: string) => void;
  onDataSourceResolved?: (dataSource: string) => void;
  title: string;
  validateDataSource?: (dataSource: string) => boolean;
};

export function AppView({
  accessMode = "read",
  children,
  componentName = "AppView",
  configButtonProps,
  configEditorProps,
  dataSource,
  defaultDataSource,
  onConfig,
  onDataSourceChange,
  onDataSourceResolved,
  title,
  validateDataSource,
  ...baseProps
}: AppViewProps) {
  const [configurationVisible, setConfigurationVisible] = useState(false);
  const [persistedAppViews, setPersistedAppViews] = useClientStateSlice(
    appViewsSlice,
  );
  const persistedAppView = persistedAppViews[componentName];
  const currentDataSource = dataSource
    ?? persistedAppView?.dataSource
    ?? defaultDataSource
    ?? "";
  useEffect(() => {
    onDataSourceResolved?.(currentDataSource);
  }, [currentDataSource, onDataSourceResolved]);

  return (
    <Base
      {...baseProps}
      className={styles.root}
      componentName={componentName}
      data-access-mode={accessMode}
    >
      <div className={styles.titleBar}>
        <div className={styles.title} data-access-mode={accessMode}>{title}</div>
        <ConfigModuleButton
          {...configButtonProps}
          aria-label={`Configure ${title}`}
          selected={configurationVisible}
          symbol=""
          onClick={() => {
            setConfigurationVisible((current) => !current);
            onConfig?.();
          }}
        />
      </div>
      <div className={styles.content}>
        {configurationVisible ? (
          <ConfigEditor
            {...configEditorProps}
            dataSource={currentDataSource}
            validateDataSource={validateDataSource}
            onDataSourceChange={(nextDataSource) => {
              setPersistedAppViews((current) => ({
                ...current,
                [componentName]: {
                  dataSource: nextDataSource,
                },
              }));
              onDataSourceChange?.(nextDataSource);
            }}
          />
        ) : children}
      </div>
    </Base>
  );
}

const appViewsSlice: ClientStateSlice<PersistedAppViews> = {
  name: "appViews.settings",
  version: 1,
  defaultValue: {},
  validate: (value): value is PersistedAppViews => (
    Boolean(value && typeof value === "object" && !Array.isArray(value))
    && Object.values(value as Record<string, unknown>).every((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      const candidate = entry as Partial<PersistedAppView>;
      return typeof candidate.dataSource === "string";
    })
  ),
};
