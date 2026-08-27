import { InputControl, type InputControlProps } from "../../components/InputControl";
import { AgentChatBrowser } from "../../components/AgentChatBrowser";
import type {
  AgentChatContentProps,
  AgentChatContentStyleProps,
} from "../../components/AgentChatContent";
import { MemoryBrowser } from "../../components/MemoryBrowser";
import { Module, type ModuleProps } from "../../components/Module";
import {
  SubmodulePanel,
  type SubmodulePanelProps,
} from "../../components/SubmodulePanel";
import {
  TreeBrowserModel,
  type TreeBrowserProps,
} from "../../components/TreeBrowser";
import {
  isStringRecord,
  useClientStateSlice,
  type ClientStateSlice,
} from "../../state";
import {
  agentMemoryInitialDrafts,
  agentMemoryInitialTree,
  defaultAgentMemory,
  type AgentMemoryData,
} from "./agentMemory";
import styles from "./AgentModule.module.css";

export type AgentModuleProps = ModuleProps & {
  inputControlProps?: InputControlProps;
  chatContentProps?: AgentChatContentStyleProps;
  nodeIdInputProps?: AgentChatContentProps["nodeIdInputProps"];
  parentInputProps?: AgentChatContentProps["parentInputProps"];
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
  chatContentProps,
  inputControlProps,
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
  const [drafts, setDrafts] = useClientStateSlice(agentMemoDraftsSlice);

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
      {activeSection === "CHAT" && (
        <AgentChatBrowser
          chatContentProps={chatContentProps}
          {...treeBrowserProps}
          inputControlProps={inputControlProps}
          nodeIdInputProps={nodeIdInputProps}
          parentInputProps={parentInputProps}
          workspaceId={workspaceId}
          onSynchronizationError={onSynchronizationError}
        />
      )}
      {activeSection === "MEMO" && (
        <MemoryBrowser
          {...treeBrowserProps}
          model={agentTreeBrowserModel}
          renderContent={({ height, node }) => (
            <InputControl
              {...inputControlProps}
              height={height}
              value={drafts[node.id] ?? initialMemoryContent(node.data)}
              onChange={(value) => setDrafts((current) => ({
                ...current,
                [node.id]: value,
              }))}
            />
          )}
        />
      )}
    </Module>
  );
}

const agentMemoDraftsSlice: ClientStateSlice<Record<string, string>> = {
  name: `drafts.memo.default.${defaultAgentMemory.version}`,
  version: 1,
  defaultValue: agentMemoryInitialDrafts,
  validate: isStringRecord,
};

const agentSectionSlice: ClientStateSlice<"CHAT" | "MEMO"> = {
  name: "navigation.agentSection",
  version: 1,
  defaultValue: "MEMO",
  validate: (value): value is "CHAT" | "MEMO" => (
    value === "CHAT" || value === "MEMO"
  ),
};

const agentTreeBrowserModel = new TreeBrowserModel<AgentMemoryData>({
  initialTree: agentMemoryInitialTree,
  storageKey: `flydeck.tree.memo.default.${defaultAgentMemory.version}`,
});

function initialMemoryContent(value: unknown) {
  return value && typeof value === "object"
    && typeof (value as Partial<AgentMemoryData>).initialContent === "string"
    ? (value as AgentMemoryData).initialContent
    : "";
}
