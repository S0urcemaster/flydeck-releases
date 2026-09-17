import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSportPosePresets, parseSportPosePresets } from "./SportPosePresets";
import { saveSportPosePresets } from "./SportPosePresetsStore";

const state = vi.hoisted(() => ({
  nodes: [] as { id: string; parentId: string; localId: string; label: string }[],
  contents: {} as Record<string, { content: string; revision: number }>, commands: [] as string[], treeRevision: 0,
}));

vi.mock("../../replica", () => ({
  workspaceReplica: { getSnapshot: () => ({ tree: { document: { nodes: state.nodes, revision: state.treeRevision } }, contents: state.contents }) },
  workspaceSyncEngine: {
    ensureContents: async () => true,
    submit: async (_scope: unknown, command: { type: string; nodeId?: string; input: { nodeId?: string; parentId?: string; localId?: string; label?: string; content?: string } }) => {
      state.commands.push(command.type);
      if (command.type === "create-node") { state.nodes.push({ id: command.input.nodeId!, parentId: command.input.parentId!, localId: command.input.localId!, label: command.input.label! }); state.treeRevision += 1; }
      if (command.type === "update-content") state.contents[command.nodeId!] = { content: command.input.content!, revision: 1 };
    },
  },
}));

describe("sport pose preset storage", () => {
  beforeEach(() => { state.nodes.length = 0; state.commands.length = 0; state.contents = {}; state.treeRevision = 0; });
  it("creates and reuses _user/pose-presets beneath the selected source", async () => {
    const scope = { userId: "user", workspaceId: "workspace" };
    await saveSportPosePresets(scope, "source-root", defaultSportPosePresets);
    const user = state.nodes.find((node) => node.parentId === "source-root" && node.localId === "_user")!;
    const presets = state.nodes.find((node) => node.parentId === user.id && node.localId === "pose-presets")!;
    expect(parseSportPosePresets(state.contents[presets.id].content)).toEqual(defaultSportPosePresets);
    expect(state.commands).toEqual(["create-node", "create-node", "update-content"]);
    await saveSportPosePresets(scope, "source-root", defaultSportPosePresets);
    expect(state.commands).toHaveLength(3);
  });
});
