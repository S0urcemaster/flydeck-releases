import { useEffect } from "react";

import { useClientStateSlice, type ClientStateSlice } from "../../state";
import { Base, type BaseStyleProps } from "../Base";
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
  dataSource?: string;
  defaultDataSource?: string;
  onDataSourceChange?: (dataSource: string) => void;
  onDataSourceResolved?: (dataSource: string) => void;
  title: string;
  validateDataSource?: (dataSource: string) => boolean;
};

export function AppView({
  accessMode = "read",
  children,
  componentName = "AppView",
  dataSource,
  defaultDataSource,
  onDataSourceResolved,
  title,
  ...baseProps
}: AppViewProps) {
  const [persistedAppViews] = useClientStateSlice(appViewsSlice);
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
      </div>
      <div className={styles.content}>{children}</div>
    </Base>
  );
}

export type AppSettingsProps = {
  componentName: string;
  configEditorProps?: Omit<
    ConfigEditorProps,
    "dataSource" | "dataSourceStatus" | "onDataSourceChange"
  >;
  defaultDataSource?: string;
  validateDataSource?: (dataSource: string) => boolean;
};

export function AppSettings({
  componentName,
  configEditorProps,
  defaultDataSource = "",
  validateDataSource,
}: AppSettingsProps) {
  const [persistedAppViews, setPersistedAppViews] = useClientStateSlice(
    appViewsSlice,
  );
  const currentDataSource = persistedAppViews[componentName]?.dataSource
    ?? defaultDataSource;

  return (
    <ConfigEditor
      {...configEditorProps}
      dataSource={currentDataSource}
      validateDataSource={validateDataSource}
      onDataSourceChange={(dataSource) => setPersistedAppViews((current) => ({
        ...current,
        [componentName]: { dataSource },
      }))}
    />
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
