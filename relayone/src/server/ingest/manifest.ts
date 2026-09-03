import { z } from "zod";

import type { RelayPublicationManifestV1 } from "../../shared/contracts.js";

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const uuidSchema = z.uuid();
const timestampSchema = z.iso.datetime({ offset: true });

const assetSchema = z.object({
  sha256: sha256Schema,
  mimeType: z.string().trim().min(1).max(200),
  byteSize: z.number().int().nonnegative().max(2 * 1_024 * 1_024 * 1_024),
  originalName: z.string().trim().min(1).max(500).nullable(),
}).strict();

const nodeAssetSchema = z.object({
  sha256: sha256Schema,
  role: z.enum(["hero", "attachment", "video", "audio"]),
  position: z.number().int().nonnegative(),
  alt: z.string().trim().max(1_000).nullable(),
}).strict();

const nodeSchema = z.object({
  id: uuidSchema,
  parentId: uuidSchema.nullable(),
  localId: z.string().trim().min(1).max(200),
  position: z.number().int().nonnegative(),
  label: z.string().trim().min(1).max(500),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  format: z.enum(["text", "markdown", "json"]),
  content: z.string().max(10 * 1_024 * 1_024),
  assets: z.array(nodeAssetSchema).max(1_000),
}).strict();

export const relayPublicationManifestSchema = z.object({
  schemaVersion: z.literal(1),
  publicationId: uuidSchema,
  version: z.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  info: z.string().trim().max(1_000),
  createdAt: timestampSchema,
  assets: z.array(assetSchema).max(10_000),
  nodes: z.array(nodeSchema).min(1).max(100_000),
}).strict().superRefine((manifest, context) => {
  const assetHashes = new Set<string>();
  for (const asset of manifest.assets) {
    if (assetHashes.has(asset.sha256)) {
      context.addIssue({ code: "custom", message: `Duplicate asset ${asset.sha256}`, path: ["assets"] });
    }
    assetHashes.add(asset.sha256);
  }
  const nodeIds = new Set(manifest.nodes.map((node) => node.id));
  if (nodeIds.size !== manifest.nodes.length) {
    context.addIssue({ code: "custom", message: "Node IDs must be unique", path: ["nodes"] });
  }
  for (const [index, node] of manifest.nodes.entries()) {
    if (node.parentId && !nodeIds.has(node.parentId)) {
      context.addIssue({ code: "custom", message: `Parent ${node.parentId} is absent from the snapshot`, path: ["nodes", index, "parentId"] });
    }
    for (const reference of node.assets) {
      if (!assetHashes.has(reference.sha256)) {
        context.addIssue({ code: "custom", message: `Asset ${reference.sha256} is absent from the manifest`, path: ["nodes", index, "assets"] });
      }
    }
  }
}) satisfies z.ZodType<RelayPublicationManifestV1>;

export function parsePublicationManifest(value: unknown): RelayPublicationManifestV1 {
  return relayPublicationManifestSchema.parse(value);
}
