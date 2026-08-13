import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTreeNodeLocalId,
  type TreeLoadDto,
  type TreeNodeContentDto,
  type TreeNodeDto,
} from "@flydeck/shared/v2";

import { V2ApiError, v2Api } from "../../api/V2ApiClient";
import {
  reportWorkspaceReplicaError,
  persistWorkspaceReplica,
  workspaceReplica,
  workspaceSyncEngine,
  type WorkspaceReplicaScope,
} from "../../replica";
import { ClientStateStore, useClientStateScope } from "../../state";
import {
  TreeBrowser,
  TreeBrowserModel,
  ContentEditor,
  type ContentEditorProps,
  type TreeBrowserInitialNode,
  type TreeBrowserProps,
  type TreeBrowserRootControl,
} from "../TreeBrowser";
import { InputControl, type InputControlProps } from "../InputControl";
import { NodeIdInput, type NodeIdInputProps } from "../NodeIdInput";
import {
  ParentInput,
  type ParentInputProps,
} from "../ParentInput";
import styles from "./DataBrowser.module.css";

export type DataBrowserProps = Omit<
  TreeBrowserProps,
  "model" | "renderContent"
> & {
  contentEditorProps?: ContentEditorProps;
  inputControlProps?: InputControlProps;
  nodeIdInputProps?: Omit<
    NodeIdInputProps,
    "available" | "disabled" | "onChange" | "onSave" | "savedValue" | "value"
  >;
  parentInputProps?: Omit<
    ParentInputProps,
    | "current"
    | "onChange"
    | "onSetParent"
    | "targets"
    | "value"
  >;
  workspaceId?: string;
  onSynchronizationError?: (reason: string) => void;
};

const memoryStore = new ClientStateStore({ storage: () => null });
const emptyDataTree: TreeBrowserInitialNode[] = [];
const emptyDataModel = new TreeBrowserModel({
  initialTree: emptyDataTree,
  storageKey: "flydeck.tree.data.empty",
  store: memoryStore,
});

export function DataBrowser({
  componentName = "DataBrowser",
  contentEditorProps,
  inputControlProps,
  nodeIdInputProps,
  parentInputProps,
  workspaceId,
  onSynchronizationError,
  ...treeBrowserProps
}: DataBrowserProps) {
  const { userId } = useClientStateScope();
  if (!workspaceId) {
    return (
      <TreeBrowser
        {...treeBrowserProps}
        componentName={componentName}
        model={emptyDataModel}
        renderContent={({ height }) => (
          <InputControl {...inputControlProps} height={height} />
        )}
      />
    );
  }

  return (
    <ServerDataBrowser
      {...treeBrowserProps}
      componentName={componentName}
      contentEditorProps={contentEditorProps}
      inputControlProps={inputControlProps}
      nodeIdInputProps={nodeIdInputProps}
      parentInputProps={parentInputProps}
      workspaceId={workspaceId}
      userId={userId}
      onSynchronizationError={onSynchronizationError}
    />
  );
}

