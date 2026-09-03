WITH candidates AS (
  SELECT example.id, example.tree_id,
         row_number() OVER (
           PARTITION BY example.tree_id ORDER BY example.position, example.id
         ) AS offset
  FROM tree_nodes example
  JOIN tree_nodes memo ON memo.id = example.parent_id
  JOIN tree_nodes agent ON agent.id = memo.parent_id
  JOIN tree_nodes system ON system.id = agent.parent_id
  WHERE example.kind = 'agent-memo'
    AND example.local_id = ANY(ARRAY[
      'identity', 'user', 'workspace', 'operating-rules', 'continuity'
    ])
    AND memo.kind = 'system-directory' AND memo.local_id = 'memo'
    AND agent.kind = 'system-directory' AND agent.local_id = 'agnt'
    AND system.kind = 'system-directory' AND system.local_id = '_system'
), targets AS (
  SELECT candidates.id, candidates.tree_id, trash.id AS trash_id,
         COALESCE((
           SELECT max(sibling.position) FROM tree_nodes sibling
           WHERE sibling.parent_id = trash.id
         ), -1) + candidates.offset AS next_position
  FROM candidates
  JOIN tree_nodes trash
    ON trash.tree_id = candidates.tree_id
   AND trash.kind = 'trash-directory'
), moved AS (
  UPDATE tree_nodes node
  SET parent_id = targets.trash_id,
      position = targets.next_position,
      revision = node.revision + 1,
      updated_at = now()
  FROM targets
  WHERE node.id = targets.id
  RETURNING targets.tree_id
)
UPDATE trees
SET revision = revision + 1,
    updated_at = now()
WHERE id IN (SELECT tree_id FROM moved);
