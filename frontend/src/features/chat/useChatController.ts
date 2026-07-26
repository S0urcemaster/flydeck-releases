import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  chatApi,
  formatChatSnapshot,
  type ChatEffort,
  type ChatModelTier,
  type ChatSnapshot,
} from "../../api/chat";
import {
  defaultAgentHistory,
  defaultPromptSlots,
  promptSlotMarks,
  type Snippet,
} from "../../data/defaults";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import type { ChatSubTab } from "./ChatWorkspace";

const promptStorageKey = "flydeck.promptEditorSlots";
const historyStorageKey = "flydeck.agentHistory";
const activeConversationStorageKey = "flydeck.activeConversationId";

function validatePromptSlots(value: unknown) {
  if (!Array.isArray(value)) return null;
  return promptSlotMarks.map((_, index) => typeof value[index] === "string" ? value[index] : "");
}

export function useChatController(active: boolean) {
  const [subTab, setSubTab] = useState<ChatSubTab>("PROM");
  const [activePromptSlot, setActivePromptSlot] = useState(0);
  const [promptSlots, setPromptSlots] = useLocalStorage(promptStorageKey, defaultPromptSlots, validatePromptSlots);
  const [showAgentView, setShowAgentView] = useState(false);
  const [activeConversationId, setActiveConversationId] = useLocalStorage(
    activeConversationStorageKey,
    "default",
    (value) => typeof value === "string" && value.length > 0 ? value : null,
  );
  const [agentHistory, setAgentHistory] = useLocalStorage(historyStorageKey, defaultAgentHistory, (value) =>
    typeof value === "string" ? value : null);
  const [run, setRun] = useState<ChatSnapshot["activeRun"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [effort, setEffort] = useState<ChatEffort>("FAST");
  const [modelTier, setModelTier] = useState<ChatModelTier>("ECON");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const scrollTopRef = useRef(0);
  const lastOutputRef = useRef("");
  const scrollToEndRef = useRef(false);

  const promptText = promptSlots[activePromptSlot];
  const activeText = showAgentView && subTab === "PROM" ? agentHistory : promptText;
  const busy = run?.status === "queued" || run?.status === "running";

  useLayoutEffect(() => {
    if (!active || subTab !== "PROM" || !showAgentView) return;
    const frame = requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.scrollTop = scrollTopRef.current;
    });
    return () => cancelAnimationFrame(frame);
  }, [active, subTab, showAgentView]);

  useLayoutEffect(() => {
    if (!active || subTab !== "PROM" || !showAgentView || !scrollToEndRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (!editorRef.current) return;
      editorRef.current.scrollTop = editorRef.current.scrollHeight;
      scrollTopRef.current = editorRef.current.scrollTop;
      scrollToEndRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [active, agentHistory, subTab, showAgentView]);

  const applySnapshot = useCallback((snapshot: ChatSnapshot) => {
    const output = snapshot.activeRun?.output ?? "";
    if (output && output !== lastOutputRef.current) scrollToEndRef.current = true;
    lastOutputRef.current = output;
    setRun(snapshot.activeRun);
    setAgentHistory(formatChatSnapshot(snapshot));
    setError(snapshot.activeRun?.error ?? null);
  }, [setAgentHistory]);

  useEffect(() => {
    let cancelled = false;
    void chatApi.read(activeConversationId)
      .then((snapshot) => { if (!cancelled) applySnapshot(snapshot); })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Chat could not be loaded");
      });
    const events = new EventSource(chatApi.eventsUrl(activeConversationId));
    events.addEventListener("snapshot", (event) => {
      if (!cancelled) applySnapshot(JSON.parse((event as MessageEvent<string>).data) as ChatSnapshot);
    });
    events.onerror = () => {
      if (!cancelled) setError((current) => current ?? "Live connection interrupted; reconnecting …");
    };
    return () => {
      cancelled = true;
      events.close();
    };
  }, [activeConversationId, applySnapshot]);

  function updatePrompt(nextText: string | ((current: string) => string)) {
    setPromptSlots((currentSlots) => currentSlots.map((slotText, index) => {
      if (index !== activePromptSlot) return slotText;
      return typeof nextText === "function" ? nextText(slotText) : nextText;
    }));
  }

  function updateText(text: string) {
    if (showAgentView) setAgentHistory(text);
    else updatePrompt(text);
  }

  function appendSnippet(snippet: Snippet) {
    setShowAgentView(false);
    updatePrompt((current) => `${current}${snippet.text}\n`);
  }

  async function send() {
    const prompt = promptText.trim();
    if (!prompt || busy) return;
    setShowAgentView(true);
    setError(null);
    try {
      const startedRun = await chatApi.start(activeConversationId, prompt, crypto.randomUUID(), effort, modelTier);
      setRun(startedRun);
      applySnapshot(await chatApi.read(activeConversationId));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Chat request failed");
    }
  }

  async function cancel() {
    if (!run || !busy) return;
    try {
      await chatApi.cancel(activeConversationId, run.id);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Chat could not be stopped");
    }
  }

  function startNewChat() {
    if (busy) return;
    setActiveConversationId(crypto.randomUUID());
    setRun(null);
    setError(null);
    setAgentHistory("");
    updatePrompt("");
    scrollTopRef.current = 0;
    lastOutputRef.current = "";
    scrollToEndRef.current = false;
    setShowAgentView(true);
  }

  return {
    subTab,
    setSubTab,
    activePromptSlot,
    selectPromptSlot: (index: number) => {
      setActivePromptSlot(index);
      setShowAgentView(false);
    },
    activeText,
    showAgentView,
    toggleAgentView: () => setShowAgentView((current) => !current),
    run,
    error,
    effort,
    cycleEffort: () => setEffort((current) => current === "FAST" ? "MEDI" : current === "MEDI" ? "DEEP" : "FAST"),
    modelTier,
    cycleModelTier: () => setModelTier((current) => current === "ECON" ? "MEDI" : current === "MEDI" ? "HIGH" : "ECON"),
    editorRef,
    busy,
    canSend: !showAgentView && !busy && promptText.trim().length > 0,
    updateText,
    setAgentHistory,
    appendSnippet,
    send,
    cancel,
    startNewChat,
    setScrollTop: (scrollTop: number) => { scrollTopRef.current = scrollTop; },
  };
}
