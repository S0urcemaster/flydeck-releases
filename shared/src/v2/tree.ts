import { z } from "zod";
import { requestIdSchema, revisionSchema } from "./common.js";

export const treeKindSchema = z.enum(["data", "config"]);
export const treeNodeKindSchema = z.string().trim().min(1).max(64);
export const treeNodeLabelSchema = z.string().trim().min(1).max(200);
export const treeNodeShareNameSchema = z.string().trim().min(1).max(200);
export const treeNodeLocalIdSchema = z.string()
  .trim()
  .min(1)
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
  createdAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime().optional(),
  shared: z.boolean().optional(),
  shareName: treeNodeShareNameSchema.nullable().optional(),
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

export const treePageSizeSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(4),
  z.literal(7),
  z.literal(10),
  z.literal(15),
]);
export const treeListIdSchema = z.union([
  z.literal("__tree_root__"),
  z.uuid(),
]);
export const treePageSizesSchema = z.record(
  treeListIdSchema,
  treePageSizeSchema,
);

export const treeSelectionDtoSchema = z.object({
  revision: revisionSchema,
  selectedPath: z.array(z.uuid()),
  pageSizes: treePageSizesSchema,
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

export const createTreeNodeWithContentRequestSchema = createTreeNodeRequestSchema.extend({
  content: z.string().max(1_000_000),
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

export const editTreeNodeRequestSchema = z.object({
  requestId: requestIdSchema,
  label: treeNodeLabelSchema,
  localId: treeNodeLocalIdSchema,
  parentId: z.uuid().nullable(),
  content: z.string().max(1_000_000),
  expectedNodeRevision: revisionSchema,
  expectedContentRevision: revisionSchema,
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

export const setTreeNodeSharingRequestSchema = z.object({
  requestId: requestIdSchema,
  shared: z.boolean(),
  shareName: treeNodeShareNameSchema.nullable(),
  expectedRevision: revisionSchema,
}).strict().superRefine((value, context) => {
  if (value.shared && !value.shareName) {
    context.addIssue({
      code: "custom",
      message: "A share name is required before an item can be shared",
      path: ["shareName"],
    });
  }
});

export const setTreeSelectionRequestSchema = z.object({
  requestId: requestIdSchema,
  selectedPath: z.array(z.uuid()),
  pageSizes: treePageSizesSchema,
  expectedRevision: revisionSchema,
}).strict();

export const treeNodeContentDtoSchema = z.object({
  nodeId: z.uuid(),
  format: z.enum(["text", "markdown", "json"]),
  content: z.string().max(1_000_000),
  revision: revisionSchema,
  updatedAt: z.iso.datetime().optional(),
});

export const updateTreeNodeContentRequestSchema = z.object({
  requestId: requestIdSchema,
  content: z.string().max(1_000_000),
  expectedRevision: revisionSchema,
}).strict();

export const treeNodeImageDtoSchema = z.object({
  nodeId: z.uuid(),
  mimeType: z.string().startsWith("image/").max(100),
  originalName: z.string().max(255),
  byteSize: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});

export const deleteTreeNodeImageResponseSchema = z.object({
  nodeId: z.uuid(),
  deleted: z.boolean(),
});

export type TreeKind = z.infer<typeof treeKindSchema>;
export type TreeNodeDto = z.infer<typeof treeNodeDtoSchema>;
export type TreeDocumentDto = z.infer<typeof treeDocumentDtoSchema>;
export type TreeSemanticStateDto = z.infer<typeof treeSemanticStateDtoSchema>;
export type TreeSelectionDto = z.infer<typeof treeSelectionDtoSchema>;
export type TreePageSize = z.infer<typeof treePageSizeSchema>;
export type TreeLoadDto = z.infer<typeof treeLoadDtoSchema>;
export type CreateTreeNodeRequest = z.infer<typeof createTreeNodeRequestSchema>;
export type CreateTreeNodeWithContentRequest = z.infer<typeof createTreeNodeWithContentRequestSchema>;
export type CreateTreeNodeResponse = z.infer<typeof createTreeNodeResponseSchema>;
export type RenameTreeNodeRequest = z.infer<typeof renameTreeNodeRequestSchema>;
export type UpdateTreeNodeLocalIdRequest = z.infer<
  typeof updateTreeNodeLocalIdRequestSchema
>;
export type MoveTreeNodeRequest = z.infer<typeof moveTreeNodeRequestSchema>;
export type ReparentTreeNodeRequest = z.infer<typeof reparentTreeNodeRequestSchema>;
export type EditTreeNodeRequest = z.infer<typeof editTreeNodeRequestSchema>;
export type DeleteTreeNodeRequest = z.infer<typeof deleteTreeNodeRequestSchema>;
export type SetTreeNodeEnabledRequest = z.infer<typeof setTreeNodeEnabledRequestSchema>;
export type SetTreeNodeEnabledResponse = z.infer<typeof setTreeNodeEnabledResponseSchema>;
export type SetTreeNodeSharingRequest = z.infer<typeof setTreeNodeSharingRequestSchema>;
export type SetTreeSelectionRequest = z.infer<typeof setTreeSelectionRequestSchema>;
export type TreeNodeContentDto = z.infer<typeof treeNodeContentDtoSchema>;
export type UpdateTreeNodeContentRequest = z.infer<typeof updateTreeNodeContentRequestSchema>;
export type TreeNodeImageDto = z.infer<typeof treeNodeImageDtoSchema>;
export type DeleteTreeNodeImageResponse = z.infer<
  typeof deleteTreeNodeImageResponseSchema
>;
