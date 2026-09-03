import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp as createRelayApp } from "../../../relayone/src/server/app.js";
import type { RelayConfig } from "../../../relayone/src/server/config.js";
import { createDatabase as createRelayDatabase } from "../../../relayone/src/server/database.js";
import { AssetStore } from "../../../relayone/src/server/ingest/AssetStore.js";
import { PublicationIngestService } from "../../../relayone/src/server/ingest/PublicationIngestService.js";
import { runRelayMigrations } from "../../../relayone/src/server/migrations.js";
import { ProjectedRelayStore } from "../../../relayone/src/server/ProjectedRelayStore.js";
import { loadConfig } from "../config.js";
import { createDatabase } from "../db/database.js";
import { runMigrations } from "../db/migrations.js";
import { PublicationOutbox } from "./PublicationOutbox.js";
import { PublicationSnapshotBuilder } from "./PublicationSnapshotBuilder.js";
import { PublicationWorker } from "./PublicationWorker.js";
import { RelayIngestClient } from "./RelayIngestClient.js";

const sourceUrl = process.env.FLYDECK_V2_TEST_DATABASE_URL;
const relayUrl = process.env.RELAYONE_TEST_DATABASE_URL;
const integration = describe.runIf(Boolean(sourceUrl && relayUrl));
const workspaceId = "41000000-0000-4000-8000-000000000001";
const treeId = "42000000-0000-4000-8000-000000000001";
const publicationId = "43000000-0000-4000-8000-000000000001";
const childId = "43000000-0000-4000-8000-000000000002";
const secret = "integration-ingest-secret-with-more-than-32-characters";

integration("independent Relay One publication", () => {
  const source = sourceUrl ? createDatabase(loadConfig({ DATABASE_URL: sourceUrl })) : null;
  let relay: ReturnType<typeof createRelayDatabase> | null = null;
  let directory = "";

  beforeAll(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "relay-e2e-"));
    relay = createRelayDatabase(relayConfig(relayUrl!, directory));
    await runMigrations(source!);
    await runRelayMigrations(relay);
  });

  afterAll(async () => {
    await source?.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
    await relay?.query("DELETE FROM relay_publications WHERE id = $1", [publicationId]);
    await source?.end();
    await relay?.end();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it("pushes text and an image before exposing one active snapshot", async () => {
    await source!.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
    await relay!.query("DELETE FROM relay_publications WHERE id = $1", [publicationId]);
    await source!.query(`
      INSERT INTO workspaces (id, name, filesystem_root)
      VALUES ($1, 'Relay E2E', '/tmp/relay-e2e-source')
    `, [workspaceId]);
    await source!.query(`
      INSERT INTO trees (id, workspace_id, kind) VALUES ($1, $2, 'data')
    `, [treeId, workspaceId]);
    await source!.query(`
      INSERT INTO tree_nodes (id, tree_id, parent_id, kind, label, local_id, position)
      VALUES
        ($1, $3, NULL, 'data-directory', 'Posts', 'posts', 0),
        ($2, $3, $1, 'data-file', 'Today', 'today', 0)
    `, [publicationId, childId, treeId]);
    await source!.query(`
      INSERT INTO node_contents (node_id, format, content)
      VALUES ($1, 'markdown', ''), ($2, 'markdown', 'Published from Flydon')
    `, [publicationId, childId]);

    const sourceImages = path.join(directory, "source-images");
    await mkdir(path.join(sourceImages, "2026-09"), { recursive: true });
    const image = Buffer.from("independent relay image");
    const relativePath = `2026-09/${childId}.jpg`;
    await writeFile(path.join(sourceImages, relativePath), image);
    await source!.query(`
      INSERT INTO node_images (node_id, relative_path, mime_type, original_name, byte_size)
      VALUES ($1, $2, 'image/jpeg', 'today.jpg', $3)
    `, [childId, relativePath, image.length]);
    await source!.query(`
      UPDATE tree_nodes SET shared = true, share_name = 'Public posts' WHERE id = $1
    `, [publicationId]);

    const config = relayConfig(relayUrl!, directory);
    const reader = new ProjectedRelayStore(relay!, config);
    const ingest = new PublicationIngestService(relay!, new AssetStore(config.assetDirectory));
    const server = createRelayApp(config, reader, ingest).listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    try {
      const port = (server.address() as AddressInfo).port;
      const worker = new PublicationWorker(
        new PublicationOutbox(source!),
        new PublicationSnapshotBuilder(source!, sourceImages),
        new RelayIngestClient(`http://127.0.0.1:${port}/ingest/v1`, secret),
        5_000,
      );
      expect(await worker.tick()).toBe(true);

      const page = await reader.loadNode(childId);
      expect(page?.post.content).toBe("Published from Flydon");
      expect(page?.post.imageUrl).toMatch(/^\/assets\/[0-9a-f]{64}$/);
      const hash = page!.post.imageUrl!.split("/").pop()!;
      const stored = await reader.readAsset(hash);
      expect(stored?.byte_size).toBe(image.length);
      expect(stored?.absolutePath.startsWith(config.assetDirectory)).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});

function relayConfig(databaseUrl: string, directory: string): RelayConfig {
  return {
    port: 6060,
    host: "127.0.0.1",
    databaseUrl,
    databaseSsl: false,
    title: "Relay One",
    info: "",
    imageDirectory: path.join(directory, "unused-legacy-images"),
    assetDirectory: path.join(directory, "relay-assets"),
    ingestSecret: secret,
    maxAssetBytes: 25 * 1_024 * 1_024,
    dataSource: "projection",
    publicCacheSeconds: 15,
    frontendDist: path.join(directory, "unused-dist"),
  };
}
