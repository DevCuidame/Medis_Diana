-- ============================================================
-- Migration 015: Multiple operating-hour blocks per day
-- Allows a location to have several open blocks in the same day
-- (e.g. 08:00-11:00 and 15:00-20:00). A closed day is now simply
-- represented by the absence of rows for that (location_id, day),
-- instead of an is_closed=true placeholder row.
-- ============================================================

ALTER TABLE operating_hours
  DROP CONSTRAINT IF EXISTS operating_hours_location_id_day_key;

ALTER TABLE operating_hours
  DROP COLUMN IF EXISTS is_closed;

-- Remove any leftover closed-day placeholder rows (opens_at = closes_at)
DELETE FROM operating_hours WHERE opens_at = closes_at;
