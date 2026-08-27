import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, FolderOpen, X } from "lucide-react";
import {
  createTreeNodeLocalId,
  treeNodeLabelSchema,
  type TreeLoadDto,
  type TreeNodeContentDto,
  type TreeNodeDto,
} from "@flydeck/shared/v2";

import { V2ApiError, v2Api } from "../../api/V2ApiClient";
import {
  workspaceSyncEngine,
  useWorkspaceReplica,
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
  type TreeBrowserSavedView,
  type TreeBrowserSavedViewsControl,
} from "../TreeBrowser";
import { InputControl, type InputControlProps } from "../InputControl";
import { Button, type ButtonProps } from "../Button";
import { BlockingDialog } from "../BlockingDialog";
import {
  ListControlListSizeButton,
  type ListControlListSize,
  type ListControlListSizeButtonProps,
} from "../ListControlListSizeButton";
import { NodeIdInput, type NodeIdInputProps } from "../NodeIdInput";
import {
  ParentInput,
  type ParentInputProps,
} from "../ParentInput";
import styles from "./DataBrowser.module.css";
import {
  createDataImagePreview,
  deleteDataImageDraft,
  readDataImageDraft,
  writeDataImageDraft,
  type DataImageDraft,
} from "./DataImageDraftStore";

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
const savedViewsDataSource = "_system/views";
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
  const treeRevision = useRef(0);
  const nodeRevisions = useRef(new Map<string, number>());
  const enabledRevisions = useRef<Record<string, number>>({});
  const selectionRevision = useRef(0);
  const selectedPath = useRef<string[]>([]);
  const pageSizes = useRef<TreeLoadDto["selection"]["pageSizes"]>({});
  const replicaScope = useMemo<WorkspaceReplicaScope>(() => ({
    userId,
    workspaceId,
  }), [userId, workspaceId]);
  const replicaRecord = useWorkspaceReplica(replicaScope);
  const treeLoad = replicaRecord?.tree ?? null;
  const viewRoot = useMemo(() => treeLoad
    ? resolveFlatTreePath(treeLoad.document.nodes, savedViewsDataSource)
    : undefined, [treeLoad]);
  const viewNodes = useMemo(() => viewRoot && treeLoad
    ? treeLoad.document.nodes
        .filter(({ parentId }) => parentId === viewRoot.id)
        .sort(compareDataNodes)
    : [], [treeLoad, viewRoot]);
  const savedViewDefinitions = useMemo(() => viewNodes.map((node) => ({
    id: node.id,
    name: node.label,
    paths: parseSavedViewPaths(replicaRecord?.contents[node.id]?.content ?? ""),
  } satisfies TreeBrowserSavedView)), [replicaRecord?.contents, viewNodes]);

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
        nodeRevisions.current = new Map(
          record.tree.document.nodes.map((node) => [node.id, node.revision]),
        );
        enabledRevisions.current = { ...record.tree.semanticState.nodeRevisions };
        selectionRevision.current = record.tree.selection.revision;
        selectedPath.current = [...record.tree.selection.selectedPath];
        pageSizes.current = { ...record.tree.selection.pageSizes };
      }
      return record;
    } catch (error) {
      fail(error);
      return null;
    }
  }, [fail, replicaScope]);

  useEffect(() => {
    if (!treeLoad) return;
    treeRevision.current = treeLoad.document.revision;
    nodeRevisions.current = new Map(
      treeLoad.document.nodes.map((node) => [node.id, node.revision]),
    );
    enabledRevisions.current = { ...treeLoad.semanticState.nodeRevisions };
    selectionRevision.current = treeLoad.selection.revision;
    selectedPath.current = [...treeLoad.selection.selectedPath];
    pageSizes.current = { ...treeLoad.selection.pageSizes };
  }, [treeLoad]);

  useEffect(() => {
    if (viewNodes.length > 0) {
      void workspaceSyncEngine.ensureContents(
        replicaScope,
        viewNodes.map(({ id }) => id),
      );
    }
  }, [replicaScope, viewNodes]);

  const createCanonicalNode = useCallback(async (
    label: string,
    parentId: string | null,
    afterNodeId: string | null,
    localId?: string,
    userCommandId?: string,
  ) => {
    const currentNodes = replicaRecord?.tree?.document.nodes
      ?? treeLoad?.document.nodes
      ?? [];
    const nodeId = crypto.randomUUID();
    const resolvedLocalId = localId ?? createTreeNodeLocalId(
      label,
      currentNodes
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
        localId: resolvedLocalId,
        expectedTreeRevision: treeRevision.current,
      },
    }, userCommandId);
    return record?.tree?.document.nodes.find(({ id }) => id === nodeId) ?? null;
  }, [replicaRecord?.tree?.document.nodes, submitCommand, treeLoad?.document.nodes]);

  const savedViewsControl = useMemo<TreeBrowserSavedViewsControl>(() => ({
    dataSource: savedViewsDataSource,
    views: savedViewDefinitions,
    onCreate: async (name, paths) => {
      if (!name.trim() || name.trim().length > 16 || paths.length === 0) return false;
      const userCommandId = crypto.randomUUID();
      let root = replicaRecord?.tree
        ? resolveFlatTreePath(replicaRecord.tree.document.nodes, savedViewsDataSource)
        : undefined;
      if (!root) {
        const system = replicaRecord?.tree
          ? resolveFlatTreePath(replicaRecord.tree.document.nodes, "_system")
          : treeLoad
            ? resolveFlatTreePath(treeLoad.document.nodes, "_system")
            : undefined;
        if (!system) return false;
        root = await createCanonicalNode(
          "Views",
          system.id,
          null,
          "views",
          userCommandId,
        ) ?? undefined;
        if (!root) return false;
      }
      const currentNodes = replicaRecord?.tree?.document.nodes
        ?? treeLoad?.document.nodes
        ?? [];
      const siblings = currentNodes
        .filter(({ parentId }) => parentId === root.id)
        .sort(compareDataNodes);
      const node = await createCanonicalNode(
        name.trim(),
        root.id,
        siblings.at(-1)?.id ?? null,
        createTreeNodeLocalId(name, siblings.map(({ localId }) => localId)),
        userCommandId,
      );
      if (!node) return false;
      await submitCommand({
        type: "update-content",
        nodeId: node.id,
        input: {
          requestId: crypto.randomUUID(),
          content: paths.join("\n"),
          expectedRevision: 0,
        },
      }, userCommandId);
      return { id: node.id, name: node.label, paths: [...paths] };
    },
    onDelete: async (viewId) => Boolean(await submitCommand({
      type: "delete-node",
      nodeId: viewId,
      input: {
        requestId: crypto.randomUUID(),
        expectedTreeRevision: treeRevision.current,
      },
    })),
    onMove: async (viewId, afterViewId) => Boolean(await submitCommand({
      type: "move-node",
      nodeId: viewId,
      input: {
        requestId: crypto.randomUUID(),
        afterNodeId: afterViewId,
        expectedTreeRevision: treeRevision.current,
      },
    })),
    onRename: async (viewId, name) => Boolean(await submitCommand({
      type: "rename-node",
      nodeId: viewId,
      input: {
        requestId: crypto.randomUUID(),
        label: name,
        expectedRevision: nodeRevisions.current.get(viewId) ?? 0,
      },
    })),
  }), [
    createCanonicalNode,
    replicaRecord,
    savedViewDefinitions,
    submitCommand,
    treeLoad,
  ]);

  const renameNode = useCallback(async (nodeId: string, label: string) => {
    return Boolean(await submitCommand({
      type: "rename-node",
      nodeId,
      input: {
        requestId: crypto.randomUUID(),
        label,
        expectedRevision: nodeRevisions.current.get(nodeId) ?? 0,
      },
    }));
  }, [submitCommand]);

  const model = useMemo(() => treeLoad
    ? new TreeBrowserModel({
        definitionAuthority: true,
        initialTree: toInitialTree(treeLoad),
        storageKey: `flydeck.tree.data.server.${workspaceId}`,
        store: memoryStore,
      })
    : null, [treeLoad, workspaceId]);

  if (!treeLoad || !model) return null;

  return (
    <TreeBrowser
      {...treeBrowserProps}
      componentName={componentName}
      model={model}
      structureManagedExternally
      savedViews={savedViewsControl}
      initialSelectedPath={treeLoad.selection.selectedPath}
      initialPageSizes={treeLoad.selection.pageSizes}
      onCreateNode={async (label, parentId, afterNodeId) => {
        const node = await createCanonicalNode(label, parentId, afterNodeId);
        return node ? toCreatedTreeNode(node) : false;
      }}
      onRenameNode={renameNode}
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
            pageSizes: pageSizes.current,
            expectedRevision: selectionRevision.current,
          },
        }));
      }}
      onPageSizesChange={async (nextPageSizes) => {
        return Boolean(await submitCommand({
          type: "set-selection",
          input: {
            requestId: crypto.randomUUID(),
            selectedPath: selectedPath.current,
            pageSizes: nextPageSizes,
            expectedRevision: selectionRevision.current,
          },
        }));
      }}
      renderRootContent={({ onPageSizeChange, pageSize }) => (
        <DataListSizeControl
          listSizeButtonProps={treeBrowserProps.listControlProps
            ?.listSizeButtonProps}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      )}
      renderContent={({
        height,
        localIdAvailable,
        node,
        onLocalIdChange,
        onPageSizeChange,
        pageSize,
        root,
      }) => (
        <ServerDataContent
          {...inputControlProps}
          contentEditorProps={contentEditorProps}
          nodeIdInputProps={nodeIdInputProps}
          height={height}
          nodeId={node.id}
          name={node.label}
          localId={node.localId ?? ""}
          localIdAvailable={localIdAvailable}
          onLocalIdChange={onLocalIdChange}
          onNameChange={(name) => renameNode(node.id, name)}
          onPageSizeChange={onPageSizeChange}
          pageSize={pageSize}
          listSizeButtonProps={treeBrowserProps.listControlProps
            ?.listSizeButtonProps}
          root={root}
          rootInputProps={treeBrowserProps.listControlProps?.inputProps}
          parentInputProps={parentInputProps}
          replicaScope={replicaScope}
          onSynchronizationError={fail}
        />
      )}
    />
  );
}

