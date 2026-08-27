import { useEffect, useRef, useState } from "react";
import { treeNodeLabelSchema } from "@flydeck/shared/v2";
import { Button, type ButtonProps } from "../Button";
import { Base, resolveCssValue, type BaseStyleProps } from "../Base";
import { CycleButton } from "../CycleButton";
import { InputControl, type InputControlProps } from "../InputControl";
import { NodeIdInput, type NodeIdInputProps } from "../NodeIdInput";
import { ParentInput, type ParentInputProps } from "../ParentInput";
import { PromptInput } from "../PromptInput";
import type { TreeBrowserRootControl } from "../TreeBrowser";
import {
  chatApi,
  type ChatEffort,
  type ChatModelTier,
  type ChatSnapshot,
} from "../../api/chat";
import styles from "./AgentChatContent.module.css";

export type AgentChatContentStyleProps = BaseStyleProps & {
  fontSize?: string;
};

export type AgentChatContentProps = AgentChatContentStyleProps & {
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  contextConversationIds: readonly string[];
  height?: string;
  includeParent: boolean;
  inputControlProps?: InputControlProps;
  localId: string;
  localIdAvailable: (localId: string) => boolean;
  name: string;
  nodeId: string;
  nodeIdInputProps?: Omit<
    NodeIdInputProps,
    "available" | "disabled" | "onChange" | "onSave" | "savedValue" | "value"
  >;
  parentInputProps?: Omit<
    ParentInputProps,
    "current" | "onChange" | "onSetParent" | "targets" | "value"
  >;
  root?: TreeBrowserRootControl;
  workspaceId: string;
  onIncludeParentChange: (enabled: boolean) => Promise<boolean>;
  onLocalIdChange?: (localId: string) => Promise<boolean>;
  onNameChange: (name: string) => Promise<boolean>;
};

const emptySnapshot = (id: string): ChatSnapshot => ({
  id,
  codexThreadId: null,
  messages: [],
  activeRun: null,
});

