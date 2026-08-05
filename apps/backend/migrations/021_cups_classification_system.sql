-- ============================================================
-- Migration 021: CUPS Classification System
-- ============================================================

CREATE TABLE IF NOT EXISTS cups_catalog (
  cups_code       VARCHAR(10)  PRIMARY KEY,
  procedure_name  VARCHAR(255) NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_classification_categories (
  service_group     VARCHAR(10)  NOT NULL,
  service_subgroup  VARCHAR(10)  NOT NULL,
  service_category  VARCHAR(10)  NOT NULL,
  category_name     VARCHAR(255) NOT NULL,
  PRIMARY KEY (service_group, service_subgroup, service_category)
);

CREATE TABLE IF NOT EXISTS service_classification_cups_map (
  id                   BIGSERIAL PRIMARY KEY,
  service_group        VARCHAR(10) NOT NULL,
  service_subgroup     VARCHAR(10) NOT NULL,
  service_category     VARCHAR(10) NOT NULL,
  service_subcategory  VARCHAR(10) NOT NULL,
  cups_code            VARCHAR(10) NOT NULL REFERENCES cups_catalog(cups_code),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (service_group, service_subgroup, service_category, service_subcategory, cups_code)
);

CREATE INDEX IF NOT EXISTS idx_cups_map_lookup
  ON service_classification_cups_map (service_group, service_subgroup, service_category, service_subcategory)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_cups_map_group_subgroup
  ON service_classification_cups_map (service_group, service_subgroup)
  WHERE is_active = TRUE;

-- Normalize existing service_catalog rows: '01 Consulta externa' -> '01'
UPDATE service_catalog
SET category_group = LEFT(category_group, 2)
WHERE category_group IS NOT NULL AND LENGTH(category_group) > 2;
