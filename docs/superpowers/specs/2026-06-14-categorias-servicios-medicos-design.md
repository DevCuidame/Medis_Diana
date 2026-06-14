# Diseño: Categorías de Servicios Médicos (Dra. Diana) + Corrección de `offerType`

**Fecha:** 2026-06-14
**Sub-proyecto:** Catálogo de Servicios — Panel Admin (`/admin/servicios`)
**Estado:** Aprobado — pendiente plan de implementación

---

## Contexto

El formulario de "Catálogo de Servicios" (creación/edición de servicios) aún refleja
categorías de AcariPole (Clase, Práctica Libre, Disciplinas Complementarias, Eventos,
Otros) con copy de "Pole Dance". La Dra. Diana Medina maneja 5 líneas de servicio
reales en su consulta de medicina general:

1. Promoción y Prevención en Salud
2. Atención de Enfermedades No Transmisibles (HTA, DM, RCV, Síndrome Metabólico, etc.)
3. Sobrepeso y Obesidad
4. Salud de la Mujer
5. Salud Mental

Este spec adapta el formulario de creación de servicios a estas 5 categorías,
incluyendo todos los campos necesarios para que la doctora pueda crear servicios de
este tipo.

### Hallazgo crítico (bug preexistente)

Durante el análisis se detectó que el `offerType` enviado hoy por el formulario
(`'class' | 'open_pole' | 'event' | 'workshop'`, definido en
`packages/shared-types/src/models/services.types.ts`) **no coincide** con el ENUM real
de Postgres `offer_type` (`apps/backend/migrations/005_service_management.sql`):

```sql
CREATE TYPE offer_type AS ENUM ('appointment','open_consultation','workshop','event');
```

Si se enviara `offerType: 'class'` u `'open_pole'`, el `INSERT` en `service_offers`
fallaría por violar el ENUM. Este spec corrige el tipo TS y el mapeo para que use
únicamente los valores válidos de la base de datos.

---

## Alcance — Archivos afectados

| Archivo | Cambio principal |
|---|---|
| `acaripole-landing/src/components/admin/servicioSchema.ts` | Nuevo `categoriaEnum` (5 categorías médicas), nuevo `tipoAtencionEnum`, `requiereInstructor` siempre `true`, rango de `capacidad` 2–20 |
| `acaripole-landing/src/components/admin/FormularioServicio.tsx` | Presets de `TIPOS_SERVICIO_POR_CATEGORIA`, campo "Tipo de Atención" (siempre visible), copy médico, lógica de instructor/modalidad obligatoria |
| `acaripole-landing/src/components/admin/ServiciosDashboard.tsx` | `OFFER_TYPE_LABEL`/`OFFER_TYPE_COLOR` con valores reales del ENUM, `offerTypeMap` corregido, filtro de tipo, `mapGroupToFormValues` (parseo de `tipoAtencion` desde `description`), copy |
| `acaripole-landing/src/components/admin/AdminClasses.tsx` | `TYPE_LABEL` actualizado |
| `acaripole-landing/src/components/professional/ProfessionalClasses.tsx` | `TYPE_LABEL` actualizado, título "Mis Clases" → "Mi Agenda" |
| `acaripole-landing/src/components/user/UserMisServicios.tsx` | `TYPE_LABEL` actualizado |
| `acaripole-landing/src/components/user/UserServicios.tsx` | `TYPE_LABEL` y filtros de tipo actualizados |
| `packages/shared-types/src/models/services.types.ts` | `OfferType` corregido a `'appointment' \| 'open_consultation' \| 'workshop' \| 'event'` |

**Fuera de alcance** (artefactos pole-dance detectados pero no relacionados con
`categoria`/`offerType`, quedan para una tarea separada):

- `UserServicios.tsx:300` — `LABEL = { pole, complementary, general }`, ligado a
  `service_category` de la migración `014_service_category.sql` (cupos de beneficios
  de membresía).
- Galería "Inspiración de Espacios" en `SedesDashboard.tsx`
  (`/pole_studio_1.png`, etc.).

---

## A. `servicioSchema.ts` — Categorías y campos

### `categoriaEnum` (reemplazo total)

```ts
export const categoriaEnum = z.enum([
  'Promoción y Prevención en Salud',
  'Enfermedades No Transmisibles',
  'Sobrepeso y Obesidad',
  'Salud de la Mujer',
  'Salud Mental',
]);
```

### Nuevo `tipoAtencionEnum`

Reemplaza `nivelEnum`/`nivelDificultad`. Se muestra **siempre** (no condicionado a
modalidad Grupal), y es obligatorio para las 5 categorías.

```ts
export const tipoAtencionEnum = z.enum([
  'Primera vez',
  'Control o seguimiento',
  'Urgencia',
]);
```

