import { describe, expect, it, vi } from "vitest";

import type { PublicationOutbox } from "./PublicationOutbox.js";
import type { PublicationSnapshotBuilder } from "./PublicationSnapshotBuilder.js";
import { PublicationWorker } from "./PublicationWorker.js";
import type { RelayIngestClient } from "./RelayIngestClient.js";

const entry = {
  id: "00000000-0000-4000-8000-000000000010",
  workspaceId: "00000000-0000-4000-8000-000000000020",
  publicationId: "00000000-0000-4000-8000-000000000030",
  action: "publish" as const,
  targetVersion: 4,
  attempts: 1,
};
const hash = "a".repeat(64);

describe("PublicationWorker", () => {
  it("uploads only missing assets before activating and completing", async () => {
    const calls: string[] = [];
    const outbox = {
      claimNext: vi.fn()
        .mockResolvedValueOnce(entry)
        .mockResolvedValueOnce(null),
      complete: vi.fn(async () => { calls.push("complete"); }),
      fail: vi.fn(),
    } as unknown as PublicationOutbox;
    const snapshots = {
      buildBundle: vi.fn(async () => ({
        manifest: manifest(),
        assetPaths: new Map([[hash, "/images/photo.jpg"]]),
      })),
    } as unknown as PublicationSnapshotBuilder;
    const relay = {
      stage: vi.fn(async () => {
        calls.push("stage");
        return { ...entry, status: "staging" as const, missingAssets: [hash] };
      }),
      uploadAsset: vi.fn(async () => { calls.push("upload"); }),
      activate: vi.fn(async () => { calls.push("activate"); }),
    } as unknown as RelayIngestClient;

    await new PublicationWorker(outbox, snapshots, relay, 5_000).tick();

    expect(calls).toEqual(["stage", "upload", "activate", "complete"]);
    expect(relay.uploadAsset).toHaveBeenCalledWith(hash, "/images/photo.jpg", "image/jpeg");
    expect(outbox.fail).not.toHaveBeenCalled();
  });

  it("returns a failed transfer to the durable outbox", async () => {
    const outbox = {
      claimNext: vi.fn()
        .mockResolvedValueOnce(entry)
        .mockResolvedValueOnce(null),
      complete: vi.fn(),
      fail: vi.fn(),
    } as unknown as PublicationOutbox;
    const snapshots = {
      buildBundle: vi.fn(async () => { throw new Error("image disappeared"); }),
    } as unknown as PublicationSnapshotBuilder;
    const relay = {} as RelayIngestClient;

    await new PublicationWorker(outbox, snapshots, relay, 5_000).tick();

    expect(outbox.complete).not.toHaveBeenCalled();
    expect(outbox.fail).toHaveBeenCalledWith(entry.id, "image disappeared", 1);
  });
});

function manifest() {
  return {
    schemaVersion: 1 as const,
    publicationId: entry.publicationId,
    version: entry.targetVersion!,
    title: "Posts",
    info: "",
    createdAt: "2026-09-03T10:00:00.000Z",
    assets: [{
      sha256: hash,
      mimeType: "image/jpeg",
      byteSize: 10,
      originalName: "photo.jpg",
    }],
    nodes: [{
      id: entry.publicationId,
      parentId: null,
      localId: "posts",
      position: 0,
      label: "Posts",
      createdAt: "2026-09-03T10:00:00.000Z",
      updatedAt: "2026-09-03T10:00:00.000Z",
      format: "markdown" as const,
      content: "Hello",
      assets: [{ sha256: hash, role: "hero" as const, position: 0, alt: "Photo" }],
    }],
  };
}
