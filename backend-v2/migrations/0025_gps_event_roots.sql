WITH system_roots AS (
  SELECT system.id AS system_id, system.tree_id,
    md5(system.tree_id::text || ':gps-user-root') AS user_hash
  FROM tree_nodes system
  WHERE system.kind = 'system-directory' AND system.local_id = '_system'
), user_definitions AS (
  SELECT system_roots.*,
    (substr(user_hash, 1, 12) || '4' || substr(user_hash, 14, 3)
      || '8' || substr(user_hash, 18, 15))::uuid AS user_id
  FROM system_roots
), inserted_users AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT definition.user_id, definition.tree_id, definition.system_id,
    'system-directory', 'user', 'user',
    COALESCE((SELECT max(position) + 1 FROM tree_nodes sibling
      WHERE sibling.parent_id = definition.system_id), 0),
    true, true
  FROM user_definitions definition
  WHERE NOT EXISTS (
    SELECT 1 FROM tree_nodes existing
    WHERE existing.parent_id = definition.system_id AND existing.local_id = 'user'
  )
  RETURNING id, tree_id
), user_roots AS (
  SELECT id AS user_id, tree_id FROM inserted_users
  UNION
  SELECT node.id AS user_id, node.tree_id
  FROM tree_nodes node
  JOIN system_roots system ON system.tree_id = node.tree_id
  WHERE node.parent_id = system.system_id AND node.local_id = 'user'
), root_definitions AS (
  SELECT user_roots.*,
    kind.local_id, kind.label, kind.position,
    md5(user_roots.tree_id::text || ':gps-' || kind.local_id) AS node_hash
  FROM user_roots
  CROSS JOIN (VALUES
    ('locations', 'locations', 0),
    ('events', 'events', 1)
  ) AS kind(local_id, label, position)
), inserted_roots AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT
    (substr(node_hash, 1, 12) || '4' || substr(node_hash, 14, 3)
      || '8' || substr(node_hash, 18, 15))::uuid,
    tree_id, user_id, 'system-directory', label, local_id, position, true, true
  FROM root_definitions definition
  WHERE NOT EXISTS (
    SELECT 1 FROM tree_nodes existing
    WHERE existing.parent_id = definition.user_id
      AND existing.local_id = definition.local_id
  )
  RETURNING id, tree_id
), inserted_contents AS (
  INSERT INTO node_contents (node_id, format, content)
  SELECT id, 'text', '' FROM inserted_users
  UNION ALL
  SELECT id, 'text', '' FROM inserted_roots
)
UPDATE trees SET revision = revision + 1, updated_at = now()
WHERE id IN (
  SELECT tree_id FROM inserted_users
  UNION SELECT tree_id FROM inserted_roots
);
