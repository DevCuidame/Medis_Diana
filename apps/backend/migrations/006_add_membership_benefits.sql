-- Migration 006: Add benefits column to memberships
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]';

-- Add annual and pack types to existing check or just let it be a varchar
-- Update seed memberships with some default benefits
UPDATE memberships SET benefits = '["Acceso a consulta individual","Reserva con 24h de anticipación"]'::jsonb WHERE code = 'POR_CONSULTA';
UPDATE memberships SET benefits = '["Consultas ilimitadas por mes","Reserva prioritaria","Descuento en exámenes y procedimientos 10%","Acceso a chequeos preventivos"]'::jsonb WHERE code = 'MENSUAL';
UPDATE memberships SET benefits = '["Sesión 1 a 1 con un especialista","Horario flexible","Plan de tratamiento personalizado"]'::jsonb WHERE code = 'PRIVADA';
