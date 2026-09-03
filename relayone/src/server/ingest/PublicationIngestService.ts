import { createHash } from "node:crypto";

import type {
  RelayIngestActivationResult,
  RelayIngestStageResult,
  RelayPublicationManifestV1,
} from "../../shared/contracts.js";
import type { Queryable } from "../database.js";
import { AssetStore } from "./AssetStore.js";

type AssetMetadataRow = {
  mime_type: string;
  byte_size: string;
  original_name: string | null;
};

export class PublicationIngestService {
  constructor(
    private readonly database: Queryable,
    private readonly assets: AssetStore,
  ) {}

  async stage(manifest: RelayPublicationManifestV1): Promise<RelayIngestStageResult> {
    const manifestJson = JSON.stringify(manifest);
    const manifestHash = createHash("sha256").update(manifestJson).digest("hex");
    const staged = await this.database.query<{ publication_id: string }>(
      stagePublicationSql,
      [manifestJson, manifestHash],
    );
    if (!staged.rows[0]) {
      throw new IngestConflictError("Publication version already exists with different content");
    }

    const missingAssets: string[] = [];
    for (const asset of manifest.assets) {
      if (!await this.assets.has(asset.sha256, asset.byteSize)) {
        missingAssets.push(asset.sha256);
      }
    }
    return {
      publicationId: manifest.publicationId,
      version: manifest.version,
      missingAssets,
      status: "staging",
    };
  }

  async putAsset(sha256: string, content: Buffer) {
    const expected = await this.database.query<AssetMetadataRow>(`
      SELECT mime_type, byte_size::text, original_name
      FROM relay_version_assets
      WHERE sha256 = $1
      ORDER BY publication_version DESC
      LIMIT 1
    `, [sha256]);
    const metadata = expected.rows[0];
    if (!metadata) throw new IngestConflictError("Asset is not declared by a staged version");
    if (Number(metadata.byte_size) !== content.length) {
      throw new IngestConflictError("Asset byte size does not match its manifest");
    }
    const storagePath = await this.assets.put(sha256, content);
    await this.database.query(`
      INSERT INTO relay_assets (sha256, mime_type, byte_size, storage_path, original_name)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (sha256) DO NOTHING
    `, [sha256, metadata.mime_type, content.length, storagePath, metadata.original_name]);
  }

  async activate(publicationId: string, version: number): Promise<RelayIngestActivationResult> {
    const expected = await this.database.query<{ sha256: string; byte_size: string }>(`
      SELECT sha256, byte_size::text
      FROM relay_version_assets
      WHERE publication_id = $1 AND publication_version = $2
    `, [publicationId, version]);
    for (const asset of expected.rows) {
      if (!await this.assets.has(asset.sha256, Number(asset.byte_size))) {
        throw new IngestConflictError(`Asset ${asset.sha256} is missing from storage`);
      }
    }
    const result = await this.database.query<{ version: string }>(activatePublicationSql, [
      publicationId,
      version,
    ]);
    if (!result.rows[0]) {
      throw new IngestConflictError("Version is absent, already superseded, or has missing assets");
    }
    return { publicationId, version, status: "active" };
  }

  async unpublish(publicationId: string) {
    const result = await this.database.query(`
      WITH retired AS (
        UPDATE relay_publication_versions version
        SET status = 'retired'
        FROM relay_publications publication
        WHERE publication.id = $1
          AND version.publication_id = publication.id
          AND version.version = publication.active_version
      )
      UPDATE relay_publications
      SET active_version = NULL, updated_at = now()
      WHERE id = $1 AND active_version IS NOT NULL
      RETURNING id
    `, [publicationId]);
    return result.rowCount === 1;
  }
}

export class IngestConflictError extends Error {}

