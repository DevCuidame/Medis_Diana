# Categorías de Servicios Médicos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaptar el formulario de "Catálogo de Servicios" (`/admin/servicios`) y todas las
pantallas que muestran `offerType` para que la Dra. Diana Medina pueda crear/editar
servicios usando las 5 categorías médicas reales de su consulta, con un nuevo campo
"Tipo de Atención" siempre visible, y corregir el `OfferType` de TypeScript para que
coincida con el ENUM real de Postgres (`appointment | open_consultation | workshop | event`).

**Architecture:** Cambios puramente de frontend (React + TypeScript + Zod + React Hook
Form) en `acaripole-landing`, más un ajuste de un tipo en `packages/shared-types`. No hay
cambios de backend ni de base de datos — el ENUM de Postgres ya tenía los valores
correctos; el frontend era el que estaba desalineado. El orden de tareas sigue la cadena
de dependencias: primero el tipo compartido, luego el schema Zod, luego el formulario,
luego el dashboard que construye el payload, y por último los 4 archivos de
"relabeling" que solo muestran `offerType` (sin lógica de negocio).

**Tech Stack:** React 19, TypeScript ~6.0, Zod 4, React Hook Form 7 + `@hookform/resolvers/zod`,
Framer Motion, Vite 8, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-06-14-categorias-servicios-medicos-design.md`

**Dev server:** `cd acaripole-landing; pnpm dev` → abre `http://localhost:5173`

**Build / typecheck (no hay test runner en este proyecto):** `cd acaripole-landing; pnpm build` (ejecuta `tsc -b && vite build`)

---

## File Map

| Archivo | Cambio principal |
|---|---|
| `packages/shared-types/src/models/services.types.ts` | Corrige `OfferType` al ENUM real de Postgres |
| `acaripole-landing/src/components/admin/servicioSchema.ts` | Nuevo `categoriaEnum` (5 categorías médicas), nuevo `tipoAtencionEnum`, `requiereInstructor` incondicional, `capacidad` 2–20 |
| `acaripole-landing/src/components/admin/FormularioServicio.tsx` | Presets `TIPOS_SERVICIO_POR_CATEGORIA`, campo "Tipo de Atención" siempre visible, "Médico responsable", copy médico |
| `acaripole-landing/src/components/admin/ServiciosDashboard.tsx` | `OFFER_TYPE_LABEL`/`OFFER_TYPE_COLOR`, `offerTypeMap`, parseo de `description`, filtro, copy |
| `acaripole-landing/src/components/admin/AdminClasses.tsx` | `OFFER_TYPE_LABEL`/`TYPE_COLORS` |
| `acaripole-landing/src/components/professional/ProfessionalClasses.tsx` | `TYPE_COLOR`/`TYPE_LABEL`, "Mis Clases" → "Mi Agenda" |
| `acaripole-landing/src/components/user/UserMisServicios.tsx` | `TYPE_COLOR`/`TYPE_LABEL` |
| `acaripole-landing/src/components/user/UserServicios.tsx` | `TYPE_COLOR`/`TYPE_LABEL`, filtro de pills |

**Fuera de alcance (no tocar):**
- `acaripole-landing/src/components/user/UserServicios.tsx:300` — `LABEL = { pole, complementary, general }` (otro subsistema, `service_category` de membresías).
- `SedesDashboard.tsx` — galería "Inspiración de Espacios" con imágenes `pole_studio_*`.
- `apps/frontend` (app Angular legacy, no forma parte del workspace pnpm).

---

## Task 1: Corregir `OfferType` en shared-types

**Files:**
- Modify: `packages/shared-types/src/models/services.types.ts:12`

- [ ] **Step 1: Corregir el alias de tipo `OfferType`**

Busca la línea 12:

```ts
export type OfferType = 'class' | 'open_pole' | 'workshop' | 'event';
```

Reemplázala con:

```ts
export type OfferType = 'appointment' | 'open_consultation' | 'workshop' | 'event';
```

Este alias se usa en `ServiceOfferPublic.offerType`, `CreateServiceOfferPayload.offerType`
y `ServiceOffersFilter.offerType` — los tres se actualizan automáticamente al cambiar el
alias, no requieren ediciones separadas.

- [ ] **Step 2: Verificar**

Ejecuta:

```bash
cd packages/shared-types
pnpm lint
```

