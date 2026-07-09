-- ============================================================
-- Migration 018: RIPS Service Catalog
-- ============================================================

-- 1. Crear la tabla maestra del Catálogo de Servicios (RIPS)
CREATE TABLE IF NOT EXISTS service_catalog (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id                SERIAL       UNIQUE NOT NULL, -- Consecutivo autogenerado
  service_name              VARCHAR(255) NOT NULL,
  description               TEXT,
  category_group            VARCHAR(50),  -- Ej: '01 Consulta externa'
  subcategory_group         VARCHAR(100),
  category                  VARCHAR(100),
  subcategory               VARCHAR(100),
  service_code              VARCHAR(50),  -- CUPS (Generado)
  modality                  VARCHAR(100), -- Modalidad
  is_active                 BOOLEAN      DEFAULT TRUE NOT NULL,
  base_price                NUMERIC(10,2),
  image_url                 VARCHAR(500),
  preparation_instructions  TEXT,
  gender_restriction        TEXT,
  risks                     TEXT,
  contraindications         TEXT,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at en service_catalog
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_service_catalog_updated_at') THEN
    CREATE TRIGGER trg_service_catalog_updated_at
      BEFORE UPDATE ON service_catalog
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- 2. Modificar service_offers para apuntar al catálogo
-- Primero agregamos la columna catalog_id
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS catalog_id UUID REFERENCES service_catalog(id) ON DELETE RESTRICT;

-- (Opcional) crear un índice para la nueva FK
CREATE INDEX IF NOT EXISTS idx_offers_catalog ON service_offers (catalog_id);
