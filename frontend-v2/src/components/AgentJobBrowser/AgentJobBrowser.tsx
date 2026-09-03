import { useEffect, useMemo, useRef, useState } from "react";
import {
  createTreeNodeLocalId,
  type TreeLoadDto,
  type TreeNodeDto,
} from "@flydeck/shared/v2";
import { Base, type BaseStyleProps } from "../Base";
import { ContentEditor } from "../TreeBrowser/ContentEditor";
import { ServerDataContent } from "../DataBrowser/DataBrowser";
import { JobCase, type JobCaseStyleProps } from "../JobCase";
import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserInitialNode,
  type TreeBrowserProps,
} from "../TreeBrowser";
import type { InputControlProps } from "../InputControl";
import type { NodeIdInputProps } from "../NodeIdInput";
import type { ParentInputProps } from "../ParentInput";
import {
  useWorkspaceReplica,
  workspaceSyncEngine,
  type WorkspaceReplicaScope,
} from "../../replica";
import { useClientStateScope } from "../../state";
import styles from "./AgentJobBrowser.module.css";

type JobNodeData = { kind: string; runContentEditable?: boolean };

export type AgentJobBrowserProps = BaseStyleProps & {
  inputControlProps?: InputControlProps;
  jobCaseProps?: JobCaseStyleProps;
  memoSelectionIds?: readonly string[];
  nodeIdInputProps?: Omit<NodeIdInputProps,
    "available" | "disabled" | "onChange" | "onSave" | "savedValue" | "value">;
  parentInputProps?: Omit<ParentInputProps,
    "current" | "onChange" | "onSetParent" | "targets" | "value">;
  treeBrowserProps?: Omit<TreeBrowserProps<unknown>,
    "model" | "renderContent" | "structureManagedExternally">;
  workspaceId?: string;
  onSynchronizationError?: (reason: string) => void;
};

