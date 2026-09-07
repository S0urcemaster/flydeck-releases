import { useCallback, useMemo, useState } from "react";
import type { TreeNodeDto } from "@flydeck/shared/v2";

import { useWorkspaceReplica, type WorkspaceReplicaScope } from "../../replica";
import {
  useClientStateScope,
  useClientStateSlice,
  type ClientStateSlice,
} from "../../state";
import { CompassApp } from "../../components/CompassApp";
import type { AppSettingsProps } from "../../components/AppView";
import type { BaseStyleProps } from "../../components/Base";
import type { ButtonProps } from "../../components/Button";
import type { DeviceInfoProps } from "../../components/DeviceInfo";
import { DeviceInfoView } from "../../components/DeviceInfoView";
import { InventoryApp, type InventoryAppProps } from "../../components/InventoryApp";
import { ShoppingListView } from "../../components/ShoppingListView";
import { BlueskyApp, type BlueskyAppProps } from "../../components/BlueskyApp";
import {
  AppBrowser,
  type AppBrowserOutputState,
  type AppBrowserProps,
} from "../../components/AppBrowser";
import { Module, type ModuleProps } from "../../components/Module";
import {
  SubmodulePanel,
  type SubmodulePanelProps,
} from "../../components/SubmodulePanel";

export type FunctionsAppTab =
  | "BROWSER"
  | "BLUESKY"
  | "DEVICE INFO"
  | "COMPASS"
  | "INVENTORY"
  | "SHOPPING LIST";

export type FunctionsModuleProps = ModuleProps & {
  appBrowserProps?: AppBrowserProps;
  appTabPanelProps?: Omit<
    SubmodulePanelProps<FunctionsAppTab>,
    "activeItem" | "items" | "onChange"
  >;
  appViewConfigEditorProps?: AppSettingsProps["configEditorProps"];
  appViewButtonProps?: Omit<ButtonProps, "aria-label" | "children" | "onClick">;
  blueskyAppProps?: Omit<BlueskyAppProps, "workspaceId">;
  compassAppBaseProps?: BaseStyleProps;
  deviceInfoProps?: DeviceInfoProps;
  deviceInfoViewBaseProps?: BaseStyleProps;
  inventoryAppBaseProps?: BaseStyleProps;
  inventoryBreadcrumbProps?: InventoryAppProps["breadcrumbProps"];
  inventoryCompactButtonProps?: InventoryAppProps["compactButtonProps"];
  inventoryFormProps?: InventoryAppProps["formProps"];
  inventoryFormRowProps?: InventoryAppProps["formRowProps"];
  inventoryInputProps?: InventoryAppProps["inputProps"];
  inventoryItemListProps?: InventoryAppProps["itemListProps"];
  inventoryNodeIdInputProps?: InventoryAppProps["nodeIdInputProps"];
  inventoryParentInputProps?: InventoryAppProps["parentInputProps"];
  inventoryTextareaProps?: InventoryAppProps["textareaProps"];
  shoppingListViewBaseProps?: BaseStyleProps;
  workspaceId?: string;
};

