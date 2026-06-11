-- ============================================================
-- Migration 002: Specialties, Appointments, Bookings & Ratings
-- ============================================================
-- Run: psql -d acaripole_db -f migrations/002_create_professionals.sql
-- ============================================================

-- 1. Enum de nivel de especialidad
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'specialty_level') THEN
    CREATE TYPE specialty_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all');
  END IF;
END
$$;

-- 2. Enum de estado del profesional
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'professional_status') THEN
    CREATE TYPE professional_status AS ENUM ('available', 'in_consultation', 'offline');
  END IF;
END
$$;

-- 3. Enum de estado del booking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
  END IF;
END
$$;

-- 4. Columna de status en users (para profesionales)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status professional_status NOT NULL DEFAULT 'offline';

-- 5. Tabla de especialidades médicas (tipos de consulta de la clínica)
CREATE TABLE IF NOT EXISTS specialties (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(100)    NOT NULL UNIQUE,
  description      TEXT,
  level            specialty_level NOT NULL DEFAULT 'all',
  duration_minutes INTEGER         NOT NULL DEFAULT 60,
  max_capacity     INTEGER         NOT NULL DEFAULT 12,
  is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialties_active ON specialties (is_active);

-- Trigger: create only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_specialties_updated_at') THEN
    CREATE TRIGGER trg_specialties_updated_at
      BEFORE UPDATE ON specialties
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- 6. Tabla de citas/consultas programadas
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id     UUID         NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
  professional_id  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  scheduled_at     TIMESTAMPTZ  NOT NULL,
  duration_minutes INTEGER      NOT NULL DEFAULT 60,
  capacity         INTEGER      NOT NULL DEFAULT 12,
  enrolled_count   INTEGER      NOT NULL DEFAULT 0,
  location         VARCHAR(200),
  notes            TEXT,
  is_cancelled     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_professional   ON appointments (professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_specialty      ON appointments (specialty_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at   ON appointments (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_not_cancelled  ON appointments (is_cancelled) WHERE is_cancelled = FALSE;

-- Trigger: create only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_appointments_updated_at') THEN
    CREATE TRIGGER trg_appointments_updated_at
      BEFORE UPDATE ON appointments
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- 7. Tabla de reservas de pacientes a citas
CREATE TABLE IF NOT EXISTS appointment_bookings (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID            NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id        UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         booking_status  NOT NULL DEFAULT 'confirmed',
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_bookings_appointment ON appointment_bookings (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_bookings_user        ON appointment_bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_bookings_status      ON appointment_bookings (status);

-- Trigger: create only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_appointment_bookings_updated_at') THEN
    CREATE TRIGGER trg_appointment_bookings_updated_at
      BEFORE UPDATE ON appointment_bookings
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- Trigger: actualizar enrolled_count en appointments cuando cambia un booking
CREATE OR REPLACE FUNCTION sync_appointment_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE appointments
  SET enrolled_count = (
    SELECT COUNT(*) FROM appointment_bookings
    WHERE appointment_id = COALESCE(NEW.appointment_id, OLD.appointment_id)
      AND status = 'confirmed'
  )
  WHERE id = COALESCE(NEW.appointment_id, OLD.appointment_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: create only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_appointment_enrolled_count') THEN
    CREATE TRIGGER trg_sync_appointment_enrolled_count
      AFTER INSERT OR UPDATE OR DELETE ON appointment_bookings
      FOR EACH ROW EXECUTE FUNCTION sync_appointment_enrolled_count();
  END IF;
END
$$;

-- 8. Tabla de calificaciones
CREATE TABLE IF NOT EXISTS ratings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id  UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  score           SMALLINT    NOT NULL CHECK (score >= 1 AND score <= 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (professional_id, user_id, appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_professional ON ratings (professional_id);
CREATE INDEX IF NOT EXISTS idx_ratings_score        ON ratings (professional_id, score);

-- 9. Vista materializada del promedio de ratings por profesional
CREATE OR REPLACE VIEW professional_rating_summary AS
  SELECT
    professional_id,
    ROUND(AVG(score)::NUMERIC, 1) AS avg_score,
    COUNT(*)                       AS total_reviews
  FROM ratings
  GROUP BY professional_id;

-- 10. Seed de especialidades base de la clínica
INSERT INTO specialties (name, description, level, duration_minutes, max_capacity) VALUES
  ('Medicina General',      'Consulta médica general para diagnóstico, tratamiento y seguimiento de salud.', 'all', 30, 1),
  ('Pediatría',             'Atención médica integral para bebés, niños y adolescentes.',                     'all', 30, 1),
  ('Ginecología',           'Control y cuidado de la salud femenina y reproductiva.',                          'all', 30, 1),
  ('Nutrición y Dietética', 'Valoración y plan alimenticio personalizado según objetivos de salud.',           'all', 45, 1),
  ('Psicología',            'Acompañamiento emocional y terapia individual.',                                  'all', 50, 1),
  ('Fisioterapia',          'Rehabilitación física y manejo del dolor musculoesquelético.',                    'all', 45, 1)
ON CONFLICT (name) DO NOTHING;
