import type {
  CreateTreeNodeWithContentRequest,
  CreateTreeNodeResponse,
  DeleteTreeNodeRequest,
  EditTreeNodeRequest,
  MutationRevisionDto,
  RenameTreeNodeRequest,
  ReparentTreeNodeRequest,
  SessionDto,
  SetTreeNodeEnabledRequest,
  SetTreeNodeEnabledResponse,
  TreeLoadDto,
  TreeNodeContentDto,
  TreeNodeDto,
  UpdateTreeNodeLocalIdRequest,
} from "@flydeck/shared/v2";

const API_BASE = "/flydeck/api/v2";

export type Workspace = Extract<SessionDto, { authenticated: true }>["workspaces"][number];

export interface TreeRow extends TreeNodeDto {
  children: TreeRow[];
  descendantCount: number;
  enabled: boolean;
  enabledRevision: number;
  path: string[];
  draft?: boolean;
}

export interface DesktopData {
  workspace: Workspace;
  tree: TreeLoadDto;
  roots: TreeRow[];
  rowsById: Map<string, TreeRow>;
}

export async function loadDesktopData(): Promise<DesktopData> {
  const session = await request<SessionDto>("/auth/session");
  if (!session.authenticated || !session.workspaces[0]) {
    throw new Error("Die lokale Flydeck-Session ist nicht verfuegbar.");
  }

  const workspace = session.workspaces[0];
  const tree = await request<TreeLoadDto>(
    `/workspaces/${encodeURIComponent(workspace.id)}/trees/data`,
  );
  const { roots, rowsById } = buildTreeRows(tree);
  return { workspace, tree, roots, rowsById };
}

export function loadNodeContent(workspaceId: string, nodeId: string) {
  return request<TreeNodeContentDto>(
    `/workspaces/${encodeURIComponent(workspaceId)}/trees/data/nodes/${encodeURIComponent(nodeId)}/content`,
  );
}

export function createDataNode(workspaceId: string, input: CreateTreeNodeWithContentRequest) {
  return request<CreateTreeNodeResponse>(
    `/workspaces/${encodeURIComponent(workspaceId)}/trees/data/nodes/with-content`,
    { method: "POST", body: input },
  );
}

export function renameDataNode(
  workspaceId: string,
  nodeId: string,
  input: RenameTreeNodeRequest,
) {
  return request<CreateTreeNodeResponse>(nodePath(workspaceId, nodeId), {
    method: "PATCH",
    body: input,
  });
}

export function editDataNode(
  workspaceId: string,
  nodeId: string,
  input: EditTreeNodeRequest,
) {
  return request<CreateTreeNodeResponse>(`${nodePath(workspaceId, nodeId)}/edit`, {
    method: "PUT",
    body: input,
  });
}

export function deleteDataNode(
  workspaceId: string,
  nodeId: string,
  input: DeleteTreeNodeRequest,
) {
  return request<MutationRevisionDto>(nodePath(workspaceId, nodeId), {
    method: "DELETE",
    body: input,
  });
}

export function updateDataNodeLocalId(
  workspaceId: string,
  nodeId: string,
  input: UpdateTreeNodeLocalIdRequest,
) {
  return request<CreateTreeNodeResponse>(`${nodePath(workspaceId, nodeId)}/local-id`, {
    method: "PUT",
    body: input,
  });
}

export function reparentDataNode(
  workspaceId: string,
  nodeId: string,
  input: ReparentTreeNodeRequest,
) {
  return request<CreateTreeNodeResponse>(`${nodePath(workspaceId, nodeId)}/parent`, {
    method: "PUT",
    body: input,
  });
}

export function setDataNodeEnabled(
  workspaceId: string,
  nodeId: string,
  input: SetTreeNodeEnabledRequest,
) {
  return request<SetTreeNodeEnabledResponse>(`${nodePath(workspaceId, nodeId)}/enabled`, {
    method: "PUT",
    body: input,
  });
}

function buildTreeRows(tree: TreeLoadDto) {
  const enabled = new Set(tree.semanticState.enabledNodeIds);
  const rowsById = new Map<string, TreeRow>();

  for (const node of tree.document.nodes) {
    rowsById.set(node.id, {
      ...node,
      children: [],
      descendantCount: 0,
      enabled: enabled.has(node.id),
      enabledRevision: tree.semanticState.nodeRevisions[node.id] ?? 0,
      path: [],
    });
  }

  const roots: TreeRow[] = [];
  for (const node of tree.document.nodes) {
    const row = rowsById.get(node.id)!;
    const parent = node.parentId ? rowsById.get(node.parentId) : undefined;
    if (parent) parent.children.push(row);
    else roots.push(row);
  }

  const finalize = (row: TreeRow, parentPath: string[]): number => {
    row.path = [...parentPath, row.localId];
    row.descendantCount = row.children.reduce(
      (total, child) => total + 1 + finalize(child, row.path),
      0,
    );
    return row.descendantCount;
  };
  roots.forEach((row) => finalize(row, []));

  return { roots, rowsById };
}

function nodePath(workspaceId: string, nodeId: string) {
  return `/workspaces/${encodeURIComponent(workspaceId)}/trees/data/nodes/${encodeURIComponent(nodeId)}`;
}

async function request<TResult>(
  path: string,
  options?: { method: string; body: unknown },
): Promise<TResult> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    method: options?.method,
    headers: options ? { "content-type": "application/json" } : undefined,
    body: options ? JSON.stringify(options.body) : undefined,
  });
  const body = await response.json() as unknown;
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? String(body.message)
      : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body as TResult;
}
