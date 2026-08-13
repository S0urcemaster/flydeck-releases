ALTER TABLE tree_nodes
  ADD COLUMN local_id text;

DO $$
DECLARE
  parent record;
  node record;
  base_id text;
  candidate text;
  suffix integer;
BEGIN
  FOR parent IN
    SELECT DISTINCT tree_id, parent_id
    FROM tree_nodes
  LOOP
    FOR node IN
      SELECT id, kind, label
      FROM tree_nodes
      WHERE tree_id = parent.tree_id
        AND parent_id IS NOT DISTINCT FROM parent.parent_id
      ORDER BY position, id
    LOOP
      base_id := CASE node.kind
        WHEN 'system-directory' THEN '_system'
        WHEN 'trash-directory' THEN '_trash'
        ELSE trim(both '-' FROM regexp_replace(
          lower(translate(node.label, 'äöüß', 'aous')),
          '[^a-z0-9_-]+', '-', 'g'
        ))
      END;
      IF base_id = '' THEN base_id := 'item'; END IF;
      base_id := left(base_id, 12);
      candidate := base_id;
      suffix := 2;
      WHILE EXISTS (
        SELECT 1 FROM tree_nodes existing
        WHERE existing.tree_id = parent.tree_id
          AND existing.parent_id IS NOT DISTINCT FROM parent.parent_id
          AND existing.local_id = candidate
      ) LOOP
        candidate := left(base_id, 12 - char_length(suffix::text) - 1)
          || '-' || suffix::text;
        suffix := suffix + 1;
      END LOOP;
      UPDATE tree_nodes SET local_id = candidate WHERE id = node.id;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE tree_nodes
  ALTER COLUMN local_id SET NOT NULL,
  ADD CONSTRAINT tree_nodes_local_id_format_check
    CHECK (local_id ~ '^[a-z0-9_-]{1,12}$');

CREATE UNIQUE INDEX tree_nodes_tree_parent_local_id_unique
  ON tree_nodes(tree_id, parent_id, local_id)
  WHERE parent_id IS NOT NULL;

CREATE UNIQUE INDEX tree_nodes_tree_root_local_id_unique
  ON tree_nodes(tree_id, local_id)
  WHERE parent_id IS NULL;
