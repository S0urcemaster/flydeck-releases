import path from "node:path";

import type {
  RelayNavigationLevel,
  RelayNodePage,
  RelayPostSummary,
  RelaySite,
} from "../shared/contracts.js";
import type { RelayConfig } from "./config.js";
import type { Queryable } from "./database.js";
import type { RelayAsset, RelayImage, RelayReader } from "./RelayStore.js";

type ProjectedNodeRow = {
  publication_id: string;
  id: string;
  parent_id: string | null;
  label: string;
  local_id: string;
  position: number;
  source_created_at: Date;
  source_updated_at: Date;
  format: "text" | "markdown" | "json";
  content: string;
  image_sha256: string | null;
  child_count: number;
};

type ProjectedAssetRow = {
  storage_path: string;
  mime_type: string;
  byte_size: string;
  created_at: Date;
};

export class ProjectedRelayStore implements RelayReader {
  constructor(
    private readonly database: Queryable,
    private readonly config: RelayConfig,
  ) {}

  async loadSite(): Promise<RelaySite> {
    const result = await this.database.query<ProjectedNodeRow>(projectedRootsSql);
    return {
      title: this.config.title,
      info: this.config.info,
      roots: result.rows.map(toSummary),
    };
  }

  async loadNode(nodeId: string): Promise<RelayNodePage | null> {
    const [result, roots] = await Promise.all([
      this.database.query<ProjectedNodeRow>(projectedNavigationSql, [nodeId]),
      this.database.query<ProjectedNodeRow>(projectedRootsSql),
    ]);
    const selected = result.rows.find((row) => row.id === nodeId);
    if (!selected) return null;

    const byId = new Map(result.rows.map((row) => [row.id, row]));
    const pathRows: ProjectedNodeRow[] = [selected];
    let current = selected;
    while (current.parent_id) {
      const parent = byId.get(current.parent_id);
      if (!parent) break;
      pathRows.unshift(parent);
      current = parent;
    }

    const levels: RelayNavigationLevel[] = pathRows.map((active, depth) => ({
      activeId: active.id,
      depth,
      nodes: depth === 0
        ? roots.rows.map(toSummary)
        : result.rows.filter((row) => row.parent_id === pathRows[depth - 1].id).map(toSummary),
    }));
    const children = result.rows.filter((row) => row.parent_id === selected.id).map(toSummary);
    if (children.length > 0) {
      levels.push({ activeId: null, depth: pathRows.length, nodes: children });
    }
    return {
      parents: pathRows.slice(0, -1).map(toSummary),
      levels,
      post: {
        ...toSummary(selected),
        format: selected.format,
        content: selected.content,
        children,
      },
    };
  }

  async loadNodeByPath(localIds: readonly string[]): Promise<RelayNodePage | null> {
    if (localIds.length === 0) return null;
    const site = await this.loadSite();
    let summary = site.roots.find((root) => root.localId === localIds[0]);
    if (!summary) return null;
    let page = await this.loadNode(summary.id);
    for (const localId of localIds.slice(1)) {
      summary = page?.post.children.find((child) => child.localId === localId);
      if (!summary) return null;
      page = await this.loadNode(summary.id);
    }
    return page;
  }

  // Kept only while the legacy /api/images route exists during cutover.
  async readImage(_nodeId: string): Promise<RelayImage | null> {
    return null;
  }

  async readAsset(sha256: string): Promise<RelayAsset | null> {
    if (!/^[0-9a-f]{64}$/.test(sha256)) return null;
    const result = await this.database.query<ProjectedAssetRow>(projectedAssetSql, [sha256]);
    const asset = result.rows[0];
    if (!asset) return null;
    const absolutePath = safeAssetPath(this.config.assetDirectory, asset.storage_path);
    return absolutePath ? {
      absolutePath,
      byte_size: Number(asset.byte_size),
      mime_type: asset.mime_type,
      updated_at: asset.created_at,
    } : null;
  }

  async isReady() {
    const result = await this.database.query<{ available: boolean }>(`
      SELECT to_regclass('public.relay_publications') IS NOT NULL
        AND to_regclass('public.relay_nodes') IS NOT NULL AS available
    `);
    return result.rows[0]?.available === true;
  }
}

function toSummary(row: ProjectedNodeRow): RelayPostSummary {
  return {
    id: row.id,
    label: row.label,
    localId: row.local_id,
    createdAt: row.source_created_at.toISOString(),
    updatedAt: row.source_updated_at.toISOString(),
    imageUrl: row.image_sha256 ? `/assets/${row.image_sha256}` : null,
    childCount: row.child_count,
    hasChildren: row.child_count > 0,
  };
}

export function safeAssetPath(assetDirectory: string, storedPath: string) {
  const root = path.resolve(assetDirectory);
  const candidate = path.resolve(storedPath);
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return candidate;
}

const projectedNodeColumns = `
  node.publication_id, node.id, node.parent_id, node.label, node.local_id,
  node.position, node.source_created_at, node.source_updated_at,
  node.format, node.content,
  hero.sha256 AS image_sha256,
  (
    WITH RECURSIVE descendants AS (
      SELECT child.id
      FROM relay_nodes child
      WHERE child.publication_id = node.publication_id
        AND child.publication_version = node.publication_version
        AND child.parent_id = node.id

      UNION ALL

      SELECT child.id
      FROM relay_nodes child
      JOIN descendants parent ON child.parent_id = parent.id
      WHERE child.publication_id = node.publication_id
        AND child.publication_version = node.publication_version
    )
    SELECT count(*)::int FROM descendants
  ) AS child_count
`;

const projectedRootsSql = `
  SELECT ${projectedNodeColumns}
  FROM relay_publications publication
  JOIN relay_nodes node
    ON node.publication_id = publication.id
   AND node.publication_version = publication.active_version
  LEFT JOIN relay_node_assets hero
    ON hero.publication_id = node.publication_id
   AND hero.publication_version = node.publication_version
   AND hero.node_id = node.id AND hero.role = 'hero' AND hero.position = 0
  WHERE publication.active_version IS NOT NULL AND node.parent_id IS NULL
  ORDER BY node.position, node.id
`;

const projectedNavigationSql = `
  WITH selected AS (
    SELECT node.publication_id, node.publication_version
    FROM relay_publications publication
    JOIN relay_nodes node
      ON node.publication_id = publication.id
     AND node.publication_version = publication.active_version
    WHERE node.id = $1
    LIMIT 1
  )
  SELECT ${projectedNodeColumns}
  FROM selected
  JOIN relay_nodes node
    ON node.publication_id = selected.publication_id
   AND node.publication_version = selected.publication_version
  LEFT JOIN relay_node_assets hero
    ON hero.publication_id = node.publication_id
   AND hero.publication_version = node.publication_version
   AND hero.node_id = node.id AND hero.role = 'hero' AND hero.position = 0
  ORDER BY node.position, node.id
`;

const projectedAssetSql = `
  SELECT asset.storage_path, asset.mime_type, asset.byte_size::text, asset.created_at
  FROM relay_assets asset
  WHERE asset.sha256 = $1
    AND EXISTS (
      SELECT 1
      FROM relay_node_assets reference
      JOIN relay_publications publication
        ON publication.id = reference.publication_id
       AND publication.active_version = reference.publication_version
      WHERE reference.sha256 = asset.sha256
    )
`;
