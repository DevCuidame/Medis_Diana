-- ============================================================
-- Migration 005: Gestión de Servicios
-- Extends: locations (003), appointments (002)
-- Adds: operating_hours, service_offers, booking_requests
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'day_of_week') THEN
    CREATE TYPE day_of_week AS ENUM
      ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_type') THEN
    CREATE TYPE offer_type AS ENUM ('appointment','open_consultation','workshop','event');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
    CREATE TYPE offer_status AS ENUM ('draft','published','cancelled','completed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_request_status') THEN
    CREATE TYPE booking_request_status AS ENUM ('pending','approved','rejected','cancelled');
  END IF;
END $$;

-- ─── OPERATING HOURS ─────────────────────────────────────────
-- Horarios semanales de operación por sede

CREATE TABLE IF NOT EXISTS operating_hours (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  UUID        NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  day          day_of_week NOT NULL,
  opens_at     TIME        NOT NULL,   -- ej: '08:00'
  closes_at    TIME        NOT NULL,   -- ej: '22:00'
  is_closed    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (location_id, day),
  CONSTRAINT chk_hours_order CHECK (closes_at > opens_at)
);

CREATE INDEX IF NOT EXISTS idx_op_hours_location ON operating_hours (location_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_op_hours_updated_at') THEN
    CREATE TRIGGER trg_op_hours_updated_at
      BEFORE UPDATE ON operating_hours
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── ROOM RESOURCES ──────────────────────────────────────────
-- Recursos/equipamiento de un consultorio (camilla, tensiómetro, etc.)

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS resources    JSONB NOT NULL DEFAULT '[]';
-- Ejemplo resources: [{"name":"Camilla","qty":1},{"name":"Tensiómetro","qty":1}]

-- ─── SERVICE OFFERS ──────────────────────────────────────────
-- Catálogo de ofertas programadas (consultas, jornadas abiertas, eventos)

CREATE TABLE IF NOT EXISTS service_offers (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Ubicación
  location_id      UUID         NOT NULL REFERENCES locations(id)    ON DELETE RESTRICT,
  room_id          UUID         REFERENCES rooms(id)                  ON DELETE RESTRICT,
  -- Clasificación
  offer_type       offer_type   NOT NULL DEFAULT 'appointment',
  title            VARCHAR(150) NOT NULL,
  description      TEXT,
  -- Profesional asignado (opcional para jornadas abiertas / eventos)
  professional_id  UUID         REFERENCES users(id)                  ON DELETE SET NULL,
  specialty_id     UUID         REFERENCES specialties(id)            ON DELETE SET NULL,
  -- Capacidad y duración
  capacity         INTEGER      NOT NULL DEFAULT 12,
  duration_minutes INTEGER      NOT NULL DEFAULT 60,
  -- Programación
  scheduled_at     TIMESTAMPTZ  NOT NULL,
  -- Precio (nulo = incluido en membresía)
  price            NUMERIC(10,2),
  currency         CHAR(3)      NOT NULL DEFAULT 'COP',
  -- Estado
  status           offer_status NOT NULL DEFAULT 'draft',
  -- Auditoría
  created_by       UUID         NOT NULL REFERENCES users(id)         ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Una oferta no puede exceder la capacidad del salón
  CONSTRAINT chk_offer_capacity CHECK (capacity > 0)
);

CREATE INDEX IF NOT EXISTS idx_offers_location    ON service_offers (location_id);
CREATE INDEX IF NOT EXISTS idx_offers_room        ON service_offers (room_id);
CREATE INDEX IF NOT EXISTS idx_offers_scheduled   ON service_offers (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_offers_status      ON service_offers (status);
CREATE INDEX IF NOT EXISTS idx_offers_type        ON service_offers (offer_type);
CREATE INDEX IF NOT EXISTS idx_offers_professional ON service_offers (professional_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_offers_updated_at') THEN
    CREATE TRIGGER trg_offers_updated_at
      BEFORE UPDATE ON service_offers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── CAPACITY CHECK FUNCTION ─────────────────────────────────
-- Valida que la capacidad de la oferta no supere la del salón

CREATE OR REPLACE FUNCTION check_offer_room_capacity()
RETURNS TRIGGER AS $$
DECLARE
  room_cap INTEGER;
BEGIN
  IF NEW.room_id IS NOT NULL THEN
    SELECT capacity INTO room_cap FROM rooms WHERE id = NEW.room_id;
    IF NEW.capacity > room_cap THEN
      RAISE EXCEPTION
        'La capacidad de la oferta (%) supera la del salón (%)',
        NEW.capacity, room_cap;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_offer_capacity') THEN
    CREATE TRIGGER trg_check_offer_capacity
      BEFORE INSERT OR UPDATE ON service_offers
      FOR EACH ROW EXECUTE FUNCTION check_offer_room_capacity();
  END IF;
END $$;

-- ─── BOOKING REQUESTS ────────────────────────────────────────
-- Solicitudes de reserva de pacientes (flujo: pending → approved/rejected)

CREATE TABLE IF NOT EXISTS booking_requests (
  id          UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id    UUID                   NOT NULL REFERENCES service_offers(id) ON DELETE CASCADE,
  user_id     UUID                   NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  status      booking_request_status NOT NULL DEFAULT 'pending',
  -- Resolución por admin
  resolved_by UUID                   REFERENCES users(id)                   ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  reject_reason TEXT,
  -- Auditoría
  created_at  TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  UNIQUE (offer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_breq_offer  ON booking_requests (offer_id);
CREATE INDEX IF NOT EXISTS idx_breq_user   ON booking_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_breq_status ON booking_requests (status);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_breq_updated_at') THEN
    CREATE TRIGGER trg_breq_updated_at
      BEFORE UPDATE ON booking_requests
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── ENROLLED COUNT SYNC ─────────────────────────────────────
-- Mantiene el conteo de aprobados en service_offers

ALTER TABLE service_offers
  ADD COLUMN IF NOT EXISTS enrolled_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION sync_offer_enrolled_count()
RETURNS TRIGGER AS $$
DECLARE
  target_offer_id UUID;
BEGIN
  target_offer_id := COALESCE(NEW.offer_id, OLD.offer_id);
  UPDATE service_offers
    SET enrolled_count = (
      SELECT COUNT(*) FROM booking_requests
      WHERE offer_id = target_offer_id AND status = 'approved'
    )
  WHERE id = target_offer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_offer_enrolled') THEN
    CREATE TRIGGER trg_sync_offer_enrolled
      AFTER INSERT OR UPDATE OR DELETE ON booking_requests
      FOR EACH ROW EXECUTE FUNCTION sync_offer_enrolled_count();
  END IF;
END $$;

-- ─── VISTA: OFFER SUMMARY ────────────────────────────────────

CREATE OR REPLACE VIEW v_service_offers AS
  SELECT
    so.id,
    so.title,
    so.description,
    so.offer_type,
    so.status,
    so.scheduled_at,
    so.duration_minutes,
    so.capacity,
    so.enrolled_count,
    so.price,
    so.currency,
    -- Sede
    l.id   AS location_id,
    l.name AS location_name,
    -- Salón
    r.id   AS room_id,
    r.name AS room_name,
    r.capacity AS room_capacity,
    -- Profesional
    u.id         AS professional_id,
    u.first_name AS professional_first,
    u.last_name  AS professional_last,
    u.avatar_url AS professional_avatar,
    -- Especialidad
    d.id   AS specialty_id,
    d.name AS specialty_name,
    d.level AS specialty_level
  FROM service_offers so
  JOIN locations l ON l.id = so.location_id
  LEFT JOIN rooms r ON r.id = so.room_id
  LEFT JOIN users u ON u.id = so.professional_id
  LEFT JOIN specialties d ON d.id = so.specialty_id;