export function AgentJobBrowser({
  inputControlProps,
  jobCaseProps,
  memoSelectionIds = [],
  nodeIdInputProps,
  parentInputProps,
  treeBrowserProps,
  workspaceId,
  onSynchronizationError,
  ...baseProps
}: AgentJobBrowserProps) {
  const workspace = useAgentWorkspace(workspaceId, onSynchronizationError);
  const [locallyConfiguredJobIds, setLocallyConfiguredJobIds] = useState<Set<string>>(
    new Set(),
  );
  const treeRevision = useRef(0);
  const nodeRevisions = useRef(new Map<string, number>());

  useEffect(() => {
    if (!workspace.tree) return;
    treeRevision.current = workspace.tree.document.revision;
    nodeRevisions.current = new Map(workspace.tree.document.nodes.map((node) => [
      node.id, node.revision,
    ]));
  }, [workspace.tree]);

  const jobsRoot = workspace.tree
    ? findNodeByPath(workspace.tree.document.nodes, "_system/agnt/jobs")
    : undefined;
  const jobNodes = useMemo(() => jobsRoot && workspace.tree
    ? collectSubtreeNodes(workspace.tree.document.nodes, jobsRoot.id)
    : [], [jobsRoot, workspace.tree]);
  const model = useMemo(() => new TreeBrowserModel<JobNodeData>({
    definitionAuthority: true,
    initialTree: jobsRoot && workspace.tree
      ? toBrowserTree(workspace.tree, jobsRoot.id)
      : [],
    storageKey: `flydeck.tree.agent-jobs.${workspaceId ?? "none"}`,
  }), [jobsRoot, workspace.tree, workspaceId]);

  useEffect(() => {
    if (!workspace.scope || jobNodes.length === 0) return;
    const contentIds = jobNodes
      .filter(({ kind }) => kind === "agent-job-run")
      .map(({ id }) => id);
    if (contentIds.length) void workspaceSyncEngine.ensureContents(workspace.scope, contentIds);
  }, [jobNodes, workspace.scope]);

  async function submit(
    command: Parameters<typeof workspaceSyncEngine.submit>[1],
    userCommandId?: string,
  ) {
    if (!workspace.scope) return null;
    try {
      return await workspaceSyncEngine.submit(workspace.scope, command, userCommandId);
    } catch (error) {
      onSynchronizationError?.(errorMessage(error));
      return null;
    }
  }

  if (!workspaceId || !workspace.scope || !workspace.tree || !jobsRoot) return null;

  const nodesById = new Map(jobNodes.map((node) => [node.id, node]));
  const configuredJobIds = new Set([
    ...jobNodes.filter((node) => node.jobConfigured).map((node) => node.id),
    ...locallyConfiguredJobIds,
  ]);
  const hasRunChildren = (nodeId: string) => jobNodes.some((node) => (
    node.parentId === nodeId && node.kind === "agent-run-date"
  ));
  const canOwnJobChildren = (nodeId: string) => {
    const node = nodesById.get(nodeId);
    return Boolean(node && isJobItemKind(node.kind)
      && !configuredJobIds.has(nodeId) && !hasRunChildren(nodeId));
  };
  return (
    <Base {...baseProps} className={styles.root} componentName="AgentJobBrowser">
      <TreeBrowser
        {...treeBrowserProps}
        browserLabel="Jobs browser"
        componentName="TreeBrowser"
        itemRenameVisible={false}
        menuVisible={false}
        model={model}
        rootLabel="Jobs"
        structureManagedExternally
        listControlProps={{
          ...treeBrowserProps?.listControlProps,
          deleteButtonProps: {
            ...treeBrowserProps?.listControlProps?.deleteButtonProps,
            confirmation: false,
          },
        }}
        canCreateNode={(parentId) => parentId === "__tree_root__"
          || canOwnJobChildren(parentId)}
        canDeleteNode={(node) => ![
          "system-directory", "trash-directory", "agent-run-date",
        ].includes(node.kind ?? "")}
        canMoveNode={(node) => ["agent-job", "agent-job-group"].includes(node.kind ?? "")}
        canRenameNode={(node) => ["agent-job", "agent-job-group"].includes(node.kind ?? "")}
        onCreateNode={async (name, parentId, afterNodeId) => {
          const actualParentId = parentId ?? jobsRoot.id;
          if (parentId && !canOwnJobChildren(parentId)) return false;
          const siblings = workspace.tree!.document.nodes.filter((node) => (
            node.parentId === actualParentId
          ));
          const nodeId = crypto.randomUUID();
          const record = await submit({
            type: "create-node",
            input: {
              requestId: crypto.randomUUID(), nodeId,
              parentId: actualParentId, afterNodeId,
              kind: "agent-job", label: name,
              localId: createTreeNodeLocalId(name, siblings.map(({ localId }) => localId)),
              expectedTreeRevision: treeRevision.current,
            },
          });
          await workspaceSyncEngine.flush(workspace.scope!);
          const created = record?.tree?.document.nodes.find(({ id }) => id === nodeId);
          return created ? toCreatedNode(created) : false;
        }}
        onRenameNode={async (nodeId, label) => Boolean(await submit({
          type: "rename-node", nodeId,
          input: {
            requestId: crypto.randomUUID(), label,
            expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
          },
        }))}
        onUpdateNodeLocalId={async (nodeId, localId) => Boolean(await submit({
          type: "update-local-id", nodeId,
          input: {
            requestId: crypto.randomUUID(), localId,
            expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
          },
        }))}
        onMoveNode={async (nodeId, afterNodeId) => Boolean(await submit({
          type: "move-node", nodeId,
          input: {
            requestId: crypto.randomUUID(), afterNodeId,
            expectedTreeRevision: treeRevision.current,
          },
        }))}
        onReparentNode={async (nodeId, parentId, userCommandId) => {
          const source = nodesById.get(nodeId);
          const target = parentId ? nodesById.get(parentId) : null;
          if (!source || !["agent-job", "agent-job-group"].includes(source.kind)) return false;
          if (target && !canOwnJobChildren(target.id)) return false;
          return Boolean(await submit({
            type: "reparent-node", nodeId,
            input: {
              requestId: crypto.randomUUID(),
              parentId: parentId ?? jobsRoot.id,
              expectedTreeRevision: treeRevision.current,
            },
          }, userCommandId));
        }}
        onDeleteNode={async (nodeId, userCommandId) => Boolean(await submit({
          type: "delete-node", nodeId,
          input: {
            requestId: crypto.randomUUID(),
            expectedTreeRevision: treeRevision.current,
          },
        }, userCommandId))}
        renderContent={(renderProps) => {
          const { node } = renderProps;
          if (isAgentJobCaseNode(node)) {
            const eligibleParentIds = new Set(jobNodes
              .filter((candidate) => canOwnJobChildren(candidate.id))
              .map(({ id }) => id));
            const filteredRoot = renderProps.root ? {
              ...renderProps.root,
              targets: renderProps.root.targets.map((target) => ({
                ...target,
                eligible: target.eligible && (
                  target.id === null || eligibleParentIds.has(target.id)
                ),
              })),
            } : undefined;
            return (
              <JobCase
                {...jobCaseProps}
                {...renderProps}
                height={jobCaseProps?.height ?? "unset"}
                inputControlProps={inputControlProps}
                localId={node.localId ?? ""}
                name={node.label}
                memoSelectionIds={memoSelectionIds}
                nodeId={node.id}
                nodeIdInputProps={nodeIdInputProps}
                parentInputProps={parentInputProps}
                root={filteredRoot}
                scope={workspace.scope!}
                tree={workspace.tree!}
                treeBrowserProps={treeBrowserProps}
                workspaceId={workspaceId}
                onLocalIdChange={renderProps.onLocalIdChange}
                onConfigured={() => setLocallyConfiguredJobIds((current) => (
                  new Set(current).add(node.id)
                ))}
                onNameChange={async (label) => Boolean(await submit({
                  type: "rename-node", nodeId: node.id,
                  input: {
                    requestId: crypto.randomUUID(), label,
                    expectedRevision: nodeRevisions.current.get(node.id) ?? 0,
                  },
                }))}
              >
                <JobRunsBrowser
                  initialTree={toRunBrowserTree(workspace.tree!, node.id)}
                  inputControlProps={inputControlProps}
                  jobId={node.id}
                  treeBrowserProps={treeBrowserProps}
                  workspaceId={workspaceId}
                  contents={workspace.record?.contents ?? {}}
                  onSaveRun={async (runNodeId, value) => {
                    const content = workspace.record?.contents[runNodeId];
                    if (!content) return;
                    await submit({
                      type: "update-content", nodeId: runNodeId,
                      input: {
                        requestId: crypto.randomUUID(), content: value,
                        expectedRevision: content.revision,
                      },
                    });
                  }}
                />
              </JobCase>
            );
          }
          if (node.kind === "agent-job-run") {
            const content = workspace.record?.contents[node.id];
            return (
              <PersistentContentEditor
                content={content?.content ?? ""}
                disabled={node.contentEditable === false}
                height={renderProps.height}
                inputControlProps={inputControlProps}
                label={node.contentEditable === false ? "Run running" : "Run response"}
                onSave={async (value) => {
                  if (!content || node.contentEditable === false) return;
                  await submit({
                    type: "update-content", nodeId: node.id,
                    input: {
                      requestId: crypto.randomUUID(), content: value,
                      expectedRevision: content.revision,
                    },
                  });
                }}
              />
            );
          }
          return null;
        }}
      />
    </Base>
  );
}

