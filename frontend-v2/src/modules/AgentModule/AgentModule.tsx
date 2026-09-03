import type { InputControlProps } from "../../components/InputControl";
import type { BaseStyleProps } from "../../components/Base";
import { AgentJobBrowser, AgentMemoBrowser } from "../../components/AgentJobBrowser";
import type { JobCaseProps, JobCaseStyleProps } from "../../components/JobCase";
import { Module, type ModuleProps } from "../../components/Module";
import {
  SubmodulePanel,
  type SubmodulePanelProps,
} from "../../components/SubmodulePanel";
import type { TreeBrowserProps } from "../../components/TreeBrowser";
import { useClientStateSlice, type ClientStateSlice } from "../../state";
import styles from "./AgentModule.module.css";

export type AgentModuleProps = ModuleProps & {
  inputControlProps?: InputControlProps;
  jobBrowserProps?: BaseStyleProps;
  jobCaseProps?: JobCaseStyleProps;
  nodeIdInputProps?: JobCaseProps["nodeIdInputProps"];
  parentInputProps?: JobCaseProps["parentInputProps"];
  workspaceId?: string;
  onSynchronizationError?: (reason: string) => void;
  treeBrowserProps?: Omit<
    TreeBrowserProps<unknown>,
    | "createNode"
    | "model"
    | "onTreeChange"
    | "renderContent"
    | "renderInlineContent"
  >;
  submodulePanelProps?: Omit<
    SubmodulePanelProps,
    "activeItem" | "onChange"
  >;
};

export function AgentModule({
  jobCaseProps,
  inputControlProps,
  jobBrowserProps,
  nodeIdInputProps,
  parentInputProps,
  workspaceId,
  onSynchronizationError,
  treeBrowserProps,
  submodulePanelProps,
  ...props
}: AgentModuleProps) {
  const [activeSection, setActiveSection] = useClientStateSlice(
    agentSectionSlice,
  );
  const [memoSelectionIds, setMemoSelectionIds] = useClientStateSlice(
    memoSelectionSlice,
  );
  return (
    <Module
      {...props}
      className={styles.root}
      componentName="AgentModule"
      aria-label="Agent module"
    >
      <SubmodulePanel
        {...submodulePanelProps}
        activeItem={activeSection}
        onChange={setActiveSection}
      />
      {activeSection === "JOBS" && (
        <AgentJobBrowser
          {...jobBrowserProps}
          jobCaseProps={jobCaseProps}
          memoSelectionIds={memoSelectionIds}
          treeBrowserProps={treeBrowserProps}
          inputControlProps={inputControlProps}
          nodeIdInputProps={nodeIdInputProps}
          parentInputProps={parentInputProps}
          workspaceId={workspaceId}
          onSynchronizationError={onSynchronizationError}
        />
      )}
      {activeSection === "MEMO" && (
        <AgentMemoBrowser
          checkedNodeIds={memoSelectionIds}
          inputControlProps={inputControlProps}
          nodeIdInputProps={nodeIdInputProps}
          parentInputProps={parentInputProps}
          treeBrowserProps={treeBrowserProps}
          workspaceId={workspaceId}
          onSynchronizationError={onSynchronizationError}
          onNodeCheckedChange={setMemoSelectionIds}
        />
      )}
    </Module>
  );
}

const agentSectionSlice: ClientStateSlice<"JOBS" | "MEMO"> = {
  name: "navigation.agentSection",
  version: 1,
  defaultValue: "JOBS",
  validate: (value): value is "JOBS" | "MEMO" => (
    value === "JOBS" || value === "MEMO"
  ),
};

const memoSelectionSlice: ClientStateSlice<string[]> = {
  name: "agent.memoSelection",
  version: 2,
  defaultValue: [],
  validate: (value): value is string[] => Array.isArray(value)
    && value.every((entry) => typeof entry === "string"),
};
