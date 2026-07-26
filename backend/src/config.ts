import path from "node:path";
import os from "node:os";

export type AppConfig = {
  port: number;
  basePath: string;
  workspaceRoot: string;
  dataHome: string;
  tailscaleUrl: string;
  flydonDir: string;
  trashDir: string;
  ntfyUrl?: string;
  ntfyTopic?: string;
  schedulerIntervalMs: number;
  frontendDist?: string;
  backupDir?: string;
  auth: {
    mode: "off" | "token";
    token?: string;
    secureCookie: boolean;
  };
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const workspaceRoot = path.resolve(env.WORKSPACE_ROOT ?? "/home/sntr");
  const flydonDir = path.resolve(env.FLYDON_DIR ?? path.join(workspaceRoot, ".flydon"));
  const authMode = env.AUTH_MODE === "token" ? "token" : "off";
  if (env.AUTH_MODE && env.AUTH_MODE !== "off" && env.AUTH_MODE !== "token") {
    throw new Error("AUTH_MODE must be either off or token");
  }
  if (authMode === "token" && (!env.AUTH_TOKEN || env.AUTH_TOKEN.length < 16)) {
    throw new Error("AUTH_TOKEN must contain at least 16 characters when AUTH_MODE=token");
  }
  return {
    port: Number(env.PORT ?? 5000),
    basePath: env.BASE_PATH ?? "/flydeck",
    workspaceRoot,
    dataHome: path.resolve(env.DATA_HOME ?? path.join(os.homedir(), "flydesk-data")),
    tailscaleUrl: env.TAILSCALE_URL ?? `https://${os.hostname().split(".")[0].toLowerCase()}.tail4df832.ts.net`,
    flydonDir,
    trashDir: path.resolve(env.TRASH_DIR ?? path.join(flydonDir, "trash")),
    ntfyUrl: env.NTFY_URL || undefined,
    ntfyTopic: env.NTFY_TOPIC || undefined,
    schedulerIntervalMs: Number(env.SCHEDULER_INTERVAL_MS ?? 30_000),
    frontendDist: env.FRONTEND_DIST ? path.resolve(env.FRONTEND_DIST) : undefined,
    backupDir: path.resolve(env.BACKUP_DIR ?? path.join(os.homedir(), ".flydon-backup")),
    auth: {
      mode: authMode,
      token: env.AUTH_TOKEN,
      secureCookie: env.AUTH_SECURE_COOKIE !== "false",
    },
  };
}
