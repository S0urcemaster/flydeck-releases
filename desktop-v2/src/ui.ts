import {
  Box,
  Collection,
  Document,
  Folder,
} from "@element-plus/icons-vue";
import type { TreeRow } from "./api";

export type ModuleId = "AGNT" | "DATA" | "APPS" | "CRON";
export type DesktopAppId = "data-analysis" | "mindmap";
export type AppVisualization = "timeline" | "mindmap";

export type NavigatorRow = Omit<TreeRow, "children"> & {
  children: NavigatorRow[];
  synthetic?: boolean;
};

export interface InspectorDraft {
  mode: "edit" | "new";
  nodeId: string | null;
  label: string;
  localId: string;
  localIdAutomatic: boolean;
  parentId: string | null;
  parentText: string;
  parentValid: boolean;
  content: string;
  contentRevision: number;
  contentDirty: boolean;
}

export interface ParentOption {
  id: string | null;
  label: string;
}

export function nodeIcon(row: Pick<TreeRow, "kind" | "children">) {
  if (row.kind.includes("directory")) return Folder;
  if (row.children.length) return Collection;
  if (row.kind.includes("item")) return Document;
  return Box;
}
