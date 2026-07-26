import { useRef, useState, type RefObject } from "react";
import { Editor } from "../../components/Editor";
import { TwoColumnList } from "../../components/TwoColumnList";
import { promptSlotMarks, type Snippet } from "../../data/defaults";
import type { ChatEffort, ChatModelTier } from "../../api/chat";
import { Repeat2 } from "lucide-react";
import { TextInput } from "../../components/TextInput";
import type { CharacterDialCornerAction, CharacterDialCorners, DwellMode } from "../../components/CharacterDial";
import { getCommandHintLines } from "./commandHints";

export type ChatSubTab = "PROM" | "SNIP";
type ChatWorkspaceProps = {
  subTab: ChatSubTab;
  snippets: Snippet[];
  armedDeleteSnippet: string | null;
  snippetName: string;
  snippetText: string;
  selectedSnippetName: string | null;
  activePromptSlot: number;
  activeText: string;
  showAgentView: boolean;
  chatRef: RefObject<HTMLTextAreaElement | null>;
  submitDisabled: boolean;
  agentBusy: boolean;
  chatEffort: ChatEffort;
  chatModelTier: ChatModelTier;
  onSubTabChange: (tab: ChatSubTab) => void;
  onSnippetClick: (snippet: Snippet) => void;
  onArmDeleteSnippet: (name: string) => void;
  onSnippetNameChange: (name: string) => void;
  onTextChange: (text: string) => void;
  onPromptSlotChange: (index: number) => void;
  onToggleAgentView: () => void;
  onNewChat: () => void;
  onAgentScroll: (scrollTop: number) => void;
  onCycleChatEffort: () => void;
  onCycleChatModelTier: () => void;
  onSelectWord: () => void;
  onMoveCursor: (direction: -1 | 1) => void;
  onDictate: () => void;
  dictating: boolean;
  onSubmit: () => void;
  characterDialCorners: CharacterDialCorners;
  preferredKeyboard: "system" | "mobile" | "dialer";
  dialerDefaultSize: "small" | "medium" | "large";
  characterDialRightButtons: CharacterDialCornerAction[];
  dialerDefaultDwell: DwellMode;
};

