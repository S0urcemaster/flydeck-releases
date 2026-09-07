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
import { AppSettings, type AppSettingsProps } from "../AppView";
import sayings from "../../assets/apps/compass/sayings.json";
import shoppingList from "../../assets/shopping-list.json";
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

export type AppBrowserOutputState = {
  blueskyActive: boolean;
  categories: AppBrowserOutputCategory[];
  compassActive: boolean;
  deviceInfoActive: boolean;
  inventoryActive: boolean;
  shoppingListActive: boolean;
  shoppingCategories: ShoppingListOutputCategory[];
};

export type ShoppingListOutputCategory = {
  id: string;
  label: string;
  items: { id: string; label: string }[];
};

export type AppData =
  | { kind: "group"; groupId: "system" }
  | { kind: "view-generator"; viewId: "bluesky" | "compass" | "inventory" | "shopping-list" }
  | { kind: "category"; category: string }
  | { kind: "shopping-category"; category: string }
  | { kind: "shopping-item"; label: string }
  | { kind: "saying"; saying: Saying }
  | { kind: "system-function"; functionId: "device-info" }
  | { kind: "inline-app"; appId: "backup" | "maintenance" }
  | { kind: "user-function"; functionId: string; source: string };

type Saying = {
  id: number;
  text: string;
  categories: string[];
  source: unknown[];
  rating: number;
};

type ShoppingCategory = {
  id: string;
  category: string;
  items: string[];
};

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
            : <MaintenanceApp {...maintenanceAppProps} />
          : null
      )}
      renderContent={({ height, node }) => {
        if (node.data?.kind === "view-generator") {
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
        const initialValue = node.data?.kind === "saying"
          ? node.data.saying.text
          : node.data?.kind === "shopping-item"
            ? node.data.label
            : node.data?.kind === "user-function"
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
        if (node.data?.kind === "saying" || node.data?.kind === "shopping-item") {
          return (
            <InputControl
              {...widgetInputControlProps}
              {...inputProps}
            />
          );
        }

        if (node.data?.kind === "user-function" || node.kind === "user-function") {
          return (
            <InputControl
              {...userInputControlProps}
              {...inputProps}
            />
          );
        }

        if (node.data?.kind === "system-function") {
          return (
            <output
              aria-label={`${node.label} output`}
              style={{ display: "block", height }}
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
  "compass", "inventory", "shopping-list", "bluesky", "_system",
]);

const appSettingsByViewId = {
  compass: { componentName: "CompassApp", defaultDataSource: "_system/compass" },
  inventory: { componentName: "InventoryApp", defaultDataSource: "lagerraum" },
  "shopping-list": { componentName: "ShoppingListView", defaultDataSource: "" },
  bluesky: { componentName: "BlueskyApp", defaultDataSource: "" },
} as const;

const functionHierarchy: TreeBrowserInitialNode<AppData>[] = [
  {
    id: "compass",
    label: "Compass",
    enabled: false,
    contentVisible: false,
    data: { kind: "view-generator", viewId: "compass" },
    children: createCompassCategories(sayings),
  },
  {
    id: "inventory",
    label: "Inventory",
    enabled: false,
    contentVisible: false,
    data: { kind: "view-generator", viewId: "inventory" },
    children: [],
  },
  {
    id: "shopping-list",
    label: "ShoppingList",
    enabled: false,
    contentVisible: false,
    data: { kind: "view-generator", viewId: "shopping-list" },
    children: createShoppingCategories(shoppingList),
  },
  {
    id: "bluesky",
    label: "Bluesky",
    enabled: false,
    contentVisible: false,
    data: { kind: "view-generator", viewId: "bluesky" },
    children: [],
  },
  {
    id: "_system",
    label: "_system",
    enabled: false,
    contentEditable: false,
    contentVisible: false,
    listEditable: false,
    listItemLimit: 3,
    data: { kind: "group", groupId: "system" },
    children: [
      {
        id: "device-info",
        label: "DeviceInfo",
        enabled: false,
        data: {
          kind: "system-function",
          functionId: "device-info",
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
    ],
  },
];

function createCompassCategories(
  compassSayings: Saying[],
): TreeBrowserInitialNode<AppData>[] {
  const categoryNames = Array.from(
    new Set(compassSayings.flatMap(({ categories }) => categories)),
  );

  return categoryNames.map((category) => {
    const categoryId = toFunctionId(category);

    return {
      id: `compass-category-${categoryId}`,
      label: category,
      enabled: false,
      contentVisible: false,
      data: { kind: "category", category },
      children: compassSayings
        .filter(({ categories }) => categories.includes(category))
        .map((saying) => ({
          id: `compass-${categoryId}-saying-${saying.id}`,
          label: saying.text,
          enabled: false,
          data: { kind: "saying", saying },
          children: [],
        })),
    };
  });
}

function createShoppingCategories(
  categories: ShoppingCategory[],
): TreeBrowserInitialNode<AppData>[] {
  return categories.map((category) => ({
    id: `shopping-category-${category.id}`,
    label: category.category,
    enabled: false,
    contentVisible: false,
    data: { kind: "shopping-category", category: category.category },
    children: category.items.map((label, index) => ({
      id: `shopping-${category.id}-item-${index}`,
      label,
      enabled: false,
      data: { kind: "shopping-item", label },
      children: [],
    })),
  }));
}

function toFunctionId(name: string) {
  return name.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "function";
}

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
  const compass = nodes.find(
    ({ data }) => data?.kind === "view-generator" && data.viewId === "compass",
  );
  const shopping = nodes.find(
    ({ data }) => data?.kind === "view-generator"
      && data.viewId === "shopping-list",
  );
  const inventory = nodes.find(
    ({ data }) => data?.kind === "view-generator" && data.viewId === "inventory",
  );
  const bluesky = nodes.find(
    ({ data }) => data?.kind === "view-generator" && data.viewId === "bluesky",
  );
  const compassActive = Boolean(compass?.enabled);
  const shoppingListActive = Boolean(shopping?.enabled);
  return {
    blueskyActive: Boolean(bluesky?.enabled),
    compassActive,
    deviceInfoActive: false,
    inventoryActive: Boolean(inventory?.enabled),
    categories: compassActive && compass
      ? compass.children
          .filter(({ enabled }) => enabled)
          .map((category) => ({
            id: category.id,
            label: category.data?.kind === "category"
              ? category.data.category
              : category.label,
            sayings: category.children
              .filter(({ data, enabled }) => enabled && data?.kind === "saying")
              .map(({ data, id }) => ({
                id,
                text: data?.kind === "saying" ? data.saying.text : "",
              })),
          }))
          .filter(({ sayings: activeSayings }) => activeSayings.length > 0)
      : [],
    shoppingListActive,
    shoppingCategories: shoppingListActive && shopping
      ? shopping.children
          .filter(({ enabled }) => enabled)
          .map((category) => ({
            id: category.id,
            label: category.data?.kind === "shopping-category"
              ? category.data.category
              : category.label,
            items: category.children
              .filter(({ data, enabled }) => (
                enabled && data?.kind === "shopping-item"
              ))
              .map(({ data, id }) => ({
                id,
                label: data?.kind === "shopping-item" ? data.label : "",
              })),
          }))
          .filter(({ items }) => items.length > 0)
      : [],
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
  initialTree: functionHierarchy,
  storageKey: "flydeck.tree.apps.v2",
});
