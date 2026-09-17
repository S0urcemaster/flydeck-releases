import { workspaceReplica, workspaceSyncEngine, type WorkspaceReplicaScope } from "../../replica";
import { sportPosePresetsContent, type SportPosePresets } from "./SportPosePresets";

async function ensureChild(scope: WorkspaceReplicaScope, parentId: string, localId: string, label: string) {
  const snapshot = workspaceReplica.getSnapshot(scope);
  if (!snapshot?.tree) throw new Error("Exercise data source is unavailable");
  const nodes = snapshot.tree.document.nodes;
  const existing = nodes.find((node) => node.parentId === parentId && node.localId === localId);
  if (existing) return existing.id;
  const nodeId = crypto.randomUUID();
  await workspaceSyncEngine.submit(scope, { type: "create-node", input: { requestId: crypto.randomUUID(), nodeId, parentId, afterNodeId: nodes.filter((node) => node.parentId === parentId).at(-1)?.id ?? null, kind: "data-file", label, localId, expectedTreeRevision: snapshot.tree.document.revision }});
  return nodeId;
}

export async function saveSportPosePresets(scope: WorkspaceReplicaScope, rootId: string, value: SportPosePresets) {
  const userId = await ensureChild(scope, rootId, "_user", "User");
  const presetId = await ensureChild(scope, userId, "pose-presets", "Pose presets");
  if (!workspaceReplica.getSnapshot(scope)?.contents[presetId]) await workspaceSyncEngine.ensureContents(scope, [presetId]);
  const current = workspaceReplica.getSnapshot(scope)?.contents[presetId];
  const content = sportPosePresetsContent(value);
  if (current?.content === content) return;
  await workspaceSyncEngine.submit(scope, { type: "update-content", nodeId: presetId, input: { requestId: crypto.randomUUID(), content, expectedRevision: current?.revision ?? 0 }});
}
