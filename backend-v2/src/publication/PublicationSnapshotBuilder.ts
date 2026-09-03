import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  relayPublicationManifestV1Schema,
  type RelayPublicationAsset,
  type RelayPublicationManifestV1,
} from "@flydeck/shared/v2";
import type { Queryable } from "../db/database.js";

type PublishedNodeRow = {
  id: string;
  parent_id: string | null;
  local_id: string;
  position: number;
  label: string;
  share_name: string | null;
  created_at: Date;
  updated_at: Date;
  format: "text" | "markdown" | "json";
  content: string;
  relative_path: string | null;
  mime_type: string | null;
  original_name: string | null;
  byte_size: number | null;
};

export class PublicationSnapshotBuilder {
  constructor(
    private readonly database: Queryable,
    private readonly imageDirectory: string,
  ) {}

  async build(
    workspaceId: string,
    publicationId: string,
    version: number,
    createdAt = new Date(),
  ): Promise<RelayPublicationManifestV1> {
    return (await this.buildBundle(workspaceId, publicationId, version, createdAt)).manifest;
  }

  async buildBundle(
    workspaceId: string,
    publicationId: string,
    version: number,
    createdAt = new Date(),
  ): Promise<PublicationBundle> {
    const result = await this.database.query<PublishedNodeRow>(publishedSubtreeSql, [
      workspaceId,
      publicationId,
    ]);
    if (!result.rows[0]) throw new PublicationUnavailableError(publicationId);

    const assets = new Map<string, RelayPublicationAsset>();
    const assetPaths = new Map<string, string>();
    const nodes = [];
    for (const row of result.rows) {
      const references = [];
      if (row.relative_path && row.mime_type && row.byte_size !== null) {
        const absolutePath = safeSourcePath(this.imageDirectory, row.relative_path);
        if (!absolutePath) throw new Error(`Unsafe publication asset path for node ${row.id}`);
        const content = await readFile(absolutePath);
        if (content.length !== row.byte_size) {
          throw new Error(`Publication asset size changed for node ${row.id}`);
        }
        const sha256 = createHash("sha256").update(content).digest("hex");
        assets.set(sha256, {
          sha256,
          mimeType: row.mime_type,
          byteSize: content.length,
          originalName: row.original_name || null,
        });
        assetPaths.set(sha256, absolutePath);
        references.push({ sha256, role: "hero" as const, position: 0, alt: row.label });
      }
      nodes.push({
        id: row.id,
        parentId: row.id === publicationId ? null : row.parent_id,
        localId: row.local_id,
        position: row.position,
        label: row.share_name?.trim() || row.label,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        format: row.format,
        content: row.content,
        assets: references,
      });
    }
    const manifest = relayPublicationManifestV1Schema.parse({
      schemaVersion: 1,
      publicationId,
      version,
      title: result.rows[0].share_name?.trim() || result.rows[0].label,
      info: "",
      createdAt: createdAt.toISOString(),
      assets: [...assets.values()],
      nodes,
    });
    return { manifest, assetPaths };
  }
}

export type PublicationBundle = {
  manifest: RelayPublicationManifestV1;
  assetPaths: ReadonlyMap<string, string>;
};

export class PublicationUnavailableError extends Error {
  constructor(publicationId: string) {
    super(`Publication ${publicationId} is unavailable or not shared`);
  }
}

export function safeSourcePath(directory: string, relativePath: string) {
  const root = path.resolve(directory);
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? candidate
    : null;
}

const publishedSubtreeSql = `
  WITH RECURSIVE published AS (
    SELECT node.*
    FROM tree_nodes node
    JOIN trees ON trees.id = node.tree_id
    WHERE trees.workspace_id = $1
      AND trees.kind = 'data'
      AND node.id = $2
      AND node.shared = true
      AND node.share_name IS NOT NULL
    UNION ALL
    SELECT child.*
    FROM tree_nodes child
    JOIN published parent ON child.parent_id = parent.id
    WHERE child.tree_id = parent.tree_id
      AND child.kind NOT IN ('system-directory', 'trash-directory')
  )
  SELECT
    node.id, node.parent_id, node.local_id, node.position, node.label, node.share_name,
    node.created_at, node.updated_at,
    COALESCE(content.format, 'text') AS format,
    COALESCE(content.content, '') AS content,
    image.relative_path, image.mime_type, image.original_name, image.byte_size
  FROM published node
  LEFT JOIN node_contents content ON content.node_id = node.id
  LEFT JOIN node_images image ON image.node_id = node.id
  ORDER BY node.parent_id NULLS FIRST, node.position, node.id
`;