export function AgentMemoBrowser({
  checkedNodeIds = [],
  inputControlProps,
  nodeIdInputProps,
  parentInputProps,
  onNodeCheckedChange,
  treeBrowserProps,
  workspaceId,
  onSynchronizationError,
}: Pick<AgentJobBrowserProps,
  "inputControlProps" | "nodeIdInputProps" | "parentInputProps"
  | "treeBrowserProps" | "workspaceId" | "onSynchronizationError"> & {
    checkedNodeIds?: readonly string[];
    onNodeCheckedChange?: (nodeIds: string[]) => void;
  }) {
  const workspace = useAgentWorkspace(workspaceId, onSynchronizationError);
  const treeRevision = useRef(0);
  const nodeRevisions = useRef(new Map<string, number>());
  const memoRoot = workspace.tree
    ? findNodeByPath(workspace.tree.document.nodes, "_system/agnt/memo")
    : undefined;
  const memoNodes = useMemo(() => memoRoot && workspace.tree
    ? collectSubtreeNodes(workspace.tree.document.nodes, memoRoot.id)
    : [], [memoRoot, workspace.tree]);
  const model = useMemo(() => new TreeBrowserModel({
    definitionAuthority: true,
    initialTree: memoRoot && workspace.tree
      ? toMemoBrowserTree(workspace.tree, memoRoot.id)
      : [],
    storageKey: `flydeck.tree.agent-memo.${workspaceId ?? "none"}`,
  }), [memoRoot, workspace.tree, workspaceId]);

  useEffect(() => {
    if (!workspace.tree) return;
    treeRevision.current = workspace.tree.document.revision;
    nodeRevisions.current = new Map(workspace.tree.document.nodes.map((node) => [
      node.id, node.revision,
    ]));
  }, [workspace.tree]);
  useEffect(() => {
    if (workspace.scope && memoNodes.length) void workspaceSyncEngine.ensureContents(
      workspace.scope,
      memoNodes.map(({ id }) => id),
    );
  }, [memoNodes, workspace.scope]);

  async function submit(command: Parameters<typeof workspaceSyncEngine.submit>[1]) {
    if (!workspace.scope) return null;
    try {
      return await workspaceSyncEngine.submit(workspace.scope, command);
    } catch (error) {
      onSynchronizationError?.(errorMessage(error));
      return null;
    }
  }
  if (!workspace.scope || !workspace.tree || !memoRoot) return null;
  return (
    <TreeBrowser
      {...treeBrowserProps}
      browserLabel="Memo browser"
      checkedNodeIds={checkedNodeIds}
      componentName="TreeBrowser"
      menuVisible={false}
      model={model}
      rootLabel="Memo"
      structureManagedExternally
      onNodeCheckedChange={(node, checked) => onNodeCheckedChange?.(
        updateMemoSelection(memoNodes, checkedNodeIds, node.id, checked),
      )}
      onCreateNode={async (name, parentId, afterNodeId) => {
        const actualParentId = parentId ?? memoRoot.id;
        const siblings = workspace.tree!.document.nodes.filter(({ parentId: candidate }) => (
          candidate === actualParentId
        ));
        const nodeId = crypto.randomUUID();
        const record = await submit({
          type: "create-node",
          input: {
            requestId: crypto.randomUUID(), nodeId,
            parentId: actualParentId, afterNodeId,
            kind: "agent-memo", label: name,
            localId: createTreeNodeLocalId(name, siblings.map(({ localId }) => localId)),
            expectedTreeRevision: treeRevision.current,
          },
        });
        const created = record?.tree?.document.nodes.find(({ id }) => id === nodeId);
        return created ? toCreatedNode(created) : false;
      }}
      onRenameNode={async (nodeId, label) => Boolean(await submit({
        type: "rename-node", nodeId,
        input: {
          requestId: crypto.randomUUID(), label,
          expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
        },
      }))}
      onUpdateNodeLocalId={async (nodeId, localId) => Boolean(await submit({
        type: "update-local-id", nodeId,
        input: {
          requestId: crypto.randomUUID(), localId,
          expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
        },
      }))}
      onMoveNode={async (nodeId, afterNodeId) => Boolean(await submit({
        type: "move-node", nodeId,
        input: {
          requestId: crypto.randomUUID(), afterNodeId,
          expectedTreeRevision: treeRevision.current,
        },
      }))}
      onReparentNode={async (nodeId, parentId) => Boolean(await submit({
        type: "reparent-node", nodeId,
        input: {
          requestId: crypto.randomUUID(), parentId: parentId ?? memoRoot.id,
          expectedTreeRevision: treeRevision.current,
        },
      }))}
      onDeleteNode={async (nodeId) => Boolean(await submit({
        type: "delete-node", nodeId,
        input: {
          requestId: crypto.randomUUID(),
          expectedTreeRevision: treeRevision.current,
        },
      }))}
      renderContent={({
        height,
        localIdAvailable,
        node,
        onLocalIdChange,
        onPageSizeChange,
        pageSize,
        root,
      }) => {
        const serverNode = workspace.tree!.document.nodes.find(({ id }) => id === node.id);
        return (
          <ServerDataContent
            {...inputControlProps}
            height={height}
            localId={node.localId ?? ""}
            localIdAvailable={localIdAvailable}
            name={node.label}
            nodeId={node.id}
            nodeIdInputProps={nodeIdInputProps}
            onLocalIdChange={onLocalIdChange}
            onNameChange={async (label) => Boolean(await submit({
              type: "rename-node", nodeId: node.id,
              input: {
                requestId: crypto.randomUUID(), label,
                expectedRevision: nodeRevisions.current.get(node.id) ?? 0,
              },
            }))}
            onPageSizeChange={onPageSizeChange}
            onSharingChange={async (shared, shareName) => Boolean(await submit({
              type: "set-node-sharing", nodeId: node.id,
              input: {
                requestId: crypto.randomUUID(), shared, shareName,
                expectedRevision: nodeRevisions.current.get(node.id) ?? 0,
              },
            }))}
            pageSize={pageSize}
            parentInputProps={parentInputProps}
            replicaScope={workspace.scope!}
            root={root}
            rootInputProps={treeBrowserProps?.listControlProps?.inputProps}
            shared={serverNode?.shared ?? false}
            shareName={serverNode?.shareName ?? null}
            listSizeButtonProps={treeBrowserProps?.listControlProps?.listSizeButtonProps}
            onSynchronizationError={(error) => onSynchronizationError?.(errorMessage(error))}
          />
        );
      }}
    />
  );
}


