CREATE OR REPLACE FUNCTION disable_past_scheduler_plan_from_content()
RETURNS trigger AS $$
BEGIN
  UPDATE scheduler_plans
  SET enabled = false, updated_at = now()
  WHERE node_id = NEW.node_id
    AND enabled
    AND start_at <= now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zzzz_node_contents_disable_past_scheduler_plan
AFTER INSERT OR UPDATE OF content ON node_contents
FOR EACH ROW EXECUTE FUNCTION disable_past_scheduler_plan_from_content();
