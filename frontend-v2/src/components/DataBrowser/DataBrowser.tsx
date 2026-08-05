import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TreeLoadDto, TreeNodeContentDto, TreeNodeDto } from "@flydeck/shared/v2";

import { V2ApiError, v2Api } from "../../api/V2ApiClient";
import { ClientStateStore } from "../../state";
import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserInitialNode,
  type TreeBrowserProps,
  type TreeBrowserRootControl,
} from "../TreeBrowser";
import { InputControl, type InputControlProps } from "../InputControl";
import {
  resolveRootTarget,
  RootInputControl,
  type RootInputControlProps,
} from "../RootInputControl";
import styles from "./DataBrowser.module.css";

export type DataBrowserProps = Omit<
  TreeBrowserProps,
  "componentName" | "model" | "renderContent"
> & {
  inputControlProps?: InputControlProps;
  workspaceId?: string;
  onSynchronizationError?: (reason: string) => void;
};

const memoryStore = new ClientStateStore({ storage: () => null });
const emptyDataTree: TreeBrowserInitialNode[] = [{
  id: "data-root",
  kind: "data-root",
  label: "Data",
  enabled: true,
  contentEditable: true,
  listEditable: true,
  children: [],
}];
const emptyDataModel = new TreeBrowserModel({
  initialTree: emptyDataTree,
  storageKey: "flydeck.tree.data.empty",
  store: memoryStore,
});

