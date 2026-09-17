ALTER TABLE agent_jobs
ADD COLUMN destination_node_id uuid REFERENCES tree_nodes(id) ON DELETE SET NULL;