Esperado: el lint pasa sin errores (es un cambio de tipo, sin lógica).

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/models/services.types.ts
git commit -m "fix: alinear OfferType con el ENUM real de Postgres (offer_type)"
```

---

## Task 2: `servicioSchema.ts` — Nuevas categorías y campo "Tipo de Atención"

**Files:**
- Modify: `acaripole-landing/src/components/admin/servicioSchema.ts`

- [ ] **Step 1: Reemplazar `categoriaEnum` con las 5 categorías médicas**

Busca (líneas 3-9):

```ts
export const categoriaEnum = z.enum([
  'Clase',
  'Práctica Libre',
  'Disciplinas Complementarias',
  'Eventos',
  'Otros'
]);
```

Reemplázala con:

```ts
export const categoriaEnum = z.enum([
  'Promoción y Prevención en Salud',
  'Enfermedades No Transmisibles',
  'Sobrepeso y Obesidad',
  'Salud de la Mujer',
  'Salud Mental',
]);
```

- [ ] **Step 2: Reemplazar `nivelEnum` con `tipoAtencionEnum`**

Busca la línea 12:

```ts
export const nivelEnum = z.enum(['Principiante', 'Intermedio', 'Avanzado', 'Todos los niveles']);
```

Reemplázala con:

```ts
export const tipoAtencionEnum = z.enum(['Primera vez', 'Control o seguimiento', 'Urgencia']);
```

- [ ] **Step 3: Reemplazar el campo `nivelDificultad` por `tipoAtencion` en `baseSchema`**

Busca la línea 42:

```ts
  nivelDificultad: z.preprocess((val) => (val === '' || val === null ? undefined : val), nivelEnum.optional()) as z.ZodType<'Principiante' | 'Intermedio' | 'Avanzado' | 'Todos los niveles' | undefined>,
```

Reemplázala con:

```ts
  tipoAtencion:    z.preprocess((val) => (val === '' || val === null ? undefined : val), tipoAtencionEnum.optional()) as z.ZodType<'Primera vez' | 'Control o seguimiento' | 'Urgencia' | undefined>,