function ServerDataContent({
  nodeId,
  name,
  localId,
  localIdAvailable,
  onLocalIdChange,
  onNameChange,
  onPageSizeChange,
  pageSize,
  listSizeButtonProps,
  root,
  rootInputProps,
  parentInputProps,
  nodeIdInputProps,
  contentEditorProps,
  replicaScope,
  onSynchronizationError,
  height,
  ...inputControlProps
}: InputControlProps & {
  contentEditorProps?: ContentEditorProps;
  nodeIdInputProps?: DataBrowserProps["nodeIdInputProps"];
  nodeId: string;
  name: string;
  localId: string;
  localIdAvailable: (localId: string) => boolean;
  onLocalIdChange?: (localId: string) => Promise<boolean>;
  onNameChange: (name: string) => Promise<boolean>;
  onPageSizeChange: (pageSize: ListControlListSize) => void;
  pageSize: ListControlListSize;
  listSizeButtonProps?: Omit<
    ListControlListSizeButtonProps,
    "onPageSizeChange" | "pageSize"
  >;
  root?: TreeBrowserRootControl;
  rootInputProps?: ParentInputProps["inputProps"];
  parentInputProps?: DataBrowserProps["parentInputProps"];
  replicaScope: WorkspaceReplicaScope;
  onSynchronizationError: (error: unknown) => void;
}) {
  const replicaRecord = useWorkspaceReplica(replicaScope);
  const document: TreeNodeContentDto | null = replicaRecord?.contents[nodeId] ?? null;
  const [contentDraft, setContentDraft] = useState({
    nodeId,
    revision: document?.revision,
    value: document?.content ?? "",
  });
  const draft = contentDraft.nodeId === nodeId
    && contentDraft.revision === document?.revision
    ? contentDraft.value
    : document?.content ?? "";
  const [localIdDraft, setLocalIdDraft] = useState({
    nodeId,
    saved: localId,
    value: localId,
  });
  const effectiveLocalIdDraft = localIdDraft.nodeId === nodeId
    && localIdDraft.saved === localId
    ? localIdDraft.value
    : localId;
  const [nameDraft, setNameDraft] = useState({
    nodeId,
    saved: name,
    value: name,
  });
  const effectiveNameDraft = nameDraft.nodeId === nodeId
    && nameDraft.saved === name
    ? nameDraft.value
    : name;
  const normalizedName = effectiveNameDraft.trim();
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
  const [imageDraftState, setImageDraftState] = useState<{
    nodeId: string;
    value: DataImageDraft | null;
  }>({ nodeId, value: null });
  const imageSelectionRevision = useRef(0);
  const imageDraft = imageDraftState.nodeId === nodeId
    ? imageDraftState.value
    : null;
  const [savedPreviewState, setSavedPreviewState] = useState<{
    nodeId: string;
    value: Blob | null;
  }>({ nodeId, value: null });
  const savedPreview = savedPreviewState.nodeId === nodeId
    ? savedPreviewState.value
    : null;
  const previewBlob = imageDraft?.previewBlob ?? savedPreview;
  const draftImageUrl = useMemo(
    () => previewBlob ? URL.createObjectURL(previewBlob) : null,
    [previewBlob],
  );
  const [serverImageState, setServerImageState] = useState({
    nodeId,
    revision: 0,
    visible: true,
  });
  const serverImageVisible = serverImageState.nodeId === nodeId
    ? serverImageState.visible
    : true;
  const serverImageRevision = serverImageState.nodeId === nodeId
    ? serverImageState.revision
    : 0;
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  useEffect(() => {
    void workspaceSyncEngine.ensureContents(replicaScope, [nodeId]);
  }, [nodeId, replicaScope]);
  useEffect(() => {
    let active = true;
    const revision = imageSelectionRevision.current;
    void readDataImageDraft(replicaScope.workspaceId, nodeId).then(async (value) => {
      const hydrated = value && !value.previewBlob ? {
        ...value,
        previewBlob: await createDataImagePreview(value.blob),
      } : value;
      if (hydrated && hydrated !== value) {
        await writeDataImageDraft(replicaScope.workspaceId, nodeId, hydrated);
      }
      if (active && revision === imageSelectionRevision.current) {
        setImageDraftState({ nodeId, value: hydrated });
      }
    }).catch(onSynchronizationError);
    return () => {
      active = false;
    };
  }, [nodeId, onSynchronizationError, replicaScope.workspaceId]);
  useEffect(() => {
    return () => {
      if (draftImageUrl) URL.revokeObjectURL(draftImageUrl);
    };
  }, [draftImageUrl]);

  async function selectImage(file: File) {
    if (!file.type.startsWith("image/")) {
      onSynchronizationError(new Error("The selected file is not an image."));
      return;
    }
    if (file.size > 20 * 1_024 * 1_024) {
      onSynchronizationError(new Error("The image must not exceed 20 MB."));
      return;
    }
    imageSelectionRevision.current += 1;
    const draftImage = {
      blob: file,
      fileName: file.name,
      previewBlob: await createDataImagePreview(file),
    };
    await writeDataImageDraft(replicaScope.workspaceId, nodeId, draftImage);
    setSavedPreviewState({ nodeId, value: null });
    setImageDraftState({ nodeId, value: draftImage });
  }

  async function removeImage() {
    await v2Api.deleteDataImage(replicaScope.workspaceId, nodeId);
    await deleteDataImageDraft(replicaScope.workspaceId, nodeId);
    imageSelectionRevision.current += 1;
    setImageDraftState({ nodeId, value: null });
    setSavedPreviewState({ nodeId, value: null });
    setServerImageState({
      nodeId,
      revision: serverImageRevision,
      visible: false,
    });
  }

  return (
    <div className={styles.content} style={{ height }}>
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
      <InputControl
        {...inputControlProps}
        buttonProps={{
          ...inputControlProps.buttonProps,
          disabled: inputControlProps.buttonProps?.disabled
            || !treeNodeLabelSchema.safeParse(normalizedName).success
            || normalizedName === name,
        }}
        control="input"
        inputProps={{
          ...inputControlProps.inputProps,
          "aria-label": "Item name",
          label: "Name",
          maxLength: 200,
          placeholder: "Name",
        }}
        keyboardLayout="block"
        value={effectiveNameDraft}
        onChange={(value) => setNameDraft({ nodeId, saved: name, value })}
        onSend={async () => {
          if (!treeNodeLabelSchema.safeParse(normalizedName).success
            || normalizedName === name) return;
          if (await onNameChange(normalizedName)) {
            setNameDraft({
              nodeId,
              saved: normalizedName,
              value: normalizedName,
            });
          }
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
      <div className={styles.contentEditorArea}>
        {(draftImageUrl || serverImageVisible) && (
          <div className={styles.imagePreviewFrame}>
            <img
              className={styles.imagePreview}
              src={draftImageUrl ?? `${v2Api.dataImageUrl(
                replicaScope.workspaceId,
                nodeId,
              )}?v=${serverImageRevision}`}
              alt="DATA item"
              onError={() => {
                if (!draftImageUrl) setServerImageState({
                  nodeId,
                  revision: serverImageRevision,
                  visible: false,
                });
              }}
            />
            <Button
              {...inputControlProps.buttonProps}
              activeColor="COLOR_SPEECH"
              aria-label="Remove image"
              background="COLOR_SPEECH"
              className={styles.imageRemoveButton}
              height="2.5rem"
              width="2.5rem"
              onClick={() => void removeImage().catch(onSynchronizationError)}
            >
              <X aria-hidden="true" size="1em" />
            </Button>
          </div>
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
        height={root ? "100%" : height}
        textareaProps={{
          ...inputControlProps.textareaProps,
          ...contentEditorProps?.textareaProps,
          className: [
            inputControlProps.textareaProps?.className,
            contentEditorProps?.textareaProps?.className,
            styles.contentTextarea,
          ].filter(Boolean).join(" "),
        }}
        value={draft}
        onChange={(value) => setContentDraft({
          nodeId,
          revision: document?.revision,
          value,
        })}
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
              setContentDraft({
                nodeId,
                revision: current.revision,
                value: current.content,
              });
            }
            if (imageDraft) {
              setUploadDialogOpen(true);
              try {
                await v2Api.uploadDataImage(
                  replicaScope.workspaceId,
                  nodeId,
                  imageDraft.blob,
                  imageDraft.fileName,
                );
              } finally {
                setUploadDialogOpen(false);
              }
              await deleteDataImageDraft(replicaScope.workspaceId, nodeId);
              setSavedPreviewState({
                nodeId,
                value: imageDraft.previewBlob ?? null,
              });
              setImageDraftState({ nodeId, value: null });
              setServerImageState({
                nodeId,
                revision: Date.now(),
                visible: true,
              });
            }
          } catch (error) {
            onSynchronizationError(error);
          }
        }}
        />
      </div>
      <DataListSizeControl
        buttonProps={inputControlProps.buttonProps}
        listSizeButtonProps={listSizeButtonProps}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        onImageSelect={(file) => void selectImage(file).catch(
          onSynchronizationError,
        )}
      />
      <BlockingDialog
        background="COLOR_APP"
        border="BORDER_STANDARD"
        open={uploadDialogOpen}
        padding="SPACE_MD"
        title="Bild wird gespeichert"
        width="min(100%, 22rem)"
        actions={(
          <Button
            {...inputControlProps.buttonProps}
            width="100%"
            onClick={() => setUploadDialogOpen(false)}
          >
            Fortfahren
          </Button>
        )}
      >
        Der Upload ist noch nicht abgeschlossen.
      </BlockingDialog>
    </div>
  );
}

