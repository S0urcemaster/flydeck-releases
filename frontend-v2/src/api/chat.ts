export type ChatRunStatus = "queued" | "running" | "completed" | "failed"
  | "cancelled" | "interrupted";
export type ChatEffort = "FAST" | "MEDI" | "DEEP";
export type ChatModelTier = "ECON" | "MEDI" | "HIGH";
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};
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

export const chatApi = {
  read: (workspaceId: string, conversationId: string) => request<ChatSnapshot>(
    chatPath(workspaceId, conversationId),
  ),
  start: (
    workspaceId: string,
    conversationId: string,
    prompt: string,
    requestId: string,
    effort: ChatEffort,
    modelTier: ChatModelTier,
    contextConversationIds: readonly string[],
  ) => request<ChatRun>(`${chatPath(workspaceId, conversationId)}/runs`, {
    method: "POST",
    body: JSON.stringify({
      prompt, requestId, effort, modelTier, contextConversationIds,
    }),
  }),
  cancel: (workspaceId: string, conversationId: string, runId: string) => (
    request<{ id: string; status: "cancelled" }>(
      `${chatPath(workspaceId, conversationId)}/runs/${encodeURIComponent(runId)}/cancel`,
      { method: "POST" },
    )
  ),
  eventsUrl: (workspaceId: string, conversationId: string) => (
    `${chatPath(workspaceId, conversationId)}/events`
  ),
};

function chatPath(workspaceId: string, conversationId: string) {
  return `/flydeck/api/v2/workspaces/${encodeURIComponent(workspaceId)}`
    + `/chat/${encodeURIComponent(conversationId)}`;
}

async function request<TResult>(path: string, init?: RequestInit): Promise<TResult> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: init?.body === undefined
      ? init?.headers
      : { "Content-Type": "application/json", ...init.headers },
  });
  const value = await response.json() as TResult & { message?: string };
  if (!response.ok) throw new Error(value.message ?? `Chat request failed (${response.status})`);
  return value;
}
