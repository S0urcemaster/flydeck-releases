import { useEffect, useMemo, useRef } from "react";
import {
  createTreeNodeLocalId,
  type TreeLoadDto,
  type TreeNodeDto,
} from "@flydeck/shared/v2";
import {
  AgentChatContent,
  type AgentChatContentProps,
  type AgentChatContentStyleProps,
} from "../AgentChatContent";
import type { InputControlProps } from "../InputControl";
import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserInitialNode,
  type TreeBrowserProps,
} from "../TreeBrowser";
import {
  useWorkspaceReplica,
  workspaceSyncEngine,
  type WorkspaceReplicaScope,
} from "../../replica";
import { useClientStateScope } from "../../state";

type ChatNodeMetadata = { includeParent: boolean };

export type AgentChatBrowserProps = Omit<
  TreeBrowserProps<unknown>,
  | "componentName"
  | "createNode"
  | "model"
  | "onTreeChange"
  | "renderContent"
  | "renderInlineContent"
  | "structureManagedExternally"
> & {
  inputControlProps?: InputControlProps;
  chatContentProps?: AgentChatContentStyleProps;
  nodeIdInputProps?: AgentChatContentProps["nodeIdInputProps"];
  parentInputProps?: AgentChatContentProps["parentInputProps"];
  workspaceId?: string;
  onSynchronizationError?: (reason: string) => void;
};

