import type { RelayPublicationAsset } from "@flydeck/shared/v2";

import { PublicationOutbox } from "./PublicationOutbox.js";
import { PublicationSnapshotBuilder } from "./PublicationSnapshotBuilder.js";
import { RelayIngestClient } from "./RelayIngestClient.js";

export class PublicationWorker {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<boolean>;

  constructor(
    private readonly outbox: PublicationOutbox,
    private readonly snapshots: PublicationSnapshotBuilder,
    private readonly relay: RelayIngestClient,
    private readonly intervalMs: number,
  ) {}

  start() {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    return this.running ?? Promise.resolve(false);
  }

  tick() {
    if (this.running) return this.running;
    this.running = this.drain().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  private async drain() {
    let transferred = false;
    while (await this.processNext()) transferred = true;
    return transferred;
  }

  private async processNext() {
    const entry = await this.outbox.claimNext();
    if (!entry) return false;
    try {
      if (entry.action === "unpublish") {
        await this.relay.unpublish(entry.publicationId);
      } else {
        if (entry.targetVersion === null) throw new Error("Publish entry has no target version");
        const bundle = await this.snapshots.buildBundle(
          entry.workspaceId,
          entry.publicationId,
          entry.targetVersion,
        );
        const staged = await this.relay.stage(bundle.manifest);
        const metadata = new Map<string, RelayPublicationAsset>(
          bundle.manifest.assets.map((asset) => [asset.sha256, asset]),
        );
        for (const sha256 of staged.missingAssets) {
          const absolutePath = bundle.assetPaths.get(sha256);
          const asset = metadata.get(sha256);
          if (!absolutePath || !asset) {
            throw new Error(`Relay One requested unknown asset ${sha256}`);
          }
          await this.relay.uploadAsset(sha256, absolutePath, asset.mimeType);
        }
        await this.relay.activate(entry.publicationId, entry.targetVersion);
      }
      await this.outbox.complete(entry);
      return true;
    } catch (error) {
      await this.outbox.fail(
        entry.id,
        error instanceof Error ? error.message : "Unknown publication failure",
        entry.attempts,
      );
      return false;
    }
  }
}
