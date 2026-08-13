import { z } from "zod";
import { requestIdSchema, revisionSchema } from "./common.js";

export const treeKindSchema = z.enum(["data", "config"]);
export const treeNodeKindSchema = z.string().trim().min(1).max(64);
export const treeNodeLabelSchema = z.string().trim().min(1).max(200);
export const treeNodeLocalIdSchema = z.string()
  .trim()
  .min(1)
  .max(12)
  .regex(/^[a-z0-9_-]+$/);

export function createTreeNodeLocalId(
  label: string,
  usedIds: Iterable<string> = [],
) {
  const used = new Set(usedIds);
  const normalized = label
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "s")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
  const base = normalized.slice(0, 12);
  if (!used.has(base)) return base;
  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = `${base.slice(0, 12 - suffixText.length)}${suffixText}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("No free item ID is available in this list");
}

export const treeNodeCapabilitiesDtoSchema = z.object({
  contentEditable: z.boolean(),
  listEditable: z.boolean(),
  listItemLimit: z.number().int().nonnegative().nullable(),
});

export const treeNodeDtoSchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  kind: treeNodeKindSchema,
  label: treeNodeLabelSchema,
  localId: treeNodeLocalIdSchema,
  position: z.number().int().nonnegative(),
  revision: revisionSchema,
  capabilities: treeNodeCapabilitiesDtoSchema,
});

export const treeDocumentDtoSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  kind: treeKindSchema,
  revision: revisionSchema,
  nodes: z.array(treeNodeDtoSchema),
});

export const treeSemanticStateDtoSchema = z.object({
  revision: revisionSchema,
  enabledNodeIds: z.array(z.uuid()),
  nodeRevisions: z.record(z.uuid(), revisionSchema),
});

export const treeSelectionDtoSchema = z.object({
  revision: revisionSchema,
  selectedPath: z.array(z.uuid()),
});

export const treeLoadDtoSchema = z.object({
  document: treeDocumentDtoSchema,
  semanticState: treeSemanticStateDtoSchema,
  selection: treeSelectionDtoSchema,
});

export const createTreeNodeRequestSchema = z.object({
  requestId: requestIdSchema,
  nodeId: z.uuid(),
  parentId: z.uuid().nullable(),
  afterNodeId: z.uuid().nullable(),
  kind: treeNodeKindSchema,
  label: treeNodeLabelSchema,
  localId: treeNodeLocalIdSchema,
  expectedTreeRevision: revisionSchema,
}).strict();

export const createTreeNodeResponseSchema = z.object({
  node: treeNodeDtoSchema,
  treeRevision: revisionSchema,
});

export const renameTreeNodeRequestSchema = z.object({
  requestId: requestIdSchema,
  label: treeNodeLabelSchema,
  expectedRevision: revisionSchema,
}).strict();

export const updateTreeNodeLocalIdRequestSchema = z.object({
  requestId: requestIdSchema,
  localId: treeNodeLocalIdSchema,
  expectedRevision: revisionSchema,
}).strict();

export const moveTreeNodeRequestSchema = z.object({
  requestId: requestIdSchema,
  afterNodeId: z.uuid().nullable(),
  expectedTreeRevision: revisionSchema,
}).strict();

export const reparentTreeNodeRequestSchema = z.object({
  requestId: requestIdSchema,
  parentId: z.uuid().nullable(),
  expectedTreeRevision: revisionSchema,
}).strict();

export const deleteTreeNodeRequestSchema = z.object({
  requestId: requestIdSchema,
  expectedTreeRevision: revisionSchema,
}).strict();

export const setTreeNodeEnabledRequestSchema = z.object({
  requestId: requestIdSchema,
  enabled: z.boolean(),
  expectedRevision: revisionSchema,
}).strict();

export const setTreeNodeEnabledResponseSchema = z.object({
  nodeId: z.uuid(),
  enabled: z.boolean(),
  revision: revisionSchema,
});

export const setTreeSelectionRequestSchema = z.object({
  requestId: requestIdSchema,
  selectedPath: z.array(z.uuid()),
  expectedRevision: revisionSchema,
}).strict();

export const treeNodeContentDtoSchema = z.object({
  nodeId: z.uuid(),
  format: z.enum(["text", "markdown", "json"]),
  content: z.string().max(1_000_000),
  revision: revisionSchema,
});

export const updateTreeNodeContentRequestSchema = z.object({
  requestId: requestIdSchema,
  content: z.string().max(1_000_000),
  expectedRevision: revisionSchema,
}).strict();

export type TreeKind = z.infer<typeof treeKindSchema>;
export type TreeNodeDto = z.infer<typeof treeNodeDtoSchema>;
export type TreeDocumentDto = z.infer<typeof treeDocumentDtoSchema>;
export type TreeSemanticStateDto = z.infer<typeof treeSemanticStateDtoSchema>;
export type TreeSelectionDto = z.infer<typeof treeSelectionDtoSchema>;
export type TreeLoadDto = z.infer<typeof treeLoadDtoSchema>;
export type CreateTreeNodeRequest = z.infer<typeof createTreeNodeRequestSchema>;
export type CreateTreeNodeResponse = z.infer<typeof createTreeNodeResponseSchema>;
export type RenameTreeNodeRequest = z.infer<typeof renameTreeNodeRequestSchema>;
export type UpdateTreeNodeLocalIdRequest = z.infer<
  typeof updateTreeNodeLocalIdRequestSchema
>;
export type MoveTreeNodeRequest = z.infer<typeof moveTreeNodeRequestSchema>;
export type ReparentTreeNodeRequest = z.infer<typeof reparentTreeNodeRequestSchema>;
export type DeleteTreeNodeRequest = z.infer<typeof deleteTreeNodeRequestSchema>;
export type SetTreeNodeEnabledRequest = z.infer<typeof setTreeNodeEnabledRequestSchema>;
export type SetTreeNodeEnabledResponse = z.infer<typeof setTreeNodeEnabledResponseSchema>;
export type SetTreeSelectionRequest = z.infer<typeof setTreeSelectionRequestSchema>;
export type TreeNodeContentDto = z.infer<typeof treeNodeContentDtoSchema>;
export type UpdateTreeNodeContentRequest = z.infer<typeof updateTreeNodeContentRequestSchema>;
