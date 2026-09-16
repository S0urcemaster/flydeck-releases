import { workspaceReplica, workspaceSyncEngine, type WorkspaceReplicaScope } from "../../replica";
import { sportMetricsContent, type SportMetricValues } from "./SportMetrics";

async function ensureChild(scope: WorkspaceReplicaScope, parentId: string, localId: string, label: string) {
  const snapshot = workspaceReplica.getSnapshot(scope);
  if (!snapshot?.tree) throw new Error("Exercise data source is unavailable");
  const nodes = snapshot.tree.document.nodes;
  const existing = nodes.find((node) => node.parentId === parentId && node.localId === localId);
  if (existing) return existing.id;
  const siblings = nodes.filter((node) => node.parentId === parentId);
  const nodeId = crypto.randomUUID();
  await workspaceSyncEngine.submit(scope, { type: "create-node", input: {
    requestId: crypto.randomUUID(), nodeId, parentId, afterNodeId: siblings.at(-1)?.id ?? null,
    kind: "data-file", label, localId,
    expectedTreeRevision: snapshot.tree.document.revision,
  }});
  return nodeId;
}

export async function saveSportMetrics(scope: WorkspaceReplicaScope, rootId: string, values: SportMetricValues) {
  const userId = await ensureChild(scope, rootId, "_user", "User");
  const previousMetricsId = workspaceReplica.getSnapshot(scope)?.tree?.document.nodes.find((node) => node.parentId === userId && node.localId === "metrics")?.id;
  const metricsId = await ensureChild(scope, userId, "metrics", "Body metrics");
  if (previousMetricsId && !workspaceReplica.getSnapshot(scope)?.contents[metricsId]) {
    await workspaceSyncEngine.ensureContents(scope, [metricsId]);
  }
  const content = sportMetricsContent(values);
  const snapshot = workspaceReplica.getSnapshot(scope);
  if (snapshot?.contents[metricsId]?.content === content) return;
  await workspaceSyncEngine.submit(scope, { type: "update-content", nodeId: metricsId, input: {
    requestId: crypto.randomUUID(), content, expectedRevision: snapshot?.contents[metricsId]?.revision ?? 0,
  }});
}
