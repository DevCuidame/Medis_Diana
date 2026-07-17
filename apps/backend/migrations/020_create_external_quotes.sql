-- ============================================================
-- Migration 020: External quotes (cotizaciones desde sistemas externos, ej. CuidameDoc)
-- ============================================================

CREATE TABLE IF NOT EXISTS external_quotes (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source              VARCHAR(30)  NOT NULL DEFAULT 'cuidamedoc',
  external_reference  VARCHAR(100),
  patient_name        VARCHAR(150) NOT NULL,
  patient_email       VARCHAR(150),
  professional_name   VARCHAR(150),
  items               JSONB        NOT NULL,
  total_amount        INTEGER      NOT NULL,
  status              VARCHAR(20)  NOT NULL DEFAULT 'pending',
  resolved_by         VARCHAR(150),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_external_quotes_status CHECK (status IN ('pending', 'confirmed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_external_quotes_status ON external_quotes (status);
CREATE INDEX IF NOT EXISTS idx_external_quotes_source ON external_quotes (source);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_external_quotes_updated_at') THEN
    CREATE TRIGGER trg_external_quotes_updated_at
      BEFORE UPDATE ON external_quotes
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
