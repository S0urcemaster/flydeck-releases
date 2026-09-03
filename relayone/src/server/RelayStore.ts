import path from "node:path";

import type {
  RelayNavigationLevel,
  RelayNodePage,
  RelayPostSummary,
  RelaySite,
} from "../shared/contracts.js";
import type { RelayConfig } from "./config.js";
import type { Queryable } from "./database.js";

type PublishedNodeRow = {
  publication_root_id: string;
  id: string;
  parent_id: string | null;
  label: string;
  local_id: string;
  position: number;
  created_at: Date;
  updated_at: Date;
  format: "text" | "markdown" | "json";
  content: string;
  has_image: boolean;
  child_count: number;
};

type ImageRow = {
  relative_path: string;
  mime_type: string;
  byte_size: number;
  updated_at: Date;
};

export type RelayImage = ImageRow & { absolutePath: string };

export type RelayAsset = {
  absolutePath: string;
  byte_size: number;
  mime_type: string;
  updated_at: Date;
};

export interface RelayReader {
  loadSite(): Promise<RelaySite | null>;
  loadNode(nodeId: string): Promise<RelayNodePage | null>;
  readImage(nodeId: string): Promise<RelayImage | null>;
  readAsset?(sha256: string): Promise<RelayAsset | null>;
  isReady(): Promise<boolean>;
}

export class RelayStore implements RelayReader {
  constructor(
    private readonly database: Queryable,
    private readonly config: RelayConfig,
  ) {}

  async loadSite(): Promise<RelaySite | null> {
    const result = await this.database.query<PublishedNodeRow>(publicationRootsSql);
    const roots = result.rows.map(toSummary);
    return { title: this.config.title, info: this.config.info, roots };
  }

  async loadNode(nodeId: string): Promise<RelayNodePage | null> {
    const result = await this.database.query<PublishedNodeRow>(publishedNavigationSql, [nodeId]);
    const selected = result.rows.find((row) => row.id === nodeId);
    if (!selected) return null;

    const byId = new Map(result.rows.map((row) => [row.id, row]));
    const path: PublishedNodeRow[] = [selected];
    let current = selected;
    while (current.id !== current.publication_root_id && current.parent_id) {
      const parent = byId.get(current.parent_id);
      if (!parent) break;
      path.unshift(parent);
      current = parent;
    }

    const parents = path.slice(0, -1).map(toSummary);
    const levels: RelayNavigationLevel[] = path.map((active, depth) => ({
      activeId: active.id,
      depth,
      nodes: depth === 0
        ? result.rows.filter((row) => row.id === row.publication_root_id).map(toSummary)
        : result.rows.filter((row) => row.parent_id === path[depth - 1].id).map(toSummary),
    }));
    const children = result.rows.filter((row) => row.parent_id === selected.id).map(toSummary);
    if (children.length > 0) {
      levels.push({
        activeId: null,
        depth: path.length,
        nodes: children,
      });
    }
    return {
      parents,
      levels,
      post: {
        ...toSummary(selected),
        format: selected.format,
        content: selected.content,
        children,
      },
    };
  }

  async readImage(nodeId: string): Promise<RelayImage | null> {
    const result = await this.database.query<ImageRow>(publishedImageSql, [nodeId]);
    const image = result.rows[0];
    if (!image) return null;
    const absolutePath = safeImagePath(this.config.imageDirectory, image.relative_path);
    return absolutePath ? { ...image, absolutePath } : null;
  }

  async isReady() {
    const result = await this.database.query<{ available: boolean }>(`
      SELECT to_regclass('public.tree_nodes') IS NOT NULL AS available
    `);
    return result.rows[0]?.available === true;
  }
}

function toSummary(row: PublishedNodeRow): RelayPostSummary {
  return {
    id: row.id,
    label: row.label,
    localId: row.local_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    imageUrl: row.has_image ? `/api/images/${row.id}` : null,
    childCount: row.child_count,
    hasChildren: row.child_count > 0,
  };
}

export function safeImagePath(imageDirectory: string, relativePath: string) {
  const root = path.resolve(imageDirectory);
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return candidate;
}