export function ChatWorkspace({ chatRef, ...props }: ChatWorkspaceProps) {
  const snippetNameRef = useRef<HTMLInputElement>(null);
  const snippetKeyboardHostRef = useRef<HTMLDivElement>(null);
  const [snippetNameKeyboardActive, setSnippetNameKeyboardActive] = useState(false);
  const commandHintLines = getCommandHintLines(props.activeText);

  return (
    <section className="workspace chat-workspace" aria-label="Chat workspace">
      <div className="sub-tabs">
        {(["PROM", "SNIP"] as const).map((tab) => (
          <button
            key={tab}
            className={props.subTab === tab ? "active" : ""}
            onClick={() => props.onSubTabChange(tab)}
            aria-label={tab === "PROM" ? "Prompt" : undefined}
          >{tab === "PROM" ? <span className="prompt-tab-symbol">♛</span> : tab}</button>
        ))}
      </div>
      <TwoColumnList
        ariaLabel="Prompt snippets"
        entries={props.snippets.map((snippet) => ({
          key: snippet.name,
          label: snippet.name,
          selected: props.subTab === "SNIP" && props.selectedSnippetName === snippet.name,
          onClick: () => props.onSnippetClick(snippet),
          delete: props.subTab === "SNIP" ? {
            armed: props.armedDeleteSnippet === snippet.name,
            onArm: () => props.onArmDeleteSnippet(snippet.name),
          } : undefined,
        }))}
      />
      {props.subTab === "SNIP" && (
        <>
          <TextInput
            ref={snippetNameRef}
            inputMode="none"
            aria-label="Snippet Name"
            value={props.snippetName}
            onChange={(event) => props.onSnippetNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (!props.submitDisabled) props.onSubmit();
            }}
            onFocus={() => setSnippetNameKeyboardActive(true)}
            onBlur={() => setSnippetNameKeyboardActive(false)}
            placeholder="Snippet Name"
          />
          <div ref={snippetKeyboardHostRef} />
        </>
      )}
      <section className="composer" aria-label="Text input">
        {props.subTab === "PROM" && (
          <>
            <div className="prompt-slot-tabs" aria-label="Prompt slots">
              {promptSlotMarks.map((mark, index) => (
                <button
                  key={mark}
                  className={props.activePromptSlot === index ? "active" : ""}
                  disabled={index > 0}
                  onClick={() => props.onPromptSlotChange(index)}
                >{mark}</button>
              ))}
            </div>
            <div className="agent-control-tabs" aria-label="Agent controls">
              {props.showAgentView
                ? <button type="button" onClick={props.onNewChat} disabled={props.agentBusy}>NEW</button>
                : <button type="button" disabled aria-hidden="true" />}
              <button type="button" disabled aria-hidden="true" />
              <button
                className={`chat-model-toggle model-${props.chatModelTier.toLowerCase()}`}
                onClick={props.onCycleChatModelTier}
                title="Language model"
                aria-label={`Language model: ${props.chatModelTier}`}
              ><Repeat2 size={16} />{props.chatModelTier}</button>
              <button className={`chat-effort-toggle effort-${props.chatEffort.toLowerCase()}`} onClick={props.onCycleChatEffort} title="Agent reasoning depth" aria-label={`Agent reasoning depth: ${props.chatEffort}`}><Repeat2 size={16} />{props.chatEffort}</button>
              <button className={`agent-toggle ${props.showAgentView ? "active" : ""}`} onClick={props.onToggleAgentView} title="Agent view" aria-label="Agent view">🕶</button>
            </div>
          </>
        )}
        <Editor
          key={props.subTab}
          storageKey={props.subTab.toLowerCase()}
          ref={chatRef}
          className={props.showAgentView && props.subTab === "PROM" ? "agent-output" : ""}
          ariaLabel={props.subTab === "SNIP" ? "Snippet Text" : "Chat Text"}
          placeholder={props.subTab === "SNIP" ? "Snippet text..." : "Contact Flydon..."}
          value={props.subTab === "SNIP" ? props.snippetText : props.activeText}
          readOnly={props.showAgentView && props.subTab === "PROM"}
          hint={props.subTab === "PROM" && !props.showAgentView && props.activeText.startsWith("/") && (
            <div className="command-hint" aria-hidden="true">
              {commandHintLines.map((line) => <span key={line}>{line}</span>)}
            </div>
          )}
          onScroll={(event) => {
            if (props.showAgentView && props.subTab === "PROM") props.onAgentScroll(event.currentTarget.scrollTop);
          }}
          onKeyDown={(event) => {
            if (props.subTab === "PROM" && event.ctrlKey && event.key === "Enter") {
              event.preventDefault();
              if (!props.submitDisabled) props.onSubmit();
            }
          }}
          onChange={(event) => props.onTextChange(event.target.value)}
          onValueChange={props.onTextChange}
          onSelectWord={props.onSelectWord}
          onMoveCursor={props.onMoveCursor}
          onScrollToBottom={props.showAgentView && props.subTab === "PROM" ? () => {
            const textarea = chatRef.current;
            if (!textarea) return;
            textarea.scrollTop = textarea.scrollHeight;
            props.onAgentScroll(textarea.scrollTop);
          } : undefined}
          onDictate={props.onDictate}
          dictating={props.dictating}
          dictateDisabled={props.showAgentView && props.subTab === "PROM"}
          onSubmit={props.onSubmit}
          submitDisabled={props.submitDisabled}
          characterDialCorners={props.characterDialCorners}
          preferredKeyboard={props.preferredKeyboard}
          dialerDefaultSize={props.dialerDefaultSize}
          characterDialRightButtons={props.characterDialRightButtons}
          dialerDefaultDwell={props.dialerDefaultDwell}
          temporaryInput={snippetNameKeyboardActive ? {
            ref: snippetNameRef,
            keyboardHostRef: snippetKeyboardHostRef,
            value: props.snippetName,
            onValueChange: props.onSnippetNameChange,
            onSubmit: props.onSubmit,
            submitDisabled: props.submitDisabled,
          } : null}
          onDismissTemporaryInput={() => setSnippetNameKeyboardActive(false)}
        />
      </section>
    </section>
  );
}
