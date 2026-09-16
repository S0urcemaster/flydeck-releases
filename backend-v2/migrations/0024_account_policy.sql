ALTER TABLE users
  ADD COLUMN account_type text NOT NULL DEFAULT 'personal',
  ADD COLUMN account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN usage_logging boolean NOT NULL DEFAULT false;

ALTER TABLE users
  ADD CONSTRAINT users_account_type_check
    CHECK (account_type IN ('personal', 'guest', 'probe', 'test')),
  ADD CONSTRAINT users_account_status_check
    CHECK (account_status IN ('active', 'suspended', 'expired'));

CREATE INDEX users_account_expiry_idx
  ON users (expires_at)
  WHERE expires_at IS NOT NULL;

