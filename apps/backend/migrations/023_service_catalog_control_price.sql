-- ============================================================
-- Migration 023: Control price escalonado en el catálogo de servicios
-- ============================================================
-- NULL (default): el servicio no tiene niveles, se comporta igual que hoy.
-- Con valor: el 1er control (por posición dentro de una misma historia
-- clínica en CuidameDoc) es gratis, el 2do en adelante cobra este precio.

ALTER TABLE service_catalog ADD COLUMN IF NOT EXISTS control_price NUMERIC(10,2);
