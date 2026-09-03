import { z } from "zod";

export const relayAssetHashSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const relayPublicationAssetSchema = z.object({
  sha256: relayAssetHashSchema,
  mimeType: z.string().trim().min(1).max(200),
  byteSize: z.number().int().nonnegative().max(2 * 1_024 * 1_024 * 1_024),
  originalName: z.string().trim().min(1).max(500).nullable(),
}).strict();

export const relayPublicationNodeAssetSchema = z.object({
  sha256: relayAssetHashSchema,
  role: z.enum(["hero", "attachment", "video", "audio"]),
  position: z.number().int().nonnegative(),
  alt: z.string().trim().max(1_000).nullable(),
}).strict();

export const relayPublicationNodeSchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  localId: z.string().trim().min(1).max(200),
  position: z.number().int().nonnegative(),
  label: z.string().trim().min(1).max(500),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  format: z.enum(["text", "markdown", "json"]),
  content: z.string().max(10 * 1_024 * 1_024),
  assets: z.array(relayPublicationNodeAssetSchema).max(1_000),
}).strict();

export const relayPublicationManifestV1Schema = z.object({
  schemaVersion: z.literal(1),
  publicationId: z.uuid(),
  version: z.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  info: z.string().trim().max(1_000),
  createdAt: z.iso.datetime({ offset: true }),
  assets: z.array(relayPublicationAssetSchema).max(10_000),
  nodes: z.array(relayPublicationNodeSchema).min(1).max(100_000),
}).strict().superRefine((manifest, context) => {
  const assetHashes = new Set<string>();
  for (const asset of manifest.assets) {
    if (assetHashes.has(asset.sha256)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate asset ${asset.sha256}`,
        path: ["assets"],
      });
    }
    assetHashes.add(asset.sha256);
  }

  const nodeIds = new Set(manifest.nodes.map((node) => node.id));
  if (nodeIds.size !== manifest.nodes.length) {
    context.addIssue({ code: "custom", message: "Node IDs must be unique", path: ["nodes"] });
  }
  for (const [index, node] of manifest.nodes.entries()) {
    if (node.parentId && !nodeIds.has(node.parentId)) {
      context.addIssue({
        code: "custom",
        message: `Parent ${node.parentId} is absent from the snapshot`,
        path: ["nodes", index, "parentId"],
      });
    }
    for (const reference of node.assets) {
      if (!assetHashes.has(reference.sha256)) {
        context.addIssue({
          code: "custom",
          message: `Asset ${reference.sha256} is absent from the manifest`,
          path: ["nodes", index, "assets"],
        });
      }
    }
  }
});

export type RelayPublicationManifestV1 = z.infer<typeof relayPublicationManifestV1Schema>;
export type RelayPublicationAsset = z.infer<typeof relayPublicationAssetSchema>;
