-- ============================================================
-- Migration 014: Per-category session tracking
-- Adds service_category to benefits_catalog so each free_classes
-- benefit knows which type of class it covers (pole, complementary).
-- This enables correct per-category session quota enforcement.
-- ============================================================

ALTER TABLE benefits_catalog
  ADD COLUMN IF NOT EXISTS service_category VARCHAR(30)
  CHECK (service_category IN ('pole', 'complementary', 'general'));

-- Auto-populate existing free_classes benefits based on their names
UPDATE benefits_catalog
SET service_category = 'pole'
WHERE benefit_type = 'free_classes'
  AND service_category IS NULL
  AND (
    name ILIKE '%pole%'
    OR name ILIKE '%sesion%pole%'
    OR name ILIKE '%clase%pole%'
  );

UPDATE benefits_catalog
SET service_category = 'complementary'
WHERE benefit_type = 'free_classes'
  AND service_category IS NULL
  AND (
    name ILIKE '%fuerza%'
    OR name ILIKE '%flexibilidad%'
    OR name ILIKE '%complementar%'
    OR name ILIKE '%fuerza o flexibilidad%'
  );

-- Any remaining free_classes without a category default to 'general'
-- (counts against any available pool — backward compat)
UPDATE benefits_catalog
SET service_category = 'general'
WHERE benefit_type = 'free_classes'
  AND service_category IS NULL;
