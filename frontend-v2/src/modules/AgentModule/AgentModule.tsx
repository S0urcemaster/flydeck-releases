import { InputControl, type InputControlProps } from "../../components/InputControl";
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
  treeBrowserProps?: Omit<TreeBrowserProps<AgentMemoryData>, "model" | "renderContent">;
  submodulePanelProps?: Omit<
    SubmodulePanelProps,
    "activeItem" | "onChange"
  >;
};

export function AgentModule({
  inputControlProps,
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
        <section className={styles.placeholder} aria-label="Agent chat">
          CHAT
        </section>
      )}
      {activeSection === "MEMO" && (
        <MemoryBrowser
          {...treeBrowserProps}
          model={agentTreeBrowserModel}
          renderContent={({ height, node }) => (
            <InputControl
              {...inputControlProps}
              height={height}
              value={drafts[node.id] ?? node.data?.initialContent ?? ""}
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