function useAgentWorkspace(
  workspaceId: string | undefined,
  onError: ((reason: string) => void) | undefined,
) {
  const { userId } = useClientStateScope();
  const scope = useMemo<WorkspaceReplicaScope | null>(() => workspaceId
    ? { userId, workspaceId } : null, [userId, workspaceId]);
  const record = useWorkspaceReplica(scope);
  const tree = record?.tree ?? null;
  const bootstrapping = useRef(false);
  useEffect(() => {
    if (!scope || !tree || bootstrapping.current) return;
    if (findNodeByPath(tree.document.nodes, "_system/agnt/jobs")
      && findNodeByPath(tree.document.nodes, "_system/agnt/memo")) return;
    bootstrapping.current = true;
    void ensureAgentDataStructure(scope, tree.document.nodes, tree.document.revision)
      .catch((error: unknown) => onError?.(errorMessage(error)))
      .finally(() => { bootstrapping.current = false; });
  }, [onError, scope, tree]);
  return { scope, record, tree };
}

async function ensureAgentDataStructure(
  scope: WorkspaceReplicaScope,
  initialNodes: readonly TreeNodeDto[],
  initialRevision: number,
) {
  let nodes = [...initialNodes];
  let revision = initialRevision;
  const system = findNodeByPath(nodes, "_system");
  if (!system) return false;
  const userCommandId = crypto.randomUUID();
  async function ensureNode(
    parentId: string,
    label: string,
    localId: string,
    kind: string,
    content = "",
  ) {
    const existing = nodes.find((node) => node.parentId === parentId
      && node.localId.toLowerCase() === localId.toLowerCase());
    if (existing) return existing;
    const siblings = nodes.filter((node) => node.parentId === parentId).sort(compareNodes);
    const nodeId = crypto.randomUUID();
    let record = await workspaceSyncEngine.submit(scope, {
      type: "create-node",
      input: {
        requestId: crypto.randomUUID(), nodeId, parentId,
        afterNodeId: siblings.at(-1)?.id ?? null,
        kind, label, localId, expectedTreeRevision: revision,
      },
    }, userCommandId);
    if (!record.tree) return null;
    nodes = [...record.tree.document.nodes];
    revision = record.tree.document.revision;
    if (content) {
      record = await workspaceSyncEngine.submit(scope, {
        type: "update-content", nodeId,
        input: { requestId: crypto.randomUUID(), content, expectedRevision: 0 },
      }, userCommandId);
      nodes = [...(record.tree?.document.nodes ?? nodes)];
      revision = record.tree?.document.revision ?? revision;
    }
    return nodes.find(({ id }) => id === nodeId) ?? null;
  }
  const agent = await ensureNode(system.id, "Agnt", "agnt", "system-directory");
  if (!agent) return false;
  const jobs = await ensureNode(agent.id, "Jobs", "jobs", "system-directory");
  const memo = await ensureNode(agent.id, "Memo", "memo", "system-directory");
  if (!jobs || !memo) return false;
  if (!nodes.some(({ parentId }) => parentId === jobs.id)) {
    await ensureNode(jobs.id, "Job", "job", "agent-job");
  }
  await workspaceSyncEngine.flush(scope);
  return true;
}

