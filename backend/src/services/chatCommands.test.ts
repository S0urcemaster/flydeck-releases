import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../config.js";
import { ChatStore } from "../storage/chatStore.js";
import { executeSlashCommand } from "./chatCommands.js";

describe("chat commands", () => {
  let root: string | null = null;

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
    root = null;
  });

  it("handles status locally and never treats unknown slash commands as prompts", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "flydeck-command-test-"));
    const config: AppConfig = {
      port: 5000,
      basePath: "/flydeck",
      workspaceRoot: root,
      dataHome: path.join(root, "flydesk-data"),
      tailscaleUrl: "https://cachyos.example.test",
      flydonDir: path.join(root, ".flydon"),
      trashDir: path.join(root, ".flydon", "trash"),
      schedulerIntervalMs: 30_000,
      auth: { mode: "off", secureCookie: true },
    };
    const store = new ChatStore(config);
    await store.initialize();

    const context = {
      conversationId: "default",
      store,
      effort: "FAST" as const,
      modelTier: "ECON" as const,
      serverName: "cachyos",
      workspace: root,
      tailscaleUrl: "https://cachyos.example.test",
      uptimeSeconds: 93_840,
      memoryBytes: 80 * 1024 * 1024,
    };
    expect(executeSlashCommand("normal prompt", context)).toBeNull();
    expect(executeSlashCommand("/status", context)).toBe("FLYDECK  OK\nCODEX    IDLE\nLAST     NONE\nTOKEN    0");
    expect(executeSlashCommand("/model", context)).toBe("MODEL    gpt-5.6-luna\nCONTEXT  1.05M TOKEN\nINPUT    $1.00 / 1M TOKEN\nCACHED   $0.10 / 1M TOKEN\nOUTPUT   $6.00 / 1M TOKEN");
    const serverOutput = `SERVER   cachyos\nWORKSPACE ${root}\nUPTIME   1d 02h 04m\nMEMORY   80 MB\nTHREAD   NONE\nTAILSCALE https://cachyos.example.test`;
    expect(executeSlashCommand("/server", context)).toBe(serverOutput);
    expect(executeSlashCommand("/server details", context)).toBe(serverOutput);
    expect(executeSlashCommand("/missing", context)).toContain("COMMAND  /model");
    expect(executeSlashCommand("/missing", context)).toContain("COMMAND  /server");
  });
});