export function AgentChatBrowser({
  chatContentProps,
  inputControlProps,
  nodeIdInputProps,
  parentInputProps,
  workspaceId,
  onSynchronizationError,
  ...treeBrowserProps
}: AgentChatBrowserProps) {
  const { userId } = useClientStateScope();
  const scope = useMemo<WorkspaceReplicaScope | null>(() => workspaceId
    ? { userId, workspaceId } : null, [userId, workspaceId]);
  const replicaRecord = useWorkspaceReplica(scope);
  const tree = replicaRecord?.tree ?? null;
  const treeRevision = useRef(0);
  const nodeRevisions = useRef(new Map<string, number>());
  const bootstrapping = useRef(false);
  const chatRoot = tree ? findNodeByPath(tree.document.nodes, "_system/Agnt/Chats") : undefined;
  const chatNodes = useMemo(() => chatRoot && tree
    ? collectSubtreeNodes(tree.document.nodes, chatRoot.id)
    : [], [chatRoot, tree]);

  useEffect(() => {
    if (!tree) return;
    treeRevision.current = tree.document.revision;
    nodeRevisions.current = new Map(tree.document.nodes.map((node) => [
      node.id, node.revision,
    ]));
  }, [tree]);

  useEffect(() => {
    if (!scope || !tree || bootstrapping.current) return;
    if (chatRoot && chatNodes.length > 0) return;
    bootstrapping.current = true;
    void ensureChatDataStructure(scope, tree.document.nodes, tree.document.revision)
      .catch((error: unknown) => onSynchronizationError?.(errorMessage(error)))
      .finally(() => { bootstrapping.current = false; });
  }, [chatNodes.length, chatRoot, onSynchronizationError, scope, tree]);

  useEffect(() => {
    if (!scope || chatNodes.length === 0) return;
    void workspaceSyncEngine.ensureContents(scope, chatNodes.map(({ id }) => id));
  }, [chatNodes, scope]);

  const metadata = useMemo(() => Object.fromEntries(chatNodes.map((node) => [
    node.id,
    parseChatMetadata(replicaRecord?.contents[node.id]?.content),
  ])), [chatNodes, replicaRecord?.contents]);
  const initialTree = useMemo(() => chatRoot && tree
    ? toChatTree(tree, chatRoot.id, metadata)
    : [], [chatRoot, metadata, tree]);
  const model = useMemo(() => new TreeBrowserModel<ChatNodeMetadata>({
    definitionAuthority: true,
    initialTree,
    storageKey: `flydeck.tree.agent-chat.${workspaceId ?? "none"}`,
  }), [initialTree, workspaceId]);

  async function submit(
    command: Parameters<typeof workspaceSyncEngine.submit>[1],
    userCommandId?: string,
  ) {
    if (!scope) return null;
    try {
      const record = await workspaceSyncEngine.submit(scope, command, userCommandId);
      if (record.tree) {
        treeRevision.current = record.tree.document.revision;
        nodeRevisions.current = new Map(record.tree.document.nodes.map((node) => [
          node.id, node.revision,
        ]));
      }
      return record;
    } catch (error) {
      onSynchronizationError?.(errorMessage(error));
      return null;
    }
  }

  if (!workspaceId || !scope || !tree || !chatRoot) return null;

  return (
    <TreeBrowser
      {...treeBrowserProps}
      browserLabel="Agent chat browser"
      componentName="AgentChatBrowser"
      itemRenameVisible={false}
      model={model}
      rootLabel="Chats"
      structureManagedExternally
      onCreateNode={async (name, parentId, afterNodeId) => {
        const actualParentId = parentId ?? chatRoot.id;
        const siblings = tree.document.nodes.filter((node) => (
          node.parentId === actualParentId
        ));
        const nodeId = crypto.randomUUID();
        const record = await submit({
          type: "create-node",
          input: {
            requestId: crypto.randomUUID(),
            nodeId,
            parentId: actualParentId,
            afterNodeId,
            kind: "agent-chat",
            label: name,
            localId: createTreeNodeLocalId(name, siblings.map(({ localId }) => localId)),
            expectedTreeRevision: treeRevision.current,
          },
        });
        const created = record?.tree?.document.nodes.find(({ id }) => id === nodeId);
        return created ? toCreatedNode(created) : false;
      }}
      onRenameNode={async (nodeId, label) => Boolean(await submit({
        type: "rename-node",
        nodeId,
        input: {
          requestId: crypto.randomUUID(),
          label,
          expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
        },
      }))}
      onUpdateNodeLocalId={async (nodeId, localId) => Boolean(await submit({
        type: "update-local-id",
        nodeId,
        input: {
          requestId: crypto.randomUUID(),
          localId,
          expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
        },
      }))}
      onMoveNode={async (nodeId, afterNodeId) => Boolean(await submit({
        type: "move-node",
        nodeId,
        input: {
          requestId: crypto.randomUUID(),
          afterNodeId,
          expectedTreeRevision: treeRevision.current,
        },
      }))}
      onReparentNode={async (nodeId, parentId, userCommandId) => Boolean(await submit({
        type: "reparent-node",
        nodeId,
        input: {
          requestId: crypto.randomUUID(),
          parentId: parentId ?? chatRoot.id,
          expectedTreeRevision: treeRevision.current,
        },
      }, userCommandId))}
      onDeleteNode={async (nodeId, userCommandId) => Boolean(await submit({
        type: "delete-node",
        nodeId,
        input: {
          requestId: crypto.randomUUID(),
          expectedTreeRevision: treeRevision.current,
        },
      }, userCommandId))}
      renderContent={({ height, localIdAvailable, node, onLocalIdChange, root }) => (
        <AgentChatContent
          {...chatContentProps}
          buttonProps={inputControlProps?.buttonProps}
          contextConversationIds={createContextChain(
            node.id,
            chatRoot.id,
            tree.document.nodes,
            metadata,
          )}
          height={height}
          includeParent={metadata[node.id]?.includeParent ?? false}
          inputControlProps={inputControlProps}
          localId={node.localId ?? ""}
          localIdAvailable={localIdAvailable}
          name={node.label}
          nodeId={node.id}
          nodeIdInputProps={nodeIdInputProps}
          onIncludeParentChange={async (includeParent) => {
            const content = replicaRecord?.contents[node.id];
            if (!content) return false;
            return Boolean(await submit({
              type: "update-content",
              nodeId: node.id,
              input: {
                requestId: crypto.randomUUID(),
                content: JSON.stringify({ includeParent }),
                expectedRevision: content.revision,
              },
            }));
          }}
          onLocalIdChange={onLocalIdChange}
          onNameChange={async (label) => Boolean(await submit({
            type: "rename-node",
            nodeId: node.id,
            input: {
              requestId: crypto.randomUUID(),
              label,
              expectedRevision: nodeRevisions.current.get(node.id) ?? 0,
            },
          }))}
          parentInputProps={parentInputProps}
          root={root}
          workspaceId={workspaceId}
        />
      )}
    />
  );
}

