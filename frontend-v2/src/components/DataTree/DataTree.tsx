import { useEffect, useState } from "react";
import {
  createTreeNodeLocalId,
  type TreeLoadDto,
  type TreeNodeDto,
} from "@flydeck/shared/v2";

import sayings from "../../assets/apps/compass/sayings.json";
import { v2Api } from "../../api/V2ApiClient";
import { DataBrowser, type DataBrowserProps } from "../DataBrowser";

export type DataTreeProps = DataBrowserProps;

export function DataTree({ workspaceId, ...props }: DataTreeProps) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    void importAppData(workspaceId).then((changed) => {
      if (active && changed) setRevision((current) => current + 1);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [workspaceId]);

  return (
    <DataBrowser
      {...props}
      componentName="DataTree"
      key={`${workspaceId ?? "memory"}-${revision}`}
      workspaceId={workspaceId}
      canDeleteNode={(node, parent) => {
        if (node.kind === "system-directory" || node.kind === "trash-directory") {
          return false;
        }
        return parent?.kind === "trash-directory" || parent?.listEditable !== false;
      }}
      canMoveNode={(node, direction, siblings) => {
        if (node.kind === "system-directory" || node.kind === "trash-directory") return false;
        const neighbour = siblings[siblings.indexOf(node) + direction];
        return neighbour?.kind !== "system-directory" && neighbour?.kind !== "trash-directory";
      }}
    />
  );
}

async function importAppData(workspaceId: string) {
  let load = await v2Api.loadDataTree(workspaceId);
  const system = requiredNode(load, "system-directory");
  const compassDirectories = load.document.nodes.filter((node) => (
    node.parentId === system.id && node.kind === "app-directory" && node.label === "Compass"
  ));
  let compass: TreeNodeDto | null = compassDirectories[0] ?? null;
  let changed = false;

  for (const duplicate of compassDirectories.slice(1)) {
    const children = load.document.nodes.filter((node) => node.parentId === duplicate.id);
    for (const child of children) {
      await v2Api.reparentDataNode(workspaceId, child.id, {
        requestId: crypto.randomUUID(),
        parentId: compass!.id,
        expectedTreeRevision: load.document.revision,
      });
      load = await v2Api.loadDataTree(workspaceId);
    }
    await v2Api.deleteDataNode(workspaceId, duplicate.id, {
      requestId: crypto.randomUUID(),
      expectedTreeRevision: load.document.revision,
    });
    load = await v2Api.loadDataTree(workspaceId);
    changed = true;
  }

  if (!compass) {
    await v2Api.createDataNode(workspaceId, {
      requestId: crypto.randomUUID(),
      nodeId: crypto.randomUUID(),
      parentId: system.id,
      afterNodeId: null,
      kind: "app-directory",
      label: "Compass",
      localId: createTreeNodeLocalId(
        "Compass",
        load.document.nodes
          .filter((node) => node.parentId === system.id)
          .map((node) => node.localId),
      ),
      expectedTreeRevision: load.document.revision,
    });
    changed = true;
    load = await v2Api.loadDataTree(workspaceId);
    compass = load.document.nodes.find((node) => (
      node.parentId === system.id && node.kind === "app-directory" && node.label === "Compass"
    )) ?? null;
  }
  if (!compass) return changed;

  const legacyData = load.document.nodes.filter((node) => (
    node.parentId === compass!.id && node.kind === "app-data" && node.label === "sayings.json"
  ));
  for (const node of legacyData) {
    await v2Api.deleteDataNode(workspaceId, node.id, {
      requestId: crypto.randomUUID(),
      expectedTreeRevision: load.document.revision,
    });
    load = await v2Api.loadDataTree(workspaceId);
    changed = true;
  }

  let treeRevision = load.document.revision;
  const categoryNodes = new Map(
    load.document.nodes
      .filter((node) => node.parentId === compass.id && node.kind === "compass-category")
      .map((node) => [node.label, node]),
  );
  const categories = [...new Set(sayings.flatMap((saying) => saying.categories))];
  for (const category of categories) {
    if (categoryNodes.has(category)) continue;
    const created = await v2Api.createDataNode(workspaceId, {
      requestId: crypto.randomUUID(),
      nodeId: crypto.randomUUID(),
      parentId: compass.id,
      afterNodeId: null,
      kind: "compass-category",
      label: category,
      localId: createTreeNodeLocalId(
        category,
        [...categoryNodes.values()].map((node) => node.localId),
      ),
      expectedTreeRevision: treeRevision,
    });
    categoryNodes.set(category, created.node);
    treeRevision = created.treeRevision;
    changed = true;
  }

  const existingSayingKeys = new Set(
    load.document.nodes
      .filter((node) => node.kind.startsWith("compass-saying-") && node.parentId !== null)
      .map((node) => `${node.parentId}:${node.kind}`),
  );
  const localIdsByParent = new Map<string, Set<string>>();
  for (const node of load.document.nodes) {
    if (!node.parentId) continue;
    const used = localIdsByParent.get(node.parentId) ?? new Set<string>();
    used.add(node.localId);
    localIdsByParent.set(node.parentId, used);
  }
  for (const saying of sayings) {
    const kind = `compass-saying-${saying.id}`;
    for (const category of saying.categories) {
      const parent = categoryNodes.get(category);
      if (!parent || existingSayingKeys.has(`${parent.id}:${kind}`)) continue;
      const usedLocalIds = localIdsByParent.get(parent.id) ?? new Set<string>();
      const localId = createTreeNodeLocalId(shortLabel(saying.text), usedLocalIds);
      const created = await v2Api.createDataNode(workspaceId, {
        requestId: crypto.randomUUID(),
        nodeId: crypto.randomUUID(),
        parentId: parent.id,
        afterNodeId: null,
        kind,
        label: shortLabel(saying.text),
        localId,
        expectedTreeRevision: treeRevision,
      });
      await v2Api.updateDataContent(workspaceId, created.node.id, {
        requestId: crypto.randomUUID(),
        content: saying.text,
        expectedRevision: created.node.revision,
      });
      treeRevision = created.treeRevision;
      usedLocalIds.add(localId);
      localIdsByParent.set(parent.id, usedLocalIds);
      existingSayingKeys.add(`${parent.id}:${kind}`);
      changed = true;
    }
  }
  return changed;
}

function requiredNode(load: TreeLoadDto, kind: string) {
  const node = load.document.nodes.find((candidate) => candidate.kind === kind);
  if (!node) throw new Error(`Missing required ${kind}`);
  return node;
}

function shortLabel(text: string) {
  return Array.from(text).slice(0, 20).join("");
}
