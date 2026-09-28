ALTER TABLE scheduler_plans
  ADD COLUMN comments text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE scheduler_plans
SET comments = ARRAY[comment, ''];

CREATE OR REPLACE FUNCTION sync_scheduler_point_comments_from_content()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  point_comments text[];
BEGIN
  BEGIN
    payload := NEW.content::jsonb;
    IF payload->>'type' = 'flydeck-schedule' AND payload->>'version' = '1' THEN
      SELECT COALESCE(array_agg(value ORDER BY ordinal), ARRAY[]::text[])
      INTO point_comments
      FROM jsonb_array_elements_text(COALESCE(payload->'plan'->'comments', '[]'::jsonb))
        WITH ORDINALITY AS entries(value, ordinal);
      UPDATE scheduler_plans
      SET comments = CASE
        WHEN cardinality(point_comments) > 0 THEN point_comments
        ELSE ARRAY[COALESCE(payload->'plan'->>'comment', ''), '']
      END,
      updated_at = now()
      WHERE node_id = NEW.node_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zzz_node_contents_scheduler_point_comments_sync
AFTER INSERT OR UPDATE OF content ON node_contents
FOR EACH ROW EXECUTE FUNCTION sync_scheduler_point_comments_from_content();

UPDATE node_contents
SET content = content
WHERE content LIKE '%"type": "flydeck-schedule"%';
