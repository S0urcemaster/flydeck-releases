import { useCallback, useMemo, useState } from "react";
import type { TreeNodeDto } from "@flydeck/shared/v2";

import { useWorkspaceReplica, type WorkspaceReplicaScope } from "../../replica";
import {
  useClientStateScope,
  useClientStateSlice,
  type ClientStateSlice,
} from "../../state";
import type { AppSettingsProps } from "../../components/AppView";
import type { BaseStyleProps } from "../../components/Base";
import type { ButtonProps } from "../../components/Button";
import type { DeviceInfoProps } from "../../components/DeviceInfo";
import { BlueskyApp, type BlueskyAppProps } from "../../components/BlueskyApp";
import { GpsEventsApp, type GpsEventsAppProps } from "../../components/GpsEventsApp";
import { SportApp } from "../../components/SportApp";
import { SchedulerApp } from "../../components/SchedulerApp";
import { IdolsApp } from "../../components/IdolsApp";
import type { DataTreeProps } from "../../components/DataTree";
import type { TextareaProps } from "../../components/Textarea";
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
  | "GPS EVENTS"
  | "IDOLS"
  | "SCHEDULER"
  | "SPORT";

export type FunctionsModuleProps = ModuleProps & {
  appBrowserProps?: AppBrowserProps;
  appTabPanelProps?: Omit<
    SubmodulePanelProps<FunctionsAppTab>,
    "activeItem" | "items" | "onChange"
  >;
  appViewConfigEditorProps?: AppSettingsProps["configEditorProps"];
  appViewButtonProps?: Omit<ButtonProps, "aria-label" | "children" | "onClick">;
  blueskyAppProps?: Omit<BlueskyAppProps, "workspaceId">;
  gpsEventsAppProps?: Omit<GpsEventsAppProps, "workspaceId">;
  deviceInfoProps?: DeviceInfoProps;
  sportAppBaseProps?: BaseStyleProps;
  sportAppTreeProps?: DataTreeProps;
  schedulerAppTreeProps?: DataTreeProps;
  schedulerAppDateInputProps?: BaseStyleProps;
  schedulerAppCommentTextareaProps?: Omit<TextareaProps, "aria-label" | "onChange" | "rows" | "value">;
  sportAppCommentTextareaProps?: Omit<TextareaProps, "rows" | "value" | "onChange">;
  workspaceId?: string;
  timeZone?: string;
};

export function FunctionsModule({
  appBrowserProps,
  appTabPanelProps,
  appViewConfigEditorProps,
  appViewButtonProps,
  blueskyAppProps,
  gpsEventsAppProps,
  deviceInfoProps,
  sportAppBaseProps,
  sportAppTreeProps,
  schedulerAppTreeProps,
  schedulerAppDateInputProps,
  schedulerAppCommentTextareaProps,
  sportAppCommentTextareaProps,
  workspaceId,
  timeZone,
  ...props
}: FunctionsModuleProps) {
  const { userId } = useClientStateScope();
  const [activeTab, setActiveTab] = useClientStateSlice(functionsAppTabSlice);
  const [output, setOutput] = useState<AppBrowserOutputState>({
    blueskyActive: false,
    gpsEventsActive: false,
    sportActive: false,
    schedulerActive: false,
    idolsActive: false,
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
      {visibleActiveTab === "BLUESKY" ? (
        <BlueskyApp
          {...blueskyAppProps}
          buttonProps={blueskyAppProps?.buttonProps ?? appViewButtonProps}
          key="bluesky-view"
          workspaceId={workspaceId}
        />
      ) : null}
      {visibleActiveTab === "GPS EVENTS" ? (
        <GpsEventsApp
          {...gpsEventsAppProps}
          buttonProps={gpsEventsAppProps?.buttonProps ?? appViewButtonProps}
          key="gps-events-view"
          workspaceId={workspaceId}
        />
      ) : null}
      {visibleActiveTab === "SPORT" ? (
        <SportApp {...sportAppBaseProps} key="sport-view" treeProps={sportAppTreeProps} commentTextareaProps={sportAppCommentTextareaProps} workspaceId={workspaceId} />
      ) : null}
      {visibleActiveTab === "SCHEDULER" ? (
        <SchedulerApp key="scheduler-view" timeZone={timeZone} treeProps={schedulerAppTreeProps} dateInputProps={schedulerAppDateInputProps} commentTextareaProps={schedulerAppCommentTextareaProps} workspaceId={workspaceId} />
      ) : null}
      {visibleActiveTab === "IDOLS" ? (
        <IdolsApp key="idols-view" workspaceId={workspaceId} timeZone={timeZone} dateInputProps={schedulerAppDateInputProps} buttonProps={appViewButtonProps} />
      ) : null}
      {visibleActiveTab === "BROWSER" ? (
        <AppBrowser
          {...appBrowserProps}
          deviceInfoProps={deviceInfoProps}
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
  if (output.sportActive) tabs.push("SPORT");
  if (output.schedulerActive) tabs.push("SCHEDULER");
  if (output.idolsActive) tabs.push("IDOLS");
  if (output.blueskyActive) tabs.push("BLUESKY");
  if (output.gpsEventsActive) tabs.push("GPS EVENTS");
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
    || value === "GPS EVENTS"
    || value === "IDOLS"
    || value === "SPORT"
    || value === "SCHEDULER"
  ),
};
