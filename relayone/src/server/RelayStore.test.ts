import { describe, expect, it } from "vitest";

import type { RelayConfig } from "./config.js";
import { RelayStore, safeImagePath } from "./RelayStore.js";

const config: RelayConfig = {
  port: 6060,
  host: "127.0.0.1",
  databaseUrl: "postgresql://localhost/relayone",
  databaseSsl: false,
  title: "Relay One",
  info: "Selected posts.",
  imageDirectory: "/srv/relayone/images",
  assetDirectory: "/srv/relayone/assets",
  ingestSecret: null,
  maxAssetBytes: 25 * 1_024 * 1_024,
  dataSource: "legacy",
  publicCacheSeconds: 15,
  frontendDist: "/srv/relayone/dist",
};

describe("RelayStore", () => {
  it("loads root metadata first and selected content on demand", async () => {
    const rows = [
        {
          publication_root_id: "00000000-0000-4000-8000-000000000001",
          id: "00000000-0000-4000-8000-000000000001",
          parent_id: null,
          label: "Public posts",
          local_id: "posts",
          position: 0,
          created_at: new Date("2026-01-01T10:00:00Z"),
          updated_at: new Date("2026-01-01T10:00:00Z"),
          format: "markdown" as const,
          content: "Welcome",
          has_image: false,
          child_count: 1,
        },
        {
          publication_root_id: "00000000-0000-4000-8000-000000000001",
          id: "00000000-0000-4000-8000-000000000002",
          parent_id: "00000000-0000-4000-8000-000000000001",
          label: "Public first post",
          local_id: "first-post",
          position: 0,
          created_at: new Date("2026-01-02T10:00:00Z"),
          updated_at: new Date("2026-01-02T10:00:00Z"),
          format: "text" as const,
          content: "Hello",
          has_image: true,
          child_count: 0,
        },
      ];
    let queryCount = 0;
    const query = async () => {
      queryCount += 1;
      return queryCount === 1
        ? { rowCount: 1, rows: [rows[0]] }
        : { rowCount: 2, rows };
    };
    const store = new RelayStore({ query } as never, config);

    const site = await store.loadSite();
    const page = await store.loadNode("00000000-0000-4000-8000-000000000002");
    const rootPage = await store.loadNode("00000000-0000-4000-8000-000000000001");

    expect(site?.roots[0].label).toBe("Public posts");
    expect(site?.roots[0].childCount).toBe(1);
    expect(site?.roots[0]).not.toHaveProperty("content");
    expect(page?.post).toMatchObject({
      label: "Public first post",
      imageUrl: "/api/images/00000000-0000-4000-8000-000000000002",
      content: "Hello",
    });
    expect(page?.parents.map((parent) => parent.label)).toEqual(["Public posts"]);
    expect(page?.levels).toHaveLength(2);
    expect(rootPage?.levels[1]).toMatchObject({
      activeId: null,
      nodes: [{ label: "Public first post" }],
    });
  });

  it("returns a valid empty site when nothing has been shared", async () => {
    const store = new RelayStore({
      query: async () => ({ rowCount: 0, rows: [] }),
    } as never, config);

    await expect(store.loadSite()).resolves.toMatchObject({ roots: [] });
  });

  it("rejects image paths outside the configured directory", () => {
    expect(safeImagePath("/srv/relayone/images", "2026-08/post.jpg"))
      .toBe("/srv/relayone/images/2026-08/post.jpg");
    expect(safeImagePath("/srv/relayone/images", "../../private.env")).toBeNull();
    expect(safeImagePath("/srv/relayone/images", "/etc/passwd")).toBeNull();
  });
});
