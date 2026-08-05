import { z } from "zod";
import { requestIdSchema, revisionSchema } from "./common.js";

export const treeKindSchema = z.enum(["data", "config"]);
export const treeNodeKindSchema = z.string().trim().min(1).max(64);
export const treeNodeLabelSchema = z.string().trim().min(1).max(200);

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
  parentId: z.uuid().nullable(),
  afterNodeId: z.uuid().nullable(),
  kind: treeNodeKindSchema,
  label: treeNodeLabelSchema,
  expectedTreeRevision: revisionSchema,
}).strict();

export const createTreeNodeResponseSchema = z.object({
  node: treeNodeDtoSchema,
  treeRevision: revisionSchema,
});

export const renameTreeNodeRequestSchema = z.object({
  label: treeNodeLabelSchema,
  expectedRevision: revisionSchema,
}).strict();

export const moveTreeNodeRequestSchema = z.object({
  afterNodeId: z.uuid().nullable(),
  expectedTreeRevision: revisionSchema,
}).strict();

export const deleteTreeNodeRequestSchema = z.object({
  expectedTreeRevision: revisionSchema,
}).strict();

export const setTreeNodeEnabledRequestSchema = z.object({
  enabled: z.boolean(),
  expectedRevision: revisionSchema,
}).strict();

export const setTreeNodeEnabledResponseSchema = z.object({
  nodeId: z.uuid(),
  enabled: z.boolean(),
  revision: revisionSchema,
});

export const setTreeSelectionRequestSchema = z.object({
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
export type MoveTreeNodeRequest = z.infer<typeof moveTreeNodeRequestSchema>;
export type DeleteTreeNodeRequest = z.infer<typeof deleteTreeNodeRequestSchema>;
export type SetTreeNodeEnabledRequest = z.infer<typeof setTreeNodeEnabledRequestSchema>;
export type SetTreeNodeEnabledResponse = z.infer<typeof setTreeNodeEnabledResponseSchema>;
export type SetTreeSelectionRequest = z.infer<typeof setTreeSelectionRequestSchema>;
export type TreeNodeContentDto = z.infer<typeof treeNodeContentDtoSchema>;
export type UpdateTreeNodeContentRequest = z.infer<typeof updateTreeNodeContentRequestSchema>;
