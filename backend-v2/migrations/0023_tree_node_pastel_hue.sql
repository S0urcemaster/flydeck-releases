ALTER TABLE tree_nodes
ADD COLUMN pastel_hue smallint
CHECK (pastel_hue BETWEEN 0 AND 359);