export function FunctionsModule({
  appBrowserProps,
  appTabPanelProps,
  appViewConfigEditorProps,
  appViewButtonProps,
  blueskyAppProps,
  compassAppBaseProps,
  deviceInfoProps,
  deviceInfoViewBaseProps,
  inventoryAppBaseProps,
  inventoryBreadcrumbProps,
  inventoryCompactButtonProps,
  inventoryFormProps,
  inventoryFormRowProps,
  inventoryInputProps,
  inventoryItemListProps,
  inventoryNodeIdInputProps,
  inventoryParentInputProps,
  inventoryTextareaProps,
  shoppingListViewBaseProps,
  workspaceId,
  ...props
}: FunctionsModuleProps) {
  const { userId } = useClientStateScope();
  const [activeTab, setActiveTab] = useClientStateSlice(functionsAppTabSlice);
  const [output, setOutput] = useState<AppBrowserOutputState>({
    blueskyActive: false,
    categories: [],
    compassActive: false,
    deviceInfoActive: false,
    inventoryActive: false,
    shoppingListActive: false,
    shoppingCategories: [],
  });
  const visibleTabs = getVisibleFunctionsAppTabs(output);
  const visibleActiveTab = visibleTabs.includes(activeTab)
    ? activeTab
    : "BROWSER";
  const replicaScope = useMemo<WorkspaceReplicaScope | null>(() => (
    workspaceId ? { userId, workspaceId } : null
  ), [userId, workspaceId]);
  const replicaRecord = useWorkspaceReplica(replicaScope);
  const replicaTree = replicaRecord?.tree;
  const validateDataSource = useCallback((dataSource: string) => (
    Boolean(replicaTree && dataSourceBranchExists(
      replicaTree.document.nodes,
      dataSource,
    ))
  ), [replicaTree]);

  return (
    <Module
      {...props}
      componentName="FunctionsModule"
      aria-label="Functions module"
    >
      <SubmodulePanel
        {...appTabPanelProps}
        activeItem={visibleActiveTab}
        items={visibleTabs}
        onChange={setActiveTab}
      />
      {visibleActiveTab === "DEVICE INFO" ? (
        <DeviceInfoView
          {...deviceInfoViewBaseProps}
          key="device-info-view"
          deviceInfoProps={deviceInfoProps}
        />
      ) : null}
      {visibleActiveTab === "COMPASS"
        ? (
            <CompassApp
              {...compassAppBaseProps}
              key="compass-view"
              categories={output.categories}
              reorderButtonProps={appViewButtonProps}
            />
          )
        : null}
      {visibleActiveTab === "INVENTORY"
        ? (
            <InventoryApp
              {...inventoryAppBaseProps}
              key="inventory-view"
              buttonProps={appViewButtonProps}
              breadcrumbProps={inventoryBreadcrumbProps}
              compactButtonProps={inventoryCompactButtonProps}
              formProps={inventoryFormProps}
              formRowProps={inventoryFormRowProps}
              formRowButtonProps={appViewButtonProps}
              inputProps={inventoryInputProps}
              itemListProps={inventoryItemListProps}
              nodeIdInputProps={inventoryNodeIdInputProps}
              parentInputProps={inventoryParentInputProps}
              textareaProps={inventoryTextareaProps}
              workspaceId={workspaceId}
            />
          )
        : null}
      {visibleActiveTab === "SHOPPING LIST"
        ? (
            <ShoppingListView
              {...shoppingListViewBaseProps}
              key="shopping-list-view"
              categories={output.shoppingCategories}
            />
          )
        : null}
      {visibleActiveTab === "BLUESKY" ? (
        <BlueskyApp
          {...blueskyAppProps}
          buttonProps={blueskyAppProps?.buttonProps ?? appViewButtonProps}
          key="bluesky-view"
          workspaceId={workspaceId}
        />
      ) : null}
      {visibleActiveTab === "BROWSER" ? (
        <AppBrowser
          {...appBrowserProps}
          key="function-browser"
          appSettingsEditorProps={appViewConfigEditorProps}
          onOutputChange={setOutput}
          validateDataSource={validateDataSource}
          workspaceId={workspaceId}
        />
      ) : null}
    </Module>
  );
}

export function getVisibleFunctionsAppTabs(
  output: AppBrowserOutputState,
): FunctionsAppTab[] {
  const tabs: FunctionsAppTab[] = ["BROWSER"];
  if (output.blueskyActive) tabs.push("BLUESKY");
  if (output.deviceInfoActive) tabs.push("DEVICE INFO");
  if (output.compassActive) tabs.push("COMPASS");
  if (output.inventoryActive) tabs.push("INVENTORY");
  if (output.shoppingListActive) tabs.push("SHOPPING LIST");
  return tabs;
}

export function dataSourceBranchExists(
  nodes: readonly TreeNodeDto[],
  dataSource: string,
) {
  const segments = dataSource.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  let parentId: string | null = null;
  for (const segment of segments) {
    const matches = nodes.filter((node) => (
      node.parentId === parentId && node.localId === segment
    ));
    if (matches.length !== 1) return false;
    parentId = matches[0].id;
  }
  return true;
}

const functionsAppTabSlice: ClientStateSlice<FunctionsAppTab> = {
  name: "navigation.functionsApp",
  version: 1,
  defaultValue: "BROWSER",
  validate: (value): value is FunctionsAppTab => (
    value === "BROWSER"
    || value === "BLUESKY"
    || value === "DEVICE INFO"
    || value === "COMPASS"
    || value === "INVENTORY"
    || value === "SHOPPING LIST"
  ),
};
