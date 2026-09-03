import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Queryable } from "../database.js";
import { AssetStore } from "./AssetStore.js";
import { IngestConflictError, PublicationIngestService } from "./PublicationIngestService.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("PublicationIngestService", () => {
  it("rejects reuse of a version with different manifest content", async () => {
    const directory = await temporaryDirectory();
    const database = { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) } as Queryable;
    const service = new PublicationIngestService(database, new AssetStore(directory));

    await expect(service.stage(manifest())).rejects.toBeInstanceOf(IngestConflictError);
  });

  it("does not activate when a database asset record has no physical file", async () => {
    const directory = await temporaryDirectory();
    const database = {
      query: vi.fn(async (sql: string) => sql.includes("FROM relay_version_assets")
        ? { rows: [{ sha256: "a".repeat(64), byte_size: "12" }], rowCount: 1 }
        : { rows: [{ version: "1" }], rowCount: 1 }),
    } as unknown as Queryable;
    const service = new PublicationIngestService(database, new AssetStore(directory));

    await expect(service.activate(manifest().publicationId, 1))
      .rejects.toThrow(/missing from storage/);
    expect(database.query).toHaveBeenCalledOnce();
  });
});

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "relay-ingest-"));
  directories.push(directory);
  return directory;
}

function manifest() {
  return {
    schemaVersion: 1 as const,
    publicationId: "00000000-0000-4000-8000-000000000001",
    version: 1,
    title: "Posts",
    info: "",
    createdAt: "2026-09-03T10:00:00.000Z",
    assets: [],
    nodes: [{
      id: "00000000-0000-4000-8000-000000000002",
      parentId: null,
      localId: "posts",
      position: 0,
      label: "Posts",
      createdAt: "2026-09-03T10:00:00.000Z",
      updatedAt: "2026-09-03T10:00:00.000Z",
      format: "markdown" as const,
      content: "Hello",
      assets: [],
    }],
  };
}