const publicationRootsSql = `
  WITH RECURSIVE publication_roots AS (
    SELECT node.id
    FROM tree_nodes node
    JOIN trees ON trees.id = node.tree_id
    WHERE trees.kind = 'data'
      AND node.shared = true
      AND node.share_name IS NOT NULL
      AND NOT EXISTS (
        WITH RECURSIVE ancestors AS (
          SELECT parent.id, parent.parent_id, parent.shared, parent.kind
          FROM tree_nodes parent
          WHERE parent.id = node.parent_id AND parent.tree_id = node.tree_id
          UNION ALL
          SELECT parent.id, parent.parent_id, parent.shared, parent.kind
          FROM tree_nodes parent
          JOIN ancestors child ON child.parent_id = parent.id
          WHERE parent.tree_id = node.tree_id
        )
        SELECT 1 FROM ancestors
        WHERE shared = true
          OR kind IN ('system-directory', 'trash-directory')
      )
  ), shared_order AS (
    SELECT
      CASE
        WHEN btrim(reference.value) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN btrim(reference.value)::uuid
      END AS node_id,
      reference.ordinality AS position
    FROM tree_nodes system_node
    JOIN tree_nodes views_node
      ON views_node.tree_id = system_node.tree_id
     AND views_node.parent_id = system_node.id
     AND views_node.local_id = 'views'
    JOIN tree_nodes shared_view
      ON shared_view.tree_id = views_node.tree_id
     AND shared_view.parent_id = views_node.id
     AND shared_view.local_id = '_shared'
    JOIN node_contents ON node_contents.node_id = shared_view.id
    CROSS JOIN LATERAL regexp_split_to_table(
      node_contents.content,
      E'\\n'
    ) WITH ORDINALITY AS reference(value, ordinality)
    WHERE system_node.local_id = '_system'
  )
  SELECT
    node.id AS publication_root_id,
    node.id, node.parent_id, node.share_name AS label, node.local_id,
    node.position, node.created_at, node.updated_at,
    'text'::text AS format, ''::text AS content,
    (node_images.node_id IS NOT NULL) AS has_image,
    (
      WITH RECURSIVE descendants AS (
        SELECT child.id
        FROM tree_nodes child
        WHERE child.tree_id = node.tree_id AND child.parent_id = node.id

        UNION ALL

        SELECT child.id
        FROM tree_nodes child
        JOIN descendants parent ON child.parent_id = parent.id
        WHERE child.tree_id = node.tree_id
      )
      SELECT count(*)::int FROM descendants
    ) AS child_count
  FROM tree_nodes node
  JOIN publication_roots ON publication_roots.id = node.id
  LEFT JOIN shared_order ON shared_order.node_id = node.id
  LEFT JOIN node_images ON node_images.node_id = node.id
  ORDER BY shared_order.position NULLS LAST, node.position, node.id
`;

