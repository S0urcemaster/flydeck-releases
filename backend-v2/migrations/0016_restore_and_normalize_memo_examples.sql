WITH memo_roots AS (
  SELECT memo.id AS memo_id, memo.tree_id
  FROM tree_nodes memo
  JOIN tree_nodes agent ON agent.id = memo.parent_id
  JOIN tree_nodes system ON system.id = agent.parent_id
  WHERE memo.kind = 'system-directory' AND memo.local_id = 'memo'
    AND agent.kind = 'system-directory' AND agent.local_id = 'agnt'
    AND system.kind = 'system-directory' AND system.local_id = '_system'
), restore_candidates AS (
  SELECT example.id, memo_roots.memo_id, memo_roots.tree_id,
         row_number() OVER (
           PARTITION BY memo_roots.tree_id ORDER BY example.position, example.id
         ) AS offset
  FROM memo_roots
  JOIN tree_nodes trash
    ON trash.tree_id = memo_roots.tree_id AND trash.kind = 'trash-directory'
  JOIN tree_nodes example ON example.parent_id = trash.id
  WHERE example.kind = 'agent-memo'
    AND example.local_id = ANY(ARRAY[
      'identity', 'user', 'workspace', 'operating-rules', 'continuity'
    ])
), restore_targets AS (
  SELECT restore_candidates.*,
         COALESCE((
           SELECT max(sibling.position)
           FROM tree_nodes sibling
           WHERE sibling.parent_id = restore_candidates.memo_id
         ), -1) + restore_candidates.offset AS next_position
  FROM restore_candidates
), restored AS (
  UPDATE tree_nodes example
  SET parent_id = restore_targets.memo_id,
      position = restore_targets.next_position,
      revision = example.revision + 1,
      updated_at = now()
  FROM restore_targets
  WHERE example.id = restore_targets.id
  RETURNING restore_targets.tree_id
), normalized AS (
  UPDATE node_contents content
  SET content = regexp_replace(content.content, E'^#[^\\r\\n]*(?:\\r?\\n){1,2}', ''),
      revision = content.revision + 1,
      updated_at = now()
  FROM tree_nodes node
  WHERE node.id = content.node_id
    AND node.kind = 'agent-memo'
    AND content.content ~ E'^#[^\\r\\n]*(?:\\r?\\n){1,2}'
  RETURNING node.tree_id
), changed_trees AS (
  SELECT tree_id FROM restored
  UNION
  SELECT tree_id FROM normalized
)
UPDATE trees
SET revision = revision + 1,
    updated_at = now()
WHERE id IN (SELECT tree_id FROM changed_trees);
