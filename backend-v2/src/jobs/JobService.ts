import { randomUUID } from "node:crypto";
import { Codex, type ThreadEvent } from "@openai/codex-sdk";
import type { JobSnapshotDto, JobTrigger } from "@flydeck/shared/v2";
import { JobStore, type JobExecution } from "./JobStore.js";

type Subscriber = (snapshot: JobSnapshotDto) => void;

export class JobService {
  private readonly controllers = new Map<string, AbortController>();
  private readonly subscribers = new Map<string, Set<Subscriber>>();

  constructor(readonly store: JobStore) {}

  async start(
    workspaceId: string,
    jobId: string,
    requestId: string,
    trigger: JobTrigger = "manual",
    timeZone = "UTC",
  ) {
    const { execution, created } = await this.store.createRun(
      workspaceId, jobId, requestId, trigger, timeZone,
    );
    await this.emit(workspaceId, jobId);
    if (created) queueMicrotask(() => void this.execute(workspaceId, jobId, execution));
    return execution.run;
  }

  async cancel(workspaceId: string, jobId: string, runId: string) {
    this.controllers.get(runId)?.abort();
    await this.store.cancelRun(workspaceId, jobId, runId);
    await this.emit(workspaceId, jobId);
  }

  async subscribe(workspaceId: string, jobId: string, subscriber: Subscriber) {
    const key = subscriptionKey(workspaceId, jobId);
    const subscribers = this.subscribers.get(key) ?? new Set<Subscriber>();
    subscribers.add(subscriber);
    this.subscribers.set(key, subscribers);
    subscriber(await this.store.getSnapshot(workspaceId, jobId));
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) this.subscribers.delete(key);
    };
  }

  async runDueJobs(limit = 20) {
    const jobIds = await this.store.claimDueJobs(limit);
    for (const jobId of jobIds) {
      try {
        const workspaceId = await this.store.workspaceIdForJob(jobId);
        await this.start(workspaceId, jobId, randomUUID(), "scheduled");
      } catch (error) {
        console.error(`Scheduled job ${jobId} could not be started`, error);
      }
    }
    return jobIds.length;
  }

  private async execute(workspaceId: string, jobId: string, execution: JobExecution) {
    if (execution.run.status !== "queued") return;
    const controller = new AbortController();
    this.controllers.set(execution.run.id, controller);
    if (!await this.store.setRunning(execution.run.id)) {
      this.controllers.delete(execution.run.id);
      return;
    }
    await this.emit(workspaceId, jobId);
    let output = "";
    try {
      const codex = new Codex(execution.memory ? {
        config: { developer_instructions: execution.memory },
      } : undefined);
      const thread = codex.startThread({
        workingDirectory: execution.workingDirectory,
        sandboxMode: "workspace-write",
        approvalPolicy: "never",
        skipGitRepoCheck: true,
        model: execution.modelTier === "ECON" ? "gpt-5.6-luna"
          : execution.modelTier === "MEDI" ? "gpt-5.6-terra" : "gpt-5.6-sol",
        modelReasoningEffort: execution.effort === "FAST" ? "low"
          : execution.effort === "MEDI" ? "medium" : "high",
      });
      const streamed = await thread.runStreamed(execution.userInput, {
        signal: controller.signal,
      });
      for await (const event of streamed.events) {
        const nextOutput = getAgentOutput(event);
        if (nextOutput !== null) {
          output = nextOutput;
          if (!await this.store.setOutput(execution.run.id, output)) break;
        }
        if (event.type === "turn.failed") throw new Error(event.error.message);
        if (event.type === "error") throw new Error(event.message);
        await this.emit(workspaceId, jobId);
      }
      if (!output.trim()) throw new Error("Flydon completed without a final response");
      await this.store.finishRun(execution.run.id, "completed", output, null);
    } catch (error) {
      const cancelled = controller.signal.aborted;
      await this.store.finishRun(
        execution.run.id,
        cancelled ? "cancelled" : "failed",
        output,
        cancelled ? null : normalizeError(error),
      );
    } finally {
      this.controllers.delete(execution.run.id);
      await this.emit(workspaceId, jobId);
    }
  }

  private async emit(workspaceId: string, jobId: string) {
    const subscribers = this.subscribers.get(subscriptionKey(workspaceId, jobId));
    if (!subscribers?.size) return;
    const snapshot = await this.store.getSnapshot(workspaceId, jobId);
    for (const subscriber of subscribers) subscriber(snapshot);
  }
}

function subscriptionKey(workspaceId: string, jobId: string) {
  return `${workspaceId}:${jobId}`;
}

function getAgentOutput(event: ThreadEvent) {
  if ((event.type === "item.updated" || event.type === "item.completed")
    && event.item.type === "agent_message") return event.item.text;
  return null;
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Flydon job failed";
}
