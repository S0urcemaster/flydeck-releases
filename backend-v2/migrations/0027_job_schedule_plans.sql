ALTER TABLE agent_jobs
  ADD COLUMN schedule_start_at timestamptz,
  ADD COLUMN schedule_end_at timestamptz,
  ADD COLUMN schedule_stops timestamptz[] NOT NULL DEFAULT '{}',
  ADD COLUMN schedule_repetitions integer NOT NULL DEFAULT 0
    CHECK (schedule_repetitions BETWEEN 0 AND 10000),
  ADD COLUMN schedule_occurrence integer NOT NULL DEFAULT 0
    CHECK (schedule_occurrence >= 0);

UPDATE agent_jobs
SET schedule_start_at = schedule_due_at,
    schedule_end_at = schedule_due_at + interval '1 second'
WHERE schedule_due_at IS NOT NULL;

ALTER TABLE agent_jobs DROP CONSTRAINT agent_jobs_check;
ALTER TABLE agent_jobs ADD CHECK (
  (schedule_due_at IS NULL AND schedule_start_at IS NULL AND schedule_end_at IS NULL
    AND schedule_time_zone IS NULL AND NOT schedule_enabled)
  OR (schedule_due_at IS NOT NULL AND schedule_start_at IS NOT NULL
    AND schedule_end_at IS NOT NULL AND schedule_time_zone IS NOT NULL
    AND schedule_end_at > schedule_start_at)
);
