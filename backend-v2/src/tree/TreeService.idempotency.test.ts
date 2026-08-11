import { describe, expect, it, vi } from "vitest";

import type { Database, Queryable } from "../db/database.js";
import { TreeService } from "./TreeService.js";

const userId = "00000000-0000-4000-8000-000000000001";
const workspaceId = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000003";

describe("TreeService idempotency boundary", () => {
  it("replays the recorded response without executing the mutation twice", async () => {
    const database = idempotencyDatabase();
    const trees = new TreeService(database);
    const action = vi.fn().mockResolvedValue({ value: "confirmed" });
    const schema = { parse: (value: unknown) => value as { value: string } };

    const first = await trees.executeIdempotent(
      workspaceId, userId, requestId, "tree.rename", schema, action,
    );
    const repeated = await trees.executeIdempotent(
      workspaceId, userId, requestId, "tree.rename", schema, action,
    );

    expect(first).toEqual({ value: "confirmed" });
    expect(repeated).toEqual(first);
    expect(action).toHaveBeenCalledOnce();
  });

  it("rejects reusing a request ID for another operation", async () => {
    const trees = new TreeService(idempotencyDatabase());
    const schema = { parse: (value: unknown) => value as { value: string } };

    await trees.executeIdempotent(
      workspaceId,
      userId,
      requestId,
      "tree.rename",
      schema,
      async () => ({ value: "confirmed" }),
    );

    await expect(trees.executeIdempotent(
      workspaceId,
      userId,
      requestId,
      "tree.content",
      schema,
      async () => ({ value: "wrong" }),
    )).rejects.toMatchObject({ status: 400, code: "INVALID_REQUEST" });
  });
});

function idempotencyDatabase(): Database {
  const responses = new Map<string, { operation: string; response_body: unknown }>();
  const queryImplementation = async (text: string, values: readonly unknown[] = []) => {
    if (text.includes("pg_advisory_xact_lock")) return result([]);
    if (text.includes("SELECT operation, response_body FROM idempotency_keys")) {
      const key = String(values[2]);
      const stored = responses.get(key);
      return result(stored ? [stored] : []);
    }
    if (text.includes("INSERT INTO idempotency_keys")) {
      responses.set(String(values[2]), {
        operation: String(values[3]),
        response_body: values[5],
      });
      return result([]);
    }
    throw new Error(`Unexpected query: ${text}`);
  };
  const query = queryImplementation as Queryable["query"];
  return {
    query,
    transaction: (operation) => operation({ query }),
    end: async () => undefined,
  };
}

function result<TRow extends Record<string, unknown>>(rows: TRow[]) {
  return { rows, rowCount: rows.length };
}
