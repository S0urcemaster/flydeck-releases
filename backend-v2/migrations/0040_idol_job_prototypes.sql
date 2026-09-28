WITH roots AS (
  SELECT jobs.id, jobs.tree_id
  FROM tree_nodes jobs
  JOIN tree_nodes agnt ON agnt.id = jobs.parent_id
  JOIN tree_nodes system ON system.id = agnt.parent_id
  WHERE jobs.kind = 'system-directory' AND jobs.local_id = 'jobs'
    AND agnt.kind = 'system-directory' AND agnt.local_id = 'agnt'
    AND system.kind = 'system-directory' AND system.local_id = '_system'
), definitions AS (
  SELECT roots.*,
    (substr(md5(tree_id::text || ':job-idols'), 1, 12) || '4'
      || substr(md5(tree_id::text || ':job-idols'), 14, 3) || '8'
      || substr(md5(tree_id::text || ':job-idols'), 18, 15))::uuid AS idols_id
  FROM roots
), inserted_group AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT idols_id, tree_id, id, 'agent-job-group', '_idols', '_idols',
    COALESCE((SELECT max(position) + 1 FROM tree_nodes sibling
      WHERE sibling.parent_id = definitions.id), 0), true, true
  FROM definitions
  ON CONFLICT (id) DO NOTHING
  RETURNING id, tree_id
), prototypes AS (
  SELECT definitions.tree_id, definitions.idols_id,
    prototype.label, prototype.local_id, prototype.position,
    prototype.memo, prototype.prompt,
    (substr(md5(definitions.tree_id::text || ':job-idol:' || prototype.local_id), 1, 12) || '4'
      || substr(md5(definitions.tree_id::text || ':job-idol:' || prototype.local_id), 14, 3) || '8'
      || substr(md5(definitions.tree_id::text || ':job-idol:' || prototype.local_id), 18, 15))::uuid AS prototype_id
  FROM definitions
  CROSS JOIN (VALUES
    ('Gary', 'gary', 0,
      'You are Gary, a quiet and curious data companion. Select one interesting fragment from the configured datasource. Return the fragment, its exact source path, and one concise sentence explaining why it caught your attention. Never invent source material.',
      'Select one interesting fragment from the configured datasource and bring it to me with its exact source path.'),
    ('Bello', 'bello', 1,
      'You are Bello, an eager newspaper dog. Bite one random newspaper clipping from the configured datasource and proudly bring it to your owner. Return the clipping, its exact source path, publication date when available, and one short cheerful sentence. Never invent a clipping or source.',
      'Bite one random newspaper clipping from the configured datasource and proudly bring it to me with its exact source path and publication date when available.')
  ) AS prototype(label, local_id, position, memo, prompt)
), inserted_nodes AS (
  INSERT INTO tree_nodes (
    id, tree_id, parent_id, kind, label, local_id, position,
    content_editable, list_editable
  )
  SELECT prototype_id, tree_id, idols_id, 'agent-job', label, local_id,
    position, true, true
  FROM prototypes
  ON CONFLICT (id) DO NOTHING
  RETURNING id, tree_id
), inserted_jobs AS (
  INSERT INTO agent_jobs (
    job_id, memory, data_sources, prompt, model_tier, effort
  )
  SELECT prototype_id, memo, '', prompt, 'ECON', 'FAST'
  FROM prototypes
  ON CONFLICT (job_id) DO NOTHING
  RETURNING job_id
), changed_trees AS (
  SELECT tree_id FROM inserted_group
  UNION SELECT tree_id FROM inserted_nodes
)
UPDATE trees
SET revision = revision + 1, updated_at = now()
WHERE id IN (SELECT tree_id FROM changed_trees);
