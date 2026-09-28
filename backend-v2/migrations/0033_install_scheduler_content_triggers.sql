DROP TRIGGER IF EXISTS node_contents_scheduler_plan_sync ON node_contents;
CREATE TRIGGER node_contents_scheduler_plan_sync
AFTER INSERT OR UPDATE OF content ON node_contents
FOR EACH ROW EXECUTE FUNCTION sync_scheduler_plan_from_content();

DROP TRIGGER IF EXISTS tree_nodes_scheduler_label_sync ON tree_nodes;
CREATE OR REPLACE FUNCTION sync_scheduler_plan_label()
RETURNS trigger AS $$
BEGIN
  UPDATE scheduler_plans SET label = NEW.label, updated_at = now()
    WHERE node_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tree_nodes_scheduler_label_sync
AFTER UPDATE OF label ON tree_nodes
FOR EACH ROW EXECUTE FUNCTION sync_scheduler_plan_label();

UPDATE node_contents
SET content = content
WHERE content LIKE '%"type": "flydeck-schedule"%';
