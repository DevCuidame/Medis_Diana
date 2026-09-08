-- ============================================================
-- Migration 028: Service Commercial (comercial vs. operativo split)
-- ============================================================
-- Ver docs/superpowers/specs/2026-09-08-servicios-comerciales-operativos-design.md
--
-- service_catalog pasa a representar únicamente la ficha clínica/RIPS
-- interna ("operativo"). Esta tabla nueva guarda la ficha pública de venta
-- ("comercial"): nombre, descripción, imagen, y a qué operativo pertenece.
-- Un operativo puede respaldar muchos comerciales (1:N) — operativo_id NO
-- es único.
--
-- doc_prof_service_id queda reservado sin usar en esta fase: la sincronización
-- a CuidameDoc para comerciales es trabajo futuro (documentado en el spec,
-- sección "Fuera de alcance de esta fase").

CREATE TABLE IF NOT EXISTS service_commercial (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  image_url           TEXT,
  operativo_id        UUID         NOT NULL REFERENCES service_catalog(id) ON DELETE RESTRICT,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  doc_prof_service_id INTEGER,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_commercial_operativo ON service_commercial (operativo_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_service_commercial_updated_at') THEN
    CREATE TRIGGER trg_service_commercial_updated_at
      BEFORE UPDATE ON service_commercial
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
