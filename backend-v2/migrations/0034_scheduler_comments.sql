ALTER TABLE scheduler_plans
  ADD COLUMN comment text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION sync_scheduler_comment_from_content()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
BEGIN
  BEGIN
    payload := NEW.content::jsonb;
    IF payload->>'type' = 'flydeck-schedule' AND payload->>'version' = '1' THEN
      UPDATE scheduler_plans
      SET comment = COALESCE(payload->'plan'->>'comment', ''), updated_at = now()
      WHERE node_id = NEW.node_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zz_node_contents_scheduler_comment_sync
AFTER INSERT OR UPDATE OF content ON node_contents
FOR EACH ROW EXECUTE FUNCTION sync_scheduler_comment_from_content();

UPDATE node_contents
SET content = content
WHERE content LIKE '%"type": "flydeck-schedule"%';