function ServerDataBrowser({
  componentName,
  contentEditorProps,
  inputControlProps,
  nodeIdInputProps,
  parentInputProps,
  workspaceId,
  userId,
  onSynchronizationError,
  ...treeBrowserProps
}: DataBrowserProps & { workspaceId: string; userId: string }) {
  const [treeLoad, setTreeLoad] = useState<TreeLoadDto | null>(null);
  const treeRevision = useRef(0);
  const nodeRevisions = useRef(new Map<string, number>());
  const enabledRevisions = useRef<Record<string, number>>({});
  const selectionRevision = useRef(0);
  const replicaScope = useMemo<WorkspaceReplicaScope>(() => ({
    userId,
    workspaceId,
  }), [userId, workspaceId]);

  const fail = useCallback((error: unknown) => {
    onSynchronizationError?.(
      userFacingError(error, "The DATA tree could not be synchronized."),
    );
  }, [onSynchronizationError]);

  const submitCommand = useCallback(async (
    command: Parameters<typeof workspaceSyncEngine.submit>[1],
    userCommandId?: string,
  ) => {
    try {
      const record = await workspaceSyncEngine.submit(
        replicaScope,
        command,
        userCommandId,
      );
      if (record.tree) {
        treeRevision.current = record.tree.document.revision;
        switch (command.type) {
          case "create-node":
            nodeRevisions.current.set(command.input.nodeId, 0);
            enabledRevisions.current[command.input.nodeId] = 1;
            break;
          case "rename-node":
          case "update-local-id":
            nodeRevisions.current.set(
              command.nodeId,
              command.input.expectedRevision + 1,
            );
            break;
          case "move-node":
          case "reparent-node":
            nodeRevisions.current.set(
              command.nodeId,
              (nodeRevisions.current.get(command.nodeId) ?? 0) + 1,
            );
            break;
          case "delete-node":
            nodeRevisions.current.delete(command.nodeId);
            delete enabledRevisions.current[command.nodeId];
            break;
          case "set-node-enabled":
            enabledRevisions.current[command.nodeId] =
              command.input.expectedRevision + 1;
            break;
          case "set-selection":
            selectionRevision.current = command.input.expectedRevision + 1;
            break;
          case "update-content":
            break;
        }
      }
      return record;
    } catch (error) {
      fail(error);
      return null;
    }
  }, [fail, replicaScope]);

  useEffect(() => {
    let active = true;
    void (async () => {
      let cached: TreeLoadDto | null = null;
      try {
        cached = (await workspaceReplica.load(replicaScope))?.tree ?? null;
        if (active && cached) setTreeLoad(cached);
      } catch (error) {
        reportWorkspaceReplicaError(error);
        // The server load below can still repair an unavailable local cache.
      }

      try {
        const confirmed = await v2Api.loadDataTree(workspaceId);
        if (active) setTreeLoad(confirmed);
        persistWorkspaceReplica(workspaceReplica.replaceTree(replicaScope, confirmed));
      } catch (error) {
        if (!cached) fail(error);
      }
    })();
    return () => { active = false; };
  }, [fail, replicaScope, workspaceId]);

  useEffect(() => {
    if (!treeLoad) return;
    treeRevision.current = treeLoad.document.revision;
    nodeRevisions.current = new Map(
      treeLoad.document.nodes.map((node) => [node.id, node.revision]),
    );
    enabledRevisions.current = { ...treeLoad.semanticState.nodeRevisions };
    selectionRevision.current = treeLoad.selection.revision;
  }, [treeLoad]);

  const model = useMemo(() => treeLoad && new TreeBrowserModel({
    initialTree: toInitialTree(treeLoad),
    storageKey: `flydeck.tree.data.server.${workspaceId}.${serverStateFingerprint(treeLoad)}`,
    store: memoryStore,
  }), [treeLoad, workspaceId]);

  if (!treeLoad || !model) return null;

  return (
    <TreeBrowser
      {...treeBrowserProps}
      key={serverStateFingerprint(treeLoad)}
      componentName={componentName}
      model={model}
      initialSelectedPath={treeLoad.selection.selectedPath}
      onCreateNode={async (label, parentId, afterNodeId) => {
        const nodeId = crypto.randomUUID();
        const cachedTree = (await workspaceReplica.load(replicaScope))?.tree;
        const localId = createTreeNodeLocalId(
          label,
          (cachedTree?.document.nodes ?? treeLoad.document.nodes)
            .filter((node) => node.parentId === parentId)
            .map((node) => node.localId),
        );
        const record = await submitCommand({
          type: "create-node",
          input: {
            requestId: crypto.randomUUID(),
            nodeId,
            parentId,
            afterNodeId,
            kind: "data-file",
            label,
            localId,
            expectedTreeRevision: treeRevision.current,
          },
        });
        const node = record?.tree?.document.nodes.find(({ id }) => id === nodeId);
        return node ? toCreatedTreeNode(node) : false;
      }}
      onRenameNode={async (nodeId, label) => {
        return Boolean(await submitCommand({
          type: "rename-node",
          nodeId,
          input: {
            requestId: crypto.randomUUID(),
            label,
            expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
          },
        }));
      }}
      onUpdateNodeLocalId={async (nodeId, localId) => {
        return Boolean(await submitCommand({
          type: "update-local-id",
          nodeId,
          input: {
            requestId: crypto.randomUUID(),
            localId,
            expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
          },
        }));
      }}
      onMoveNode={async (nodeId, afterNodeId) => {
        return Boolean(await submitCommand({
          type: "move-node",
          nodeId,
          input: {
            requestId: crypto.randomUUID(),
            afterNodeId,
            expectedTreeRevision: treeRevision.current,
          },
        }));
      }}
      onReparentNode={async (nodeId, parentId, userCommandId) => {
        return Boolean(await submitCommand({
          type: "reparent-node",
          nodeId,
          input: {
            requestId: crypto.randomUUID(),
            parentId,
            expectedTreeRevision: treeRevision.current,
          },
        }, userCommandId));
      }}
      onDeleteNode={async (nodeId, userCommandId) => {
        return Boolean(await submitCommand({
          type: "delete-node",
          nodeId,
          input: {
            requestId: crypto.randomUUID(),
            expectedTreeRevision: treeRevision.current,
          },
        }, userCommandId));
      }}
      onSelectedPathChange={async (selectedPath) => {
        return Boolean(await submitCommand({
          type: "set-selection",
          input: {
            requestId: crypto.randomUUID(),
            selectedPath,
            expectedRevision: selectionRevision.current,
          },
        }));
      }}
      renderContent={({
        height,
        localIdAvailable,
        node,
        onLocalIdChange,
        root,
      }) => (
        <ServerDataContent
          {...inputControlProps}
          contentEditorProps={contentEditorProps}
          nodeIdInputProps={nodeIdInputProps}
          height={height}
          nodeId={node.id}
          localId={node.localId ?? ""}
          localIdAvailable={localIdAvailable}
          onLocalIdChange={onLocalIdChange}
          root={root}
          rootInputProps={treeBrowserProps.listControlProps?.inputProps}
          parentInputProps={parentInputProps}
          workspaceId={workspaceId}
          replicaScope={replicaScope}
          onSynchronizationError={fail}
        />
      )}
    />
  );
}

