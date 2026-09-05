WITH memo_roots AS (
  SELECT memo.id, memo.tree_id
  FROM tree_nodes memo
  JOIN tree_nodes agent ON agent.id = memo.parent_id
  JOIN tree_nodes system ON system.id = agent.parent_id
  WHERE memo.kind = 'system-directory' AND memo.local_id = 'memo'
    AND agent.kind = 'system-directory' AND agent.local_id = 'agnt'
    AND system.kind = 'system-directory' AND system.local_id = '_system'
), node_hashes AS (
  SELECT memo_roots.*,
    md5(memo_roots.tree_id::text || ':memo-system') AS system_hash,
    md5(memo_roots.tree_id::text || ':memo-formatting') AS formatting_hash,
    md5(memo_roots.tree_id::text || ':memo-output') AS output_hash,
    md5(memo_roots.tree_id::text || ':memo-treebrowser') AS treebrowser_hash
  FROM memo_roots
), node_definitions AS (
  SELECT tree_id, id AS memo_root_id,
    (substr(system_hash, 1, 12) || '4' || substr(system_hash, 14, 3)
      || '8' || substr(system_hash, 18, 15))::uuid AS system_id,
    (substr(formatting_hash, 1, 12) || '4' || substr(formatting_hash, 14, 3)
      || '8' || substr(formatting_hash, 18, 15))::uuid AS formatting_id,
    (substr(output_hash, 1, 12) || '4' || substr(output_hash, 14, 3)
      || '8' || substr(output_hash, 18, 15))::uuid AS output_id,
    (substr(treebrowser_hash, 1, 12) || '4' || substr(treebrowser_hash, 14, 3)
      || '8' || substr(treebrowser_hash, 18, 15))::uuid AS treebrowser_id
  FROM node_hashes
), inserted_system AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT definition.system_id, definition.tree_id, definition.memo_root_id,
    'agent-memo', '_system', '_system',
    COALESCE((SELECT max(position) + 1 FROM tree_nodes sibling
      WHERE sibling.parent_id = definition.memo_root_id), 0),
    true, true
  FROM node_definitions definition
  ON CONFLICT (id) DO NOTHING
  RETURNING tree_id
), inserted_formatting AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT formatting_id, tree_id, system_id,
    'agent-memo', 'formatting', 'formatting', 0, true, true
  FROM node_definitions
  ON CONFLICT (id) DO NOTHING
  RETURNING tree_id
), inserted_output AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT output_id, tree_id, formatting_id,
    'agent-memo', 'output', 'output', 0, true, true
  FROM node_definitions
  ON CONFLICT (id) DO NOTHING
  RETURNING tree_id
), inserted_treebrowser AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT treebrowser_id, tree_id, output_id,
    'agent-memo', 'treebrowser', 'treebrowser', 0, true, true
  FROM node_definitions
  ON CONFLICT (id) DO NOTHING
  RETURNING id, tree_id
), inserted_contents AS (
  INSERT INTO node_contents (node_id, format, content)
  SELECT id, 'text', '' FROM (
    SELECT system_id AS id FROM node_definitions
    UNION ALL SELECT formatting_id FROM node_definitions
    UNION ALL SELECT output_id FROM node_definitions
  ) nodes
  ON CONFLICT (node_id) DO NOTHING
  RETURNING node_id
), inserted_treebrowser_content AS (
  INSERT INTO node_contents (node_id, format, content)
  SELECT treebrowser_id, 'text',
    'Create a structured tree list output with indents |-'
  FROM node_definitions
  ON CONFLICT (node_id) DO NOTHING
  RETURNING node_id
), changed_trees AS (
  SELECT tree_id FROM inserted_system
  UNION SELECT tree_id FROM inserted_formatting
  UNION SELECT tree_id FROM inserted_output
  UNION SELECT tree_id FROM inserted_treebrowser
)
UPDATE trees
SET revision = revision + 1, updated_at = now()
WHERE id IN (SELECT tree_id FROM changed_trees);
