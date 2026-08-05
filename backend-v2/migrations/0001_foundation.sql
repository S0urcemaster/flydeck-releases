CREATE TABLE users (
  id uuid PRIMARY KEY,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('password', 'passkey')),
  credential jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash bytea PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  filesystem_root text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_memberships (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX workspace_memberships_user_id_idx
  ON workspace_memberships(user_id);

CREATE TABLE cron_timers (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired')),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expired_at timestamptz,
  CHECK (
    (status = 'active' AND expired_at IS NULL)
    OR status = 'expired'
  )
);
CREATE INDEX cron_timers_workspace_due_idx
  ON cron_timers(workspace_id, due_at)
  WHERE status = 'active';
CREATE INDEX cron_timers_created_by_user_id_idx
  ON cron_timers(created_by_user_id);

CREATE TABLE trees (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('data', 'config')),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, kind)
);

CREATE TABLE tree_nodes (
  id uuid PRIMARY KEY,
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  parent_id uuid,
  kind text NOT NULL CHECK (char_length(kind) BETWEEN 1 AND 64),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  position integer NOT NULL CHECK (position >= 0),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  content_editable boolean NOT NULL DEFAULT true,
  list_editable boolean NOT NULL DEFAULT true,
  list_item_limit integer CHECK (list_item_limit >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tree_id, id),
  FOREIGN KEY (tree_id, parent_id)
    REFERENCES tree_nodes(tree_id, id) ON DELETE CASCADE
);
CREATE INDEX tree_nodes_tree_parent_position_idx
  ON tree_nodes(tree_id, parent_id, position);

CREATE TABLE node_contents (
  node_id uuid PRIMARY KEY REFERENCES tree_nodes(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('text', 'markdown', 'json')),
  content text NOT NULL DEFAULT '',
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE node_user_states (
  node_id uuid NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, user_id)
);

CREATE TABLE tree_user_states (
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selected_path uuid[] NOT NULL DEFAULT '{}',
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tree_id, user_id)
);

CREATE TABLE legacy_imports (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_kind text NOT NULL
    CHECK (source_kind IN ('v1-data-file', 'v1-cron-timer')),
  source_key text NOT NULL CHECK (char_length(source_key) BETWEEN 1 AND 500),
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_modified_at timestamptz,
  target_kind text NOT NULL
    CHECK (target_kind IN ('tree-node', 'cron-timer')),
  target_id uuid NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, source_kind, source_key)
);
CREATE INDEX legacy_imports_target_idx
  ON legacy_imports(target_kind, target_id);

CREATE TABLE idempotency_keys (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  operation text NOT NULL,
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, workspace_id, request_id)
);

CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  request_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_workspace_created_idx
  ON audit_events(workspace_id, created_at DESC);