function toBrowserTree(
  tree: TreeLoadDto,
  parentId: string,
): TreeBrowserInitialNode<JobNodeData>[] {
  return tree.document.nodes
    .filter((node) => node.parentId === parentId)
    .sort(compareNodes)
    .map((node) => {
      const allChildren = tree.document.nodes.filter((candidate) => (
        candidate.parentId === node.id
      ));
      const organizationalChildren = allChildren.filter((child) => (
        isJobItemKind(child.kind)
      ));
      const children = isJobItemKind(node.kind)
        ? organizationalChildren.flatMap((child) => toBrowserTreeNode(tree, child))
        : toBrowserTree(tree, node.id);
      const isGroup = isJobItemKind(node.kind)
        && children.some((child) => isJobItemKind(child.kind));
      return {
      id: node.id,
      kind: node.kind,
      label: node.label,
      localId: node.localId,
      enabled: true,
      contentEditable: node.capabilities.contentEditable && !isGroup,
      contentVisible: false,
      listEditable: isJobItemKind(node.kind) || node.kind === "agent-run-date"
        ? true
        : node.capabilities.listEditable,
      listItemLimit: node.kind === "agent-job" ? undefined
        : node.kind === "agent-run-date" ? undefined : node.capabilities.listItemLimit ?? undefined,
      data: { kind: node.kind },
      children,
    };
    });
}