const publishedNavigationSql = `
  WITH RECURSIVE publication_roots AS (
    SELECT node.id
    FROM tree_nodes node
    JOIN trees ON trees.id = node.tree_id
    WHERE trees.kind = 'data'
      AND node.shared = true
      AND node.share_name IS NOT NULL
      AND NOT EXISTS (
        WITH RECURSIVE ancestors AS (
          SELECT parent.id, parent.parent_id, parent.shared, parent.kind
          FROM tree_nodes parent
          WHERE parent.id = node.parent_id AND parent.tree_id = node.tree_id
          UNION ALL
          SELECT parent.id, parent.parent_id, parent.shared, parent.kind
          FROM tree_nodes parent
          JOIN ancestors child ON child.parent_id = parent.id
          WHERE parent.tree_id = node.tree_id
        )
        SELECT 1 FROM ancestors
        WHERE shared = true
          OR kind IN ('system-directory', 'trash-directory')
      )
  ), shared_order AS (
    SELECT
      CASE
        WHEN btrim(reference.value) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN btrim(reference.value)::uuid
      END AS node_id,
      reference.ordinality AS position
    FROM tree_nodes system_node
    JOIN tree_nodes views_node
      ON views_node.tree_id = system_node.tree_id
     AND views_node.parent_id = system_node.id
     AND views_node.local_id = 'views'
    JOIN tree_nodes shared_view
      ON shared_view.tree_id = views_node.tree_id
     AND shared_view.parent_id = views_node.id
     AND shared_view.local_id = '_shared'
    JOIN node_contents ON node_contents.node_id = shared_view.id
    CROSS JOIN LATERAL regexp_split_to_table(
      node_contents.content,
      E'\\n'
    ) WITH ORDINALITY AS reference(value, ordinality)
    WHERE system_node.local_id = '_system'
  ), target_path AS (
    SELECT
      node.id, node.tree_id, node.parent_id, 0 AS depth
    FROM tree_nodes node
    JOIN trees ON trees.id = node.tree_id
    WHERE node.id = $1 AND trees.kind = 'data'

    UNION ALL

    SELECT
      parent.id, parent.tree_id, parent.parent_id, child.depth + 1
    FROM tree_nodes parent
    JOIN target_path child
      ON child.tree_id = parent.tree_id AND child.parent_id = parent.id
  ), selected_publication AS (
    SELECT publication_roots.id AS root_id, target_path.tree_id, target_path.depth AS root_depth
    FROM publication_roots
    JOIN target_path ON target_path.id = publication_roots.id
    ORDER BY target_path.depth
    LIMIT 1
  ), visible_ids AS (
    SELECT publication_roots.id
    FROM publication_roots
    CROSS JOIN selected_publication

    UNION

    SELECT sibling.id
    FROM target_path member
    JOIN selected_publication ON member.depth < selected_publication.root_depth
    JOIN tree_nodes sibling
      ON sibling.tree_id = member.tree_id
     AND sibling.parent_id = member.parent_id

    UNION

    SELECT child.id
    FROM tree_nodes child
    JOIN selected_publication ON selected_publication.tree_id = child.tree_id
    WHERE child.parent_id = $1
  )
  SELECT
    CASE
      WHEN publication_roots.id IS NOT NULL THEN node.id
      ELSE selected_publication.root_id
    END AS publication_root_id,
    node.id, node.parent_id,
    COALESCE(node.share_name, node.label) AS label,
    node.local_id, node.position, node.created_at, node.updated_at,
    COALESCE(node_contents.format, 'text') AS format,
    COALESCE(node_contents.content, '') AS content,
    (node_images.node_id IS NOT NULL) AS has_image,
    (
      WITH RECURSIVE descendants AS (
        SELECT child.id
        FROM tree_nodes child
        WHERE child.tree_id = node.tree_id AND child.parent_id = node.id

        UNION ALL

        SELECT child.id
        FROM tree_nodes child
        JOIN descendants parent ON child.parent_id = parent.id
        WHERE child.tree_id = node.tree_id
      )
      SELECT count(*)::int FROM descendants
    ) AS child_count
  FROM visible_ids
  JOIN tree_nodes node ON node.id = visible_ids.id
  CROSS JOIN selected_publication
  LEFT JOIN publication_roots ON publication_roots.id = node.id
  LEFT JOIN shared_order ON shared_order.node_id = node.id
  LEFT JOIN node_contents
    ON node_contents.node_id = node.id AND node.id = $1
  LEFT JOIN node_images ON node_images.node_id = node.id
  ORDER BY
    CASE WHEN publication_roots.id IS NOT NULL THEN 0 ELSE 1 END,
    CASE WHEN publication_roots.id IS NOT NULL THEN shared_order.position END NULLS LAST,
    node.position, node.id
`;

const publishedImageSql = `
  WITH RECURSIVE ancestors AS (
    SELECT tree_nodes.id, tree_nodes.parent_id, tree_nodes.tree_id,
      tree_nodes.shared, tree_nodes.share_name
    FROM tree_nodes
    JOIN trees ON trees.id = tree_nodes.tree_id
    WHERE tree_nodes.id = $1 AND trees.kind = 'data'
    UNION ALL
    SELECT parent.id, parent.parent_id, parent.tree_id,
      parent.shared, parent.share_name
    FROM tree_nodes parent
    JOIN ancestors child
      ON child.tree_id = parent.tree_id AND child.parent_id = parent.id
  )
  SELECT
    node_images.relative_path, node_images.mime_type,
    node_images.byte_size, node_images.updated_at
  FROM node_images
  WHERE node_images.node_id = $1
    AND EXISTS (
      SELECT 1 FROM ancestors
      WHERE shared = true AND share_name IS NOT NULL
    )
`;
