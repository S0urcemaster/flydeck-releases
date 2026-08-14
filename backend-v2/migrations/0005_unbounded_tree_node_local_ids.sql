ALTER TABLE tree_nodes
  DROP CONSTRAINT tree_nodes_local_id_format_check,
  ADD CONSTRAINT tree_nodes_local_id_format_check
    CHECK (local_id ~ '^[a-z0-9_-]+$');
