import { NodeOAuthClient, JoseKey, requestLocalLock } from "@atproto/oauth-client-node";
import { z } from "zod";
import type { RelayConfig } from "../config.js";
import type { RelayDatabase } from "../database.js";
import { EncryptedJson } from "./EncryptedJson.js";
import { OAuthBrokerStore } from "./OAuthBrokerStore.js";

const callbackStateSchema = z.object({
  userId: z.uuid(), workspaceId: z.uuid(), handle: z.string().min(1).max(253),
});

export interface BlueskyOAuthBrokerApi {
  readonly clientMetadata: unknown;
  readonly jwks: unknown;
  authorize(userId: string, workspaceId: string, handle: string): Promise<string>;
  callback(params: URLSearchParams): Promise<void>;
  status(userId: string, workspaceId: string): Promise<unknown>;
  disconnect(userId: string, workspaceId: string): Promise<void>;
  publish(userId: string, workspaceId: string, posts: readonly string[], image?: BlueskyImage): Promise<readonly PostReference[]>;
}

type PostReference = { uri: string; cid: string };
type BlueskyImage = { mimeType: string; content: Buffer };

export class BlueskyOAuthBroker implements BlueskyOAuthBrokerApi {
  constructor(private readonly client: NodeOAuthClient, private readonly store: OAuthBrokerStore) {}
  get clientMetadata() { return this.client.clientMetadata; }
  get jwks() { return this.client.jwks; }
  async authorize(userId: string, workspaceId: string, handle: string) {
    const state = Buffer.from(JSON.stringify({ userId, workspaceId, handle })).toString("base64url");
    return (await this.client.authorize(handle, { state })).toString();
  }
  async callback(params: URLSearchParams) {
    const { session, state } = await this.client.callback(params);
    if (!state) throw new Error("Bluesky OAuth callback is missing state");
    const context = callbackStateSchema.parse(JSON.parse(Buffer.from(state, "base64url").toString("utf8")));
    await this.store.connect(context.userId, context.workspaceId, session.did, context.handle);
  }
  async status(userId: string, workspaceId: string) {
    const connection = await this.store.find(userId, workspaceId);
    return connection?.status === "connected"
      ? { provider: "bluesky", connected: true, connectionId: connection.id,
          handle: connection.handle, did: connection.did }
      : { provider: "bluesky", connected: false };
  }
  async disconnect(userId: string, workspaceId: string) {
    const connection = await this.store.find(userId, workspaceId);
    if (!connection || connection.status !== "connected") return;
    await this.client.revoke(connection.did);
    await this.store.revoke(userId, workspaceId);
  }
  async publish(userId: string, workspaceId: string, posts: readonly string[], image?: BlueskyImage) {
    const connection = await this.store.find(userId, workspaceId);
    if (!connection || connection.status !== "connected") {
      throw new Error("Bluesky account is not connected");
    }
    const session = await this.client.restore(connection.did);
    let imageBlob: unknown;
    if (image) {
      const upload = await session.fetchHandler("/xrpc/com.atproto.repo.uploadBlob", {
        method: "POST",
        headers: { "Content-Type": image.mimeType },
        body: Uint8Array.from(image.content),
      });
      if (!upload.ok) throw new Error(await blueskyFailure("image", upload));
      const value = await upload.json() as { blob?: unknown };
      if (!value.blob) throw new Error("Bluesky returned an invalid image blob");
      imageBlob = value.blob;
    }
    const published: PostReference[] = [];
    for (const text of posts) {
      const length = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
      if (!text.trim() || length > 300) throw new Error("Bluesky posts must contain 1 to 300 characters");
      const root = published[0];
      const parent = published[published.length - 1];
      const response = await session.fetchHandler("/xrpc/com.atproto.repo.createRecord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: session.did,
          collection: "app.bsky.feed.post",
          record: {
            $type: "app.bsky.feed.post",
            text,
            createdAt: new Date().toISOString(),
            ...(imageBlob && published.length === 0 ? {
              embed: {
                $type: "app.bsky.embed.images",
                images: [{ alt: "", image: imageBlob }],
              },
            } : {}),
            ...(root && parent ? { reply: { root, parent } } : {}),
          },
        }),
      });
      if (!response.ok) {
        throw new Error(await blueskyFailure(`post ${published.length + 1}`, response));
      }
      const value = await response.json() as Partial<PostReference>;
      if (!value.uri || !value.cid) throw new Error("Bluesky returned an invalid post reference");
      published.push({ uri: value.uri, cid: value.cid });
    }
    return published;
  }
}

async function blueskyFailure(operation: string, response: Response) {
  let detail = "";
  try {
    const value = await response.json() as { error?: unknown; message?: unknown };
    detail = [value.error, value.message]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(": ");
  } catch {
    // Bluesky errors are normally JSON; status remains useful if not.
  }
  return `Bluesky rejected ${operation} (${response.status})${detail ? `: ${detail}` : ""}`;
}

export async function createBlueskyOAuthBroker(config: RelayConfig, database: RelayDatabase) {
  const values = [config.oauthBrokerSecret, config.oauthEncryptionKey,
    config.oauthClientPrivateJwk, config.oauthPublicOrigin, config.oauthFlydeckReturnUrl];
  if (values.every((value) => !value)) return undefined;
  if (values.some((value) => !value)) throw new Error("All Relay One OAuth settings must be configured together");
  const origin = config.oauthPublicOrigin!;
  const store = new OAuthBrokerStore(database, new EncryptedJson(config.oauthEncryptionKey!));
  const encodedJwk = Buffer.from(config.oauthClientPrivateJwk!, "base64url").toString("utf8");
  const key = await JoseKey.fromJWK({
    ...JSON.parse(encodedJwk),
    alg: "ES256",
  }, "relay-one-oauth-1");
  const client = new NodeOAuthClient({
    clientMetadata: {
      client_id: `${origin}/oauth/bluesky/client-metadata.json`,
      client_name: "Flydeck",
      client_uri: origin,
      redirect_uris: [`${origin}/oauth/bluesky/callback`],
      grant_types: ["authorization_code", "refresh_token"],
      scope: "atproto transition:generic",
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: key.alg,
      dpop_bound_access_tokens: true,
      jwks_uri: `${origin}/oauth/bluesky/jwks.json`,
    },
    keyset: [key], stateStore: store.stateStore, sessionStore: store.sessionStore,
    requestLock: requestLocalLock,
  });
  return new BlueskyOAuthBroker(client, store);
}
