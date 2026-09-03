CREATE TABLE agent_jobs (
  job_id uuid PRIMARY KEY REFERENCES tree_nodes(id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  memory_node_ids uuid[] NOT NULL DEFAULT '{}',
  data_source_node_ids uuid[] NOT NULL DEFAULT '{}',
  prompt text NOT NULL DEFAULT '',
  model_tier text NOT NULL DEFAULT 'ECON'
    CHECK (model_tier IN ('ECON', 'MEDI', 'HIGH')),
  effort text NOT NULL DEFAULT 'FAST'
    CHECK (effort IN ('FAST', 'MEDI', 'DEEP')),
  schedule_due_at timestamptz,
  schedule_time_zone text,
  schedule_enabled boolean NOT NULL DEFAULT false,
  schedule_claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (schedule_due_at IS NULL AND schedule_time_zone IS NULL AND NOT schedule_enabled)
    OR (schedule_due_at IS NOT NULL AND schedule_time_zone IS NOT NULL)
  )
);

CREATE INDEX agent_jobs_due_idx
  ON agent_jobs(schedule_due_at, job_id)
  WHERE schedule_enabled = true AND schedule_claimed_at IS NULL;

CREATE TABLE agent_job_runs (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES agent_jobs(job_id) ON DELETE CASCADE,
  node_id uuid NOT NULL UNIQUE REFERENCES tree_nodes(id) ON DELETE CASCADE,
  date_node_id uuid NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
  request_id uuid NOT NULL UNIQUE,
  status text NOT NULL CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'interrupted')
  ),
  trigger text NOT NULL CHECK (trigger IN ('manual', 'scheduled')),
  memory_snapshot jsonb NOT NULL DEFAULT '[]',
  data_source_snapshot jsonb NOT NULL DEFAULT '[]',
  prompt_snapshot text NOT NULL,
  effective_input text NOT NULL,
  model_tier text NOT NULL CHECK (model_tier IN ('ECON', 'MEDI', 'HIGH')),
  effort text NOT NULL CHECK (effort IN ('FAST', 'MEDI', 'DEEP')),
  output text NOT NULL DEFAULT '',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agent_job_runs_one_active_per_job
  ON agent_job_runs(job_id)
  WHERE status IN ('queued', 'running');

CREATE INDEX agent_job_runs_job_created_idx
  ON agent_job_runs(job_id, created_at DESC, id DESC);
