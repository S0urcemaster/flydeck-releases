import type { BlueskyConnectionDto } from "@flydeck/shared/v2";

export interface OAuthBroker {
  status(userId: string, workspaceId: string): Promise<BlueskyConnectionDto>;
  authorize(userId: string, workspaceId: string, handle: string): Promise<{ authorizationUrl: string }>;
  disconnect(userId: string, workspaceId: string): Promise<void>;
  publish(userId: string, workspaceId: string, posts: readonly string[], image?: BlueskyImage): Promise<{ posts: { uri: string; cid: string }[] }>;
}

type BlueskyImage = { mimeType: string; content: Buffer };

export class RelayOAuthClient implements OAuthBroker {
  constructor(private readonly url: string, private readonly secret: string) {}

  status(userId: string, workspaceId: string) {
    return this.request<BlueskyConnectionDto>(this.path(userId, workspaceId));
  }
  authorize(userId: string, workspaceId: string, handle: string) {
    return this.request<{ authorizationUrl: string }>("/internal/oauth/bluesky/authorize", {
      method: "POST", body: JSON.stringify({ userId, workspaceId, handle }),
    });
  }
  async disconnect(userId: string, workspaceId: string) {
    await this.request(this.path(userId, workspaceId), { method: "DELETE" });
  }
  publish(userId: string, workspaceId: string, posts: readonly string[], image?: BlueskyImage) {
    return this.request<{ posts: { uri: string; cid: string }[] }>("/internal/oauth/bluesky/publish", {
      method: "POST", body: JSON.stringify({
        userId, workspaceId, posts,
        ...(image ? { image: { mimeType: image.mimeType, data: image.content.toString("base64") } } : {}),
      }),
    });
  }
  private path(userId: string, workspaceId: string) {
    return `/internal/oauth/bluesky/connections/${encodeURIComponent(userId)}/${encodeURIComponent(workspaceId)}`;
  }
  private async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.url}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.secret}`, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`Relay OAuth broker returned ${response.status}`);
    return await response.json() as T;
  }
}
