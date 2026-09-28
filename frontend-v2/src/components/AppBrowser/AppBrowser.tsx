import { useCallback, useRef } from "react";

import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserInitialNode,
  type TreeBrowserModelSnapshotNode,
  type TreeBrowserProps,
} from "../TreeBrowser";
import { InputControl, type InputControlProps } from "../InputControl";
import { BackupApp, type BackupAppProps } from "../BackupApp";
import { MaintenanceApp, type MaintenanceAppProps } from "../MaintenanceApp";
import { EmptyTrashApp, type EmptyTrashAppProps } from "../EmptyTrashApp";
import { DeviceInfo, type DeviceInfoProps } from "../DeviceInfo";
import { InlineAppView } from "../InlineAppView";
import { AppSettings, type AppSettingsProps } from "../AppView";
import styles from "./AppBrowser.module.css";
import {
  isStringRecord,
  useClientStateSlice,
  type ClientStateSlice,
} from "../../state";

export type AppBrowserProps = Omit<
  TreeBrowserProps<AppData>,
  | "canCreateNode"
  | "componentName"
  | "createNode"
  | "checkedNodeIds"
  | "model"
  | "onNodeCheckedChange"
  | "onTreeChange"
  | "renderContent"
  | "renderInlineContent"
> & {
  backupAppProps?: Omit<BackupAppProps, "workspaceId">;
  emptyTrashAppProps?: Omit<EmptyTrashAppProps, "workspaceId">;
  deviceInfoProps?: DeviceInfoProps;
  maintenanceAppProps?: MaintenanceAppProps;
  appSettingsEditorProps?: AppSettingsProps["configEditorProps"];
  onOutputChange?: (output: AppBrowserOutputState) => void;
  userInputControlProps?: InputControlProps;
  widgetInputControlProps?: InputControlProps;
  workspaceId?: string;
  validateDataSource?: (dataSource: string) => boolean;
};

export type AppBrowserOutputCategory = {
  id: string;
  label: string;
  sayings: { id: string; text: string }[];
};

export type ShoppingListOutputCategory = {
  id: string;
  label: string;
  items: { id: string; label: string }[];
};

export type AppBrowserOutputState = {
  blueskyActive: boolean;
  gpsEventsActive: boolean;
  sportActive: boolean;
  schedulerActive: boolean;
  idolsActive: boolean;
};

export type AppData =
  | { kind: "group"; groupId: "system" }
  | { kind: "view-generator"; viewId: "bluesky" | "gps-events" | "idols" | "scheduler" | "sport" }
  | { kind: "inline-app"; appId: "backup" | "device-info" | "empty-trash" | "maintenance" }
  | { kind: "user-function"; functionId: string; source: string };

type FunctionTreeNode = {
  id: string;
  label: string;
  enabled: boolean;
  data?: AppData;
  children: readonly FunctionTreeNode[];
};

export function AppBrowser({
  appSettingsEditorProps,
  backupAppProps,
  emptyTrashAppProps,
  deviceInfoProps,
  maintenanceAppProps,
  onOutputChange,
  userInputControlProps,
  widgetInputControlProps,
  workspaceId,
  validateDataSource,
  ...treeBrowserProps
}: AppBrowserProps) {
  const [drafts, setDrafts] = useClientStateSlice(functionDraftsSlice);
  const [checkedNodeIds, setCheckedNodeIds] = useClientStateSlice(
    checkedAppsSlice,
  );
  const latestNodes = useRef<readonly TreeBrowserModelSnapshotNode<AppData>[]>([]);
  const reportOutput = useCallback((
    nodes: readonly TreeBrowserModelSnapshotNode<AppData>[],
  ) => {
    latestNodes.current = nodes;
    onOutputChange?.(generateFunctionOutput(
      applyCheckedState(nodes, new Set(checkedNodeIds)),
    ));
  }, [checkedNodeIds, onOutputChange]);

  return (
    <TreeBrowser
      {...treeBrowserProps}
      componentName="AppBrowser"
      menuVisible={false}
      model={appBrowserModel}
      rootListEditable
      rootListItemLimit={99}
      checkedNodeIds={checkedNodeIds}
      canCheckNode={(node) => !isSystemNode(node.id, latestNodes.current)}
      canCreateNode={() => false}
      canDeleteNode={(_node, parent) => parent !== null}
      canRenameNode={(node) => !rootAppIds.has(node.id)}
      onTreeChange={reportOutput}
      onNodeCheckedChange={(node, checked) => {
        if (isSystemNode(node.id, latestNodes.current)) return;
        setCheckedNodeIds((current) => checked
          ? [...new Set([...current, node.id])]
          : current.filter((id) => id !== node.id));
      }}
      renderInlineContent={({ node }) => (
        node.data?.kind === "inline-app"
          ? node.data.appId === "backup"
            ? <BackupApp {...backupAppProps} workspaceId={workspaceId} />
            : node.data.appId === "empty-trash"
              ? <EmptyTrashApp {...emptyTrashAppProps} workspaceId={workspaceId} />
              : node.data.appId === "device-info"
                ? <InlineAppView><div className={styles.deviceInfoScroller}><DeviceInfo {...deviceInfoProps} showRefreshButton={false} /></div></InlineAppView>
                : <MaintenanceApp {...maintenanceAppProps} />
          : null
      )}
      renderContent={({ height, node }) => {
        if (node.data?.kind === "view-generator") {
          if (node.data.viewId === "gps-events") {
            return <pre>locations: _system/user/locations{"\n"}events: _system/user/events</pre>;
          }
          const settings = appSettingsByViewId[node.data.viewId];
          return (
            <AppSettings
              componentName={settings.componentName}
              configEditorProps={appSettingsEditorProps}
              defaultDataSource={settings.defaultDataSource}
              validateDataSource={validateDataSource}
            />
          );
        }
        const initialValue = node.data?.kind === "user-function"
              ? node.data.source
              : "";
        const inputProps = {
          key: node.id,
          height,
          value: drafts[node.id] ?? initialValue,
          onChange: (value: string) => setDrafts((current) => ({
            ...current,
            [node.id]: value,
          })),
        };
        if (node.data?.kind === "user-function" || node.kind === "user-function") {
          return (
            <InputControl
              {...userInputControlProps}
              {...inputProps}
            />
          );
        }

        return <InputControl {...widgetInputControlProps} {...inputProps} />;
      }}
    />
  );
}

