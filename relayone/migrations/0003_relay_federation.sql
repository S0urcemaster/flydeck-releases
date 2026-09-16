CREATE TABLE relay_exchange_requests (
  id uuid PRIMARY KEY,
  peer_node_id text NOT NULL,
  peer_origin text NOT NULL,
  peer_title text NOT NULL,
  peer_public_key text NOT NULL,
  peer_fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  received_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (peer_fingerprint)
);

CREATE TABLE relay_connections (
  id uuid PRIMARY KEY,
  peer_node_id text NOT NULL,
  peer_origin text NOT NULL,
  peer_title text NOT NULL,
  peer_public_key text NOT NULL,
  peer_fingerprint text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'active'
    CHECK (state IN ('active', 'disconnected')),
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  last_sync_error text
);

CREATE TABLE relay_peer_snapshots (
  connection_id uuid PRIMARY KEY REFERENCES relay_connections(id) ON DELETE CASCADE,
  source_revision text NOT NULL,
  site jsonb NOT NULL,
  nodes jsonb NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE relay_peer_assets (
  connection_id uuid NOT NULL REFERENCES relay_connections(id) ON DELETE CASCADE,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  stored_path text NOT NULL,
  PRIMARY KEY (connection_id, sha256)
);

CREATE INDEX relay_exchange_requests_inbox_idx
  ON relay_exchange_requests (status, received_at DESC);

