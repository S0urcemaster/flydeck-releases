WITH updated AS (
  UPDATE node_contents content
  SET content = regexp_replace(content.content, '^#[^\n]*\n\n', ''),
      revision = content.revision + 1,
      updated_at = now()
  FROM tree_nodes node
  WHERE node.id = content.node_id
    AND node.kind = 'agent-memo'
    AND node.local_id = ANY(ARRAY[
      'identity', 'identity-role', 'identity-working-style', 'identity-boundaries',
      'user', 'user-profile', 'user-communication', 'user-priorities',
      'workspace', 'workspace-purpose', 'workspace-conventions', 'workspace-locations',
      'operating-rules', 'operating-rules-before-action',
      'operating-rules-after-action', 'operating-rules-recovery',
      'continuity', 'continuity-decisions', 'continuity-open-questions',
      'continuity-handover'
    ])
    AND content.content ~ '^#[^\n]*\n\n'
  RETURNING node.tree_id
)
UPDATE trees
SET revision = revision + 1,
    updated_at = now()
WHERE id IN (SELECT tree_id FROM updated);
