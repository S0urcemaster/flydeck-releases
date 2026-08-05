WITH updated_nodes AS (
  UPDATE tree_nodes
  SET list_editable = true,
      revision = tree_nodes.revision + 1,
      updated_at = now()
  FROM trees
  WHERE tree_nodes.tree_id = trees.id
    AND trees.kind = 'data'
    AND tree_nodes.list_editable = false
  RETURNING tree_nodes.tree_id
)
UPDATE trees
SET revision = trees.revision + 1,
    updated_at = now()
WHERE trees.id IN (SELECT tree_id FROM updated_nodes);