const functionDraftsSlice: ClientStateSlice<Record<string, string>> = {
  name: "drafts.functions",
  version: 1,
  defaultValue: {},
  validate: isStringRecord,
};

const checkedAppsSlice: ClientStateSlice<string[]> = {
  name: "apps.checkedNodeIds",
  version: 1,
  defaultValue: [],
  validate: (value): value is string[] => (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  ),
};

const rootAppIds = new Set([
  "bluesky", "gps-events", "idols", "scheduler", "sport", "_system",
]);

const appSettingsByViewId = {
  bluesky: { componentName: "BlueskyApp", defaultDataSource: "" },
  "gps-events": { componentName: "GpsEventsApp", defaultDataSource: "" },
  sport: { componentName: "SportApp", defaultDataSource: "" },
  scheduler: { componentName: "SchedulerApp", defaultDataSource: "" },
  idols: { componentName: "IdolsApp", defaultDataSource: "" },
} as const;

const functionHierarchy: TreeBrowserInitialNode<AppData>[] = [
  {
    id: "bluesky",
    label: "Bluesky",
    enabled: false,
    contentVisible: false,
    data: { kind: "view-generator", viewId: "bluesky" },
    children: [],
  },
  {
    id: "gps-events",
    label: "GPS Events",
    enabled: false,
    contentVisible: false,
    data: { kind: "view-generator", viewId: "gps-events" },
    children: [],
  },
  {
    id: "idols",
    label: "Idols",
    enabled: false,
    contentVisible: false,
    data: { kind: "view-generator", viewId: "idols" },
    children: [],
  },
  {
    id: "scheduler",
    label: "Scheduler",
    enabled: false,
    contentVisible: false,
    data: { kind: "view-generator", viewId: "scheduler" },
    children: [],
  },
  {
    id: "sport",
    label: "Sport",
    enabled: false,
    contentVisible: false,
    data: { kind: "view-generator", viewId: "sport" },
    children: [],
  },
  {
    id: "_system",
    label: "_system",
    enabled: false,
    contentEditable: false,
    contentVisible: false,
    listEditable: false,
    listItemLimit: 4,
    data: { kind: "group", groupId: "system" },
    children: [
      {
        id: "empty-trash",
        label: "Empty trash",
        enabled: false,
        contentEditable: false,
        contentVisible: false,
        listEditable: false,
        data: {
          kind: "inline-app",
          appId: "empty-trash",
        },
        children: [],
      },
      {
        id: "backup",
        label: "Backup",
        enabled: false,
        contentEditable: false,
        contentVisible: false,
        listEditable: false,
        data: {
          kind: "inline-app",
          appId: "backup",
        },
        children: [],
      },
      {
        id: "maintenance",
        label: "Maintenance",
        enabled: false,
        contentEditable: false,
        contentVisible: false,
        listEditable: false,
        data: {
          kind: "inline-app",
          appId: "maintenance",
        },
        children: [],
      },
      {
        id: "device-info",
        label: "Device Info",
        enabled: false,
        data: {
          kind: "inline-app",
          appId: "device-info",
        },
        children: [],
      },
    ],
  },
];

function findNode(
  nodes: readonly FunctionTreeNode[],
  id: string,
): FunctionTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

export function generateFunctionOutput(
  nodes: readonly FunctionTreeNode[],
): AppBrowserOutputState {
  const bluesky = nodes.find(
    ({ data }) => data?.kind === "view-generator" && data.viewId === "bluesky",
  );
  const gpsEvents = nodes.find(
    ({ data }) => data?.kind === "view-generator" && data.viewId === "gps-events",
  );
  const sport = nodes.find(
    ({ data }) => data?.kind === "view-generator" && data.viewId === "sport",
  );
  const scheduler = nodes.find(
    ({ data }) => data?.kind === "view-generator" && data.viewId === "scheduler",
  );
  const idols = nodes.find(
    ({ data }) => data?.kind === "view-generator" && data.viewId === "idols",
  );
  return {
    blueskyActive: Boolean(bluesky?.enabled),
    gpsEventsActive: Boolean(gpsEvents?.enabled),
    sportActive: Boolean(sport?.enabled),
    schedulerActive: Boolean(scheduler?.enabled),
    idolsActive: Boolean(idols?.enabled),
  };
}

function applyCheckedState(
  nodes: readonly TreeBrowserModelSnapshotNode<AppData>[],
  checked: ReadonlySet<string>,
): FunctionTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    enabled: checked.has(node.id),
    children: applyCheckedState(node.children, checked),
  }));
}

function isSystemNode(
  nodeId: string,
  nodes: readonly TreeBrowserModelSnapshotNode<AppData>[],
) {
  const system = nodes.find(({ id }) => id === "_system");
  return Boolean(system && (system.id === nodeId || findNode([system], nodeId)));
}

const appBrowserModel = new TreeBrowserModel({
  definitionOrderAuthority: true,
  initialTree: functionHierarchy,
  retainStoredOnlyNodes: false,
  storageKey: "flydeck.tree.apps.v2",
});
