import { describe, expect, it } from "vitest";

import { dataSourceBranchExists } from "./FunctionsModule";

const capabilities = {
  contentEditable: false,
  listEditable: true,
  listItemLimit: null,
};
const nodes = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    parentId: null,
    kind: "system-directory",
    label: "_system",
    position: 0,
    revision: 0,
    capabilities,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    parentId: "00000000-0000-4000-8000-000000000001",
    kind: "app-directory",
    label: "Compass",
    position: 0,
    revision: 0,
    capabilities,
  },
];

describe("dataSourceBranchExists", () => {
  it("resolves a complete branch path", () => {
    expect(dataSourceBranchExists(nodes, "_system/Compass")).toBe(true);
    expect(dataSourceBranchExists(nodes, "_system/Missing")).toBe(false);
  });
});