export function DataBrowser({
  inputControlProps,
  workspaceId,
  onSynchronizationError,
  ...treeBrowserProps
}: DataBrowserProps) {
  if (!workspaceId) {
    return (
      <TreeBrowser
        {...treeBrowserProps}
        componentName="DataBrowser"
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
      inputControlProps={inputControlProps}
      workspaceId={workspaceId}
      onSynchronizationError={onSynchronizationError}
    />
  );
}

function ServerDataBrowser({
  inputControlProps,
  workspaceId,
  onSynchronizationError,
  ...treeBrowserProps
}: DataBrowserProps & { workspaceId: string }) {
  const [treeLoad, setTreeLoad] = useState<TreeLoadDto | null>(null);
  const treeRevision = useRef(0);
  const nodeRevisions = useRef(new Map<string, number>());
  const enabledRevisions = useRef<Record<string, number>>({});
  const selectionRevision = useRef(0);

  const fail = useCallback((error: unknown) => {
    onSynchronizationError?.(
      userFacingError(error, "The DATA tree could not be synchronized."),
    );
  }, [onSynchronizationError]);

  const reload = useCallback(async () => {
    try {
      setTreeLoad(await v2Api.loadDataTree(workspaceId));
    } catch (error) {
      fail(error);
    }
  }, [fail, workspaceId]);

  useEffect(() => {
    let active = true;
    void v2Api.loadDataTree(workspaceId).then((value) => {
      if (active) setTreeLoad(value);
    }).catch(fail);
    return () => { active = false; };
  }, [fail, workspaceId]);

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

  async function confirmed<TResult>(action: () => Promise<TResult>) {
    try {
      return await action();
    } catch (error) {
      if (error instanceof V2ApiError && error.response.error === "REVISION_CONFLICT") {
        await reload();
        return false;
      }
      fail(error);
      return false;
    }
  }

  return (
    <TreeBrowser
      {...treeBrowserProps}
      key={serverStateFingerprint(treeLoad)}
      componentName="DataBrowser"
      model={model}
      initialSelectedPath={treeLoad.selection.selectedPath}
      onCreateNode={async (label, parentId, afterNodeId) => {
        const result = await confirmed(() => v2Api.createDataNode(workspaceId, {
          requestId: crypto.randomUUID(),
          parentId,
          afterNodeId,
          kind: "data-file",
          label,
          expectedTreeRevision: treeRevision.current,
        }));
        if (result === false) return false;
        treeRevision.current = result.treeRevision;
        nodeRevisions.current.set(result.node.id, result.node.revision);
        enabledRevisions.current[result.node.id] = 1;
        return toCreatedTreeNode(result.node);
      }}
      onRenameNode={async (nodeId, label) => {
        const result = await confirmed(() => v2Api.renameDataNode(workspaceId, nodeId, {
          label,
          expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
        }));
        if (result === false) return false;
        treeRevision.current = result.treeRevision;
        nodeRevisions.current.set(nodeId, result.node.revision);
        return true;
      }}
      onMoveNode={async (nodeId, afterNodeId) => {
        const result = await confirmed(() => v2Api.moveDataNode(workspaceId, nodeId, {
          afterNodeId,
          expectedTreeRevision: treeRevision.current,
        }));
        if (result === false) return false;
        treeRevision.current = result.treeRevision;
        nodeRevisions.current.set(nodeId, result.node.revision);
        return true;
      }}
      onReparentNode={async (nodeId, parentId) => {
        const result = await confirmed(() => v2Api.reparentDataNode(workspaceId, nodeId, {
          parentId,
          expectedTreeRevision: treeRevision.current,
        }));
        if (result === false) return false;
        treeRevision.current = result.treeRevision;
        nodeRevisions.current.set(nodeId, result.node.revision);
        return true;
      }}
      onDeleteNode={async (nodeId) => {
        const result = await confirmed(() => v2Api.deleteDataNode(workspaceId, nodeId, {
          expectedTreeRevision: treeRevision.current,
        }));
        if (result === false) return false;
        treeRevision.current = result.revision;
        nodeRevisions.current.delete(nodeId);
        delete enabledRevisions.current[nodeId];
        return true;
      }}
      onEnabledNode={async (nodeId, enabled) => {
        const result = await confirmed(() => v2Api.setDataNodeEnabled(workspaceId, nodeId, {
          enabled,
          expectedRevision: enabledRevisions.current[nodeId] ?? 0,
        }));
        if (result === false) return false;
        enabledRevisions.current[nodeId] = result.revision;
        return true;
      }}
      onSelectedPathChange={async (selectedPath) => {
        const result = await confirmed(() => v2Api.setDataSelection(workspaceId, {
          selectedPath,
          expectedRevision: selectionRevision.current,
        }));
        if (result === false) return false;
        selectionRevision.current = result.revision;
        return true;
      }}
      renderContent={({ height, node, root }) => (
        <ServerDataContent
          {...inputControlProps}
          height={height}
          nodeId={node.id}
          root={root}
          rootInputProps={treeBrowserProps.listControlProps?.inputProps}
          workspaceId={workspaceId}
          onSynchronizationError={fail}
        />
      )}
    />
  );
}

function ServerDataContent({
  nodeId,
  root,
  rootInputProps,
  workspaceId,
  onSynchronizationError,
  ...inputControlProps
}: InputControlProps & {
  nodeId: string;
  root?: TreeBrowserRootControl;
  rootInputProps?: RootInputControlProps["inputProps"];
  workspaceId: string;
  onSynchronizationError: (error: unknown) => void;
}) {
  const [document, setDocument] = useState<TreeNodeContentDto | null>(null);
  const [draft, setDraft] = useState("");
  const [rootDraft, setRootDraft] = useState({
    nodeId,
    currentId: root?.current.id,
    currentLabel: root?.current.label,
    value: root?.current.label ?? "",
  });
  const rootValue = rootDraft.nodeId === nodeId
    && rootDraft.currentId === root?.current.id
    && rootDraft.currentLabel === root?.current.label
    ? rootDraft.value
    : root?.current.label ?? "";
  const rootTarget = root
    ? resolveRootTarget(root.current, root.targets, rootValue)
    : null;
  const rootValid = !root || Boolean(rootTarget);

  useEffect(() => {
    let active = true;
    void v2Api.readDataContent(workspaceId, nodeId).then((value) => {
      if (!active) return;
      setDocument(value);
      setDraft(value.content);
    }).catch(onSynchronizationError);
    return () => { active = false; };
  }, [nodeId, onSynchronizationError, workspaceId]);

  return (
    <div className={styles.content} style={{ height: inputControlProps.height }}>
      {root && (
        <RootInputControl
          current={root.current}
          inputProps={rootInputProps}
          targets={root.targets}
          value={rootValue}
          onChange={(value) => setRootDraft({
            nodeId,
            currentId: root.current.id,
            currentLabel: root.current.label,
            value,
          })}
        />
      )}
      <InputControl
        {...inputControlProps}
        buttonProps={{
          ...inputControlProps.buttonProps,
          disabled: inputControlProps.buttonProps?.disabled || !document || !rootValid,
        }}
        height={root ? "100%" : inputControlProps.height}
        value={draft}
        onChange={setDraft}
        onSend={async (content) => {
          if (!document || !rootValid) return;
          try {
            const confirmed = await v2Api.updateDataContent(workspaceId, nodeId, {
              content,
              expectedRevision: document.revision,
            });
            setDocument(confirmed);
            setDraft(confirmed.content);
          } catch (error) {
            if (error instanceof V2ApiError && error.response.error === "REVISION_CONFLICT") {
              const current = await v2Api.readDataContent(workspaceId, nodeId);
              setDocument(current);
              setDraft(current.content);
              return;
            }
            onSynchronizationError(error);
            return;
          }
          if (root && rootTarget && rootTarget.id !== root.current.id) {
            const confirmed = await root.onChange(rootTarget.id);
            if (confirmed) {
              setRootDraft({
                nodeId,
                currentId: rootTarget.id,
                currentLabel: rootTarget.label,
                value: rootTarget.label,
              });
            }
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
      .sort((left, right) => left.position - right.position)
      .map((node) => ({
        id: node.id,
        kind: node.kind,
        label: node.label,
        enabled: enabled.has(node.id),
        contentEditable: node.capabilities.contentEditable,
        contentVisible: false,
        listEditable: node.capabilities.listEditable,
        listItemLimit: node.capabilities.listItemLimit ?? undefined,
        children: build(node.id),
      }));
  }

  return build(null);
}

function toCreatedTreeNode(node: TreeNodeDto) {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
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
