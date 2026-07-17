-- ============================================================
-- Migration 019: Inventory items (Insumos, medicamentos, equipos)
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(150) NOT NULL,
  category     VARCHAR(50)  NOT NULL,
  unit         VARCHAR(30)  NOT NULL,
  price        INTEGER      NOT NULL DEFAULT 0,
  quantity     INTEGER      NOT NULL DEFAULT 0,
  min_stock    INTEGER      NOT NULL DEFAULT 0,
  notes        TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items (is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items (category);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inventory_items_updated_at') THEN
    CREATE TRIGGER trg_inventory_items_updated_at
      BEFORE UPDATE ON inventory_items
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
