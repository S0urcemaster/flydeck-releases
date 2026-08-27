import { randomUUID } from "node:crypto";
import type { Database } from "../db/database.js";
import { HttpError } from "../http/HttpError.js";

export type ChatRunStatus = "queued" | "running" | "completed" | "failed"
  | "cancelled" | "interrupted";
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

type RunRow = {
  id: string;
  status: ChatRunStatus;
  prompt: string;
  output: string;
  error: string | null;
  created_at: Date;
  updated_at: Date;
};

export class ChatStore {
  constructor(private readonly database: Database) {}

  async markInterrupted() {
    await this.database.query(`
      UPDATE agent_chat_runs
      SET status = 'interrupted',
          error = 'Backend restarted while the agent was running',
          updated_at = now()
      WHERE status IN ('queued', 'running')
    `);
  }

  async getWorkspaceRoot(workspaceId: string) {
    const result = await this.database.query<{ filesystem_root: string }>(`
      SELECT filesystem_root FROM workspaces WHERE id = $1
    `, [workspaceId]);
    if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Workspace was not found");
    return result.rows[0].filesystem_root;
  }

  async getSnapshot(workspaceId: string, conversationId: string): Promise<ChatSnapshot> {
    await this.ensureConversation(workspaceId, conversationId);
    const [conversation, messages, runs] = await Promise.all([
      this.database.query<{ codex_thread_id: string | null }>(`
        SELECT codex_thread_id FROM agent_chat_conversations
        WHERE id = $1 AND workspace_id = $2
      `, [conversationId, workspaceId]),
      this.database.query<{
        id: string; role: "user" | "assistant"; text: string; created_at: Date;
      }>(`
        SELECT id, role, text, created_at FROM agent_chat_messages
        WHERE conversation_id = $1 ORDER BY created_at, id
      `, [conversationId]),
      this.database.query<RunRow>(`
        SELECT id, status, prompt, output, error, created_at, updated_at
        FROM agent_chat_runs WHERE conversation_id = $1
        ORDER BY created_at DESC, id DESC LIMIT 1
      `, [conversationId]),
    ]);
    return {
      id: conversationId,
      codexThreadId: conversation.rows[0]?.codex_thread_id ?? null,
      messages: messages.rows.map((message) => ({
        id: message.id,
        role: message.role,
        text: message.text,
        createdAt: message.created_at.toISOString(),
      })),
      activeRun: runs.rows[0] ? mapRun(runs.rows[0]) : null,
    };
  }

  async createRun(
    workspaceId: string,
    conversationId: string,
    prompt: string,
    requestId: string,
  ) {
    await this.ensureConversation(workspaceId, conversationId);
    const existing = await this.database.query<RunRow>(`
      SELECT id, status, prompt, output, error, created_at, updated_at
      FROM agent_chat_runs WHERE request_id = $1
    `, [requestId]);
    if (existing.rows[0]) return { run: mapRun(existing.rows[0]), created: false };
    const active = await this.database.query(`
      SELECT id FROM agent_chat_runs
      WHERE conversation_id = $1 AND status IN ('queued', 'running')
    `, [conversationId]);
    if (active.rows[0]) {
      throw new HttpError(
        409,
        "REVISION_CONFLICT",
        "An agent run is already active for this chat",
      );
    }
    const runId = randomUUID();
    await this.database.transaction(async (client) => {
      await client.query(`
        INSERT INTO agent_chat_messages (id, conversation_id, role, text)
        VALUES ($1, $2, 'user', $3)
      `, [randomUUID(), conversationId, prompt]);
      await client.query(`
        INSERT INTO agent_chat_runs (
          id, conversation_id, request_id, status, prompt
        ) VALUES ($1, $2, $3, 'queued', $4)
      `, [runId, conversationId, requestId, prompt]);
      await client.query(`
        UPDATE agent_chat_conversations SET updated_at = now() WHERE id = $1
      `, [conversationId]);
    });
    return { run: await this.getRun(runId), created: true };
  }

  async getRun(runId: string) {
    const result = await this.database.query<RunRow>(`
      SELECT id, status, prompt, output, error, created_at, updated_at
      FROM agent_chat_runs WHERE id = $1
    `, [runId]);
    if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Chat run was not found");
    return mapRun(result.rows[0]);
  }

  async setRunStatus(runId: string, status: ChatRunStatus, error: string | null = null) {
    await this.database.query(`
      UPDATE agent_chat_runs SET status = $2, error = $3, updated_at = now()
      WHERE id = $1
    `, [runId, status, error]);
  }

  async setRunOutput(runId: string, output: string) {
    await this.database.query(`
      UPDATE agent_chat_runs SET output = $2, updated_at = now() WHERE id = $1
    `, [runId, output]);
  }

  async setThreadId(conversationId: string, threadId: string) {
    await this.database.query(`
      UPDATE agent_chat_conversations
      SET codex_thread_id = $2, updated_at = now() WHERE id = $1
    `, [conversationId, threadId]);
  }

  async completeRun(conversationId: string, runId: string, output: string) {
    await this.database.transaction(async (client) => {
      await client.query(`
        UPDATE agent_chat_runs
        SET status = 'completed', output = $2, error = NULL, updated_at = now()
        WHERE id = $1
      `, [runId, output]);
      await client.query(`
        INSERT INTO agent_chat_messages (id, conversation_id, role, text)
        VALUES ($1, $2, 'assistant', $3)
      `, [randomUUID(), conversationId, output]);
      await client.query(`
        UPDATE agent_chat_conversations SET updated_at = now() WHERE id = $1
      `, [conversationId]);
    });
  }

  async cancelRun(conversationId: string, runId: string) {
    await this.database.query(`
      UPDATE agent_chat_runs SET status = 'cancelled', error = NULL, updated_at = now()
      WHERE id = $1 AND conversation_id = $2 AND status IN ('queued', 'running')
    `, [runId, conversationId]);
  }

  private async ensureConversation(workspaceId: string, conversationId: string) {
    const inserted = await this.database.query(`
      INSERT INTO agent_chat_conversations (id, workspace_id)
      SELECT tree_nodes.id, trees.workspace_id
      FROM tree_nodes JOIN trees ON trees.id = tree_nodes.tree_id
      WHERE tree_nodes.id = $1 AND trees.workspace_id = $2
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `, [conversationId, workspaceId]);
    if (!inserted.rows[0]) {
      const existing = await this.database.query(`
        SELECT id FROM agent_chat_conversations WHERE id = $1 AND workspace_id = $2
      `, [conversationId, workspaceId]);
      if (!existing.rows[0]) throw new HttpError(404, "NOT_FOUND", "Chat was not found");
    }
  }
}

function mapRun(row: RunRow): ChatRun {
  return {
    id: row.id,
    status: row.status,
    prompt: row.prompt,
    output: row.output,
    error: row.error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