function toMemoBrowserTree(
  tree: TreeLoadDto,
  parentId: string,
): TreeBrowserInitialNode[] {
  return tree.document.nodes
    .filter((node) => node.parentId === parentId)
    .sort(compareNodes)
    .map((node) => ({
      id: node.id,
      kind: node.kind,
      label: node.label,
      localId: node.localId,
      enabled: true,
      contentEditable: node.capabilities.contentEditable,
      contentVisible: false,
      listEditable: node.capabilities.listEditable,
      listItemLimit: node.capabilities.listItemLimit ?? undefined,
      children: toMemoBrowserTree(tree, node.id),
    }));
}

function toBrowserTreeNode(
  tree: TreeLoadDto,
  node: TreeNodeDto,
): TreeBrowserInitialNode<JobNodeData>[] {
  const children = tree.document.nodes
    .filter((candidate) => candidate.parentId === node.id && isJobItemKind(candidate.kind))
    .sort(compareNodes)
    .flatMap((child) => toBrowserTreeNode(tree, child));
  return [{
    id: node.id,
    kind: node.kind,
    label: node.label,
    localId: node.localId,
    enabled: true,
    contentEditable: node.capabilities.contentEditable && children.length === 0,
    contentVisible: children.length === 0,
    listEditable: true,
    data: { kind: node.kind },
    children,
  }];
}

function toRunBrowserTree(
  tree: TreeLoadDto,
  jobId: string,
): TreeBrowserInitialNode<JobNodeData>[] {
  const visit = (parentId: string): TreeBrowserInitialNode<JobNodeData>[] => tree.document.nodes
    .filter((node) => node.parentId === parentId && (
      node.kind === "agent-run-date" || node.kind === "agent-job-run"
    ))
    .sort(compareNodes)
    .map((node) => ({
      id: node.id,
      kind: node.kind,
      label: node.label,
      localId: node.localId,
      enabled: true,
      // A run always owns a content level. Whether its textarea may be edited
      // is kept separately so running runs can still show that level.
      contentEditable: node.kind === "agent-job-run"
        ? true : node.capabilities.contentEditable,
      contentVisible: false,
      listEditable: false,
      data: {
        kind: node.kind,
        runContentEditable: node.capabilities.contentEditable,
      },
      children: visit(node.id),
    }));
  return visit(jobId);
}

function JobRunsBrowser({
  contents,
  initialTree,
  inputControlProps,
  jobId,
  onSaveRun,
  treeBrowserProps,
  workspaceId,
}: {
  contents: Record<string, { content: string; revision: number }>;
  initialTree: TreeBrowserInitialNode<JobNodeData>[];
  inputControlProps?: InputControlProps;
  jobId: string;
  onSaveRun: (nodeId: string, value: string) => void | Promise<void>;
  treeBrowserProps?: AgentJobBrowserProps["treeBrowserProps"];
  workspaceId: string;
}) {
  const model = useMemo(() => new TreeBrowserModel<JobNodeData>({
    definitionAuthority: true,
    initialTree,
    storageKey: `flydeck.tree.job-runs.${workspaceId}.${jobId}`,
  }), [initialTree, jobId, workspaceId]);
  return (
    <TreeBrowser
      {...treeBrowserProps}
      browserLabel="Runs browser"
      itemRenameVisible={false}
      leafListsVisible
      menuVisible={false}
      model={model}
      rootLabel="Runs"
      rootListEditable={false}
      canCreateNode={() => false}
      canDeleteNode={() => false}
      canMoveNode={() => false}
      canRenameNode={() => false}
      renderContent={({ height, node }) => node.kind === "agent-job-run" ? (
        <PersistentContentEditor
          content={contents[node.id]?.content ?? ""}
          disabled={(node.data as JobNodeData | undefined)?.runContentEditable === false}
          height={height}
          inputControlProps={inputControlProps}
          label={(node.data as JobNodeData | undefined)?.runContentEditable === false
            ? "Run running" : "Run response"}
          onSave={(value) => onSaveRun(node.id, value)}
        />
      ) : null}
    />
  );
}

