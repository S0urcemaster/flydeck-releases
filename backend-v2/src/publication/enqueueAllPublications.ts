import "../environment.js";

import { loadConfig } from "../config.js";
import { createDatabase } from "../db/database.js";
import { runMigrations } from "../db/migrations.js";

const database = createDatabase(loadConfig());
try {
  await runMigrations(database);
  const result = await database.query<{ publication_id: string }>(`
    WITH RECURSIVE candidates AS (
      SELECT node.id, node.parent_id, node.tree_id
      FROM tree_nodes node
      JOIN trees ON trees.id = node.tree_id
      WHERE trees.kind = 'data'
        AND node.shared = true
        AND node.share_name IS NOT NULL
    ), roots AS (
      SELECT candidate.id
      FROM candidates candidate
      WHERE NOT EXISTS (
        WITH RECURSIVE ancestors AS (
          SELECT parent.id, parent.parent_id, parent.shared
          FROM tree_nodes parent
          WHERE parent.id = candidate.parent_id
          UNION ALL
          SELECT parent.id, parent.parent_id, parent.shared
          FROM tree_nodes parent
          JOIN ancestors child ON child.parent_id = parent.id
        )
        SELECT 1 FROM ancestors WHERE shared = true
      )
    )
    SELECT roots.id AS publication_id,
      relay_enqueue_publication(trees.workspace_id, roots.id, 'publish')
    FROM roots
    JOIN tree_nodes node ON node.id = roots.id
    JOIN trees ON trees.id = node.tree_id
  `);
  console.info(`Queued ${result.rowCount ?? result.rows.length} Relay One publications`);
} finally {
  await database.end();
}
