import { describe, expect, it } from "vitest";

import type { RelayConfig } from "./config.js";
import { ProjectedRelayStore, safeAssetPath } from "./ProjectedRelayStore.js";

const config: RelayConfig = {
  port: 6060,
  host: "127.0.0.1",
  databaseUrl: "postgresql://localhost/relayone",
  databaseSsl: false,
  title: "Relay One",
  info: "Independent publication",
  imageDirectory: "/legacy/images",
  assetDirectory: "/srv/relayone/assets",
  ingestSecret: null,
  maxAssetBytes: 25 * 1_024 * 1_024,
  dataSource: "projection",
  publicCacheSeconds: 15,
  frontendDist: "/srv/relayone/dist",
};

const rootId = "00000000-0000-4000-8000-000000000001";
const childId = "00000000-0000-4000-8000-000000000002";

describe("ProjectedRelayStore", () => {
  it("builds the selected tree while exposing every publication at the root level", async () => {
    const rows = [row(rootId, null, "Posts", 1), row(childId, rootId, "Today", 0)];
    const otherRoot = row("00000000-0000-4000-8000-000000000003", null, "Other", 0);
    const store = new ProjectedRelayStore({
      query: async (_sql, values) => {
        const result = values ? rows : [rows[0], otherRoot];
        return { rows: result, rowCount: result.length };
      },
    }, config);

    const page = await store.loadNode(childId);

    expect(page?.parents.map((node) => node.label)).toEqual(["Posts"]);
    expect(page?.post.label).toBe("Today");
    expect(page?.post.imageUrl).toBe(`/assets/${"a".repeat(64)}`);
    expect(page?.levels[0].nodes.map((node) => node.label)).toEqual(["Posts", "Other"]);
  });

  it("accepts assets below the configured root and rejects escaped paths", () => {
    expect(safeAssetPath(config.assetDirectory, "/srv/relayone/assets/aa/file"))
      .toBe("/srv/relayone/assets/aa/file");
    expect(safeAssetPath(config.assetDirectory, "/srv/relayone/private/file"))
      .toBeNull();
    expect(safeAssetPath(config.assetDirectory, "/srv/relayone/assets"))
      .toBeNull();
  });
});

function row(id: string, parentId: string | null, label: string, childCount: number) {
  return {
    publication_id: "00000000-0000-4000-8000-000000000099",
    id,
    parent_id: parentId,
    label,
    local_id: label.toLowerCase(),
    position: 0,
    source_created_at: new Date("2026-09-03T10:00:00Z"),
    source_updated_at: new Date("2026-09-03T10:00:00Z"),
    format: "markdown" as const,
    content: id === childId ? "Published on Netcup" : "",
    image_sha256: id === childId ? "a".repeat(64) : null,
    child_count: childCount,
  };
}
