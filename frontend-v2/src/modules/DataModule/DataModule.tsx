import { useMemo, useState } from "react";
import { treeNodeLabelSchema, type TreeNodeDto } from "@flydeck/shared/v2";
import { DataTree, type DataTreeProps } from "../../components/DataTree";
import {
  createFlatTreeNodePath,
  createSelectedPathSlice,
  resolveFlatTreePath,
} from "../../components/DataBrowser/DataBrowser";
import { Module, type ModuleProps } from "../../components/Module";
import {
  useWorkspaceReplica,
  type WorkspaceReplicaScope,
} from "../../replica";
import { useClientStateScope, useClientStateSlice } from "../../state";
import styles from "./DataModule.module.css";

const emptyNodes: readonly TreeNodeDto[] = [];

export type DataModuleProps = ModuleProps & {
  dataBrowserProps?: DataTreeProps;
};

export function DataModule({ dataBrowserProps, ...props }: DataModuleProps) {
  return (
    <Module {...props} componentName="DataModule" aria-label="Data module">
      <DataTree {...dataBrowserProps} />
      <div className={styles.bottomSpacer} aria-hidden="true" />
    </Module>
  );
}

export type LensModuleProps = ModuleProps & {
  dataBrowserProps?: DataTreeProps;
  workspaceId?: string;
};

export function LensModule({ dataBrowserProps, workspaceId, ...props }: LensModuleProps) {
  const { userId } = useClientStateScope();
  const scope = useMemo<WorkspaceReplicaScope | null>(() => workspaceId
    ? { userId, workspaceId }
    : null, [userId, workspaceId]);
  const record = useWorkspaceReplica(scope);
  const nodes = record?.tree?.document.nodes ?? emptyNodes;
  const lensRoot = resolveFlatTreePath(nodes, "_system/lens");
  const [selectedLensId, setSelectedLensId] = useState<string | null>(null);
  const dataSelectionSlice = useMemo(() => createSelectedPathSlice("data"), []);
  const [dataSelectedPath] = useClientStateSlice(dataSelectionSlice);
  const nodeIndex = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const lensNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!lensRoot) return ids;
    const childrenByParent = new Map<string, string[]>();
    for (const node of nodes) {
      if (!node.parentId) continue;
      const children = childrenByParent.get(node.parentId) ?? [];
      children.push(node.id);
      childrenByParent.set(node.parentId, children);
    }
    const pending = [lensRoot.id];
    while (pending.length > 0) {
      const id = pending.pop()!;
      if (ids.has(id)) continue;
      ids.add(id);
      pending.push(...(childrenByParent.get(id) ?? []));
    }
    return ids;
  }, [lensRoot, nodes]);
  const dataPath = useMemo(
    () => createFlatTreeNodePath(nodes, dataSelectedPath.at(-1)),
    [dataSelectedPath, nodes],
  );
  const dataTarget = dataPath ? resolveFlatTreePath(nodes, dataPath) : undefined;
  const dataPathIsLens = Boolean(dataTarget && lensNodeIds.has(dataTarget.id));
  const lensAlreadyExists = nodes.some((node) => node.parentId === lensRoot?.id
    && node.label.trim() === dataPath);
  const canCreateLens = treeNodeLabelSchema.safeParse(dataPath).success
    && !dataPathIsLens
    && !lensAlreadyExists;

  const targetPath = selectedLensId
    ? nodeIndex.get(selectedLensId)?.label.trim() ?? ""
    : "";
  const target = targetPath ? resolveFlatTreePath(nodes, targetPath) : undefined;
  const targetInsideLensTree = Boolean(target && lensNodeIds.has(target.id));
  const targetPageSize = target
    ? record?.tree?.selection.pageSizes[target.id]
    : undefined;

  return (
    <Module {...props} componentName="DataModule" aria-label="Lens module">
      {lensRoot ? (
        <DataTree
          {...dataBrowserProps}
          leafListsVisible={false}
          formatItemLabel={({ label }) => label.length > 18
            ? `…${label.slice(-18)}`
            : label}
          maxDepth={1}
          menuVisible={false}
          navigationSlot="lens-index"
          newNodeName={dataPath}
          rootPageSize={7}
          rootNodeId={lensRoot.id}
          workspaceId={workspaceId}
          canCreateNode={() => canCreateLens}
          onSelectedNodeChange={setSelectedLensId}
        />
      ) : null}
      {target && !targetInsideLensTree ? (
        <div className={styles.focus}>
          <DataTree
            {...dataBrowserProps}
            fixedRootPageSize={targetPageSize}
            key={selectedLensId}
            navigationSlot={`lens-focus-${selectedLensId}`}
            rootNodeId={target.id}
            workspaceId={workspaceId}
          />
        </div>
      ) : null}
    </Module>
  );
}
