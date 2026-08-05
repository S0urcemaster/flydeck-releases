import { describe, expect, it } from "vitest";

import {
  agentMemoryInitialDrafts,
  agentMemoryInitialTree,
  defaultAgentMemory,
} from "./agentMemory";

describe("default agent memory", () => {
  it("provides a versioned, useful initial memory without demo data", () => {
    expect(defaultAgentMemory.version).toBe(1);
    expect(agentMemoryInitialTree.map(({ label }) => label)).toEqual([
      "Identity",
      "User",
      "Workspace",
      "Operating rules",
      "Continuity",
    ]);
    expect(agentMemoryInitialDrafts["identity-role"]).toContain("Flydeck");
    expect(JSON.stringify(defaultAgentMemory)).not.toContain("Gefäßpflanzen");
  });
});
