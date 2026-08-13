import { useCallback, useState } from "react";
import type { TreeNodeDto } from "@flydeck/shared/v2";

import { v2Api } from "../../api/V2ApiClient";
import { CompassApp } from "../../components/CompassApp";
import type { ConfigModuleButtonProps } from "../../components/ConfigModuleButton";
import type { AppViewProps } from "../../components/AppView";
import type { BaseStyleProps } from "../../components/Base";
import type { ButtonProps } from "../../components/Button";
import type { DeviceInfoProps } from "../../components/DeviceInfo";
import { DeviceInfoView } from "../../components/DeviceInfoView";
import { InventoryApp, type InventoryAppProps } from "../../components/InventoryApp";
import { ShoppingListView } from "../../components/ShoppingListView";
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
  appViewConfigButtonProps?: Omit<
    ConfigModuleButtonProps,
    "symbol" | "onClick"
  >;
  appViewConfigEditorProps?: AppViewProps["configEditorProps"];
  appViewButtonProps?: Omit<ButtonProps, "aria-label" | "children" | "onClick">;
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
  appViewConfigButtonProps,
  appViewConfigEditorProps,
  appViewButtonProps,
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
  const [activeTab, setActiveTab] = useState<FunctionsAppTab>("BROWSER");
  const [output, setOutput] = useState<AppBrowserOutputState>({
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
  const validateDataSource = useCallback(async (dataSource: string) => {
    if (!workspaceId) return false;
    const tree = await v2Api.loadDataTree(workspaceId);
    return dataSourceBranchExists(tree.document.nodes, dataSource);
  }, [workspaceId]);

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
          configButtonProps={appViewConfigButtonProps}
          configEditorProps={appViewConfigEditorProps}
          deviceInfoProps={deviceInfoProps}
          validateDataSource={validateDataSource}
        />
      ) : null}
      {visibleActiveTab === "COMPASS"
        ? (
            <CompassApp
              {...compassAppBaseProps}
              key="compass-view"
              categories={output.categories}
              configButtonProps={appViewConfigButtonProps}
              configEditorProps={appViewConfigEditorProps}
              reorderButtonProps={appViewButtonProps}
              validateDataSource={validateDataSource}
            />
          )
        : null}
      {visibleActiveTab === "INVENTORY"
        ? (
            <InventoryApp
              {...inventoryAppBaseProps}
              key="inventory-view"
              configButtonProps={appViewConfigButtonProps}
              buttonProps={appViewButtonProps}
              breadcrumbProps={inventoryBreadcrumbProps}
              compactButtonProps={inventoryCompactButtonProps}
              configEditorProps={appViewConfigEditorProps}
              formProps={inventoryFormProps}
              formRowProps={inventoryFormRowProps}
              formRowButtonProps={appViewButtonProps}
              inputProps={inventoryInputProps}
              itemListProps={inventoryItemListProps}
              nodeIdInputProps={inventoryNodeIdInputProps}
              parentInputProps={inventoryParentInputProps}
              textareaProps={inventoryTextareaProps}
              validateDataSource={validateDataSource}
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
              configButtonProps={appViewConfigButtonProps}
              configEditorProps={appViewConfigEditorProps}
              validateDataSource={validateDataSource}
            />
          )
        : null}
      {visibleActiveTab === "BROWSER" ? (
        <AppBrowser
          {...appBrowserProps}
          key="function-browser"
          onOutputChange={setOutput}
        />
      ) : null}
    </Module>
  );
}

export function getVisibleFunctionsAppTabs(
  output: AppBrowserOutputState,
): FunctionsAppTab[] {
  const tabs: FunctionsAppTab[] = ["BROWSER"];
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
