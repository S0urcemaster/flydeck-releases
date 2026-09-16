WITH user_roots AS (
  SELECT node.id AS user_id, node.tree_id
  FROM tree_nodes node
  JOIN tree_nodes system ON system.id = node.parent_id
  WHERE system.kind = 'system-directory' AND system.local_id = '_system'
    AND node.local_id = 'user'
), definitions AS (
  SELECT user_roots.*, kind.local_id, kind.label, kind.position,
    md5(user_roots.tree_id::text || ':gps-' || kind.local_id) AS node_hash
  FROM user_roots
  CROSS JOIN (VALUES
    ('locations', 'locations', 0),
    ('events', 'events', 1)
  ) AS kind(local_id, label, position)
), inserted AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT
    (substr(node_hash, 1, 12) || '4' || substr(node_hash, 14, 3)
      || '8' || substr(node_hash, 18, 15))::uuid,
    tree_id, user_id, 'system-directory', label, local_id, position, true, true
  FROM definitions definition
  WHERE NOT EXISTS (
    SELECT 1 FROM tree_nodes existing
    WHERE existing.parent_id = definition.user_id
      AND existing.local_id = definition.local_id
  )
  RETURNING id, tree_id
), contents AS (
  INSERT INTO node_contents (node_id, format, content)
  SELECT id, 'text', '' FROM inserted
)
UPDATE trees SET revision = revision + 1, updated_at = now()
WHERE id IN (SELECT tree_id FROM inserted);
