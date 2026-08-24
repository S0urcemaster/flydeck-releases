import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { TreeNodeImageDto } from "@flydeck/shared/v2";
import type { Database } from "../db/database.js";
import { HttpError } from "../http/HttpError.js";

const extensionsByMimeType: Record<string, string> = {
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type ImageRecord = {
  node_id: string;
  relative_path: string;
  mime_type: string;
  original_name: string;
  byte_size: number;
  updated_at: Date;
};

export class NodeImageService {
  constructor(
    private readonly database: Database,
    private readonly imageDirectory: string,
  ) {}

  async read(workspaceId: string, nodeId: string) {
    const result = await this.database.query<ImageRecord>(`
      SELECT node_images.*
      FROM node_images
      JOIN tree_nodes ON tree_nodes.id = node_images.node_id
      JOIN trees ON trees.id = tree_nodes.tree_id
      WHERE node_images.node_id = $1 AND trees.workspace_id = $2
    `, [nodeId, workspaceId]);
    const record = result.rows[0];
    if (!record) throw new HttpError(404, "NOT_FOUND", "Image was not found");
    return {
      ...toDto(record),
      absolutePath: path.join(this.imageDirectory, record.relative_path),
    };
  }

  async save(
    workspaceId: string,
    nodeId: string,
    mimeType: string,
    originalName: string,
    content: Buffer,
    now = new Date(),
  ): Promise<TreeNodeImageDto> {
    const normalizedMimeType = mimeType.toLowerCase();
    const extension = extensionsByMimeType[normalizedMimeType];
    if (!extension) {
      throw new HttpError(400, "INVALID_REQUEST", "Unsupported image type");
    }
    if (content.length === 0) {
      throw new HttpError(400, "INVALID_REQUEST", "Image is empty");
    }
    const node = await this.database.query<{ id: string }>(`
      SELECT tree_nodes.id
      FROM tree_nodes
      JOIN trees ON trees.id = tree_nodes.tree_id
      WHERE tree_nodes.id = $1 AND trees.workspace_id = $2
    `, [nodeId, workspaceId]);
    if (!node.rows[0]) {
      throw new HttpError(404, "NOT_FOUND", "Tree node was not found");
    }

    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const relativePath = path.join(month, `${nodeId}.${extension}`);
    const directory = path.join(this.imageDirectory, month);
    await mkdir(directory, { recursive: true });
    const destination = path.join(this.imageDirectory, relativePath);
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, content, { flag: "wx" });
    await rename(temporary, destination);

    const previous = await this.database.query<{ relative_path: string }>(
      "SELECT relative_path FROM node_images WHERE node_id = $1",
      [nodeId],
    );
    const result = await this.database.query<ImageRecord>(`
      INSERT INTO node_images (
        node_id, relative_path, mime_type, original_name, byte_size, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (node_id) DO UPDATE SET
        relative_path = EXCLUDED.relative_path,
        mime_type = EXCLUDED.mime_type,
        original_name = EXCLUDED.original_name,
        byte_size = EXCLUDED.byte_size,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `, [
      nodeId,
      relativePath,
      normalizedMimeType,
      safeFileName(originalName),
      content.length,
      now,
    ]);
    const previousPath = previous.rows[0]?.relative_path;
    if (previousPath && previousPath !== relativePath) {
      await unlink(path.join(this.imageDirectory, previousPath)).catch(() => undefined);
    }
    return toDto(result.rows[0]);
  }

  async delete(workspaceId: string, nodeId: string) {
    const result = await this.database.query<{ relative_path: string }>(`
      DELETE FROM node_images
      USING tree_nodes, trees
      WHERE node_images.node_id = $1
        AND tree_nodes.id = node_images.node_id
        AND trees.id = tree_nodes.tree_id
        AND trees.workspace_id = $2
      RETURNING node_images.relative_path
    `, [nodeId, workspaceId]);
    const relativePath = result.rows[0]?.relative_path;
    if (relativePath) {
      await unlink(path.join(this.imageDirectory, relativePath)).catch(() => undefined);
    }
    return Boolean(relativePath);
  }
}

function safeFileName(value: string) {
  return value.replace(/[\u0000-\u001f\u007f/\\]/g, "_").slice(0, 255);
}

function toDto(record: ImageRecord): TreeNodeImageDto {
  return {
    nodeId: record.node_id,
    mimeType: record.mime_type,
    originalName: record.original_name,
    byteSize: record.byte_size,
    updatedAt: record.updated_at.toISOString(),
  };
}