function DataListSizeControl({
  buttonProps,
  listSizeButtonProps,
  pageSize,
  onPageSizeChange,
  onImageSelect,
}: {
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  listSizeButtonProps?: Omit<
    ListControlListSizeButtonProps,
    "onPageSizeChange" | "pageSize"
  >;
  pageSize: ListControlListSize;
  onPageSizeChange: (pageSize: ListControlListSize) => void;
  onImageSelect?: (file: File) => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const receiveImage = (file: File | undefined) => {
    if (file) onImageSelect?.(file);
  };
  return (
    <div className={styles.listSizeControl}>
      <ListControlListSizeButton
        {...listSizeButtonProps}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
      {onImageSelect && (
        <>
          <Button
            {...buttonProps}
            aria-label="Take photo"
            activeColor="COLOR_SPEECH"
            background="COLOR_SPEECH"
            width="100%"
            onClick={() => cameraInput.current?.click()}
          >
            <Camera aria-hidden="true" />
          </Button>
          <Button
            {...buttonProps}
            aria-label="Choose image file"
            width="100%"
            onClick={() => fileInput.current?.click()}
          >
            <FolderOpen aria-hidden="true" />
          </Button>
          <input
            ref={cameraInput}
            className={styles.hiddenFileInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              receiveImage(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={fileInput}
            className={styles.hiddenFileInput}
            type="file"
            accept="image/*"
            onChange={(event) => {
              receiveImage(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </>
      )}
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

export function resolveFlatTreePath(
  nodes: readonly TreeNodeDto[],
  path: string,
) {
  let parentId: string | null = null;
  let current: TreeNodeDto | undefined;
  for (const segment of path.split("/").filter(Boolean)) {
    current = nodes.find((node) => (
      node.parentId === parentId && node.localId === segment
    ));
    if (!current) return undefined;
    parentId = current.id;
  }
  return current;
}

export function parseSavedViewPaths(content: string) {
  return [...new Set(content
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean))];
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
