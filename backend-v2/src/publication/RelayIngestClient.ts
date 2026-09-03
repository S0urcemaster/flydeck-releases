import { readFile } from "node:fs/promises";

import type { RelayPublicationManifestV1 } from "@flydeck/shared/v2";

type StageResult = {
  publicationId: string;
  version: number;
  missingAssets: string[];
  status: "staging";
};

export class RelayIngestClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly secret: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async stage(manifest: RelayPublicationManifestV1): Promise<StageResult> {
    return this.requestJson(
      `/publications/${manifest.publicationId}/versions/${manifest.version}`,
      { method: "PUT", body: JSON.stringify(manifest), headers: { "Content-Type": "application/json" } },
    );
  }

  async uploadAsset(sha256: string, absolutePath: string, mimeType: string) {
    const content = await readFile(absolutePath);
    await this.request(`/assets/${sha256}`, {
      method: "PUT",
      body: content,
      headers: { "Content-Type": mimeType },
    });
  }

  async activate(publicationId: string, version: number) {
    await this.request(`/publications/${publicationId}/versions/${version}/activate`, {
      method: "POST",
    });
  }

  async unpublish(publicationId: string) {
    const response = await this.request(`/publications/${publicationId}`, {
      method: "DELETE",
    }, true);
    if (!response.ok && response.status !== 404) throw await relayError(response);
  }

  private async requestJson<TResult>(path: string, init: RequestInit): Promise<TResult> {
    const response = await this.request(path, init);
    return response.json() as Promise<TResult>;
  }

  private async request(path: string, init: RequestInit, allowError = false) {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${this.secret}` },
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      throw new RelayTransportError(
        error instanceof Error ? error.message : "Relay One request failed",
      );
    }
    if (!allowError && !response.ok) throw await relayError(response);
    return response;
  }
}

export class RelayTransportError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

async function relayError(response: Response) {
  const body = await response.text();
  let message = `Relay One returned HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    if (typeof parsed.message === "string") message = parsed.message;
  } catch {
    // Keep the bounded status message; never put an HTML proxy response in the outbox.
  }
  return new RelayTransportError(message, response.status);
}
