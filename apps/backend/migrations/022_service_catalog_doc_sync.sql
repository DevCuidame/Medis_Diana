-- ============================================================
-- Migration 022: Doc sync tracking en el catálogo de servicios
-- ============================================================
-- Guarda el prof_service_id que CuidameDoc asignó a este servicio, para
-- poder actualizarlo (borrar+crear, CuidameDoc no tiene endpoint de
-- edición) o eliminarlo más adelante. NULL = no sincronizado todavía, o
-- actualmente no publicado en CuidameDoc.
ALTER TABLE service_catalog
  ADD COLUMN IF NOT EXISTS doc_prof_service_id INTEGER;
