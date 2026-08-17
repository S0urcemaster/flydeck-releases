import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(5100),
  BASE_PATH: z.string().default("/flydeck"),
  DATABASE_URL: z.url(),
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  NTFY_URL: z.string().trim().optional(),
  NTFY_TOPIC: z.string().trim().optional(),
  SCHEDULER_INTERVAL_MS: z.coerce.number().int().min(1_000).max(300_000).default(5_000),
  LOGIN_REQUIRED: z.enum(["true", "false"]).default("false"),
  AUTH_DEFAULT_USER_ID: z.uuid().optional(),
  AUTH_SECURE_COOKIE: z.enum(["true", "false"]).default("false"),
  BACKUP_DIRECTORY: z.string().trim().default("backups"),
  BACKUP_RETENTION: z.coerce.number().int().min(1).max(365).default(7),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  FRONTEND_DIST: z.string().trim().optional(),
  FRONTEND_BASE_PATH: z.string().default("/v2"),
});

export type AppConfig = {
  port: number;
  basePath: string;
  databaseUrl: string;
  databaseSsl: boolean;
  trustProxy: boolean;
  ntfyUrl?: string;
  ntfyTopic?: string;
  schedulerIntervalMs: number;
  loginRequired: boolean;
  authDefaultUserId?: string;
  authSecureCookie: boolean;
  backupDirectory: string;
  backupRetention: number;
  sessionTtlDays: number;
  frontendDist?: string;
  frontendBasePath: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  return {
    port: parsed.PORT,
    basePath: normalizeBasePath(parsed.BASE_PATH),
    databaseUrl: parsed.DATABASE_URL,
    databaseSsl: parsed.DATABASE_SSL === "true",
    trustProxy: parsed.TRUST_PROXY === "true",
    ntfyUrl: parsed.NTFY_URL || undefined,
    ntfyTopic: parsed.NTFY_TOPIC || undefined,
    schedulerIntervalMs: parsed.SCHEDULER_INTERVAL_MS,
    loginRequired: parsed.LOGIN_REQUIRED === "true",
    authDefaultUserId: parsed.AUTH_DEFAULT_USER_ID,
    authSecureCookie: parsed.AUTH_SECURE_COOKIE === "true",
    backupDirectory: path.resolve(parsed.BACKUP_DIRECTORY),
    backupRetention: parsed.BACKUP_RETENTION,
    sessionTtlDays: parsed.SESSION_TTL_DAYS,
    frontendDist: parsed.FRONTEND_DIST
      ? path.resolve(parsed.FRONTEND_DIST)
      : undefined,
    frontendBasePath: normalizeBasePath(parsed.FRONTEND_BASE_PATH),
  };
}

function normalizeBasePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}
