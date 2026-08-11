import { describe, expect, it } from "vitest";

import {
  createCronTimerRequestSchema,
  createTreeNodeRequestSchema,
  reparentTreeNodeRequestSchema,
  setTreeNodeEnabledRequestSchema,
  treeDocumentDtoSchema,
} from "./index.js";

const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";

describe("V2 network contracts", () => {
  it("accepts a compact flat initial tree document", () => {
    expect(treeDocumentDtoSchema.parse({
      id: firstId,
      workspaceId: secondId,
      kind: "data",
      revision: 3,
      nodes: [],
    })).toMatchObject({ revision: 3, nodes: [] });
  });

  it("keeps create and enabled changes as narrow commands", () => {
    expect(createTreeNodeRequestSchema.parse({
      requestId: firstId,
      nodeId: secondId,
      parentId: null,
      afterNodeId: null,
      kind: "memo-entry",
      label: "Idea",
      expectedTreeRevision: 4,
    })).toMatchObject({ label: "Idea", expectedTreeRevision: 4 });

    expect(setTreeNodeEnabledRequestSchema.parse({
      requestId: firstId,
      enabled: true,
      expectedRevision: 2,
    })).toEqual({ requestId: firstId, enabled: true, expectedRevision: 2 });
  });

  it("keeps normal node creation independent from node content", () => {
    expect(createTreeNodeRequestSchema.safeParse({
      requestId: "00000000-0000-4000-8000-000000000001",
      nodeId: "00000000-0000-4000-8000-000000000002",
      parentId: null,
      afterNodeId: null,
      kind: "data-file",
      label: "Name from the list input",
      content: "This must not become the item name",
      expectedTreeRevision: 0,
    }).success).toBe(false);
  });

  it("uses a narrow parent command for tree restructuring", () => {
    expect(reparentTreeNodeRequestSchema.parse({
      requestId: firstId,
      parentId: secondId,
      expectedTreeRevision: 4,
    })).toEqual({ requestId: firstId, parentId: secondId, expectedTreeRevision: 4 });
    expect(reparentTreeNodeRequestSchema.safeParse({
      requestId: firstId,
      parentId: secondId,
      expectedTreeRevision: 4,
      nodes: [],
    }).success).toBe(false);
  });

  it("rejects an entire tree snapshot sent as an enabled-state mutation", () => {
    expect(setTreeNodeEnabledRequestSchema.safeParse({
      requestId: firstId,
      enabled: true,
      expectedRevision: 2,
      nodes: [{ id: firstId }],
    }).success).toBe(false);
  });

  it("keeps CRON creation explicit and narrow", () => {
    expect(createCronTimerRequestSchema.parse({
      requestId: firstId,
      title: "Monatsbericht",
      dueAt: "2026-08-06T08:00:00.000Z",
    })).toMatchObject({ title: "Monatsbericht" });
  });
});
