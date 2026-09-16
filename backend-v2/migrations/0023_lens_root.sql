WITH system_roots AS (
  SELECT system.id AS system_id, system.tree_id,
    md5(system.tree_id::text || ':lens-root') AS lens_hash
  FROM tree_nodes system
  WHERE system.kind = 'system-directory' AND system.local_id = '_system'
), lens_definitions AS (
  SELECT system_id, tree_id,
    (substr(lens_hash, 1, 12) || '4' || substr(lens_hash, 14, 3)
      || '8' || substr(lens_hash, 18, 15))::uuid AS lens_id
  FROM system_roots
), inserted_lenses AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT definition.lens_id, definition.tree_id, definition.system_id,
    'system-directory', 'Lens', 'lens',
    COALESCE((SELECT max(position) + 1 FROM tree_nodes sibling
      WHERE sibling.parent_id = definition.system_id), 0),
    false, true
  FROM lens_definitions definition
  WHERE NOT EXISTS (
    SELECT 1 FROM tree_nodes existing
    WHERE existing.tree_id = definition.tree_id
      AND existing.parent_id = definition.system_id
      AND existing.local_id = 'lens'
  )
  RETURNING id, tree_id
), inserted_contents AS (
  INSERT INTO node_contents (node_id, format, content)
  SELECT id, 'text', '' FROM inserted_lenses
  ON CONFLICT (node_id) DO NOTHING
)
UPDATE trees
SET revision = revision + 1, updated_at = now()
WHERE id IN (SELECT tree_id FROM inserted_lenses);
