CREATE TABLE scheduler_plans (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 0),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  stops timestamptz[] NOT NULL DEFAULT '{}',
  repetitions integer NOT NULL DEFAULT 0 CHECK (repetitions BETWEEN 0 AND 10000),
  time_zone text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  next_due_at timestamptz NOT NULL,
  occurrence integer NOT NULL DEFAULT 0 CHECK (occurrence >= 0),
  last_fired_at timestamptz,
  fired_count integer NOT NULL DEFAULT 0 CHECK (fired_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);
CREATE INDEX scheduler_plans_due_idx ON scheduler_plans(next_due_at, id) WHERE enabled;
