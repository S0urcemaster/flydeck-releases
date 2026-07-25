import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AppConfig } from "../config.js";

export type ChatRole = "user" | "assistant";
export type ChatRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";

export type ChatMessage = { id: string; role: ChatRole; text: string; createdAt: string };
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

export class ChatStore {
  private database: DatabaseSync | null = null;

  constructor(private readonly config: AppConfig) {}

  async initialize() {
    await mkdir(this.config.flydonDir, { recursive: true });
    this.database = new DatabaseSync(path.join(this.config.flydonDir, "chat.sqlite"));
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        codex_thread_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        request_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        prompt TEXT NOT NULL,
        output TEXT NOT NULL DEFAULT '',
        error TEXT,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        cached_input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        reasoning_output_tokens INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS run_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        event TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    this.ensureRunUsageColumns();
    this.db.prepare("UPDATE runs SET status = 'interrupted', error = ?, updated_at = ? WHERE status IN ('queued', 'running')")
      .run("Backend restarted while the agent was running", new Date().toISOString());
    this.ensureConversation("default");
  }

  getSnapshot(conversationId = "default"): ChatSnapshot {
    this.ensureConversation(conversationId);
    const conversation = this.db.prepare("SELECT codex_thread_id FROM conversations WHERE id = ?").get(conversationId) as { codex_thread_id: string | null };
    const messages = this.db.prepare("SELECT id, role, text, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid")
      .all(conversationId) as Array<{ id: string; role: ChatRole; text: string; created_at: string }>;
    const run = this.db.prepare("SELECT * FROM runs WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1").get(conversationId) as RunRow | undefined;
    return {
      id: conversationId,
      codexThreadId: conversation.codex_thread_id,
      messages: messages.map((message) => ({ id: message.id, role: message.role, text: message.text, createdAt: message.created_at })),
      activeRun: run ? mapRun(run) : null,
    };
  }

  createRun(conversationId: string, prompt: string, requestId: string): { run: ChatRun; created: boolean } {
    this.ensureConversation(conversationId);
    const existing = this.db.prepare("SELECT * FROM runs WHERE request_id = ?").get(requestId) as RunRow | undefined;
    if (existing) return { run: mapRun(existing), created: false };
    const active = this.db.prepare("SELECT id FROM runs WHERE conversation_id = ? AND status IN ('queued', 'running')").get(conversationId);
    if (active) throw new Error("An agent run is already active for this chat");
    const now = new Date().toISOString();
    const runId = randomUUID();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO messages (id, conversation_id, role, text, created_at) VALUES (?, ?, 'user', ?, ?)")
        .run(randomUUID(), conversationId, prompt, now);
      this.db.prepare("INSERT INTO runs (id, conversation_id, request_id, status, prompt, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?, ?)")
        .run(runId, conversationId, requestId, prompt, now, now);
      this.db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, conversationId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { run: this.getRun(runId), created: true };
  }

  getRun(id: string): ChatRun {
    const row = this.db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow | undefined;
    if (!row) throw new Error("Chat run was not found");
    return mapRun(row);
  }

  setRunStatus(id: string, status: ChatRunStatus, error: string | null = null) {
    this.db.prepare("UPDATE runs SET status = ?, error = ?, updated_at = ? WHERE id = ?")
      .run(status, error, new Date().toISOString(), id);
  }

  cancelRun(id: string) {
    this.db.prepare("UPDATE runs SET status = 'cancelled', error = NULL, updated_at = ? WHERE id = ? AND status IN ('queued', 'running')")
      .run(new Date().toISOString(), id);
    return this.getRun(id);
  }

  setRunOutput(id: string, output: string) {
    this.db.prepare("UPDATE runs SET output = ?, updated_at = ? WHERE id = ?").run(output, new Date().toISOString(), id);
  }

  setRunUsage(id: string, usage: { input_tokens: number; cached_input_tokens: number; output_tokens: number; reasoning_output_tokens: number }) {
    this.db.prepare(`UPDATE runs SET input_tokens = ?, cached_input_tokens = ?, output_tokens = ?, reasoning_output_tokens = ?, updated_at = ? WHERE id = ?`)
      .run(usage.input_tokens, usage.cached_input_tokens, usage.output_tokens, usage.reasoning_output_tokens, new Date().toISOString(), id);
  }

