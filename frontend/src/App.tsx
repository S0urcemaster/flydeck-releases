import { useRef, useState, type CSSProperties } from "react";
import {
  Bot,
  CalendarClock,
  Database,
} from "lucide-react";
import { AppTopbar } from "./components/AppTopbar";
import { useEditorControls } from "./hooks/useEditorControls";
import { useServerHealth } from "./hooks/useServerHealth";
import { ChatWorkspace } from "./features/chat/ChatWorkspace";
import { useChatController } from "./features/chat/useChatController";
import { useSnippetController } from "./features/chat/useSnippetController";
import { DataWorkspace } from "./features/data/DataWorkspace";
import { useDataController } from "./features/data/useDataController";
import { SettingsWorkspace } from "./features/settings/SettingsWorkspace";
import { useUiSettings } from "./features/settings/useUiSettings";
import { useCronController } from "./features/cron/useCronController";
import { CronWorkspace } from "./features/cron/CronWorkspace";
import {
  getCharacterDialCorners,
  getCharacterDialRightButtons,
  getDialerDefaultDwell,
  getDialerDefaultSize,
  getDialerScaleSize,
  getPreferredKeyboard,
  getUiButtonHeight,
  getUiFontScale,
} from "./config/uiConfig";

type MainTab = "CHAT" | "DATA" | "CRON";

