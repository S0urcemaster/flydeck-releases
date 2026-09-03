WITH candidate AS (
  SELECT example.id, example.tree_id, trash.id AS trash_id,
         COALESCE((
           SELECT max(sibling.position) FROM tree_nodes sibling
           WHERE sibling.parent_id = trash.id
         ), -1) + 1 AS next_position
  FROM tree_nodes example
  JOIN tree_nodes memo ON memo.id = example.parent_id
  JOIN tree_nodes agent ON agent.id = memo.parent_id
  JOIN tree_nodes system ON system.id = agent.parent_id
  JOIN tree_nodes trash
    ON trash.tree_id = example.tree_id AND trash.kind = 'trash-directory'
  WHERE example.id = '00000000-0000-4000-8000-000000000306'
    AND example.kind = 'agent-memo'
    AND example.local_id = 'rules'
    AND memo.kind = 'system-directory' AND memo.local_id = 'memo'
    AND agent.kind = 'system-directory' AND agent.local_id = 'agnt'
    AND system.kind = 'system-directory' AND system.local_id = '_system'
), moved AS (
  UPDATE tree_nodes node
  SET parent_id = candidate.trash_id,
      position = candidate.next_position,
      revision = node.revision + 1,
      updated_at = now()
  FROM candidate
  WHERE node.id = candidate.id
  RETURNING candidate.tree_id
)
UPDATE trees
SET revision = revision + 1,
    updated_at = now()
WHERE id IN (SELECT tree_id FROM moved);
