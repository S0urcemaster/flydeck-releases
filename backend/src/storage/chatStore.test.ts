import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../config.js";
import { ChatStore } from "./chatStore.js";

describe("ChatStore", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  async function createStore() {
    const root = await mkdtemp(path.join(os.tmpdir(), "flydeck-chat-test-"));
    roots.push(root);
    const config: AppConfig = {
      port: 5000,
      basePath: "/flydeck",
      workspaceRoot: root,
      dataHome: path.join(root, "flydesk-data"),
      tailscaleUrl: "https://flydon.example.test",
      flydonDir: path.join(root, ".flydon"),
      trashDir: path.join(root, ".flydon", "trash"),
      schedulerIntervalMs: 30_000,
      auth: { mode: "off", secureCookie: true },
    };
    const store = new ChatStore(config);
    await store.initialize();
    return { store, config };
  }

  it("persists a user turn, output and resumable thread id", async () => {
    const { store } = await createStore();
    const created = store.createRun("default", "Inspect the project", "ba7e17f7-7799-4d26-b3ac-5e75f98ce334");
    expect(created.created).toBe(true);
    expect(store.createRun("default", "Inspect the project", "ba7e17f7-7799-4d26-b3ac-5e75f98ce334").created).toBe(false);
    store.setThreadId("default", "thread-123");
    store.setRunStatus(created.run.id, "running");
    store.setRunUsage(created.run.id, { input_tokens: 100, cached_input_tokens: 60, output_tokens: 25, reasoning_output_tokens: 10 });
    store.completeRun("default", created.run.id, "Done");

    expect(store.getSnapshot()).toMatchObject({
      codexThreadId: "thread-123",
      messages: [{ role: "user", text: "Inspect the project" }, { role: "assistant", text: "Done" }],
      activeRun: { status: "completed", output: "Done" },
    });
    expect(store.getCommandStatus("default")).toMatchObject({ codex: "IDLE", last: "COMPLETED", tokens: 125 });
  });

  it("marks unfinished work as interrupted after restart", async () => {
    const { store, config } = await createStore();
    const { run } = store.createRun("default", "Long task", "f14ef527-6d5a-47d8-981b-d995d8fdcbad");
    store.setRunStatus(run.id, "running");
    const restartedStore = new ChatStore(config);
    await restartedStore.initialize();
    expect(restartedStore.getRun(run.id)).toMatchObject({ status: "interrupted", error: "Backend restarted while the agent was running" });
  });
});
