import { describe, expect, it, vi } from "vitest";

import type { Database, Queryable } from "../db/database.js";
import { TreeService } from "./TreeService.js";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const treeId = "00000000-0000-4000-8000-000000000002";
const nodeId = "00000000-0000-4000-8000-000000000003";

describe("TreeService sharing boundary", () => {
  it("atomically unshares shared ancestors and descendants", async () => {
    const query = vi.fn(async (text: string) => {
      if (text.includes("FOR UPDATE OF trees")) {
        return result([{ id: treeId, workspace_id: workspaceId, kind: "data", revision: 7 }]);
      }
      if (text.includes("SELECT kind FROM tree_nodes")) {
        return result([{ kind: "data-file" }]);
      }
      if (text.includes("WITH RECURSIVE ancestry AS")) {
        return result([{ protected: false }]);
      }
      if (text.includes("UPDATE tree_nodes\n        SET shared = $1")) {
        return result([nodeRow()]);
      }
      if (text.includes("WITH RECURSIVE ancestors AS")) return result([]);
      if (text.includes("UPDATE trees SET revision")) return result([{ revision: 8 }]);
      throw new Error(`Unexpected query: ${text}`);
    }) as Queryable["query"];
    const database: Database = {
      query,
      transaction: (operation) => operation({ query }),
      end: async () => undefined,
    };

    const response = await new TreeService(database).setSharing(
      workspaceId,
      nodeId,
      {
        requestId: "00000000-0000-4000-8000-000000000004",
        shared: true,
        shareName: "Public node",
        expectedRevision: 4,
      },
    );

    expect(response).toMatchObject({
      node: { id: nodeId, shared: true, shareName: "Public node" },
      treeRevision: 8,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/ancestors[\s\S]+descendants[\s\S]+shared = false/),
      [treeId, nodeId],
    );
  });
});

function nodeRow() {
  const timestamp = new Date("2026-08-28T12:00:00.000Z");
  return {
    id: nodeId,
    parent_id: null,
    kind: "data-file",
    label: "Node",
    local_id: "node",
    position: 0,
    revision: 5,
    created_at: timestamp,
    updated_at: timestamp,
    content_editable: true,
    list_editable: true,
    list_item_limit: null,
    shared: true,
    share_name: "Public node",
    enabled: false,
    enabled_revision: 0,
  };
}

function result<TRow extends Record<string, unknown>>(rows: TRow[]) {
  return { rows, rowCount: rows.length };
}
