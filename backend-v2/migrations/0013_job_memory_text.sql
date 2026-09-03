ALTER TABLE agent_jobs
ADD COLUMN memory text NOT NULL DEFAULT '';

UPDATE agent_jobs job
SET memory = COALESCE((
  SELECT string_agg(
    '# ' || node.label || E'\n\n' || content.content,
    E'\n\n---\n\n'
    ORDER BY selected.ordinality
  )
  FROM unnest(job.memory_node_ids) WITH ORDINALITY selected(node_id, ordinality)
  JOIN tree_nodes node ON node.id = selected.node_id
  JOIN node_contents content ON content.node_id = node.id
), '')
WHERE cardinality(job.memory_node_ids) > 0;
