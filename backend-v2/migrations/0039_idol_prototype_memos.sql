WITH memo_roots AS (
  SELECT memo.id, memo.tree_id
  FROM tree_nodes memo
  JOIN tree_nodes agnt ON agnt.id = memo.parent_id
  JOIN tree_nodes system ON system.id = agnt.parent_id
  WHERE memo.kind = 'system-directory' AND memo.local_id = 'memo'
    AND agnt.kind = 'system-directory' AND agnt.local_id = 'agnt'
    AND system.kind = 'system-directory' AND system.local_id = '_system'
), definitions AS (
  SELECT memo_roots.*,
    (substr(md5(tree_id::text || ':memo-idols'), 1, 12) || '4'
      || substr(md5(tree_id::text || ':memo-idols'), 14, 3) || '8'
      || substr(md5(tree_id::text || ':memo-idols'), 18, 15))::uuid AS idols_id
  FROM memo_roots
), inserted_idols AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT idols_id, tree_id, id, 'agent-memo', '_idols', '_idols',
    COALESCE((SELECT max(position) + 1 FROM tree_nodes sibling
      WHERE sibling.parent_id = definitions.id), 0),
    true, true
  FROM definitions
  ON CONFLICT (id) DO NOTHING
  RETURNING id, tree_id
), prototypes AS (
  SELECT definitions.tree_id, definitions.idols_id,
    prototype.label, prototype.local_id, prototype.position, prototype.content,
    (substr(md5(definitions.tree_id::text || ':memo-idol:' || prototype.local_id), 1, 12) || '4'
      || substr(md5(definitions.tree_id::text || ':memo-idol:' || prototype.local_id), 14, 3) || '8'
      || substr(md5(definitions.tree_id::text || ':memo-idol:' || prototype.local_id), 18, 15))::uuid AS prototype_id
  FROM definitions
  CROSS JOIN (VALUES
    ('Gary', 'gary', 0,
      'You are Gary, a quiet and curious data companion. Select one interesting fragment from the configured datasource. Return the fragment, its exact source path, and one concise sentence explaining why it caught your attention. Never invent source material.'),
    ('Bello', 'bello', 1,
      'You are Bello, an eager newspaper dog. Bite one random newspaper clipping from the configured datasource and proudly bring it to your owner. Return the clipping, its exact source path, publication date when available, and one short cheerful sentence. Never invent a clipping or source.')
  ) AS prototype(label, local_id, position, content)
), inserted_prototypes AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT prototype_id, tree_id, idols_id, 'agent-memo', label, local_id,
    position, true, false
  FROM prototypes
  ON CONFLICT (id) DO NOTHING
  RETURNING id, tree_id
), inserted_contents AS (
  INSERT INTO node_contents (node_id, format, content)
  SELECT idols_id, 'text', '' FROM definitions
  UNION ALL
  SELECT prototype_id, 'text', content FROM prototypes
  ON CONFLICT (node_id) DO NOTHING
  RETURNING node_id
), changed_trees AS (
  SELECT tree_id FROM inserted_idols
  UNION SELECT tree_id FROM inserted_prototypes
)
UPDATE trees
SET revision = revision + 1, updated_at = now()
WHERE id IN (SELECT tree_id FROM changed_trees);
