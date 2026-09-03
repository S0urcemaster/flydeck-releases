UPDATE tree_nodes
SET content_editable = true, list_editable = true, updated_at = now()
WHERE kind IN ('agent-job', 'agent-job-group');

DELETE FROM agent_jobs
WHERE revision = 0
  AND memory_node_ids = '{}'
  AND data_source_node_ids = '{}'
  AND prompt = ''
  AND schedule_due_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM agent_job_runs WHERE agent_job_runs.job_id = agent_jobs.job_id
  );
