CREATE TABLE relay_publication_versions (
  publication_id uuid PRIMARY KEY REFERENCES tree_nodes(id) ON DELETE CASCADE,
  last_issued_version bigint NOT NULL DEFAULT 0 CHECK (last_issued_version >= 0),
  last_confirmed_version bigint NOT NULL DEFAULT 0 CHECK (last_confirmed_version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE relay_publication_outbox (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  publication_id uuid NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('publish', 'unpublish')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
  target_version bigint CHECK (target_version IS NULL OR target_version > 0),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX relay_publication_outbox_due_idx
  ON relay_publication_outbox(next_attempt_at, created_at)
  WHERE status IN ('pending', 'failed');

CREATE UNIQUE INDEX relay_publication_outbox_one_open_idx
  ON relay_publication_outbox(publication_id)
  WHERE status IN ('pending', 'sending', 'failed');
