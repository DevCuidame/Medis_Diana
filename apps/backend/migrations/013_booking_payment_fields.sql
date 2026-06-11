-- Migration 013: Add payment fields to booking_requests
-- So the system knows how much to charge and how the user wants to pay

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS payment_method  VARCHAR(20) DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS discount_pct    SMALLINT;
