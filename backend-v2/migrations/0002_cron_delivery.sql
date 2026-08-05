ALTER TABLE cron_timers
  ADD COLUMN notification_claimed_at timestamptz,
  ADD COLUMN notified_at timestamptz,
  ADD COLUMN notification_attempts integer NOT NULL DEFAULT 0
    CHECK (notification_attempts >= 0),
  ADD COLUMN notification_last_error text;

CREATE INDEX cron_timers_delivery_idx
  ON cron_timers(due_at, notification_claimed_at)
  WHERE status = 'active';
