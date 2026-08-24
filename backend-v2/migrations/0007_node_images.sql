CREATE TABLE node_images (
  node_id uuid PRIMARY KEY REFERENCES tree_nodes(id) ON DELETE CASCADE,
  relative_path text NOT NULL CHECK (char_length(relative_path) BETWEEN 1 AND 500),
  mime_type text NOT NULL CHECK (char_length(mime_type) BETWEEN 1 AND 100),
  original_name text NOT NULL DEFAULT '' CHECK (char_length(original_name) <= 255),
  byte_size integer NOT NULL CHECK (byte_size > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