function ServerDataContent({
  nodeId,
  localId,
  localIdAvailable,
  onLocalIdChange,
  root,
  rootInputProps,
  parentInputProps,
  nodeIdInputProps,
  contentEditorProps,
  workspaceId,
  replicaScope,
  onSynchronizationError,
  ...inputControlProps
}: InputControlProps & {
  contentEditorProps?: ContentEditorProps;
  nodeIdInputProps?: DataBrowserProps["nodeIdInputProps"];
  nodeId: string;
  localId: string;
  localIdAvailable: (localId: string) => boolean;
  onLocalIdChange?: (localId: string) => Promise<boolean>;
  root?: TreeBrowserRootControl;
  rootInputProps?: ParentInputProps["inputProps"];
  parentInputProps?: DataBrowserProps["parentInputProps"];
  workspaceId: string;
  replicaScope: WorkspaceReplicaScope;
  onSynchronizationError: (error: unknown) => void;
}) {
  const [document, setDocument] = useState<TreeNodeContentDto | null>(null);
  const [draft, setDraft] = useState("");
  const [localIdDraft, setLocalIdDraft] = useState({
    nodeId,
    saved: localId,
    value: localId,
  });
  const effectiveLocalIdDraft = localIdDraft.nodeId === nodeId
    && localIdDraft.saved === localId
    ? localIdDraft.value
    : localId;
  const [rootDraft, setRootDraft] = useState({
    nodeId,
    currentId: root?.current.id,
    currentPath: root?.current.path,
    value: root?.current.path ?? "",
  });
  const rootValue = rootDraft.nodeId === nodeId
    && rootDraft.currentId === root?.current.id
    && rootDraft.currentPath === root?.current.path
    ? rootDraft.value
    : root?.current.path ?? "";
  useEffect(() => {
    let active = true;
    void (async () => {
      let cached: TreeNodeContentDto | null = null;
      try {
        cached = (await workspaceReplica.load(replicaScope))?.contents[nodeId] ?? null;
        if (active && cached) {
          setDocument(cached);
          setDraft(cached.content);
        }
      } catch (error) {
        reportWorkspaceReplicaError(error);
        // Continue with the authoritative server read.
      }

      try {
        const confirmed = await v2Api.readDataContent(workspaceId, nodeId);
        if (active) {
          setDocument(confirmed);
          setDraft(confirmed.content);
        }
        persistWorkspaceReplica(workspaceReplica.putContent(replicaScope, confirmed));
      } catch (error) {
        if (!cached) onSynchronizationError(error);
      }
    })();
    return () => { active = false; };
  }, [nodeId, onSynchronizationError, replicaScope, workspaceId]);

  return (
    <div className={styles.content} style={{ height: inputControlProps.height }}>
      <NodeIdInput
        {...inputControlProps}
        {...nodeIdInputProps}
        available={localIdAvailable}
        value={effectiveLocalIdDraft}
        buttonProps={{
          ...inputControlProps.buttonProps,
          ...nodeIdInputProps?.buttonProps,
        }}
        inputProps={{
          ...inputControlProps.inputProps,
          ...nodeIdInputProps?.inputProps,
        }}
        disabled={!onLocalIdChange}
        savedValue={localId}
        onChange={(value) => setLocalIdDraft({
          nodeId,
          saved: localId,
          value,
        })}
        onSave={async (value) => {
          if (!onLocalIdChange) return;
          const confirmed = await onLocalIdChange(value);
          if (confirmed) setLocalIdDraft({
            nodeId,
            saved: value,
            value,
          });
        }}
      />
      {root && (
        <ParentInput
          {...parentInputProps}
          current={root.current}
          inputProps={{
            ...parentInputProps?.inputProps,
            ...rootInputProps,
          }}
          targets={root.targets}
          value={rootValue}
          onChange={(value) => setRootDraft({
            nodeId,
            currentId: root.current.id,
            currentPath: root.current.path,
            value,
          })}
          onSetParent={async (target) => {
            const confirmed = await root.onChange(target.id);
            if (confirmed) {
              setRootDraft({
                nodeId,
                currentId: target.id,
                currentPath: target.path,
                value: target.path,
              });
            }
          }}
        />
      )}
      <ContentEditor
        {...inputControlProps}
        {...contentEditorProps}
        buttonProps={{
          ...inputControlProps.buttonProps,
          ...contentEditorProps?.buttonProps,
          disabled: inputControlProps.buttonProps?.disabled
            || contentEditorProps?.buttonProps?.disabled
            || !document,
        }}
        height={root ? "100%" : inputControlProps.height}
        value={draft}
        onChange={setDraft}
        onSend={async (content) => {
          if (!document) return;
          try {
            const record = await workspaceSyncEngine.submit(replicaScope, {
              type: "update-content",
              nodeId,
              input: {
                requestId: crypto.randomUUID(),
                content,
                expectedRevision: document.revision,
              },
            });
            const current = record.contents[nodeId];
            if (current) {
              setDocument(current);
              setDraft(current.content);
            }
          } catch (error) {
            onSynchronizationError(error);
          }
        }}
      />
    </div>
  );
}

