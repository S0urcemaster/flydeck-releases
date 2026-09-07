CREATE TABLE relay_oauth_states (
  key text PRIMARY KEY,
  encrypted_value bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE relay_oauth_sessions (
  did text PRIMARY KEY,
  encrypted_value bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE relay_oauth_connections (
  id uuid PRIMARY KEY,
  flydeck_user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider = 'bluesky'),
  did text NOT NULL REFERENCES relay_oauth_sessions(did) ON DELETE CASCADE,
  handle text NOT NULL,
  status text NOT NULL CHECK (status IN ('connected', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flydeck_user_id, workspace_id, provider)
);

CREATE INDEX relay_oauth_states_expiry_idx ON relay_oauth_states (expires_at);