function isJobItemKind(kind: string | undefined) {
  return kind === "agent-job" || kind === "agent-job-group";
}

export function updateMemoSelection(
  nodes: readonly Pick<TreeNodeDto, "id" | "parentId" | "position">[],
  currentIds: readonly string[],
  nodeId: string,
  checked: boolean,
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const selected = new Set(currentIds.filter((id) => byId.has(id)));
  const descendants = (parentId: string): string[] => nodes
    .filter((node) => node.parentId === parentId)
    .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
    .flatMap((node) => [node.id, ...descendants(node.id)]);
  const subtreeIds = [nodeId, ...descendants(nodeId)];

  if (checked) {
    subtreeIds.forEach((id) => selected.add(id));
    let parentId = byId.get(nodeId)?.parentId;
    while (parentId && byId.has(parentId)) {
      selected.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  } else {
    subtreeIds.forEach((id) => selected.delete(id));
    let parentId = byId.get(nodeId)?.parentId;
    while (parentId && byId.has(parentId)) {
      const hasSelectedDescendant = descendants(parentId).some((id) => selected.has(id));
      if (hasSelectedDescendant) break;
      selected.delete(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  }

  const roots = nodes.filter((node) => !node.parentId || !byId.has(node.parentId));
  const orderedIds = roots
    .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
    .flatMap((node) => [node.id, ...descendants(node.id)]);
  return orderedIds.filter((id) => selected.has(id));
}

export function isAgentJobCaseNode(node: {
  kind?: string;
  children: readonly { kind?: string }[];
}) {
  return isJobItemKind(node.kind)
    && !node.children.some((child) => isJobItemKind(child.kind));
}

function collectSubtreeNodes(nodes: readonly TreeNodeDto[], rootId: string) {
  const result: TreeNodeDto[] = [];
  const visit = (parentId: string) => {
    for (const node of nodes.filter((candidate) => candidate.parentId === parentId)) {
      result.push(node);
      visit(node.id);
    }
  };
  visit(rootId);
  return result;
}

function findNodeByPath(nodes: readonly TreeNodeDto[], path: string) {
  let parentId: string | null = null;
  let current: TreeNodeDto | undefined;
  for (const segment of path.split("/").filter(Boolean)) {
    current = nodes.find((node) => node.parentId === parentId && (
      node.localId.toLowerCase() === segment.toLowerCase()
      || node.label.toLowerCase() === segment.toLowerCase()
    ));
    if (!current) return undefined;
    parentId = current.id;
  }
  return current;
}

function compareNodes(left: TreeNodeDto, right: TreeNodeDto) {
  return left.position - right.position || left.id.localeCompare(right.id);
}

function toCreatedNode(node: TreeNodeDto) {
  return {
    id: node.id, kind: node.kind, label: node.label, localId: node.localId,
    enabled: true, contentVisible: true,
    contentEditable: node.capabilities.contentEditable,
    listEditable: node.capabilities.listEditable,
    data: { kind: node.kind }, children: [],
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Agent workspace synchronization failed";
}

function PersistentContentEditor({
  content,
  disabled = false,
  height,
  inputControlProps,
  label,
  onSave,
}: {
  content: string;
  disabled?: boolean;
  height?: string;
  inputControlProps?: InputControlProps;
  label: string;
  onSave: (value: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState({ saved: content, value: content });
  const value = draft.saved === content ? draft.value : content;
  return (
    <ContentEditor
      {...inputControlProps}
      height={height}
      value={value}
      onChange={(next) => setDraft({ saved: content, value: next })}
      onSend={async (next) => {
        if (disabled) return;
        await onSave(next);
        setDraft({ saved: next, value: next });
      }}
      textareaProps={{
        ...inputControlProps?.textareaProps,
        "aria-label": label,
        label,
        readOnly: disabled,
      }}
    />
  );
}
