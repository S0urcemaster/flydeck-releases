import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSportMetrics, parseSportMetrics } from "./SportMetrics";
import { saveSportMetrics } from "./SportMetricsStore";

const state = vi.hoisted(() => ({
  nodes: [] as { id: string; parentId: string; localId: string; label: string }[],
  contents: {} as Record<string, { content: string; revision: number }>,
  commands: [] as string[],
  treeRevision: 0,
}));

vi.mock("../../replica", () => ({
  workspaceReplica: { getSnapshot: () => ({
    tree: { document: { nodes: state.nodes, revision: state.treeRevision } },
    contents: state.contents,
  }) },
  workspaceSyncEngine: {
    ensureContents: async () => true,
    submit: async (_scope: unknown, command: { type: string; nodeId?: string; input: { nodeId?: string; parentId?: string; localId?: string; label?: string; content?: string } }) => {
      state.commands.push(command.type);
      if (command.type === "create-node") {
        state.nodes.push({ id: command.input.nodeId!, parentId: command.input.parentId!, localId: command.input.localId!, label: command.input.label! });
        state.treeRevision += 1;
      } else if (command.type === "update-content") {
        state.contents[command.nodeId!] = { content: command.input.content!, revision: 1 };
      }
    },
  },
}));

describe("sport metrics storage", () => {
  beforeEach(() => {
    state.nodes.length = 0;
    state.commands.length = 0;
    state.contents = {};
    state.treeRevision = 0;
  });

  it("creates the _user/metrics path beneath the selected source and reuses it", async () => {
    const scope = { userId: "user", workspaceId: "workspace" };
    await saveSportMetrics(scope, "source-root", defaultSportMetrics);
    const user = state.nodes.find((node) => node.parentId === "source-root" && node.localId === "_user")!;
    const metrics = state.nodes.find((node) => node.parentId === user.id && node.localId === "metrics")!;
    expect(parseSportMetrics(state.contents[metrics.id].content)).toEqual(defaultSportMetrics);
    expect(state.commands).toEqual(["create-node", "create-node", "update-content"]);
    await saveSportMetrics(scope, "source-root", defaultSportMetrics);
    expect(state.commands).toHaveLength(3);
  });
});
