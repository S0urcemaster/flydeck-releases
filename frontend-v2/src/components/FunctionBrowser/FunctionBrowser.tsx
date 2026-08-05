import { useCallback } from "react";

import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserInitialNode,
  type TreeBrowserNode,
  type TreeBrowserModelSnapshotNode,
  type TreeBrowserProps,
} from "../TreeBrowser";
import { InputControl, type InputControlProps } from "../InputControl";
import sayings from "../../assets/sayings.json";
import shoppingList from "../../assets/shopping-list.json";
import {
  isStringRecord,
  useClientStateSlice,
  type ClientStateSlice,
} from "../../state";

export type FunctionBrowserProps = Omit<
  TreeBrowserProps<FunctionData>,
  | "canCreateNode"
  | "componentName"
  | "createNode"
  | "model"
  | "onTreeChange"
  | "renderContent"
> & {
  onOutputChange?: (output: FunctionBrowserOutputState) => void;
  userInputControlProps?: InputControlProps;
  widgetInputControlProps?: InputControlProps;
};

export type FunctionBrowserOutputCategory = {
  id: string;
  label: string;
  sayings: { id: string; text: string }[];
};

export type FunctionBrowserOutputState = {
  categories: FunctionBrowserOutputCategory[];
  compassActive: boolean;
  deviceInfoActive: boolean;
  shoppingListActive: boolean;
  shoppingCategories: ShoppingListOutputCategory[];
};

export type ShoppingListOutputCategory = {
  id: string;
  label: string;
  items: { id: string; label: string }[];
};

export type FunctionData =
  | { kind: "group"; groupId: "system" | "user" | "widgets" }
  | { kind: "view-generator"; viewId: "compass" | "shopping-list" }
  | { kind: "category"; category: string }
  | { kind: "shopping-category"; category: string }
  | { kind: "shopping-item"; label: string }
  | { kind: "saying"; saying: Saying }
  | { kind: "system-function"; functionId: "device-info" }
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
  data?: FunctionData;
  children: readonly FunctionTreeNode[];
};

export function FunctionBrowser({
  onOutputChange,
  userInputControlProps,
  widgetInputControlProps,
  ...treeBrowserProps
}: FunctionBrowserProps) {
  const [drafts, setDrafts] = useClientStateSlice(functionDraftsSlice);
  const reportOutput = useCallback((
    nodes: readonly TreeBrowserModelSnapshotNode<FunctionData>[],
  ) => {
    onOutputChange?.(generateFunctionOutput(nodes));
  }, [onOutputChange]);

  return (
    <TreeBrowser
      {...treeBrowserProps}
      componentName="FunctionBrowser"
      model={functionBrowserModel}
      rootListEditable={false}
      rootListItemLimit={3}
      canCreateNode={(parentId) => parentId === "user"}
      createNode={(name): TreeBrowserNode<FunctionData> => ({
        id: `user-${toFunctionId(name)}`,
        kind: "user-function",
        label: name,
        enabled: false,
        contentEditable: true,
        contentVisible: true,
        listEditable: true,
        data: {
          kind: "user-function",
          functionId: toFunctionId(name),
          source: "",
        },
        children: [],
      })}
      onTreeChange={reportOutput}
      renderContent={({ height, node }) => {
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

const functionHierarchy: TreeBrowserInitialNode<FunctionData>[] = [
  {
    id: "widgets",
    label: "Widgets",
    enabled: false,
    contentEditable: false,
    contentVisible: false,
    listEditable: false,
    listItemLimit: 2,
    data: { kind: "group", groupId: "widgets" },
    children: [
      {
        id: "compass",
        label: "Compass",
        enabled: false,
        contentVisible: false,
        data: { kind: "view-generator", viewId: "compass" },
        children: createCompassCategories(sayings),
      },
      {
        id: "shopping-list",
        label: "ShoppingList",
        enabled: false,
        contentVisible: false,
        data: { kind: "view-generator", viewId: "shopping-list" },
        children: createShoppingCategories(shoppingList),
      },
    ],
  },
  {
    id: "system",
    label: "System",
    enabled: false,
    contentEditable: false,
    contentVisible: false,
    listEditable: false,
    listItemLimit: 1,
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
    ],
  },
  {
    id: "user",
    label: "User",
    enabled: false,
    contentEditable: false,
    contentVisible: false,
    listEditable: false,
    data: { kind: "group", groupId: "user" },
    children: [],
  },
];

function createCompassCategories(
  compassSayings: Saying[],
): TreeBrowserInitialNode<FunctionData>[] {
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
): TreeBrowserInitialNode<FunctionData>[] {
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
): FunctionBrowserOutputState {
  const widgets = findNode(nodes, "widgets");
  const system = findNode(nodes, "system");
  const compass = widgets?.children.find(
    ({ data }) => data?.kind === "view-generator" && data.viewId === "compass",
  );
  const shopping = widgets?.children.find(
    ({ data }) => data?.kind === "view-generator"
      && data.viewId === "shopping-list",
  );
  const deviceInfo = system?.children.find(
    ({ data }) => data?.kind === "system-function"
      && data.functionId === "device-info",
  );
  const compassActive = Boolean(widgets?.enabled && compass?.enabled);
  const shoppingListActive = Boolean(widgets?.enabled && shopping?.enabled);
  return {
    compassActive,
    deviceInfoActive: Boolean(system?.enabled && deviceInfo?.enabled),
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

const functionBrowserModel = new TreeBrowserModel({
  initialTree: functionHierarchy,
  storageKey: "flydeck.tree.functions",
});
