-- ============================================================
-- Migration 016: Descuentos y Promociones
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
    CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'buy_x_get_y');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS discounts (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(150)  NOT NULL,
  type                   discount_type NOT NULL,
  value                  NUMERIC(10,2),
  buy_qty                INTEGER,
  pay_qty                INTEGER,
  code                   VARCHAR(50)   UNIQUE,
  specialty_id           UUID          REFERENCES specialties(id) ON DELETE SET NULL,
  starts_at              TIMESTAMPTZ,
  ends_at                TIMESTAMPTZ,
  max_total_uses         INTEGER,
  max_uses_per_patient   INTEGER,
  is_active              BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by             UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_discount_value CHECK (
    (type = 'buy_x_get_y' AND buy_qty IS NOT NULL AND pay_qty IS NOT NULL AND pay_qty < buy_qty)
    OR (type IN ('percentage','fixed_amount') AND value IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts (is_active);

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id        UUID          NOT NULL REFERENCES discounts(id)        ON DELETE CASCADE,
  user_id            UUID          NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
  booking_request_id UUID          REFERENCES booking_requests(id)          ON DELETE SET NULL,
  amount_saved       NUMERIC(10,2) NOT NULL DEFAULT 0,
  redeemed_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_discount ON discount_redemptions (discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_user ON discount_redemptions (user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_discounts_updated_at') THEN
    CREATE TRIGGER trg_discounts_updated_at
      BEFORE UPDATE ON discounts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
