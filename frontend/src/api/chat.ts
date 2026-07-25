import { requestJson } from "./request";

export type ChatRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";
export type ChatEffort = "FAST" | "MEDI" | "DEEP";
export type ChatModelTier = "ECON" | "MEDI" | "HIGH";
export type ChatMessage = { id: string; role: "user" | "assistant"; text: string; createdAt: string };
export type ChatRun = {
  id: string;
  status: ChatRunStatus;
  prompt: string;
  output: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};
export type ChatSnapshot = {
  id: string;
  codexThreadId: string | null;
  messages: ChatMessage[];
  activeRun: ChatRun | null;
};

const conversationId = "default";
const chatApiPath = `/flydeck/api/chat/${conversationId}`;

export const chatApi = {
  read: () => requestJson<ChatSnapshot>(chatApiPath),
  start: (prompt: string, requestId: string, effort: ChatEffort, modelTier: ChatModelTier) => requestJson<ChatRun>(`${chatApiPath}/runs`, {
    method: "POST",
    body: JSON.stringify({ prompt, requestId, effort, modelTier }),
  }),
  cancel: (runId: string) => requestJson<{ id: string; status: "cancelled" }>(`${chatApiPath}/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" }),
  eventsUrl: `${chatApiPath}/events`,
};

export function formatChatSnapshot(snapshot: ChatSnapshot) {
  const blocks = snapshot.messages.map((message) => {
    const time = new Date(message.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return `${message.role === "user" ? "You" : "Flydon"} ${time}\n${message.text}`;
  });
  const run = snapshot.activeRun;
  if (run && (run.status === "queued" || run.status === "running")) {
    blocks.push(`Flydon\n${run.output || (run.status === "queued" ? "Queued …" : "Working …")}`);
  } else if (run?.status === "failed") {
    blocks.push(`Flydon\nRequest failed: ${run.error || "Codex run failed"}`);
  }
  return blocks.join("\n\n");
}
