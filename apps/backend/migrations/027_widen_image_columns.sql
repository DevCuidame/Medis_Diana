-- ============================================================
-- Migration 027: Widen image/avatar columns to TEXT
-- ============================================================
-- avatar_url (users) e image_url (service_catalog) se guardan como
-- data URLs base64 desde el frontend (ProfessionalProfileModal.tsx,
-- FormularioServicio.tsx), no como URLs cortas. VARCHAR(500) rechazaba
-- cualquier imagen real con "value too long for type character
-- varying(500)". TEXT no tiene límite práctico y el cambio es
-- metadata-only en Postgres (no reescribe la tabla).

-- v_service_offers (005_service_management.sql) expone u.avatar_url y bloquea
-- el ALTER mientras exista — se recrea idéntica después del cambio de tipo.
DROP VIEW IF EXISTS v_service_offers;

ALTER TABLE users           ALTER COLUMN avatar_url TYPE TEXT;
ALTER TABLE service_catalog ALTER COLUMN image_url   TYPE TEXT;

CREATE VIEW v_service_offers AS
 SELECT so.id,
    so.title,
    so.description,
    so.offer_type,
    so.status,
    so.scheduled_at,
    so.duration_minutes,
    so.capacity,
    so.enrolled_count,
    so.price,
    so.currency,
    l.id AS location_id,
    l.name AS location_name,
    r.id AS room_id,
    r.name AS room_name,
    r.capacity AS room_capacity,
    u.id AS professional_id,
    u.first_name AS professional_first,
    u.last_name AS professional_last,
    u.avatar_url AS professional_avatar,
    d.id AS specialty_id,
    d.name AS specialty_name,
    d.level AS specialty_level
   FROM service_offers so
     JOIN locations l ON l.id = so.location_id
     LEFT JOIN rooms r ON r.id = so.room_id
     LEFT JOIN users u ON u.id = so.professional_id
     LEFT JOIN specialties d ON d.id = so.specialty_id;
