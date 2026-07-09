-- ============================================================
-- Migration 017: Extended identity/contact/SISPRO fields on users
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS id_type                     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS id_number                    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS middle_name                  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS second_last_name              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS personal_address              VARCHAR(255),
  ADD COLUMN IF NOT EXISTS medical_registration_number  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sispro_username              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sispro_password_hash         VARCHAR(255);

-- Unique document number (multiple NULLs allowed for legacy users)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id_number_unique
  ON users (id_number)
  WHERE id_number IS NOT NULL;
