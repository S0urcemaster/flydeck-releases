CREATE OR REPLACE FUNCTION disable_past_scheduler_plan_from_content()
RETURNS trigger AS $$
BEGIN
  UPDATE scheduler_plans
  SET enabled = false, updated_at = now()
  WHERE node_id = NEW.node_id
    AND enabled
    AND start_at < date_trunc('minute', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
