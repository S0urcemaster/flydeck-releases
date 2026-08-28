ALTER TABLE tree_nodes
  ADD COLUMN shared boolean NOT NULL DEFAULT false,
  ADD COLUMN share_name text;

ALTER TABLE tree_nodes
  ADD CONSTRAINT tree_nodes_share_name_length
    CHECK (share_name IS NULL OR char_length(btrim(share_name)) BETWEEN 1 AND 200),
  ADD CONSTRAINT tree_nodes_shared_requires_name
    CHECK (NOT shared OR share_name IS NOT NULL);

CREATE INDEX tree_nodes_shared_idx
  ON tree_nodes(tree_id, position, id)
  WHERE shared = true;
