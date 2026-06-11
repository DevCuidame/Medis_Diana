-- ============================================================
-- Migration 003: Locations (Sedes) & Rooms (Salones)
-- ============================================================

-- 1. Tabla de Sedes (Locations)
CREATE TABLE IF NOT EXISTS locations (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100)  NOT NULL UNIQUE,
  address     VARCHAR(255),
  city        VARCHAR(100),
  phone       VARCHAR(30),
  email       VARCHAR(255),
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Asegurar columnas en bases de datos existentes (schema upgrade idempotente)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS city  VARCHAR(100);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Trigger para locations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_locations_updated_at') THEN
    CREATE TRIGGER trg_locations_updated_at
      BEFORE UPDATE ON locations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- 2. Tabla de Salones (Rooms)
CREATE TABLE IF NOT EXISTS rooms (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  UUID          NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name         VARCHAR(100)  NOT NULL,
  capacity     INTEGER       NOT NULL DEFAULT 12,
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (location_id, name)
);

-- Trigger para rooms
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rooms_updated_at') THEN
    CREATE TRIGGER trg_rooms_updated_at
      BEFORE UPDATE ON rooms
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- 3. Modificar la tabla appointments para asociar con Room
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE RESTRICT;

-- 4. Seed inicial de sedes y salones
INSERT INTO locations (name, address) VALUES
  ('Sede Poblado', 'Calle 10 #43A-30, El Poblado, Medellín'),
  ('Sede Laureles', 'Transversal 39B #74-20, Laureles, Medellín')
ON CONFLICT (name) DO NOTHING;

-- Insertar salones asociados
DO $$
DECLARE
  poblado_id UUID;
  laureles_id UUID;
BEGIN
  SELECT id INTO poblado_id FROM locations WHERE name = 'Sede Poblado';
  SELECT id INTO laureles_id FROM locations WHERE name = 'Sede Laureles';

  IF poblado_id IS NOT NULL THEN
    INSERT INTO rooms (location_id, name, capacity) VALUES
      (poblado_id, 'Consultorio 1 - Medicina General', 1),
      (poblado_id, 'Consultorio 2 - Pediatría', 1),
      (poblado_id, 'Sala de Fisioterapia y Rehabilitación', 1)
    ON CONFLICT (location_id, name) DO NOTHING;
  END IF;

  IF laureles_id IS NOT NULL THEN
    INSERT INTO rooms (location_id, name, capacity) VALUES
      (laureles_id, 'Consultorio A - Ginecología', 1),
      (laureles_id, 'Consultorio B - Psicología', 1)
    ON CONFLICT (location_id, name) DO NOTHING;
  END IF;
END
$$;
