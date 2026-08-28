import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(6060),
  HOST: z.enum(["127.0.0.1", "::1"]).default("127.0.0.1"),
  DATABASE_URL: z.url(),
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  RELAYONE_TITLE: z.string().trim().min(1).max(120).default("Relay One"),
  RELAYONE_INFO: z.string().trim().max(1_000).default(
    "Selected posts from my private Flydeck.",
  ),
  IMAGE_DIRECTORY: z.string().trim().default("../flydon-server/images"),
  PUBLIC_CACHE_SECONDS: z.coerce.number().int().min(0).max(300).default(15),
  FRONTEND_DIST: z.string().trim().default("dist"),
});

export type RelayConfig = {
  port: number;
  host: "127.0.0.1" | "::1";
  databaseUrl: string;
  databaseSsl: boolean;
  title: string;
  info: string;
  imageDirectory: string;
  publicCacheSeconds: number;
  frontendDist: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RelayConfig {
  const parsed = envSchema.parse(env);
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    databaseUrl: parsed.DATABASE_URL,
    databaseSsl: parsed.DATABASE_SSL === "true",
    title: parsed.RELAYONE_TITLE,
    info: parsed.RELAYONE_INFO,
    imageDirectory: path.resolve(parsed.IMAGE_DIRECTORY),
    publicCacheSeconds: parsed.PUBLIC_CACHE_SECONDS,
    frontendDist: path.resolve(parsed.FRONTEND_DIST),
  };
}
