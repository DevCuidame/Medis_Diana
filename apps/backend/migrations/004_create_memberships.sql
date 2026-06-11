-- ============================================================
-- Migration 004: Memberships and appointment membership links
-- ============================================================

-- 1. Memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(40)  NOT NULL UNIQUE,
  name         VARCHAR(120) NOT NULL,
  description  TEXT,
  type         VARCHAR(20)  NOT NULL,
  price        INTEGER      NOT NULL DEFAULT 0,
  currency     VARCHAR(3)   NOT NULL DEFAULT 'COP',
  duration_days INTEGER,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships (is_active);

-- Trigger: create only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_memberships_updated_at') THEN
    CREATE TRIGGER trg_memberships_updated_at
      BEFORE UPDATE ON memberships
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- 2. Add membership_id to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_membership ON appointments (membership_id);

-- 3. Seed default memberships
INSERT INTO memberships (code, name, description, type, price, currency, duration_days)
VALUES
  ('POR_CONSULTA', 'Por Consulta', 'Pago por consulta individual', 'per_class', 45000, 'COP', NULL),
  ('MENSUAL', 'Plan Mensual', 'Acceso mensual a consultas regulares', 'monthly', 180000, 'COP', 30),
  ('PRIVADA', 'Consulta Privada', 'Sesión privada con un médico especialista', 'private', 120000, 'COP', NULL)
ON CONFLICT (code) DO NOTHING;

-- 4. Set default membership for existing appointments
UPDATE appointments
SET membership_id = (SELECT id FROM memberships WHERE code = 'POR_CONSULTA')
WHERE membership_id IS NULL;
