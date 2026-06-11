-- Migration 010: Add benefit_type and benefit_value to benefits_catalog
ALTER TABLE benefits_catalog
  ADD COLUMN IF NOT EXISTS benefit_type VARCHAR(30) NOT NULL DEFAULT 'informational'
    CHECK (benefit_type IN ('informational', 'free_classes', 'discount_percent', 'unlimited_classes')),
  ADD COLUMN IF NOT EXISTS benefit_value NUMERIC;

-- Update existing rows to informational (they were all text-based)
UPDATE benefits_catalog SET benefit_type = 'informational' WHERE benefit_type = 'informational';