export function AgentChatContent({
  buttonProps,
  background,
  border,
  color,
  contextConversationIds,
  height,
  fontSize,
  includeParent,
  inputControlProps,
  localId,
  localIdAvailable,
  name,
  nodeId,
  nodeIdInputProps,
  parentInputProps,
  root,
  workspaceId,
  onIncludeParentChange,
  onLocalIdChange,
  onNameChange,
  margin,
  padding,
  width,
}: AgentChatContentProps) {
  const [snapshotState, setSnapshotState] = useState({
    nodeId,
    value: emptySnapshot(nodeId),
  });
  const snapshot = snapshotState.nodeId === nodeId
    ? snapshotState.value : emptySnapshot(nodeId);
  const [promptState, setPromptState] = useState({ nodeId, value: "" });
  const prompt = promptState.nodeId === nodeId ? promptState.value : "";
  const [errorState, setErrorState] = useState<{ nodeId: string; value: string | null }>({
    nodeId,
    value: null,
  });
  const error = errorState.nodeId === nodeId ? errorState.value : null;
  const [modelTier, setModelTier] = useState<ChatModelTier>("ECON");
  const [effort, setEffort] = useState<ChatEffort>("FAST");
  const [nameDraft, setNameDraft] = useState({ nodeId, saved: name, value: name });
  const effectiveName = nameDraft.nodeId === nodeId && nameDraft.saved === name
    ? nameDraft.value : name;
  const [localIdDraft, setLocalIdDraft] = useState({
    nodeId, saved: localId, value: localId,
  });
  const effectiveLocalId = localIdDraft.nodeId === nodeId
    && localIdDraft.saved === localId ? localIdDraft.value : localId;
  const [parentDraft, setParentDraft] = useState({
    nodeId,
    currentId: root?.current.id,
    currentPath: root?.current.path,
    value: root?.current.path ?? "",
  });
  const parentValue = parentDraft.nodeId === nodeId
    && parentDraft.currentId === root?.current.id
    && parentDraft.currentPath === root?.current.path
    ? parentDraft.value : root?.current.path ?? "";
  const historyRef = useRef<HTMLDivElement>(null);
  const busy = snapshot.activeRun?.status === "queued"
    || snapshot.activeRun?.status === "running";

  useEffect(() => {
    let active = true;
    void chatApi.read(workspaceId, nodeId).then((value) => {
      if (active) setSnapshotState({ nodeId, value });
    }).catch((error: unknown) => {
      if (active) setErrorState({
        nodeId,
        value: error instanceof Error ? error.message : "Chat could not be loaded",
      });
    });
    const events = new EventSource(chatApi.eventsUrl(workspaceId, nodeId));
    events.addEventListener("snapshot", (event) => {
      if (!active) return;
      setSnapshotState({
        nodeId,
        value: JSON.parse((event as MessageEvent<string>).data) as ChatSnapshot,
      });
      setErrorState({ nodeId, value: null });
    });
    events.onerror = () => {
      if (active) setErrorState((current) => current.nodeId === nodeId
        ? { nodeId, value: current.value ?? "Live connection interrupted" }
        : current);
    };
    return () => {
      active = false;
      events.close();
    };
  }, [nodeId, workspaceId]);

  useEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [snapshot]);

  async function sendPrompt() {
    const value = prompt.trim();
    if (!value || busy) return;
    setErrorState({ nodeId, value: null });
    try {
      const run = await chatApi.start(
        workspaceId,
        nodeId,
        value,
        crypto.randomUUID(),
        effort,
        modelTier,
        contextConversationIds,
      );
      setSnapshotState((current) => current.nodeId === nodeId
        ? { nodeId, value: { ...current.value, activeRun: run } }
        : current);
      setPromptState({ nodeId, value: "" });
    } catch (error) {
      setErrorState({
        nodeId,
        value: error instanceof Error ? error.message : "Chat request failed",
      });
    }
  }

  const normalizedName = effectiveName.trim();
  const pendingAssistant = busy ? snapshot.activeRun : null;

  return (
    <Base
      as="section"
      className={styles.root}
      componentName="AgentChatContent"
      color={color}
      background={background}
      border={border}
      padding={padding}
      margin={margin}
      width={width}
      style={{ height }}
      aria-label="Agent chat content"
    >
      <div className={styles.identityFields}>
        <NodeIdInput
          {...inputControlProps}
          {...nodeIdInputProps}
          available={localIdAvailable}
          disabled={!onLocalIdChange}
          savedValue={localId}
          value={effectiveLocalId}
          onChange={(value) => setLocalIdDraft({ nodeId, saved: localId, value })}
          onSave={async (value) => {
            if (await onLocalIdChange?.(value)) {
              setLocalIdDraft({ nodeId, saved: value, value });
            }
          }}
        />
        <InputControl
          {...inputControlProps}
          buttonProps={{
            ...inputControlProps?.buttonProps,
            disabled: !treeNodeLabelSchema.safeParse(normalizedName).success
              || normalizedName === name,
          }}
          control="input"
          inputProps={{
            ...inputControlProps?.inputProps,
            "aria-label": "Chat name",
            label: "Name",
            maxLength: 200,
          }}
          keyboardLayout="block"
          value={effectiveName}
          onChange={(value) => setNameDraft({ nodeId, saved: name, value })}
          onSend={async () => {
            if (normalizedName === name || !treeNodeLabelSchema.safeParse(normalizedName).success) return;
            if (await onNameChange(normalizedName)) {
              setNameDraft({ nodeId, saved: normalizedName, value: normalizedName });
            }
          }}
        />
        {root && (
          <ParentInput
            {...parentInputProps}
            current={root.current}
            targets={root.targets}
            value={parentValue}
            onChange={(value) => setParentDraft({
              nodeId,
              currentId: root.current.id,
              currentPath: root.current.path,
              value,
            })}
            onSetParent={async (target) => {
              if (await root.onChange(target.id)) {
                setParentDraft({
                  nodeId,
                  currentId: target.id,
                  currentPath: target.path,
                  value: target.path,
                });
              }
            }}
          />
        )}
      </div>
      <div className={styles.chatControls}>
        <Button
          {...buttonProps}
          activeColor="COLOR_ACCENT_ONE"
          disabled={!root?.current.id}
          selected={includeParent && Boolean(root?.current.id)}
          aria-pressed={includeParent && Boolean(root?.current.id)}
          onClick={() => void onIncludeParentChange(!includeParent)}
        >
          Parent
        </Button>
        <CycleButton
          {...buttonProps}
          activeColor={modelTier === "MEDI" ? "COLOR_SPEECH" : "COLOR_ERROR"}
          aria-label={`Language model: ${modelTier}`}
          options={["ECON", "MEDI", "HIGH"]}
          selected={modelTier !== "ECON"}
          showAlternatives={false}
          value={modelTier}
          onChange={(value) => setModelTier(value as ChatModelTier)}
        />
        <CycleButton
          {...buttonProps}
          activeColor={effort === "MEDI" ? "COLOR_SPEECH" : "COLOR_ERROR"}
          aria-label={`Agent reasoning depth: ${effort}`}
          options={["FAST", "MEDI", "DEEP"]}
          selected={effort !== "FAST"}
          showAlternatives={false}
          value={effort}
          onChange={(value) => setEffort(value as ChatEffort)}
        />
      </div>
      <div
        className={styles.history}
        ref={historyRef}
        aria-label="Chat history"
        style={{ fontSize: resolveCssValue(fontSize) }}
      >
        {snapshot.messages.length === 0 && !pendingAssistant ? (
          <p className={styles.empty}>Noch keine Nachrichten.</p>
        ) : snapshot.messages.map((message) => (
          <article
            className={styles.message}
            data-role={message.role}
            key={message.id}
          >
            <p>{message.text}</p>
            <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
          </article>
        ))}
        {pendingAssistant && (
          <article className={styles.message} data-role="assistant" data-pending="true">
            <p>{pendingAssistant.output || (pendingAssistant.status === "queued"
              ? "Queued …" : "Working …")}</p>
          </article>
        )}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      <PromptInput
        {...inputControlProps}
        height="8rem"
        keyboardLayout="block"
        textareaProps={{
          ...inputControlProps?.textareaProps,
          "aria-label": "Prompt",
          label: "Prompt",
          placeholder: "Contact Flydon...",
        }}
        keyboardActions={busy ? (
          <Button
            {...buttonProps}
            activeColor="COLOR_SPEECH"
            width="100%"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              const runId = snapshot.activeRun?.id;
              if (runId) void chatApi.cancel(workspaceId, nodeId, runId);
            }}
          >
            Cancel
          </Button>
        ) : undefined}
        value={prompt}
        onChange={(value) => setPromptState({ nodeId, value })}
        onSend={() => void sendPrompt()}
      />
    </Base>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
