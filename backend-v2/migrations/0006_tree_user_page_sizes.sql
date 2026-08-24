ALTER TABLE tree_user_states
ADD COLUMN page_sizes jsonb NOT NULL DEFAULT '{}'::jsonb
CHECK (jsonb_typeof(page_sizes) = 'object');
