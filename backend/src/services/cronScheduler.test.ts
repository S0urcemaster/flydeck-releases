import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../config.js";
import { CronStore } from "../storage/cronStore.js";
import { CronScheduler } from "./cronScheduler.js";

describe("cron scheduler", () => {
  let root: string;
  let store: CronStore;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "flydeck-cron-"));
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
    store = new CronStore(config);
    await store.initialize();
  });

  afterEach(async () => rm(root, { recursive: true, force: true }));

  it("arms an exact timeout for a timer due before the next scan", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    try {
      const now = new Date("2026-07-20T10:00:00.000Z");
      vi.setSystemTime(now);
      await store.create({ title: "Exact", dueAt: "2026-07-20T10:00:12.000Z" }, now);
      let markSent!: () => void;
      const sent = new Promise<void>((resolve) => { markSent = resolve; });
      const sendTimer = vi.fn(async () => { markSent(); });
      const scheduler = new CronScheduler(store, { sendTimer }, 30_000);

      await scheduler.tick(now);
      await vi.advanceTimersByTimeAsync(11_999);
      expect(sendTimer).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await sent;
      expect(sendTimer).toHaveBeenCalledWith("Exact");
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if ((await store.list())[0].status === "expired") break;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      expect((await store.list())[0].status).toBe("expired");
      scheduler.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("notifies and expires due timers", async () => {
    const createdAt = new Date("2026-07-20T10:00:00.000Z");
    const timer = await store.create({ title: "Backup", dueAt: "2026-07-20T11:00:00.000Z" }, createdAt);
    const sendTimer = vi.fn(async () => undefined);
    const scheduler = new CronScheduler(store, { sendTimer }, 30_000);
    await scheduler.tick(new Date("2026-07-20T12:00:00.000Z"));
    expect(sendTimer).toHaveBeenCalledWith("Backup");
    expect((await store.list()).find((current) => current.id === timer.id)?.status).toBe("expired");
  });

  it("keeps a timer active when notification fails", async () => {
    await store.create({ title: "Backup", dueAt: "2026-07-20T11:00:00.000Z" }, new Date("2026-07-20T10:00:00.000Z"));
    const scheduler = new CronScheduler(store, { sendTimer: async () => { throw new Error("offline"); } }, 30_000);
    await scheduler.tick(new Date("2026-07-20T12:00:00.000Z"));
    expect((await store.list())[0].status).toBe("active");
  });
});
