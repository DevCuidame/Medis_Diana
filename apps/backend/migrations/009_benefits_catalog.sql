CREATE TABLE IF NOT EXISTS benefits_catalog (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO benefits_catalog (name, sort_order) VALUES
  ('Acceso a todas las consultas del catálogo',        1),
  ('Consultas ilimitadas durante la vigencia',          2),
  ('Descuento en exámenes y procedimientos especiales', 3),
  ('Acceso a chequeos preventivos',                     4),
  ('Consulta de valoración incluida',                   5),
  ('Material educativo digital de salud',               6),
  ('Seguimiento médico personalizado',                  7),
  ('Acceso a contenido educativo de salud online',      8)
ON CONFLICT (name) DO NOTHING;
