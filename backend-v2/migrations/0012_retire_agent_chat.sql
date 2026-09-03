WITH candidates AS (
  SELECT node.id, node.tree_id,
         row_number() OVER (PARTITION BY node.tree_id ORDER BY node.position, node.id) AS offset
  FROM tree_nodes node
  LEFT JOIN tree_nodes parent ON parent.id = node.parent_id
  WHERE node.kind = 'agent-chat'
     OR (
       node.kind = 'system-directory'
       AND node.local_id = 'chats'
       AND parent.kind = 'system-directory'
       AND parent.local_id = 'agnt'
     )
), targets AS (
  SELECT candidates.id, trash.id AS trash_id,
         COALESCE((
           SELECT max(sibling.position) FROM tree_nodes sibling
           WHERE sibling.parent_id = trash.id
         ), -1) + candidates.offset AS next_position
  FROM candidates
  JOIN tree_nodes trash
    ON trash.tree_id = candidates.tree_id
   AND trash.kind = 'trash-directory'
)
UPDATE tree_nodes node
SET parent_id = targets.trash_id,
    position = targets.next_position,
    updated_at = now()
FROM targets
WHERE node.id = targets.id;