export function App() {
  const {
    open: settingsOpen,
    config: uiConfig,
    draft: uiConfigDraft,
    setDraft: setUiConfigDraft,
    close: closeSettings,
    toggle: toggleSettings,
  } = useUiSettings();
  const [activeTab, setActiveTab] = useState<MainTab>("CHAT");
  const {
    subTab: chatSubTab,
    setSubTab: setChatSubTab,
    activePromptSlot,
    selectPromptSlot,
    activeText: activeChatText,
    showAgentView,
    toggleAgentView,
    run: chatRun,
    error: chatError,
    effort: chatEffort,
    cycleEffort: cycleChatEffort,
    modelTier: chatModelTier,
    cycleModelTier: cycleChatModelTier,
    editorRef: chatRef,
    busy: chatBusy,
    canSend: canSendPrompt,
    updateText: updateChatText,
    setAgentHistory,
    appendSnippet,
    send: sendPrompt,
    startNewChat,
    setScrollTop: setAgentScrollTop,
  } = useChatController(activeTab === "CHAT");
  const serverVital = useServerHealth();
  const {
    snippets,
    name: snippetName,
    setName: setSnippetName,
    text: snippetText,
    setText: setSnippetText,
    selectedName: selectedSnippetName,
    setSelectedName: setSelectedSnippetName,
    armedDelete: armedDeleteSnippet,
    error: snippetError,
    canSave: canSendSnippet,
    save: saveSnippet,
    armDelete: armDeleteSnippet,
    selectOrDelete: confirmDeleteSnippet,
  } = useSnippetController();
  const {
    data,
    files: dataFiles,
    selectedFile,
    selectedLine,
    page: linePage,
    setPage: setLinePage,
    text: dataText,
    setText: setDataText,
    newFileName: dataNewFileName,
    setNewFileName: setDataNewFileName,
    armedDeleteFile,
    armedDeleteLine,
    busy: dataBusy,
    deletePending: dataDeletePending,
    error: dataError,
    editorRef: dataRef,
    selectLine,
    saveLine: saveDataLine,
    saveLineAsNew: saveDataLineAsNew,
    armFile: armDeleteFile,
    armLine: armDeleteLine,
    selectOrDeleteLine: confirmDeleteLine,
    selectOrDeleteFile: confirmDeleteFile,
    createFile: createDataFile,
  } = useDataController();
  const cron = useCronController();
  const cronError = cron.error;
  const settingsRef = useRef<HTMLTextAreaElement>(null);

  const activeRef = settingsOpen ? settingsRef : activeTab === "DATA" ? dataRef : chatRef;

  const { moveCursor, selectWord, dictate, dictating } = useEditorControls(activeRef, (nextValue) => {
    if (settingsOpen) {
      setUiConfigDraft(nextValue);
    } else if (activeTab === "DATA") {
      setDataText(nextValue);
    } else if (chatSubTab === "SNIP") {
      setSnippetText(nextValue);
    } else if (showAgentView) {
      setAgentHistory(nextValue);
    } else {
      updateChatText(nextValue);
    }
  });

  const activeError = settingsOpen
    ? null
    : activeTab === "DATA"
      ? dataError
      : activeTab === "CRON"
        ? cronError
        : chatSubTab === "SNIP"
          ? snippetError ?? chatError
          : chatError;
  const editorFontScale = getUiFontScale(uiConfig, "editor-fontsize-scale");
  const editorPreferences = {
    characterDialCorners: getCharacterDialCorners(uiConfig),
    characterDialRightButtons: getCharacterDialRightButtons(uiConfig),
    preferredKeyboard: getPreferredKeyboard(uiConfig),
    dialerDefaultSize: getDialerDefaultSize(uiConfig),
    dialerDefaultDwell: getDialerDefaultDwell(uiConfig),
  };

  return (
    <main
      className="app-shell"
      style={{
        "--ui-font-size": `${getUiFontScale(uiConfig, "ui-font-size")}rem`,
        "--ui-list-font-size": `${getUiFontScale(uiConfig, "ui-list-font-size")}rem`,
        "--ui-buttonheight-standard": `${getUiButtonHeight(uiConfig, "standard")}px`,
        "--ui-buttonheight-compact": `${getUiButtonHeight(uiConfig, "compact")}px`,
        "--dialer-inner-scale-size": 1 + (getDialerScaleSize(uiConfig, "inner") - 1) / 99,
        "--dialer-outer-scale-size": 1 + (getDialerScaleSize(uiConfig, "outer") - 1) / 99,
        "--editor-font-size-medi": `${1.08 + 0.16 * editorFontScale}rem`,
        "--editor-font-size-big": `${1.08 + 0.52 * editorFontScale}rem`,
        "--agent-editor-font-size-medi": `${0.94 + 0.14 * editorFontScale}rem`,
        "--agent-editor-font-size-big": `${0.94 + 0.51 * editorFontScale}rem`,
      } as CSSProperties}
    >
      <div className="app-background-layer" aria-hidden="true">
        <span className="app-background-logo">𐦍</span>
      </div>
      <AppTopbar
        activeError={activeError}
        serverVital={serverVital}
        chatBusy={chatBusy}
        chatRun={chatRun}
        settingsOpen={settingsOpen}
        onToggleSettings={toggleSettings}
      />

      <div className="ui-font-scope">
      {settingsOpen ? (
        <SettingsWorkspace
          value={uiConfigDraft}
          textareaRef={settingsRef}
          onChange={setUiConfigDraft}
          onSelectWord={selectWord}
          onMoveCursor={moveCursor}
          onDictate={dictate}
          dictating={dictating}
          onSave={closeSettings}
          {...editorPreferences}
        />
      ) : <>
      <nav className="main-tabs" aria-label="Main sections">
        {(["CHAT", "DATA", "CRON"] as const).map((tab) => (
          <button key={tab} className={tab === activeTab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab === "CHAT" && <Bot size={20} />}
            {tab === "DATA" && <Database size={20} />}
            {tab === "CRON" && <CalendarClock size={20} />}
            <span>{tab}</span>
          </button>
        ))}
      </nav>

      {activeTab === "CHAT" && (
        <ChatWorkspace
          subTab={chatSubTab}
          snippets={snippets}
          armedDeleteSnippet={armedDeleteSnippet}
          snippetName={snippetName}
          snippetText={snippetText}
          selectedSnippetName={selectedSnippetName}
          activePromptSlot={activePromptSlot}
          activeText={activeChatText}
          showAgentView={showAgentView}
          chatRef={chatRef}
          submitDisabled={chatSubTab === "SNIP" ? !canSendSnippet : !canSendPrompt}
          agentBusy={chatBusy}
          chatEffort={chatEffort}
          chatModelTier={chatModelTier}
          {...editorPreferences}
          onSubTabChange={setChatSubTab}
          onSnippetClick={(snippet) => {
            if (chatSubTab === "SNIP") {
              setSelectedSnippetName(snippet.name);
              void confirmDeleteSnippet(snippet.name);
            } else {
              appendSnippet(snippet);
            }
          }}
          onArmDeleteSnippet={armDeleteSnippet}
          onSnippetNameChange={setSnippetName}
          onTextChange={(text) => {
            if (chatSubTab === "SNIP") setSnippetText(text);
            else updateChatText(text);
          }}
          onPromptSlotChange={selectPromptSlot}
          onToggleAgentView={toggleAgentView}
          onNewChat={startNewChat}
          onAgentScroll={setAgentScrollTop}
          onCycleChatEffort={cycleChatEffort}
          onCycleChatModelTier={cycleChatModelTier}
          onSelectWord={selectWord}
          onMoveCursor={moveCursor}
          onDictate={dictate}
          dictating={dictating}
          onSubmit={chatSubTab === "PROM" ? () => void sendPrompt() : () => void saveSnippet()}
        />
      )}

      {activeTab === "DATA" && (
        <DataWorkspace
          data={data}
          files={dataFiles}
          selectedFile={selectedFile}
          armedDeleteFile={armedDeleteFile}
          armedDeleteLine={armedDeleteLine}
          selectedLine={selectedLine}
          dataText={dataText}
          newFileName={dataNewFileName}
          dataRef={dataRef}
          page={linePage}
          onPageChange={setLinePage}
          onArmDelete={armDeleteFile}
          onSelectOrDelete={confirmDeleteFile}
          onSelectLine={selectLine}
          onArmDeleteLine={armDeleteLine}
          onSelectOrDeleteLine={(index) => void confirmDeleteLine(index)}
          onTextChange={setDataText}
          onNewFileNameChange={setDataNewFileName}
          onSelectWord={selectWord}
          onMoveCursor={moveCursor}
          onDictate={dictate}
          dictating={dictating}
          onSubmit={() => void saveDataLine()}
          onSubmitAsNew={() => void saveDataLineAsNew()}
          onCreateFile={createDataFile}
          isBusy={dataBusy}
          deletePending={dataDeletePending}
          {...editorPreferences}
        />
      )}

      {activeTab === "CRON" && (
        <CronWorkspace
          controller={cron}
          onDictate={dictate}
          dictating={dictating}
          {...editorPreferences}
        />
      )}
      </>}
      </div>
    </main>
  );
}
