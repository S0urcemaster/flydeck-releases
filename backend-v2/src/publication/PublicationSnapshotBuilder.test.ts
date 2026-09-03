import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { Queryable } from "../db/database.js";
import { PublicationSnapshotBuilder, safeSourcePath } from "./PublicationSnapshotBuilder.js";

const directories: string[] = [];
const rootId = "00000000-0000-4000-8000-000000000001";
const childId = "00000000-0000-4000-8000-000000000002";

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("PublicationSnapshotBuilder", () => {
  it("exports one complete tree and hashes its image", async () => {
    const imageDirectory = await mkdtemp(path.join(os.tmpdir(), "publication-images-"));
    directories.push(imageDirectory);
    await mkdir(path.join(imageDirectory, "2026-09"));
    const image = Buffer.from("published image");
    await writeFile(path.join(imageDirectory, "2026-09", `${childId}.jpg`), image);
    const rows = [node(rootId, null), node(childId, rootId, image.length)];
    const database = {
      query: async () => ({ rows, rowCount: rows.length }),
    } as Queryable;

    const snapshot = await new PublicationSnapshotBuilder(database, imageDirectory)
      .build("00000000-0000-4000-8000-000000000099", rootId, 3);

    const hash = createHash("sha256").update(image).digest("hex");
    expect(snapshot.version).toBe(3);
    expect(snapshot.nodes[0].parentId).toBeNull();
    expect(snapshot.nodes[1].assets[0].sha256).toBe(hash);
    expect(snapshot.assets).toEqual([expect.objectContaining({ sha256: hash })]);
  });

  it("does not allow publication files to escape the image root", () => {
    expect(safeSourcePath("/srv/images", "../secret")).toBeNull();
  });
});

function node(id: string, parentId: string | null, imageSize: number | null = null) {
  return {
    id,
    parent_id: parentId,
    local_id: id === rootId ? "posts" : "today",
    position: 0,
    label: id === rootId ? "Posts" : "Today",
    share_name: id === rootId ? "Public posts" : null,
    created_at: new Date("2026-09-03T10:00:00Z"),
    updated_at: new Date("2026-09-03T10:00:00Z"),
    format: "markdown" as const,
    content: id === childId ? "Hello" : "",
    relative_path: imageSize === null ? null : `2026-09/${childId}.jpg`,
    mime_type: imageSize === null ? null : "image/jpeg",
    original_name: imageSize === null ? null : "photo.jpg",
    byte_size: imageSize,
  };
}
