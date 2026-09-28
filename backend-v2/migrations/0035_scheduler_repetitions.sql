CREATE OR REPLACE FUNCTION sync_scheduler_plan_from_content()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  plan jsonb;
  workspace uuid;
  node_label text;
BEGIN
  BEGIN
    payload := NEW.content::jsonb;
    IF payload->>'type' <> 'flydeck-schedule' OR payload->>'version' <> '1' THEN
      DELETE FROM scheduler_plans WHERE node_id = NEW.node_id;
      RETURN NEW;
    END IF;
    plan := payload->'plan';
    SELECT trees.workspace_id, tree_nodes.label INTO workspace, node_label
      FROM tree_nodes JOIN trees ON trees.id = tree_nodes.tree_id
      WHERE tree_nodes.id = NEW.node_id AND trees.kind = 'data';
    IF workspace IS NULL THEN RETURN NEW; END IF;
    INSERT INTO scheduler_plans (
      id, workspace_id, node_id, label, revision, start_at, end_at, stops,
      repetitions, time_zone, enabled, notify_with_ntfy, next_due_at, occurrence
    ) VALUES (
      gen_random_uuid(), workspace, NEW.node_id, node_label, 1,
      (plan->>'startAt')::timestamptz, (plan->>'endAt')::timestamptz,
      ARRAY(SELECT value::timestamptz FROM jsonb_array_elements_text(COALESCE(plan->'stops', '[]'::jsonb))),
      COALESCE((plan->>'repetitions')::integer, 0),
      plan->>'timeZone', COALESCE((plan->>'enabled')::boolean, false),
      COALESCE((plan->>'notifyWithNtfy')::boolean, false),
      (plan->>'startAt')::timestamptz, 0
    ) ON CONFLICT (workspace_id, node_id) DO UPDATE SET
      label = EXCLUDED.label, revision = scheduler_plans.revision + 1,
      start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at,
      stops = EXCLUDED.stops, repetitions = EXCLUDED.repetitions,
      time_zone = EXCLUDED.time_zone, enabled = EXCLUDED.enabled,
      notify_with_ntfy = EXCLUDED.notify_with_ntfy,
      next_due_at = EXCLUDED.next_due_at, occurrence = 0, updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    DELETE FROM scheduler_plans WHERE node_id = NEW.node_id;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