function toInitialTree(load: TreeLoadDto): TreeBrowserInitialNode[] {
  const enabled = new Set(load.semanticState.enabledNodeIds);
  const childrenByParent = new Map<string | null, TreeNodeDto[]>();
  for (const node of load.document.nodes) {
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }

  function build(parentId: string | null): TreeBrowserInitialNode[] {
    return (childrenByParent.get(parentId) ?? [])
      .sort(compareDataNodes)
      .map((node) => ({
        id: node.id,
        kind: node.kind,
        label: node.label,
        localId: node.localId,
        enabled: enabled.has(node.id),
        contentEditable: node.capabilities.contentEditable,
        contentVisible: false,
        listEditable: node.kind === "system-directory" || node.kind === "trash-directory"
          ? false
          : node.capabilities.listEditable,
        listItemLimit: node.capabilities.listItemLimit ?? undefined,
        children: build(node.id),
      }));
  }

  return build(null);
}

function compareDataNodes(left: TreeNodeDto, right: TreeNodeDto) {
  const rank = (node: TreeNodeDto) => node.parentId === null
    ? node.kind === "system-directory"
      ? 1
      : node.kind === "trash-directory"
        ? 2
        : 0
    : 0;
  return rank(left) - rank(right)
    || left.position - right.position
    || left.id.localeCompare(right.id);
}

function toCreatedTreeNode(node: TreeNodeDto) {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    localId: node.localId,
    enabled: true,
    contentVisible: true,
    contentEditable: node.capabilities.contentEditable,
    listEditable: node.capabilities.listEditable,
    listItemLimit: node.capabilities.listItemLimit ?? undefined,
    children: [],
  };
}

function userFacingError(error: unknown, fallback: string) {
  if (!(error instanceof V2ApiError)) {
    return error instanceof Error ? error.message : fallback;
  }
  switch (error.response.error) {
    case "AUTH_REQUIRED": return "Your session has expired. Please sign in again.";
    case "INVALID_CREDENTIALS": return "The user name or password is incorrect.";
    case "FORBIDDEN": return "You do not have permission for this operation.";
    case "NOT_FOUND": return "The requested server resource no longer exists.";
    case "REVISION_CONFLICT": return "The server state changed and has been reloaded.";
    case "INVALID_REQUEST": return "The server rejected the request.";
    case "SERVICE_UNAVAILABLE": return "The server is temporarily unavailable.";
    case "INTERNAL_ERROR": return "The server could not process the request.";
  }
}

function serverStateFingerprint(load: TreeLoadDto) {
  return JSON.stringify([
    load.document.revision,
    load.selection.revision,
    load.selection.selectedPath,
    load.semanticState.enabledNodeIds,
    load.semanticState.nodeRevisions,
  ]);
}
