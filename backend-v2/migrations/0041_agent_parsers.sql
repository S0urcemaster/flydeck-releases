ALTER TABLE agent_jobs
ADD COLUMN parser_node_id uuid REFERENCES tree_nodes(id) ON DELETE SET NULL;

WITH roots AS (
  SELECT agnt.id, agnt.tree_id
  FROM tree_nodes agnt
  JOIN tree_nodes system ON system.id = agnt.parent_id
  WHERE agnt.kind = 'system-directory' AND agnt.local_id = 'agnt'
    AND system.kind = 'system-directory' AND system.local_id = '_system'
), ids AS (
  SELECT roots.*,
    (substr(md5(tree_id::text || ':agent-prsr'), 1, 12) || '4' || substr(md5(tree_id::text || ':agent-prsr'), 14, 3) || '8' || substr(md5(tree_id::text || ':agent-prsr'), 18, 15))::uuid prsr_id,
    (substr(md5(tree_id::text || ':agent-prsr-input'), 1, 12) || '4' || substr(md5(tree_id::text || ':agent-prsr-input'), 14, 3) || '8' || substr(md5(tree_id::text || ':agent-prsr-input'), 18, 15))::uuid input_id,
    (substr(md5(tree_id::text || ':agent-prsr-ntfy'), 1, 12) || '4' || substr(md5(tree_id::text || ':agent-prsr-ntfy'), 14, 3) || '8' || substr(md5(tree_id::text || ':agent-prsr-ntfy'), 18, 15))::uuid ntfy_id,
    (substr(md5(tree_id::text || ':agent-prsr-idol-inbox'), 1, 12) || '4' || substr(md5(tree_id::text || ':agent-prsr-idol-inbox'), 14, 3) || '8' || substr(md5(tree_id::text || ':agent-prsr-idol-inbox'), 18, 15))::uuid parser_id
  FROM roots
), inserted AS (
  INSERT INTO tree_nodes (id, tree_id, parent_id, kind, label, local_id, position, content_editable, list_editable)
  SELECT prsr_id, tree_id, id, 'system-directory', '_prsr', '_prsr', 2, false, true FROM ids
  UNION ALL SELECT input_id, tree_id, prsr_id, 'system-directory', '_input_prototypes', '_input_prototypes', 0, false, true FROM ids
  UNION ALL SELECT ntfy_id, tree_id, input_id, 'data-item', 'ntfy', 'ntfy', 0, true, false FROM ids
  UNION ALL SELECT parser_id, tree_id, prsr_id, 'agent-parser', 'Idol to Inbox', 'idol-to-inbox', 1, true, false FROM ids
  ON CONFLICT (id) DO NOTHING RETURNING id, tree_id
), contents AS (
  INSERT INTO node_contents (node_id, format, content)
  SELECT ntfy_id, 'json', '{"title":"Gary found something","message":"A concise notification for the owner.","tags":["pet","inbox"],"priority":"default","item":{"label":"Found fragment","content":"The complete datasource item content.","source":"path/to/source"}}' FROM ids
  UNION ALL
  SELECT parser_id, 'json', '{"type":"flydeck-agent-parser","version":1,"parser":"idol-to-inbox","outputSource":""}' FROM ids
  ON CONFLICT (node_id) DO NOTHING
)
UPDATE trees SET revision = revision + 1, updated_at = now()
WHERE id IN (SELECT tree_id FROM inserted);

WITH ids AS (
  SELECT agnt.tree_id,
    (substr(md5(agnt.tree_id::text || ':agent-prsr-idol-inbox'), 1, 12) || '4' || substr(md5(agnt.tree_id::text || ':agent-prsr-idol-inbox'), 14, 3) || '8' || substr(md5(agnt.tree_id::text || ':agent-prsr-idol-inbox'), 18, 15))::uuid parser_id
  FROM tree_nodes agnt WHERE agnt.kind = 'system-directory' AND agnt.local_id = 'agnt'
)
UPDATE agent_jobs job
SET parser_node_id = ids.parser_id
FROM ids
JOIN tree_nodes prototype ON prototype.tree_id = ids.tree_id
JOIN tree_nodes parent ON parent.id = prototype.parent_id
WHERE job.job_id = prototype.id AND parent.local_id = '_idols'
  AND prototype.local_id IN ('gary', 'bello') AND job.parser_node_id IS NULL;