function parseChatMetadata(content: string | undefined): ChatNodeMetadata {
  if (!content) return { includeParent: false };
  try {
    const value: unknown = JSON.parse(content);
    return value && typeof value === "object"
      && (value as { includeParent?: unknown }).includeParent === true
      ? { includeParent: true }
      : { includeParent: false };
  } catch {
    return { includeParent: false };
  }
}

function toChatTree(
  tree: TreeLoadDto,
  parentId: string,
  metadata: Record<string, ChatNodeMetadata>,
): TreeBrowserInitialNode<ChatNodeMetadata>[] {
  return tree.document.nodes
    .filter((node) => node.parentId === parentId)
    .sort(compareNodes)
    .map((node) => ({
      id: node.id,
      kind: node.kind,
      label: node.label,
      localId: node.localId,
      enabled: true,
      contentEditable: true,
      contentVisible: false,
      listEditable: true,
      data: metadata[node.id],
      children: toChatTree(tree, node.id, metadata),
    }));
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

function createContextChain(
  nodeId: string,
  chatRootId: string,
  nodes: readonly TreeNodeDto[],
  metadata: Record<string, ChatNodeMetadata>,
) {
  const result: string[] = [];
  let current = nodes.find(({ id }) => id === nodeId);
  while (current && current.parentId && current.parentId !== chatRootId
    && metadata[current.id]?.includeParent) {
    result.unshift(current.parentId);
    current = nodes.find(({ id }) => id === current?.parentId);
  }
  return result;
}

async function ensureChatDataStructure(
  scope: WorkspaceReplicaScope,
  initialNodes: readonly TreeNodeDto[],
  initialRevision: number,
) {
  let nodes = [...initialNodes];
  let revision = initialRevision;
  const system = findNodeByPath(nodes, "_system");
  if (!system) return false;
  const userCommandId = crypto.randomUUID();
  async function ensureNode(parentId: string, label: string, localId: string, kind: string) {
    const existing = nodes.find((node) => node.parentId === parentId
      && (node.localId.toLowerCase() === localId.toLowerCase()
        || node.label.toLowerCase() === label.toLowerCase()));
    if (existing) return existing;
    const siblings = nodes.filter((node) => node.parentId === parentId).sort(compareNodes);
    const nodeId = crypto.randomUUID();
    const record = await workspaceSyncEngine.submit(scope, {
      type: "create-node",
      input: {
        requestId: crypto.randomUUID(),
        nodeId,
        parentId,
        afterNodeId: siblings.at(-1)?.id ?? null,
        kind,
        label,
        localId,
        expectedTreeRevision: revision,
      },
    }, userCommandId);
    if (!record.tree) return null;
    nodes = [...record.tree.document.nodes];
    revision = record.tree.document.revision;
    return nodes.find(({ id }) => id === nodeId) ?? null;
  }
  const agent = await ensureNode(system.id, "Agnt", "agnt", "system-directory");
  if (!agent) return false;
  const chats = await ensureNode(agent.id, "Chats", "chats", "system-directory");
  if (!chats) return false;
  const existingChats = nodes.filter(({ parentId }) => parentId === chats.id);
  if (existingChats.length === 0) {
    await ensureNode(chats.id, "Chat", "chat", "agent-chat");
  }
  return true;
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
    id: node.id,
    kind: node.kind,
    label: node.label,
    localId: node.localId,
    enabled: true,
    contentVisible: true,
    contentEditable: true,
    listEditable: true,
    data: { includeParent: false },
    children: [],
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Agent chat synchronization failed";
}
