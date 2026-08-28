-- Run once as a PostgreSQL administrator after replacing the password.
CREATE ROLE relayone LOGIN PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
GRANT CONNECT ON DATABASE flydeck TO relayone;
GRANT USAGE ON SCHEMA public TO relayone;
GRANT SELECT ON TABLE trees, tree_nodes, node_contents, node_images TO relayone;
