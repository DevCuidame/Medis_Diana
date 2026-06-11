-- ============================================================
-- Migration 007: User Memberships
-- Tracks which memberships each user has purchased and their status
-- ============================================================

-- Add max_classes to memberships for pack/per_class types
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS max_classes INT;
UPDATE memberships SET max_classes = 1  WHERE type = 'per_class';
UPDATE memberships SET max_classes = 1  WHERE type = 'private';
-- Pack memberships get 10 appointments by default (admin can edit)
UPDATE memberships SET max_classes = 10 WHERE type = 'pack';

-- User memberships table
CREATE TABLE IF NOT EXISTS user_memberships (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_id     UUID         NOT NULL REFERENCES memberships(id),
  started_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,           -- NULL for per_class / pack (no calendar expiry)
  classes_remaining INT,                   -- NULL for monthly/annual (unlimited)
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  payment_status    VARCHAR(20)  NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('pending','paid','cancelled')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_memberships_user ON user_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_active ON user_memberships (user_id, is_active);

-- Auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_memberships_updated_at') THEN
    CREATE TRIGGER trg_user_memberships_updated_at
      BEFORE UPDATE ON user_memberships
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