Campo en el schema: `tipoAtencion: tipoAtencionEnum` (reemplaza
`nivelDificultad?: nivelEnum`).

### `requiereInstructor` — ahora incondicional

```ts
const requiereInstructor = true; // aplica a las 5 categorías
```

- `modalidad` (Grupal/Individual) e `instructorId` (médico responsable) pasan a ser
  **obligatorios** para todas las categorías (antes solo para "Clase" y "Disciplinas
  Complementarias").
- `tipoAtencion` es obligatorio siempre.
- `capacidad` sigue siendo obligatoria solo si `modalidad === 'Grupal'`, pero el rango
  válido cambia de **2–5** a **2–20**.

### `superRefine` actualizado

- Elimina la rama condicional `if (requiereInstructor)` para modalidad/instructor (ya
  no es condicional), pero conserva la validación condicional de `capacidad` cuando
  `modalidad === 'Grupal'` (ahora con `min(2).max(20)`).
- Añade validación de `tipoAtencion` requerido para todas las categorías.

### `generateOccurrences` y helpers de día

Sin cambios.

---

## B. `FormularioServicio.tsx` — Presets y campos

### `TIPOS_SERVICIO_POR_CATEGORIA` (precargado)

```ts
const TIPOS_SERVICIO_POR_CATEGORIA: Record<string, string[]> = {
  'Promoción y Prevención en Salud': [
    'Vacunación',
    'Charlas educativas',
    'Tamizaje / Detección temprana',
    'Control de crecimiento y desarrollo',
  ],
  'Enfermedades No Transmisibles': [
    'Control de Hipertensión Arterial (HTA)',
    'Control de Diabetes (DM)',
    'Riesgo Cardiovascular (RCV)',
    'Control de Dislipidemia',
  ],
  'Sobrepeso y Obesidad': [
    'Valoración nutricional',
    'Plan de manejo de peso',
    'Seguimiento de obesidad',
  ],
  'Salud de la Mujer': [
    'Control prenatal',
    'Citología / Tamizaje ginecológico',
    'Planificación familiar',
    'Climaterio y menopausia',
  ],
  'Salud Mental': [
    'Valoración inicial de salud mental',
    'Manejo de ansiedad',
    'Manejo de depresión',
    'Acompañamiento psicológico',
  ],
};
```

La doctora conserva la posibilidad de agregar/eliminar tipos personalizados por
categoría (localStorage `MEDIS_custom_tipos`, sin cambios en su mecánica).

### Campo "Tipo de Atención" (nuevo, siempre visible)

- Se ubica junto a "Modalidad" en el Paso 2, como chips/radio:
  `Primera vez | Control o seguimiento | Urgencia`.
- Etiqueta deliberadamente distinta de "Tipo de Servicio Específico" para evitar
  confusión en la UI.

### Bloque "requiereInstructor" → siempre renderizado

- "Modalidad" (Grupal/Individual) y "Médico responsable" (antes "Instructor a cargo")
  se muestran siempre, sin envoltorio condicional.
- "Capacidad" sigue condicionado a `modalidad === 'Grupal'`, con límites 2–20
  (placeholder/helper text actualizado, ej. "Entre 2 y 20 pacientes").

### `handleFormSubmit`

- Ya no necesita el `if (!requiereInstructor) { strip... }` para
  modalidad/instructorId, porque siempre son requeridos.
- `tipoAtencion` se incluye siempre en el payload.

### Copy / textos

- Subtítulo del formulario: "Configura una nueva experiencia de Pole Dance y
  disciplinas de forma fluida." → **"Configura una nueva consulta o servicio para la
  agenda de la clínica."**
- Título: "Catálogo de Servicios" se mantiene (ya es genérico).

---

## C. `ServiciosDashboard.tsx` — Mapeo a `offerType` + relabeling

### Corrección de `OfferType` (shared-types)

`packages/shared-types/src/models/services.types.ts`:

```ts
export type OfferType = 'appointment' | 'open_consultation' | 'workshop' | 'event';
```

(Se actualiza en las 4 ubicaciones donde se usa: `ServiceOfferPublic.offerType`,
`CreateServiceOfferPayload.offerType`, `ServiceOffersFilter.offerType`, y el
`offerType?: string` de la línea 155).

### `offerTypeMap` corregido (categoria + modalidad → offerType)

```ts
const offerTypeMap = (modalidad: 'Grupal' | 'Individual'): OfferType =>
  modalidad === 'Grupal' ? 'workshop' : 'appointment';
```

- **Individual → `appointment`** (cita médica individual).
- **Grupal → `workshop`** (sesión/taller grupal — aplica sobre todo a "Promoción y
  Prevención en Salud", pero disponible para cualquier categoría si la doctora la
  programa en grupo).
- `open_consultation` y `event` quedan como valores válidos del ENUM (datos existentes
  o uso futuro), pero este formulario no los genera.

### `OFFER_TYPE_LABEL` y `OFFER_TYPE_COLOR`

```ts
const OFFER_TYPE_LABEL: Record<string, string> = {
  appointment: 'Cita Individual',
  open_consultation: 'Consulta Abierta',
  workshop: 'Sesión Grupal',
  event: 'Evento',
};

const OFFER_TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  appointment:       { bg: 'rgba(37,99,235,0.1)',  color: '#2563EB' }, // azul
  open_consultation: { bg: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }, // celeste
  workshop:          { bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }, // morado
  event:             { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' }, // azul claro
};
```

### Filtro "Tipo de servicio" (dropdown)

```ts
{ v: 'all',               label: 'Todos' },
{ v: 'appointment',       label: 'Citas Individuales' },
{ v: 'open_consultation', label: 'Consultas Abiertas' },
{ v: 'workshop',          label: 'Sesiones Grupales' },
{ v: 'event',             label: 'Eventos' },
```

### `description` — persistir `tipoAtencion` para edición

`handleFormSuccess` construye:

```ts
description: `Modalidad: ${data.modalidad} | Atención: ${data.tipoAtencion}`
```

`mapGroupToFormValues` parsea ambos valores desde `description` (split por `' | '` y
luego por `': '`) para reconstruir `modalidad` y `tipoAtencion` al editar.

### `mapGroupToFormValues` — cast de `categoria`

El cast de tipo en la línea 220 se actualiza a las 5 nuevas categorías:

```ts
categoria: categoria as
  | 'Promoción y Prevención en Salud'
  | 'Enfermedades No Transmisibles'
  | 'Sobrepeso y Obesidad'
  | 'Salud de la Mujer'
  | 'Salud Mental',
```

### Copy

- Estado vacío: "Comienza a construir el catálogo de clases, prácticas libres o
  talleres de tu estudio." → **"Comienza a construir el catálogo de consultas y
  servicios de la clínica."**

---

## D. Relabeling en archivos restantes

Mismo `OFFER_TYPE_LABEL`/`TYPE_LABEL` (sección C) aplicado en:

- **`AdminClasses.tsx`** (línea 30): `TYPE_LABEL` actualizado.
- **`ProfessionalClasses.tsx`** (línea 22): `TYPE_LABEL` actualizado. Título de página
  "Mis Clases" (línea 105) → **"Mi Agenda"**.
- **`UserMisServicios.tsx`** (línea 16): `TYPE_LABEL` actualizado.
- **`UserServicios.tsx`** (línea 16): `TYPE_LABEL` actualizado. Filtro de pills (línea
  348):

  ```ts
  [['all','Todos'], ['appointment','Citas'], ['open_consultation','Consultas'],
   ['workshop','Sesiones'], ['event','Eventos']]
  ```

  (El `LABEL = { pole, complementary, general }` de la línea 300 **no se toca** — es
  un concepto distinto, fuera de alcance, ver sección de alcance).

---

## Resumen de tipos finales

| Campo | Valores |
|---|---|
| `categoria` | Promoción y Prevención en Salud · Enfermedades No Transmisibles · Sobrepeso y Obesidad · Salud de la Mujer · Salud Mental |
| `tipoServicio` | Texto libre + chips precargados por categoría (ver sección B) |
| `modalidad` | Grupal · Individual (obligatorio, todas las categorías) |
| `instructorId` (médico responsable) | obligatorio, todas las categorías |
| `tipoAtencion` | Primera vez · Control o seguimiento · Urgencia (obligatorio, siempre visible) |
| `capacidad` | 2–20 (solo si modalidad = Grupal) |
| `offerType` (DB) | `appointment` (Individual) · `workshop` (Grupal) — `open_consultation`/`event` reservados |

---

## Testing

- Verificación manual: crear un servicio de cada una de las 5 categorías (mezcla de
  Individual/Grupal) desde `/admin/servicios` y confirmar que el `POST
  /api/services/offers` responde `200` (antes fallaría por el ENUM).
- Editar un servicio existente y confirmar que `modalidad` y `tipoAtencion` se
  recuperan correctamente desde `description`.
- Confirmar que las etiquetas (`OFFER_TYPE_LABEL`) se ven correctamente en
  `ServiciosDashboard`, `AdminClasses`, `ProfessionalClasses`, `UserMisServicios`,
  `UserServicios`.
- `pnpm -r typecheck` (o equivalente) para confirmar que el cambio de `OfferType` en
  `shared-types` no rompe otros consumidores.
