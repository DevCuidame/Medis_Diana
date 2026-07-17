# Convenciones — Medis Diana

> Volver al índice: [CLAUDE.md](CLAUDE.md)

## Reglas críticas (SIEMPRE aplicar)

- **No mencionar pole dance, baile, estudio, instructoras ni nada del contexto original** en ningún texto visible al usuario.
- **Paleta:** blanco (`#FFFFFF`, `#F5F7FA`) + azules (`#1D4ED8`, `#2563EB`, `#0EA5E9`). Cero dorados/rosas del original.
- **Lenguaje:** formal, orientado a salud. Pacientes, médicos, consultas, citas, especialidades.

## Reglas globales (aplican a TODA la migración de pantallas)

- **Temática**: médica (clínica general). Todo el contenido, textos de ejemplo, datos
  semilla (seed) e imágenes deben reflejar un entorno de salud — consultas, médicos,
  pacientes, especialidades, exámenes, tratamientos — sin rastros de pole dance, danza
  o estudios de baile (nombres de disciplinas, salones, instructoras, etc.).
- **Colores**: blancos, azules, limpios. La paleta visual debe transmitir confianza,
  higiene y profesionalismo médico. Evitar la paleta original de dorados/rosas
  (`#775A00`, `#B08D32`, `#BE185D`, `#DB2777`, etc.) y reemplazarla por tonos blancos
  (`#FFFFFF`, `#F5F7FA`) y azules (`#1D4ED8`, `#2563EB`, `#0EA5E9`, etc.).
- **Textos**: formales y orientados a salud/pacientes. Lenguaje claro, respetuoso y
  profesional, dirigido a pacientes y personal médico (evitar tono "fitness/estudio").

## Paleta de referencia en código

Paleta usada por `DianaBookingCalendar.tsx` (patrón a seguir en componentes nuevos):

```ts
const C = {
  primary: '#1D4ED8',
  primaryLight: '#2563EB',
  primaryMuted: '#EFF6FF',
  accent: '#0EA5E9',
  // ...texto, bordes, success en el archivo
}
```

Para la equivalencia de términos entre la plataforma original y la clínica,
ver [glosario.md](glosario.md).