```

- [ ] **Step 4: Hacer incondicionales `modalidad`/`instructorId`, agregar validación de `tipoAtencion`, y subir el rango de `capacidad` a 2–20**

Busca (líneas 46-66):

```ts
export const servicioSchema = baseSchema.superRefine((data, ctx) => {
  const requiereInstructor =
    data.categoria === 'Clase' ||
    data.categoria === 'Disciplinas Complementarias';

  if (requiereInstructor) {
    if (!data.modalidad) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La modalidad es obligatoria para clases y disciplinas', path: ['modalidad'] });
    }
    if (!data.instructorId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El instructor es obligatorio para este servicio', path: ['instructorId'] });
    }
    if (data.modalidad === 'Grupal') {
      if (!data.nivelDificultad) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El nivel de dificultad es obligatorio para clases grupales', path: ['nivelDificultad'] });
      }
      if (!data.capacidad || data.capacidad < 2 || data.capacidad > 5) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La capacidad grupal debe ser entre 2 y 5', path: ['capacidad'] });
      }
    }
  }

  if (data.horaInicio && data.horaFin) {
```

Reemplázala con:

```ts
export const servicioSchema = baseSchema.superRefine((data, ctx) => {
  if (!data.modalidad) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La modalidad es obligatoria', path: ['modalidad'] });
  }
  if (!data.instructorId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El médico responsable es obligatorio', path: ['instructorId'] });
  }
  if (!data.tipoAtencion) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El tipo de atención es obligatorio', path: ['tipoAtencion'] });
  }
  if (data.modalidad === 'Grupal') {
    if (!data.capacidad || data.capacidad < 2 || data.capacidad > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La capacidad grupal debe ser entre 2 y 20', path: ['capacidad'] });
    }
  }

  if (data.horaInicio && data.horaFin) {
```

El resto de `superRefine` (validación de horas y fechas) y `generateOccurrences` /
helpers de día quedan sin cambios.

- [ ] **Step 5: Commit**

```bash
git add acaripole-landing/src/components/admin/servicioSchema.ts
git commit -m "feat: nuevas categorias medicas y campo tipoAtencion en servicioSchema"
```

---

## Task 3: `FormularioServicio.tsx` — Presets, campo "Tipo de Atención" y copy médico

**Files:**
- Modify: `acaripole-landing/src/components/admin/FormularioServicio.tsx`

- [ ] **Step 1: Actualizar el import — `nivelEnum` → `tipoAtencionEnum`**

Busca (líneas 11-14):

```ts
import {
  servicioSchema, categoriaEnum, modalidadEnum, nivelEnum,
  DIA_LABELS, DIA_NOMBRES, DIAS_ORDEN, generateOccurrences,
} from './servicioSchema';
```

Reemplázala con:

```ts
import {
  servicioSchema, categoriaEnum, modalidadEnum, tipoAtencionEnum,
  DIA_LABELS, DIA_NOMBRES, DIAS_ORDEN, generateOccurrences,
} from './servicioSchema';
```

- [ ] **Step 2: Reemplazar `TIPOS_SERVICIO_POR_CATEGORIA` con los presets médicos**

Busca (líneas 28-34):

```ts
const TIPOS_SERVICIO_POR_CATEGORIA: Record<string, string[]> = {
  'Clase': [],
  'Práctica Libre': [],
  'Disciplinas Complementarias': [],
  'Eventos': [],
  'Otros': [],
};
```

Reemplázala con:

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

- [ ] **Step 3: Actualizar la categoría por defecto del formulario**

Busca (líneas 93-99):

```ts
    defaultValues: initialData || {
      categoria: 'Clase',
      precio: 0,
      diasSemana: [],
      fechaDesde: todayStr(),
      fechaHasta: fourWeeksStr(),
    },
```

Reemplázala con:

```ts
    defaultValues: initialData || {
      categoria: 'Promoción y Prevención en Salud',
      precio: 0,
      diasSemana: [],
      fechaDesde: todayStr(),
      fechaHasta: fourWeeksStr(),
    },
```

- [ ] **Step 4: Observar el nuevo campo `tipoAtencion`**

Busca la línea 104:

```ts
  const modalidad      = useWatch({ control, name: 'modalidad' });
```

Reemplázala con:

```ts
  const modalidad      = useWatch({ control, name: 'modalidad' });
  const tipoAtencion   = useWatch({ control, name: 'tipoAtencion' });
```

- [ ] **Step 5: Simplificar `requiereInstructor` (ahora siempre `true`)**

Busca la línea 113:

```ts
  const requiereInstructor = categoria === 'Clase' || categoria === 'Disciplinas Complementarias';
```

Reemplázala con:

```ts
  const requiereInstructor = true; // aplica a las 5 categorías médicas
```

(`categoria` ya no incluye `'Clase'`/`'Disciplinas Complementarias'`, así que la
comparación anterior sería un error de tipos tras el Task 2).

- [ ] **Step 6: Simplificar `handleFormSubmit`**

Busca (líneas 238-256):

```ts
  const handleFormSubmit = async (data: ServicioFormValues) => {
    setIsSubmitting(true);
    try {
      const cleaned: any = { ...data };
      const room = espacios.find(e => e.id === data.roomId);
      if (room) cleaned.roomCapacity = room.capacity;
      if (!requiereInstructor) {
        delete cleaned.modalidad;
        delete cleaned.instructorId;
        delete cleaned.nivelDificultad;
        delete cleaned.capacidad;
      } else if (cleaned.modalidad === 'Individual') {
        delete cleaned.nivelDificultad;
        delete cleaned.capacidad;
      }
      await onSuccess(cleaned);
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
  };
```

Reemplázala con:

```ts
  const handleFormSubmit = async (data: ServicioFormValues) => {
    setIsSubmitting(true);
    try {
      const cleaned: any = { ...data };
      const room = espacios.find(e => e.id === data.roomId);
      if (room) cleaned.roomCapacity = room.capacity;
      if (cleaned.modalidad === 'Individual') {
        delete cleaned.capacidad;
      }
      await onSuccess(cleaned);
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
  };
```

`modalidad`, `instructorId` y `tipoAtencion` ahora son siempre obligatorios (Task 2), así
que siempre se envían. `capacidad` solo se elimina cuando la modalidad es Individual.

- [ ] **Step 7: Actualizar el subtítulo del formulario**

Busca la línea 292:

```tsx
          <p style={{ color: C.textMedium, fontSize: 14, marginTop: 6 }}>Configura una nueva experiencia de Pole Dance y disciplinas de forma fluida.</p>
```

Reemplázala con:

```tsx
          <p style={{ color: C.textMedium, fontSize: 14, marginTop: 6 }}>Configura una nueva consulta o servicio para la agenda de la clínica.</p>
```

- [ ] **Step 8: Corregir el placeholder de "Agregar tipo" (ya no referencia categorías de pole)**

Busca la línea 392:

```tsx
                            placeholder={`Ej: ${categoria === 'Clase' ? 'Exotic de fuerza' : categoria === 'Eventos' ? 'Showcasing' : 'Nuevo tipo'}...`}
```

Reemplázala con:

```tsx
                            placeholder="Ej: Control de Hipertensión Arterial..."
```

(El ternario anterior comparaba `categoria` con `'Clase'`/`'Eventos'`, valores que ya no
existen en `categoriaEnum` tras el Task 2 — sería un error de tipos).

- [ ] **Step 9: Agregar el campo "Tipo de Atención" (siempre visible, junto a Modalidad)**

Busca (líneas 428-432):

```tsx
                      {errors.modalidad && <span style={{ color: C.red, fontSize: 11, marginTop: 6, display: 'block', fontWeight: 500 }}>{errors.modalidad.message}</span>}
                    </div>

                    <AnimatePresence mode="wait">
                      {modalidad === 'Grupal' && (
```

Reemplázala con:

```tsx
                      {errors.modalidad && <span style={{ color: C.red, fontSize: 11, marginTop: 6, display: 'block', fontWeight: 500 }}>{errors.modalidad.message}</span>}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 12 }}>
                        <Activity size={14} color={C.gold} /> Tipo de Atención
                      </label>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {tipoAtencionEnum.options.map(tipo => (
                          <label key={tipo} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderRadius: 12, border: `1.5px solid ${tipoAtencion === tipo ? C.gold : C.borderLight}`, background: tipoAtencion === tipo ? 'rgba(139,92,246,0.06)' : C.white, color: tipoAtencion === tipo ? C.gold : C.textBrown, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                            <input type="radio" value={tipo} {...register('tipoAtencion')} style={{ display: 'none' }} />
                            {tipo}
                          </label>
                        ))}
                      </div>
                      {errors.tipoAtencion && <span style={{ color: C.red, fontSize: 11, marginTop: 6, display: 'block', fontWeight: 500 }}>{errors.tipoAtencion.message}</span>}
                    </div>

                    <AnimatePresence mode="wait">
                      {modalidad === 'Grupal' && (
```

- [ ] **Step 10: Quitar "Nivel de Dificultad" y actualizar "Capacidad" (rango 2–20)**

Busca (líneas 433-444):

```tsx
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                          <InputField label="Nivel de Dificultad" icon={Activity} error={errors.nivelDificultad}>
                            <select {...register('nivelDificultad')} style={activeInputStyle(!!errors.nivelDificultad)}>
                              <option value="">Seleccionar nivel...</option>
                              {nivelEnum.options.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </InputField>
                          <InputField label="Capacidad (Alumnos)" icon={Users} error={errors.capacidad}>
                            <input type="number" {...register('capacidad', { setValueAs: (v) => v === '' ? undefined : Number(v) })} style={activeInputStyle(!!errors.capacidad)} placeholder="Límite 2 a 5 alumnos" />
                          </InputField>
                        </motion.div>
```

Reemplázala con:

```tsx
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ marginBottom: 24 }}>
                          <InputField label="Capacidad (Pacientes)" icon={Users} error={errors.capacidad}>
                            <input type="number" {...register('capacidad', { setValueAs: (v) => v === '' ? undefined : Number(v) })} style={activeInputStyle(!!errors.capacidad)} placeholder="Entre 2 y 20 pacientes" />
                          </InputField>
                        </motion.div>
```

- [ ] **Step 11: Renombrar "Instructor a cargo" a "Médico responsable"**

Busca la línea 447:

```tsx
                    <InputField label="Instructor a cargo" icon={UserCheck} error={errors.instructorId}>
```

Reemplázala con:

```tsx
                    <InputField label="Médico responsable" icon={UserCheck} error={errors.instructorId}>
```

- [ ] **Step 12: Verificar en el navegador**

```bash
cd acaripole-landing
pnpm dev
```

Abre `http://localhost:5173/admin/servicios` (sesión admin), haz clic en "Crear
servicio" y confirma:

1. El selector "Categoría Principal" muestra las 5 categorías médicas (Promoción y
   Prevención en Salud, Enfermedades No Transmisibles, Sobrepeso y Obesidad, Salud de
   la Mujer, Salud Mental), con "Promoción y Prevención en Salud" seleccionada por
   defecto.
2. Al cambiar de categoría, los chips de "Tipo de Servicio Específico" muestran los
   presets correctos (p.ej. "Enfermedades No Transmisibles" → "Control de Hipertensión
   Arterial (HTA)", "Control de Diabetes (DM)", etc.).
3. "Modalidad", "Tipo de Atención" y "Médico responsable" se muestran siempre, sin
   importar la categoría.
4. Al elegir Modalidad = "Grupal" aparece el campo "Capacidad (Pacientes)" con
   placeholder "Entre 2 y 20 pacientes"; al elegir "Individual" desaparece.
5. Si se intenta guardar sin Modalidad / Médico responsable / Tipo de Atención,
   aparece el banner de validación con los mensajes correspondientes.

- [ ] **Step 13: Commit**

```bash
git add acaripole-landing/src/components/admin/FormularioServicio.tsx
git commit -m "feat: presets medicos, campo Tipo de Atencion y copy clinico en FormularioServicio"
```

---

## Task 4: `ServiciosDashboard.tsx` — Mapeo a `offerType`, parseo de `description` y copy

**Files:**
- Modify: `acaripole-landing/src/components/admin/ServiciosDashboard.tsx`

- [ ] **Step 1: Reemplazar `OFFER_TYPE_LABEL` y `OFFER_TYPE_COLOR`**

Busca (líneas 20-28):

```ts
const OFFER_TYPE_LABEL: Record<string, string> = {
  class: 'Clase', open_pole: 'Práctica Libre', event: 'Evento', workshop: 'Taller',
};
const OFFER_TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  class:      { bg: 'rgba(139,92,246,0.1)',    color: '#8B5CF6' },
  open_pole:  { bg: 'rgba(124,58,237,0.1)',  color: '#7C3AED' },
  event:      { bg: 'rgba(59,130,246,0.1)',  color: '#2563EB' },
  workshop:   { bg: 'rgba(236,72,153,0.1)',  color: '#3B82F6' },
};
```

Reemplázala con:

```ts
const OFFER_TYPE_LABEL: Record<string, string> = {
  appointment: 'Cita Individual', open_consultation: 'Consulta Abierta', workshop: 'Sesión Grupal', event: 'Evento',
};
const OFFER_TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  appointment:       { bg: 'rgba(37,99,235,0.1)',  color: '#2563EB' },
  open_consultation: { bg: 'rgba(14,165,233,0.1)', color: '#0EA5E9' },
  workshop:          { bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6' },
  event:             { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
};
```

- [ ] **Step 2: Actualizar `mapGroupToFormValues` — cast de categoría y parseo de `modalidad`/`tipoAtencion`**

Busca (líneas 203-233):

```ts
  const mapGroupToFormValues = (g: ServiceGroup) => {
    const s = g.representative;
    let categoria = 'Clases de Pole'; let tipoServicio = '';
    if (s.title) { const p = s.title.split(' — '); categoria = p[0]; tipoServicio = p[1] || ''; }

    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    // Reconstruct diasSemana codes from day names in group
    const dayCodeByName: Record<string, string> = { Dom: 'dom', Lun: 'lun', Mar: 'mar', Mié: 'mie', Jue: 'jue', Vie: 'vie', Sáb: 'sab' };
    const diasSemana = g.days.map(n => dayCodeByName[n]).filter(Boolean);

    let modalidad: string | undefined;
    if (s.description?.includes('Modalidad:')) modalidad = s.description.replace('Modalidad:', '').trim();

    return {
      locationId: s.locationId || '', roomId: s.roomId || '',
      categoria: categoria as "Práctica Libre" | "Clases de Pole" | "Disciplinas Complementarias" | "Eventos" | "Otros",
      tipoServicio,
      diasSemana: diasSemana.length ? diasSemana : ['lun'],
      fechaDesde: toDateStr(g.firstDate),
      fechaHasta: toDateStr(g.lastDate),
      horaInicio: g.timeStart,
      horaFin: g.timeEnd,
      precio: g.price,
      modalidad: modalidad as "Grupal" | "Individual" | undefined,
      instructorId: s.professionalId || '',
      nivelDificultad: undefined,
      capacidad: s.capacity,
    };
  };
```

Reemplázala con:

```ts
  const mapGroupToFormValues = (g: ServiceGroup) => {
    const s = g.representative;
    let categoria = 'Promoción y Prevención en Salud'; let tipoServicio = '';
    if (s.title) { const p = s.title.split(' — '); categoria = p[0]; tipoServicio = p[1] || ''; }

    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    // Reconstruct diasSemana codes from day names in group
    const dayCodeByName: Record<string, string> = { Dom: 'dom', Lun: 'lun', Mar: 'mar', Mié: 'mie', Jue: 'jue', Vie: 'vie', Sáb: 'sab' };
    const diasSemana = g.days.map(n => dayCodeByName[n]).filter(Boolean);

    let modalidad: string | undefined;
    let tipoAtencion: string | undefined;
    if (s.description) {
      for (const part of s.description.split(' | ')) {
        const [key, value] = part.split(': ').map(p => p.trim());
        if (key === 'Modalidad') modalidad = value;
        if (key === 'Atención') tipoAtencion = value;
      }
    }

    return {
      locationId: s.locationId || '', roomId: s.roomId || '',
      categoria: categoria as
        | "Promoción y Prevención en Salud"
        | "Enfermedades No Transmisibles"
        | "Sobrepeso y Obesidad"
        | "Salud de la Mujer"
        | "Salud Mental",
      tipoServicio,
      diasSemana: diasSemana.length ? diasSemana : ['lun'],
      fechaDesde: toDateStr(g.firstDate),
      fechaHasta: toDateStr(g.lastDate),
      horaInicio: g.timeStart,
      horaFin: g.timeEnd,
      precio: g.price,
      modalidad: modalidad as "Grupal" | "Individual" | undefined,
      instructorId: s.professionalId || '',
      tipoAtencion: tipoAtencion as "Primera vez" | "Control o seguimiento" | "Urgencia" | undefined,
      capacidad: s.capacity,
    };
  };
```

- [ ] **Step 3: Corregir `offerTypeMap` y la construcción de `description` en `handleFormSuccess`**

Busca (líneas 236-258):

```ts
  const handleFormSuccess = async (data: any) => {
    const offerTypeMap: Record<string, string> = {
      'Clases de Pole': 'class', 'Disciplinas Complementarias': 'class',
      'Práctica Libre': 'open_pole', 'Eventos': 'event', 'Otros': 'workshop',
    };
    const headers = authH();

    const tempStart = new Date(`${data.fechaDesde}T${data.horaInicio}`);
    const tempEnd   = new Date(`${data.fechaDesde}T${data.horaFin}`);
    const durationMinutes = Math.max(Math.round((tempEnd.getTime() - tempStart.getTime()) / 60000), 30);

    const basePayload = {
      locationId:      data.locationId,
      roomId:          data.roomId || undefined,
      offerType:       offerTypeMap[data.categoria] ?? 'class',
      title:           `${data.categoria}${data.tipoServicio ? ` — ${data.tipoServicio}` : ''}`,
      description:     data.modalidad ? `Modalidad: ${data.modalidad}` : undefined,
      professionalId:  data.instructorId || undefined,
      capacity:        data.capacidad ?? (data.roomCapacity ?? 10),
      durationMinutes,
      price:           data.precio ?? 0,
      currency:        'COP',
    };
```

Reemplázala con:

```ts
  const handleFormSuccess = async (data: any) => {
    const offerTypeMap = (modalidad: 'Grupal' | 'Individual'): string =>
      modalidad === 'Grupal' ? 'workshop' : 'appointment';
    const headers = authH();

    const tempStart = new Date(`${data.fechaDesde}T${data.horaInicio}`);
    const tempEnd   = new Date(`${data.fechaDesde}T${data.horaFin}`);
    const durationMinutes = Math.max(Math.round((tempEnd.getTime() - tempStart.getTime()) / 60000), 30);

    const basePayload = {
      locationId:      data.locationId,
      roomId:          data.roomId || undefined,
      offerType:       offerTypeMap(data.modalidad),
      title:           `${data.categoria}${data.tipoServicio ? ` — ${data.tipoServicio}` : ''}`,
      description:     `Modalidad: ${data.modalidad} | Atención: ${data.tipoAtencion}`,
      professionalId:  data.instructorId || undefined,
      capacity:        data.capacidad ?? (data.roomCapacity ?? 10),
      durationMinutes,
      price:           data.precio ?? 0,
      currency:        'COP',
    };
```

El resto de `handleFormSuccess` (bucle de creación de ocurrencias, manejo de errores,
toasts) queda sin cambios.

- [ ] **Step 4: Actualizar las opciones del filtro "Tipo de servicio"**

Busca (líneas 405-411):

```tsx
                          {([
                            { v: 'all',      label: 'Todos' },
                            { v: 'class',     label: 'Clases' },
                            { v: 'open_pole', label: 'Práctica Libre' },
                            { v: 'event',     label: 'Eventos' },
                            { v: 'workshop',  label: 'Talleres' },
                          ] as const).map(opt => {
```

Reemplázala con:

```tsx
                          {([
                            { v: 'all',               label: 'Todos' },
                            { v: 'appointment',       label: 'Citas Individuales' },
                            { v: 'open_consultation', label: 'Consultas Abiertas' },
                            { v: 'workshop',          label: 'Sesiones Grupales' },
                            { v: 'event',             label: 'Eventos' },
                          ] as const).map(opt => {
```

- [ ] **Step 5: Actualizar el fallback de color de `OFFER_TYPE_COLOR`**

Busca la línea 489:

```ts
                    const tc = OFFER_TYPE_COLOR[g.offerType] ?? OFFER_TYPE_COLOR.class;
```

Reemplázala con:

```ts
                    const tc = OFFER_TYPE_COLOR[g.offerType] ?? OFFER_TYPE_COLOR.appointment;
```

(`OFFER_TYPE_COLOR.class` ya no existe tras el Step 1; sería un error de tipos).

- [ ] **Step 6: Actualizar el copy del estado vacío**

Busca la línea 478:

```tsx
                    <p style={{ color: C.textMedium, textAlign: 'center', maxWidth: 400, marginBottom: 24, lineHeight: 1.5 }}>Comienza a construir el catálogo de clases, prácticas libres o talleres de tu estudio.</p>
```

Reemplázala con:

```tsx
                    <p style={{ color: C.textMedium, textAlign: 'center', maxWidth: 400, marginBottom: 24, lineHeight: 1.5 }}>Comienza a construir el catálogo de consultas y servicios de la clínica.</p>
```

- [ ] **Step 7: Verificar en el navegador**

Con `pnpm dev` corriendo, en `http://localhost:5173/admin/servicios`:

1. Crea un servicio con Modalidad = "Individual" → guarda → confirma que el `POST
   /api/services/offers` responde `200` (antes fallaría por el ENUM con `offerType:
   'class'`).
2. Crea otro servicio con Modalidad = "Grupal" → confirma `200` también.
3. Abre cada tarjeta creada y confirma que la etiqueta de tipo muestra "Cita
   Individual" (Individual) o "Sesión Grupal" (Grupal) con los colores azul/morado
   correctos.
4. Edita el servicio creado y confirma que "Modalidad" y "Tipo de Atención" se
   recuperan correctamente en el formulario (deben coincidir con lo que se guardó).
5. Abre el filtro "Tipo de servicio" y confirma las 5 opciones: Todos, Citas
   Individuales, Consultas Abiertas, Sesiones Grupales, Eventos.
6. Si no hay servicios, confirma que el estado vacío muestra el nuevo copy clínico.

- [ ] **Step 8: Commit**

```bash
git add acaripole-landing/src/components/admin/ServiciosDashboard.tsx
git commit -m "fix: offerType correcto (appointment/workshop) y parseo de tipoAtencion en ServiciosDashboard"
```

---

## Task 5: `AdminClasses.tsx` — Relabeling de `OFFER_TYPE_LABEL`/`TYPE_COLORS`

**Files:**
- Modify: `acaripole-landing/src/components/admin/AdminClasses.tsx`

- [ ] **Step 1: Reemplazar `OFFER_TYPE_LABEL` y `TYPE_COLORS`**

Busca (líneas 29-35):

```ts
const OFFER_TYPE_LABEL: Record<string, string> = {
  class: 'Clase', open_pole: 'Práctica Libre', event: 'Evento', workshop: 'Taller',
}
const OFFER_COLORS = ['#8B5CF6', '#4A6FA5', '#7C6B8A', '#2563EB', '#059669', '#3B82F6']
const TYPE_COLORS: Record<string, string> = {
  class: '#8B5CF6', open_pole: '#7C3AED', event: '#2563EB', workshop: '#3B82F6',
}
```

Reemplázala con:

```ts
const OFFER_TYPE_LABEL: Record<string, string> = {
  appointment: 'Cita Individual', open_consultation: 'Consulta Abierta', workshop: 'Sesión Grupal', event: 'Evento',
}
const OFFER_COLORS = ['#8B5CF6', '#4A6FA5', '#7C6B8A', '#2563EB', '#059669', '#3B82F6']
const TYPE_COLORS: Record<string, string> = {
  appointment: '#2563EB', open_consultation: '#0EA5E9', workshop: '#8B5CF6', event: '#3B82F6',
}
```

`OFFER_COLORS` (paleta para avatares de instructores vía `instructorColor()`) no se toca
— es un concepto distinto sin relación con `offerType`.

- [ ] **Step 2: Verificar en el navegador**

Con `pnpm dev` corriendo, en `http://localhost:5173/admin/clases` (vista semanal y
mensual):

1. Las tarjetas de servicios creados en el Task 4 muestran el borde/color correcto
   según `TYPE_COLORS` (azul para "Cita Individual", morado para "Sesión Grupal").
2. La etiqueta de tipo en cada tarjeta muestra "Cita Individual" / "Sesión Grupal" en
   vez de "Clase"/"Práctica Libre"/etc.
3. La tarjeta de resumen/analítica (conteo por tipo) muestra las nuevas etiquetas.

- [ ] **Step 3: Commit**

```bash
git add acaripole-landing/src/components/admin/AdminClasses.tsx
git commit -m "fix: relabeling de tipos de oferta a appointment/open_consultation/workshop/event en AdminClasses"
```

---

## Task 6: `ProfessionalClasses.tsx` — Relabeling + título "Mi Agenda"

**Files:**
- Modify: `acaripole-landing/src/components/professional/ProfessionalClasses.tsx`

- [ ] **Step 1: Reemplazar `TYPE_COLOR` y `TYPE_LABEL`**

Busca (líneas 18-23):

```ts
const TYPE_COLOR: Record<string, string> = {
  class: '#8B5CF6', open_pole: '#7C3AED', event: '#2563EB', workshop: '#3B82F6',
}
const TYPE_LABEL: Record<string, string> = {
  class: 'Clase', open_pole: 'Práctica Libre', event: 'Evento', workshop: 'Taller',
}
```

Reemplázala con:

```ts
const TYPE_COLOR: Record<string, string> = {
  appointment: '#2563EB', open_consultation: '#0EA5E9', workshop: '#8B5CF6', event: '#3B82F6',
}
const TYPE_LABEL: Record<string, string> = {
  appointment: 'Cita Individual', open_consultation: 'Consulta Abierta', workshop: 'Sesión Grupal', event: 'Evento',
}
```

- [ ] **Step 2: Renombrar el título de la página**

Busca la línea 105:

```tsx
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Mis Clases</h1>
```

Reemplázala con:

```tsx
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Mi Agenda</h1>
```

- [ ] **Step 3: Verificar en el navegador**

Con `pnpm dev` corriendo, inicia sesión como médico y abre el portal profesional:

1. El título de la página dice "Mi Agenda" (no "Mis Clases").
2. En la vista semanal y en la vista de lista, los servicios creados en el Task 4
   muestran el color y la etiqueta correctos ("Cita Individual" / "Sesión Grupal").

- [ ] **Step 4: Commit**

```bash
git add acaripole-landing/src/components/professional/ProfessionalClasses.tsx
git commit -m "fix: relabeling de tipos de oferta y renombrar Mis Clases a Mi Agenda en ProfessionalClasses"
```

---

## Task 7: `UserMisServicios.tsx` — Relabeling de `TYPE_COLOR`/`TYPE_LABEL`

**Files:**
- Modify: `acaripole-landing/src/components/user/UserMisServicios.tsx`

- [ ] **Step 1: Reemplazar `TYPE_COLOR` y `TYPE_LABEL`**

Busca (líneas 15-16):

```ts
const TYPE_COLOR: Record<string, string> = { class: '#8B5CF6', open_pole: '#7C3AED', event: '#2563EB', workshop: '#3B82F6' }
const TYPE_LABEL: Record<string, string> = { class: 'Clase', open_pole: 'Práctica Libre', event: 'Evento', workshop: 'Taller' }
```

Reemplázala con:

```ts
const TYPE_COLOR: Record<string, string> = { appointment: '#2563EB', open_consultation: '#0EA5E9', workshop: '#8B5CF6', event: '#3B82F6' }
const TYPE_LABEL: Record<string, string> = { appointment: 'Cita Individual', open_consultation: 'Consulta Abierta', workshop: 'Sesión Grupal', event: 'Evento' }
```

- [ ] **Step 2: Verificar en el navegador**

Con `pnpm dev` corriendo, inicia sesión como paciente y abre `/user/mis-servicios`:

1. Si el paciente tiene reservas en los servicios creados en el Task 4, la etiqueta
   muestra "Cita Individual" / "Sesión Grupal" con el color correcto.

- [ ] **Step 3: Commit**

```bash
git add acaripole-landing/src/components/user/UserMisServicios.tsx
git commit -m "fix: relabeling de tipos de oferta en UserMisServicios"
```

---

## Task 8: `UserServicios.tsx` — Relabeling de `TYPE_COLOR`/`TYPE_LABEL` y filtro de pills

**Files:**
- Modify: `acaripole-landing/src/components/user/UserServicios.tsx`

- [ ] **Step 1: Reemplazar `TYPE_COLOR` y `TYPE_LABEL`**

Busca (líneas 15-16):

```ts
const TYPE_COLOR: Record<string, string> = { class: '#8B5CF6', open_pole: '#7C3AED', event: '#2563EB', workshop: '#3B82F6' }
const TYPE_LABEL: Record<string, string> = { class: 'Clase', open_pole: 'Práctica Libre', event: 'Evento', workshop: 'Taller' }
```

Reemplázala con:

```ts
const TYPE_COLOR: Record<string, string> = { appointment: '#2563EB', open_consultation: '#0EA5E9', workshop: '#8B5CF6', event: '#3B82F6' }
const TYPE_LABEL: Record<string, string> = { appointment: 'Cita Individual', open_consultation: 'Consulta Abierta', workshop: 'Sesión Grupal', event: 'Evento' }
```

- [ ] **Step 2: Actualizar el filtro de pills**

Busca la línea 348:

```tsx
            {[['all','Todos'],['class','Clases'],['open_pole','Práctica'],['event','Eventos'],['workshop','Talleres']].map(([v,l]) => (
```

Reemplázala con:

```tsx
            {[['all','Todos'],['appointment','Citas'],['open_consultation','Consultas'],['workshop','Sesiones'],['event','Eventos']].map(([v,l]) => (
```

**No tocar** la línea 300 (`const LABEL: Record<string, string> = { pole: 'Pole',
complementary: 'Fuerza/Flex', general: 'Clases' }`) — es un concepto distinto
(`service_category` de membresías), fuera de alcance de este plan.

- [ ] **Step 3: Verificar en el navegador**

Con `pnpm dev` corriendo, inicia sesión como paciente y abre `/user/servicios`:

1. Los pills de filtro muestran: Todos, Citas, Consultas, Sesiones, Eventos.
2. Las tarjetas de los servicios creados en el Task 4 muestran la etiqueta y el color
   correctos ("Cita Individual" / "Sesión Grupal").
3. Filtrar por "Citas" muestra solo los servicios con `offerType: 'appointment'`;
   filtrar por "Sesiones" muestra solo `offerType: 'workshop'`.

- [ ] **Step 4: Commit**

```bash
git add acaripole-landing/src/components/user/UserServicios.tsx
git commit -m "fix: relabeling de tipos de oferta y filtro de pills en UserServicios"
```

---

## Task 9: Verificación final end-to-end

**Files:** (ninguno — solo verificación)

- [ ] **Step 1: Typecheck completo del frontend**

```bash
cd acaripole-landing
pnpm build
```

Esperado: `tsc -b` y `vite build` terminan sin errores. Esto confirma que no quedan
referencias a `'Clase'`, `'Eventos'`, `'Disciplinas Complementarias'`, `nivelEnum`,
`nivelDificultad`, `'class'`, `'open_pole'` en los 8 archivos tocados.

- [ ] **Step 2: Recorrido manual de los 5 escenarios de categoría**

Con `pnpm dev` corriendo y sesión admin en `/admin/servicios`, crea un servicio para
cada una de las 5 categorías (alternando Modalidad Individual/Grupal), y confirma en
cada caso que el `POST /api/services/offers` responde `200`:

1. Promoción y Prevención en Salud — Individual — Tipo de Atención "Primera vez"
2. Enfermedades No Transmisibles — Grupal (capacidad 10) — "Control o seguimiento"
3. Sobrepeso y Obesidad — Individual — "Primera vez"
4. Salud de la Mujer — Grupal (capacidad 8) — "Urgencia"
5. Salud Mental — Individual — "Control o seguimiento"

- [ ] **Step 3: Confirmar consistencia de etiquetas en las 5 pantallas**

Recorre `/admin/servicios`, `/admin/clases`, el portal profesional ("Mi Agenda"),
`/user/mis-servicios` y `/user/servicios`, y confirma que todas muestran las mismas
etiquetas ("Cita Individual" / "Sesión Grupal") y colores (azul `#2563EB` / morado
`#8B5CF6`) para los servicios creados en el Step 2.
