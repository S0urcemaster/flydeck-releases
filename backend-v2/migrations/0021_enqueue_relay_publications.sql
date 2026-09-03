-- Publication identities must survive deletion of their private source node so
-- an unpublish command can still reach Relay One.
ALTER TABLE relay_publication_outbox
  DROP CONSTRAINT relay_publication_outbox_publication_id_fkey;
ALTER TABLE relay_publication_versions
  DROP CONSTRAINT relay_publication_versions_publication_id_fkey;

CREATE FUNCTION relay_publication_root_for_node(source_node_id uuid)
RETURNS TABLE (publication_id uuid, workspace_id uuid)
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE ancestors AS (
    SELECT node.id, node.parent_id, node.shared, node.share_name,
      node.kind, node.tree_id, 0 AS depth
    FROM tree_nodes node
    WHERE node.id = source_node_id
    UNION ALL
    SELECT parent.id, parent.parent_id, parent.shared, parent.share_name,
      parent.kind, parent.tree_id, child.depth + 1
    FROM tree_nodes parent
    JOIN ancestors child ON child.parent_id = parent.id
  ), allowed AS (
    SELECT NOT EXISTS (
      SELECT 1 FROM ancestors WHERE kind IN ('system-directory', 'trash-directory')
    ) AS value
  )
  SELECT ancestor.id, tree.workspace_id
  FROM ancestors ancestor
  JOIN trees tree ON tree.id = ancestor.tree_id AND tree.kind = 'data'
  CROSS JOIN allowed
  WHERE allowed.value AND ancestor.shared AND ancestor.share_name IS NOT NULL
  ORDER BY ancestor.depth DESC
  LIMIT 1
$$;

CREATE FUNCTION relay_enqueue_publication(
  target_workspace_id uuid,
  target_publication_id uuid,
  target_action text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  issued_version bigint;
  outbox_id uuid;
BEGIN
  -- A cascading workspace deletion can remove the tree before its nodes. There
  -- is then deliberately no durable workspace/outbox left to own a new job.
  IF target_workspace_id IS NULL THEN
    RETURN;
  END IF;
  IF target_action = 'publish' THEN
    INSERT INTO relay_publication_versions (publication_id, last_issued_version)
    VALUES (target_publication_id, 1)
    ON CONFLICT (publication_id) DO UPDATE SET
      last_issued_version = relay_publication_versions.last_issued_version + 1,
      updated_at = now()
    RETURNING last_issued_version INTO issued_version;
  ELSIF target_action = 'unpublish' THEN
    issued_version := NULL;
  ELSE
    RAISE EXCEPTION 'Invalid relay publication action %', target_action;
  END IF;

  -- Core PostgreSQL does not guarantee pgcrypto on existing installations.
  outbox_id := md5(random()::text || clock_timestamp()::text
    || target_publication_id::text)::uuid;
  INSERT INTO relay_publication_outbox (
    id, workspace_id, publication_id, action, target_version
  ) VALUES (
    outbox_id, target_workspace_id, target_publication_id,
    target_action, issued_version
  )
  ON CONFLICT (publication_id)
    WHERE status IN ('pending', 'sending', 'failed')
  DO UPDATE SET
    action = EXCLUDED.action,
    target_version = EXCLUDED.target_version,
    status = 'pending',
    attempts = 0,
    next_attempt_at = now(),
    last_error = NULL,
    updated_at = now();
END
$$;

CREATE FUNCTION relay_enqueue_node_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_publication uuid;
  old_workspace uuid;
  new_publication uuid;
  new_workspace uuid;
  source_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'tree_nodes' THEN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      IF OLD.shared AND OLD.share_name IS NOT NULL THEN
        old_publication := OLD.id;
        SELECT trees.workspace_id INTO old_workspace
        FROM trees WHERE trees.id = OLD.tree_id AND trees.kind = 'data';
      ELSIF OLD.parent_id IS NOT NULL THEN
        SELECT root.publication_id, root.workspace_id
          INTO old_publication, old_workspace
        FROM relay_publication_root_for_node(OLD.parent_id) root;
      END IF;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      SELECT root.publication_id, root.workspace_id
        INTO new_publication, new_workspace
      FROM relay_publication_root_for_node(NEW.id) root;
    END IF;
  ELSE
    source_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.node_id ELSE NEW.node_id END;
    SELECT root.publication_id, root.workspace_id
      INTO new_publication, new_workspace
    FROM relay_publication_root_for_node(source_id) root;
  END IF;

  IF old_publication IS NOT NULL AND old_publication IS DISTINCT FROM new_publication THEN
    IF TG_TABLE_NAME = 'tree_nodes' AND old_publication = OLD.id THEN
      PERFORM relay_enqueue_publication(old_workspace, old_publication, 'unpublish');
    ELSE
      PERFORM relay_enqueue_publication(old_workspace, old_publication, 'publish');
    END IF;
  END IF;
  IF new_publication IS NOT NULL THEN
    PERFORM relay_enqueue_publication(new_workspace, new_publication, 'publish');
  END IF;
  RETURN NULL;
END
$$;

CREATE TRIGGER relay_tree_node_change
AFTER INSERT OR UPDATE OR DELETE ON tree_nodes
FOR EACH ROW EXECUTE FUNCTION relay_enqueue_node_change();

CREATE TRIGGER relay_node_content_change
AFTER INSERT OR UPDATE OR DELETE ON node_contents
FOR EACH ROW EXECUTE FUNCTION relay_enqueue_node_change();

CREATE TRIGGER relay_node_image_change
AFTER INSERT OR UPDATE OR DELETE ON node_images
FOR EACH ROW EXECUTE FUNCTION relay_enqueue_node_change();
