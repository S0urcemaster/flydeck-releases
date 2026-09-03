import { describe, expect, it } from "vitest";
import { isAgentJobCaseNode, updateMemoSelection } from "./AgentJobBrowser";

const memoNodes = [
  { id: "parent", parentId: "memo-root", position: 0 },
  { id: "first", parentId: "parent", position: 0 },
  { id: "nested", parentId: "first", position: 0 },
  { id: "second", parentId: "parent", position: 1 },
];

describe("AgentJobBrowser job roles", () => {
  it("shows JobCase for an empty item and for a saved job with run children", () => {
    expect(isAgentJobCaseNode({ kind: "agent-job", children: [] })).toBe(true);
    expect(isAgentJobCaseNode({
      kind: "agent-job",
      children: [{ kind: "agent-run-date" }],
    })).toBe(true);
  });

  it("treats an item with a manually defined child as a group", () => {
    expect(isAgentJobCaseNode({
      kind: "agent-job",
      children: [{ kind: "agent-job" }],
    })).toBe(false);
  });

  it("cascades MEMO checks down to children and up to parents", () => {
    expect(updateMemoSelection(memoNodes, [], "parent", true)).toEqual([
      "parent", "first", "nested", "second",
    ]);
    expect(updateMemoSelection(memoNodes, [], "nested", true)).toEqual([
      "parent", "first", "nested",
    ]);
  });

  it("keeps a parent checked until its final selected child is cleared", () => {
    const selected = updateMemoSelection(memoNodes, [], "parent", true);
    expect(updateMemoSelection(memoNodes, selected, "first", false)).toEqual([
      "parent", "second",
    ]);
    expect(updateMemoSelection(memoNodes, ["parent", "first", "nested"], "nested", false))
      .toEqual([]);
  });
});
