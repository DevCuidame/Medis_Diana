-- Migration 011: Professional type (dependiente / independiente) and schedules

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS professional_type VARCHAR(20) DEFAULT 'dependiente'
    CHECK (professional_type IN ('dependiente', 'independiente'));

CREATE TABLE IF NOT EXISTS professional_schedules (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- JS: 0=Sun,1=Mon,...6=Sat
  start_time   TIME        NOT NULL,
  end_time     TIME        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_schedule_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_prof_schedules_user ON professional_schedules(user_id);
