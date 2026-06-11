-- Migration 012: Enrollment groups for recurring service enrollments
-- A single booking_request (the "lead") represents all sessions of a service.
-- On approval, sibling sessions are auto-created as approved records.

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS sibling_offer_ids JSONB,
  ADD COLUMN IF NOT EXISTS is_group_lead BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_br_is_group_lead
  ON booking_requests(is_group_lead);
