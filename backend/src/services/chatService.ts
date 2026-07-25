import { Codex, type ThreadEvent } from "@openai/codex-sdk";
import os from "node:os";
import type { AppConfig } from "../config.js";
import { ChatStore, type ChatRun, type ChatSnapshot } from "../storage/chatStore.js";
import { executeSlashCommand } from "./chatCommands.js";

type Subscriber = (snapshot: ChatSnapshot) => void;
type ChatEffort = "FAST" | "MEDI" | "DEEP";
type ChatModelTier = "ECON" | "MEDI" | "HIGH";

export class ChatService {
  private readonly codex = new Codex();
  private readonly subscribers = new Map<string, Set<Subscriber>>();
  private readonly controllers = new Map<string, AbortController>();

  constructor(private readonly config: AppConfig, readonly store = new ChatStore(config)) {}

  async initialize() {
    await this.store.initialize();
  }

  start(conversationId: string, prompt: string, requestId: string, effort: ChatEffort = "FAST", modelTier: ChatModelTier = "ECON") {
    const commandOutput = executeSlashCommand(prompt, {
      conversationId,
      store: this.store,
      effort,
      modelTier,
      serverName: os.hostname().split(".")[0].toLowerCase(),
      workspace: this.config.workspaceRoot,
      tailscaleUrl: this.config.tailscaleUrl,
      uptimeSeconds: process.uptime(),
      memoryBytes: process.memoryUsage().rss,
    });
    if (commandOutput !== null) {
      const run = this.store.completeCommand(conversationId, requestId, prompt, commandOutput);
      this.emit(conversationId);
      return run;
    }
    const { run, created } = this.store.createRun(conversationId, prompt, requestId);
    this.emit(conversationId);
    if (created) queueMicrotask(() => void this.execute(conversationId, run, effort, modelTier));
    return run;
  }

  cancel(conversationId: string, runId: string) {
    this.controllers.get(runId)?.abort();
    this.store.cancelRun(runId);
    this.emit(conversationId);
  }

  subscribe(conversationId: string, subscriber: Subscriber) {
    const subscribers = this.subscribers.get(conversationId) ?? new Set<Subscriber>();
    subscribers.add(subscriber);
    this.subscribers.set(conversationId, subscribers);
    subscriber(this.store.getSnapshot(conversationId));
    return () => subscribers.delete(subscriber);
  }

  private async execute(conversationId: string, run: ChatRun, effort: ChatEffort, modelTier: ChatModelTier) {
    if (this.store.getRun(run.id).status !== "queued") return;
    const controller = new AbortController();
    this.controllers.set(run.id, controller);
    this.store.setRunStatus(run.id, "running");
    this.emit(conversationId);
    try {
      const snapshot = this.store.getSnapshot(conversationId);
      const options = {
        workingDirectory: this.config.workspaceRoot,
        sandboxMode: "workspace-write" as const,
        approvalPolicy: "never" as const,
        skipGitRepoCheck: true,
        model: modelTier === "ECON" ? "gpt-5.6-luna" : modelTier === "MEDI" ? "gpt-5.6-terra" : "gpt-5.6-sol",
        modelReasoningEffort: effort === "FAST" ? "low" as const : effort === "MEDI" ? "medium" as const : "high" as const,
      };
      const thread = snapshot.codexThreadId
        ? this.codex.resumeThread(snapshot.codexThreadId, options)
        : this.codex.startThread(options);
      const streamed = await thread.runStreamed(run.prompt, { signal: controller.signal });
      let output = "";
      for await (const event of streamed.events) {
        this.store.addEvent(run.id, event);
        if (event.type === "thread.started") this.store.setThreadId(conversationId, event.thread_id);
        const nextOutput = getAgentOutput(event);
        if (nextOutput !== null) {
          output = nextOutput;
          this.store.setRunOutput(run.id, output);
        }
        if (event.type === "turn.failed") throw new Error(event.error.message);
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "turn.completed") this.store.setRunUsage(run.id, event.usage);
        this.emit(conversationId);
      }
      if (!output.trim()) throw new Error("Codex completed without a final response");
      this.store.completeRun(conversationId, run.id, output);
    } catch (error) {
      const cancelled = controller.signal.aborted;
      this.store.setRunStatus(run.id, cancelled ? "cancelled" : "failed", cancelled ? null : normalizeError(error));
    } finally {
      this.controllers.delete(run.id);
      this.emit(conversationId);
    }
  }

  private emit(conversationId: string) {
    const snapshot = this.store.getSnapshot(conversationId);
    for (const subscriber of this.subscribers.get(conversationId) ?? []) subscriber(snapshot);
  }
}

function getAgentOutput(event: ThreadEvent) {
  if ((event.type === "item.updated" || event.type === "item.completed") && event.item.type === "agent_message") return event.item.text;
  return null;
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Codex run failed";
}
