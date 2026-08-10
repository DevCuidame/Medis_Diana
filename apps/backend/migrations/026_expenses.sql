-- ============================================================
-- Migration 026: Expenses (Gastos del consultorio)
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description  VARCHAR(255) NOT NULL,
  amount       NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  category     VARCHAR(100) NOT NULL,
  expense_date DATE NOT NULL,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
