import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(6060),
  HOST: z.enum(["127.0.0.1", "::1", "0.0.0.0", "::"]).default("127.0.0.1"),
  DATABASE_URL: z.url(),
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  RELAY_NODE_ID: z.string().trim().regex(/^[a-z0-9](?:[a-z0-9-]{0,62})$/)
    .default("relay-one"),
  RELAY_PUBLIC_ORIGIN: z.url().optional(),
  RELAY_TITLE: z.string().trim().min(1).max(120).optional(),
  RELAY_INFO: z.string().trim().max(1_000).optional(),
  RELAYONE_TITLE: z.string().trim().min(1).max(120).default("Relay One"),
  RELAYONE_INFO: z.string().trim().max(1_000).default(
    "Selected posts from my private Flydeck.",
  ),
  IMAGE_DIRECTORY: z.string().trim().default("../flydon-server/images"),
  RELAY_ASSET_DIRECTORY: z.string().trim().default("../relayone-data/assets"),
  RELAY_IDENTITY_DIRECTORY: z.string().trim().default("../relayone-data/identity"),
  RELAY_INGEST_SECRET: z.string().min(32).optional(),
  RELAY_MAX_ASSET_BYTES: z.coerce.number().int().min(1).max(100 * 1_024 * 1_024)
    .default(25 * 1_024 * 1_024),
  RELAY_DATA_SOURCE: z.enum(["legacy", "projection"]).default("legacy"),
  PUBLIC_CACHE_SECONDS: z.coerce.number().int().min(0).max(300).default(15),
  FRONTEND_DIST: z.string().trim().default("dist"),
  OAUTH_BROKER_SECRET: z.string().min(32).optional(),
  OAUTH_ENCRYPTION_KEY: z.string().min(43).optional(),
  OAUTH_CLIENT_PRIVATE_JWK: z.string().optional(),
  OAUTH_PUBLIC_ORIGIN: z.url().optional(),
  OAUTH_FLYDECK_RETURN_URL: z.url().optional(),
  RELAY_HOME_INGRESS_ENABLED: z.enum(["true", "false"]).default("true"),
  RELAY_FEDERATION_ENABLED: z.enum(["true", "false"]).default("false"),
  RELAY_ACCOUNTS_ENABLED: z.enum(["true", "false"]).default("false"),
  RELAY_DIAGNOSTICS_ENABLED: z.enum(["true", "false"]).default("false"),
});

export type RelayConfig = {
  port: number;
  host: "127.0.0.1" | "::1" | "0.0.0.0" | "::";
  databaseUrl: string;
  databaseSsl: boolean;
  nodeId: string;
  publicOrigin: string | null;
  title: string;
  info: string;
  imageDirectory: string;
  assetDirectory: string;
  identityDirectory: string;
  ingestSecret: string | null;
  maxAssetBytes: number;
  dataSource: "legacy" | "projection";
  publicCacheSeconds: number;
  frontendDist: string;
  oauthBrokerSecret?: string | null;
  oauthEncryptionKey?: string | null;
  oauthClientPrivateJwk?: string | null;
  oauthPublicOrigin?: string | null;
  oauthFlydeckReturnUrl?: string | null;
  capabilities: {
    homeIngress: boolean;
    federation: boolean;
    accounts: boolean;
    diagnostics: boolean;
  };
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RelayConfig {
  const parsed = envSchema.parse(env);
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    databaseUrl: parsed.DATABASE_URL,
    databaseSsl: parsed.DATABASE_SSL === "true",
    nodeId: parsed.RELAY_NODE_ID,
    publicOrigin: parsed.RELAY_PUBLIC_ORIGIN?.replace(/\/$/, "") ?? null,
    title: parsed.RELAY_TITLE ?? parsed.RELAYONE_TITLE,
    info: parsed.RELAY_INFO ?? parsed.RELAYONE_INFO,
    imageDirectory: path.resolve(parsed.IMAGE_DIRECTORY),
    assetDirectory: path.resolve(parsed.RELAY_ASSET_DIRECTORY),
    identityDirectory: path.resolve(parsed.RELAY_IDENTITY_DIRECTORY),
    ingestSecret: parsed.RELAY_INGEST_SECRET ?? null,
    maxAssetBytes: parsed.RELAY_MAX_ASSET_BYTES,
    dataSource: parsed.RELAY_DATA_SOURCE,
    publicCacheSeconds: parsed.PUBLIC_CACHE_SECONDS,
    frontendDist: path.resolve(parsed.FRONTEND_DIST),
    oauthBrokerSecret: parsed.OAUTH_BROKER_SECRET ?? null,
    oauthEncryptionKey: parsed.OAUTH_ENCRYPTION_KEY ?? null,
    oauthClientPrivateJwk: parsed.OAUTH_CLIENT_PRIVATE_JWK ?? null,
    oauthPublicOrigin: parsed.OAUTH_PUBLIC_ORIGIN?.replace(/\/$/, "") ?? null,
    oauthFlydeckReturnUrl: parsed.OAUTH_FLYDECK_RETURN_URL ?? null,
    capabilities: {
      homeIngress: parsed.RELAY_HOME_INGRESS_ENABLED === "true",
      federation: parsed.RELAY_FEDERATION_ENABLED === "true",
      accounts: parsed.RELAY_ACCOUNTS_ENABLED === "true",
      diagnostics: parsed.RELAY_DIAGNOSTICS_ENABLED === "true",
    },
  };
}
