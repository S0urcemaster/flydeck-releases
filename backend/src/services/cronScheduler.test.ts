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
