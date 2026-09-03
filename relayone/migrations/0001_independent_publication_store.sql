CREATE TABLE relay_assets (
  sha256 text PRIMARY KEY CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text NOT NULL CHECK (char_length(mime_type) BETWEEN 1 AND 200),
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  storage_path text NOT NULL UNIQUE CHECK (char_length(storage_path) BETWEEN 1 AND 500),
  original_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE relay_publications (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  info text NOT NULL DEFAULT '' CHECK (char_length(info) <= 1000),
  active_version bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE relay_publication_versions (
  publication_id uuid NOT NULL REFERENCES relay_publications(id) ON DELETE CASCADE,
  version bigint NOT NULL CHECK (version > 0),
  schema_version integer NOT NULL CHECK (schema_version > 0),
  manifest_sha256 text NOT NULL CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('staging', 'active', 'retired')),
  created_at timestamptz NOT NULL,
  activated_at timestamptz,
  PRIMARY KEY (publication_id, version)
);

ALTER TABLE relay_publications
  ADD CONSTRAINT relay_publications_active_version_fk
  FOREIGN KEY (id, active_version)
  REFERENCES relay_publication_versions(publication_id, version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE relay_nodes (
  publication_id uuid NOT NULL,
  publication_version bigint NOT NULL,
  id uuid NOT NULL,
  parent_id uuid,
  local_id text NOT NULL CHECK (char_length(local_id) BETWEEN 1 AND 200),
  position integer NOT NULL CHECK (position >= 0),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 500),
  format text NOT NULL CHECK (format IN ('text', 'markdown', 'json')),
  content text NOT NULL DEFAULT '',
  source_created_at timestamptz NOT NULL,
  source_updated_at timestamptz NOT NULL,
  PRIMARY KEY (publication_id, publication_version, id),
  FOREIGN KEY (publication_id, publication_version)
    REFERENCES relay_publication_versions(publication_id, version)
    ON DELETE CASCADE,
  FOREIGN KEY (publication_id, publication_version, parent_id)
    REFERENCES relay_nodes(publication_id, publication_version, id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX relay_nodes_parent_idx
  ON relay_nodes(publication_id, publication_version, parent_id, position);

CREATE TABLE relay_version_assets (
  publication_id uuid NOT NULL,
  publication_version bigint NOT NULL,
  sha256 text NOT NULL,
  mime_type text NOT NULL CHECK (char_length(mime_type) BETWEEN 1 AND 200),
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  original_name text,
  PRIMARY KEY (publication_id, publication_version, sha256),
  FOREIGN KEY (publication_id, publication_version)
    REFERENCES relay_publication_versions(publication_id, version)
    ON DELETE CASCADE
);

CREATE TABLE relay_node_assets (
  publication_id uuid NOT NULL,
  publication_version bigint NOT NULL,
  node_id uuid NOT NULL,
  sha256 text NOT NULL,
  role text NOT NULL CHECK (role IN ('hero', 'attachment', 'video', 'audio')),
  position integer NOT NULL CHECK (position >= 0),
  alt text,
  PRIMARY KEY (publication_id, publication_version, node_id, role, position),
  FOREIGN KEY (publication_id, publication_version, node_id)
    REFERENCES relay_nodes(publication_id, publication_version, id)
    ON DELETE CASCADE,
  FOREIGN KEY (publication_id, publication_version, sha256)
    REFERENCES relay_version_assets(publication_id, publication_version, sha256)
    ON DELETE CASCADE
);

CREATE INDEX relay_node_assets_hash_idx ON relay_node_assets(sha256);
