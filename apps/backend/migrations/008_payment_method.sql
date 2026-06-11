ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
  CHECK (payment_method IN ('cash', 'wompi', 'free'));

-- Existing rows (created as paid/free) retroactively mark as free
UPDATE user_memberships SET payment_method = 'free' WHERE payment_status = 'paid';