  getCommandStatus(conversationId: string) {
    this.ensureConversation(conversationId);
    const active = this.db.prepare("SELECT status FROM runs WHERE conversation_id = ? AND status IN ('queued', 'running') ORDER BY created_at DESC LIMIT 1")
      .get(conversationId) as { status: ChatRunStatus } | undefined;
    const last = this.db.prepare("SELECT status FROM runs WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(conversationId) as { status: ChatRunStatus } | undefined;
    const usage = this.db.prepare("SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens FROM runs WHERE conversation_id = ?")
      .get(conversationId) as { tokens: number };
    return {
      codex: active?.status.toUpperCase() ?? "IDLE",
      last: last?.status.toUpperCase() ?? "NONE",
      tokens: usage.tokens,
    };
  }

  completeCommand(conversationId: string, requestId: string, prompt: string, output: string): ChatRun {
    this.ensureConversation(conversationId);
    const existing = this.db.prepare("SELECT * FROM runs WHERE request_id = ?").get(requestId) as RunRow | undefined;
    if (existing) return mapRun(existing);
    const now = new Date().toISOString();
    const runId = randomUUID();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO messages (id, conversation_id, role, text, created_at) VALUES (?, ?, 'user', ?, ?)")
        .run(randomUUID(), conversationId, prompt, now);
      this.db.prepare("INSERT INTO runs (id, conversation_id, request_id, status, prompt, output, created_at, updated_at) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?)")
        .run(runId, conversationId, requestId, prompt, output, now, now);
      this.db.prepare("INSERT INTO messages (id, conversation_id, role, text, created_at) VALUES (?, ?, 'assistant', ?, ?)")
        .run(randomUUID(), conversationId, output, now);
      this.db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, conversationId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getRun(runId);
  }

  completeRun(conversationId: string, id: string, output: string) {
    const now = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE runs SET status = 'completed', output = ?, error = NULL, updated_at = ? WHERE id = ?").run(output, now, id);
      this.db.prepare("INSERT INTO messages (id, conversation_id, role, text, created_at) VALUES (?, ?, 'assistant', ?, ?)")
        .run(randomUUID(), conversationId, output, now);
      this.db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, conversationId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  setThreadId(conversationId: string, threadId: string) {
    this.db.prepare("UPDATE conversations SET codex_thread_id = ?, updated_at = ? WHERE id = ?")
      .run(threadId, new Date().toISOString(), conversationId);
  }

  addEvent(runId: string, event: unknown) {
    this.db.prepare("INSERT INTO run_events (run_id, event, created_at) VALUES (?, ?, ?)")
      .run(runId, JSON.stringify(event), new Date().toISOString());
  }

  private ensureConversation(id: string) {
    const now = new Date().toISOString();
    this.db.prepare("INSERT OR IGNORE INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)").run(id, now, now);
  }

  private ensureRunUsageColumns() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(runs)").all() as Array<{ name: string }>).map((column) => column.name));
    const additions = [
      ["input_tokens", "INTEGER NOT NULL DEFAULT 0"],
      ["cached_input_tokens", "INTEGER NOT NULL DEFAULT 0"],
      ["output_tokens", "INTEGER NOT NULL DEFAULT 0"],
      ["reasoning_output_tokens", "INTEGER NOT NULL DEFAULT 0"],
    ] as const;
    for (const [name, definition] of additions) {
      if (!columns.has(name)) this.db.exec(`ALTER TABLE runs ADD COLUMN ${name} ${definition}`);
    }
  }

  private get db() {
    if (!this.database) throw new Error("Chat store is not initialized");
    return this.database;
  }
}

type RunRow = {
  id: string; status: ChatRunStatus; prompt: string; output: string; error: string | null; created_at: string; updated_at: string;
};

function mapRun(row: RunRow): ChatRun {
  return { id: row.id, status: row.status, prompt: row.prompt, output: row.output, error: row.error, createdAt: row.created_at, updatedAt: row.updated_at };
}