const stagePublicationSql = `
  WITH manifest AS (
    SELECT $1::jsonb AS value
  ), publication AS (
    INSERT INTO relay_publications (id, title, info)
    SELECT (value->>'publicationId')::uuid, value->>'title', value->>'info'
    FROM manifest
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      info = EXCLUDED.info,
      updated_at = now()
    RETURNING id
  ), version AS (
    INSERT INTO relay_publication_versions (
      publication_id, version, schema_version, manifest_sha256, status, created_at
    )
    SELECT
      (value->>'publicationId')::uuid,
      (value->>'version')::bigint,
      (value->>'schemaVersion')::integer,
      $2,
      'staging',
      (value->>'createdAt')::timestamptz
    FROM manifest
    ON CONFLICT (publication_id, version) DO UPDATE SET
      manifest_sha256 = EXCLUDED.manifest_sha256
    WHERE relay_publication_versions.status = 'staging'
      AND relay_publication_versions.manifest_sha256 = EXCLUDED.manifest_sha256
    RETURNING publication_id, version
  ), version_assets AS (
    INSERT INTO relay_version_assets (
      publication_id, publication_version, sha256, mime_type, byte_size, original_name
    )
    SELECT
      version.publication_id,
      version.version,
      asset->>'sha256',
      asset->>'mimeType',
      (asset->>'byteSize')::bigint,
      asset->>'originalName'
    FROM manifest, version, jsonb_array_elements(manifest.value->'assets') asset
    ON CONFLICT DO NOTHING
  ), nodes AS (
    INSERT INTO relay_nodes (
      publication_id, publication_version, id, parent_id, local_id, position,
      label, format, content, source_created_at, source_updated_at
    )
    SELECT
      version.publication_id,
      version.version,
      (node->>'id')::uuid,
      (node->>'parentId')::uuid,
      node->>'localId',
      (node->>'position')::integer,
      node->>'label',
      node->>'format',
      node->>'content',
      (node->>'createdAt')::timestamptz,
      (node->>'updatedAt')::timestamptz
    FROM manifest, version, jsonb_array_elements(manifest.value->'nodes') node
    ON CONFLICT DO NOTHING
    RETURNING publication_id, publication_version, id
  ), node_assets AS (
    INSERT INTO relay_node_assets (
      publication_id, publication_version, node_id, sha256, role, position, alt
    )
    SELECT
      version.publication_id,
      version.version,
      (node->>'id')::uuid,
      reference->>'sha256',
      reference->>'role',
      (reference->>'position')::integer,
      reference->>'alt'
    FROM manifest, version,
      jsonb_array_elements(manifest.value->'nodes') node,
      jsonb_array_elements(node->'assets') reference
    ON CONFLICT DO NOTHING
  )
  SELECT publication_id FROM version
`;

const activatePublicationSql = `
  WITH candidate AS (
    SELECT version.publication_id, version.version
    FROM relay_publication_versions version
    WHERE version.publication_id = $1
      AND version.version = $2
      AND version.status = 'staging'
      AND NOT EXISTS (
        SELECT 1
        FROM relay_version_assets expected
        LEFT JOIN relay_assets stored
          ON stored.sha256 = expected.sha256
         AND stored.byte_size = expected.byte_size
        WHERE expected.publication_id = version.publication_id
          AND expected.publication_version = version.version
          AND stored.sha256 IS NULL
      )
  ), retired AS (
    UPDATE relay_publication_versions version
    SET status = 'retired'
    FROM candidate
    WHERE version.publication_id = candidate.publication_id
      AND version.status = 'active'
      AND version.version <> candidate.version
  ), activated AS (
    UPDATE relay_publication_versions version
    SET status = 'active', activated_at = now()
    FROM candidate
    WHERE version.publication_id = candidate.publication_id
      AND version.version = candidate.version
    RETURNING version.publication_id, version.version
  )
  UPDATE relay_publications publication
  SET active_version = activated.version, updated_at = now()
  FROM activated
  WHERE publication.id = activated.publication_id
  RETURNING activated.version::text
`;
