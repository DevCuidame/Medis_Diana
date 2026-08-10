# Provisión automática de doctores en CuidameDoc + vínculo cabeza-trabajador

**Fecha:** 2026-08-10
**Estado:** Implementado y mergeado a `main` en ambos repos (2026-08-10). Ver [arquitectura.md](../../../arquitectura.md#aprovisionamiento-automático-de-doctores-en-cuidamedoc--vínculo-cabeza-trabajador-2026-08-10) para el resumen operativo final (incluye ajustes hechos en la revisión de código que no estaban en este spec original, como el valor de `gender` y la validación de campos/duplicados) y [errores-conocidos.md](../../../errores-conocidos.md) para la limitación de reintento que quedó abierta.

## Contexto y causa raíz

Hoy, cuando un admin crea un profesional (doctor) en Medis vía
`CreateProfessionalModal` → `POST /api/professionals`, esa cuenta solo existe
en la base de datos propia de Medis (tabla `users`, `role='PROFESSIONAL'`).
No existe ninguna cuenta correspondiente en CuidameDoc.

Esto se volvió un problema concreto con el fix de hoy mismo a
`ArtistLogin.tsx`: ahora, cuando un profesional inicia sesión, la app intenta
un handoff SSO hacia CuidameDoc usando las mismas credenciales — pero si esa
cuenta nunca se creó del otro lado, el SSO falla y el profesional cae al
panel interno de respaldo (o ve "credenciales inválidas"), porque nadie
aprovisionó su acceso en CuidameDoc.

Además, el usuario quiere que los doctores que se dan de alta en un sitio
(Diana hoy; a futuro Ximena y otros que compren el mismo plan) queden
registrados en CuidameDoc como "trabajadores" de esa cabeza — dato puramente
organizacional por ahora, decidido explícitamente con el usuario: *"por
ahora solo es que tanto en doc como en diana se sepa que son trabajadores
profesionales de \[la cabeza]"*, sin cambios de comportamiento en HC, agenda
o permisos.

CuidameDoc no tiene ningún concepto de jerarquía entre profesionales hoy:
cada `professional_id` es independiente. El único precedente de "vínculo
entre sistemas" es `ProfessionalIntegration` (1 profesional ↔ 1 API externa,
usado para el catálogo de servicios) — es un mecanismo distinto, no aplica
aquí.

Medis ya tiene la infraestructura para hablar con CuidameDoc como un
profesional autenticado: `docAuth.ts` (login como la cabeza del sitio,
cachea/renueva token) y el patrón best-effort `{ ok, error }` de
`docServiceSync.service.ts` (ver spec
`2026-08-05-sync-servicios-cuidamedoc-design.md`). Este trabajo extiende
exactamente ese mismo patrón, no inventa uno nuevo.

## Objetivo

Cuando se crea un profesional con `role='PROFESSIONAL'` en Medis, se debe:

1. Crear automáticamente una cuenta funcional (activa, sin fricción de
   verificación) con el mismo email/password en CuidameDoc.
2. Dejar registrado en ambos lados que ese profesional es "trabajador" de la
   cabeza del sitio (la cuenta que Medis usa para autenticarse contra
   CuidameDoc — hoy Diana, `professional_id=12`).
3. No afectar en nada a profesionales que no pasan por este flujo
   (auto-registro público en CuidameDoc, o dados de alta manualmente ahí) —
   deben seguir funcionando exactamente igual que hoy.

## Decisiones (confirmadas con el usuario)

- **Visibilidad clínica:** cada doctor ve solo lo suyo (sus propios
  pacientes/HC). El vínculo cabeza→trabajador es puramente organizacional,
  no habilita ningún acceso cruzado a datos clínicos.
- **Uso del vínculo, por ahora:** solo persistir el dato en ambas bases. No
  se toca Finanzas/cotizaciones consolidadas ni límites de plan en este
  trabajo — quedan documentados como posibles usos futuros, fuera de
  alcance.
- **Multi-tenant desde el diseño:** la "cabeza" nunca se hardcodea a Diana.
  Es, en cada deployment de Medis, quien sea que autentique `docAuth.ts`
  (sus propias credenciales de entorno). El mismo mecanismo sirve tal cual
  para el sitio de Ximena o futuros clientes del plan, sin cambios de
  código.
- **Activación inmediata:** la cuenta creada en CuidameDoc nace activa
  (`status: active`, `verified: true`) y el `Professional` nace
  `status: ACTIVE` (no `pending_approval`) — se salta el correo de
  verificación y la aprobación manual, porque quien la da de alta (la
  cabeza, vía Medis) ya es de confianza.
- **Falla de aprovisionamiento en CuidameDoc:** nunca bloquea ni revierte la
  creación local en Medis (mismo principio que `ensureDocSync`). El admin ve
  un toast de advertencia si falla, y el profesional queda creado
  localmente sin `doc_professional_id`. El reintento es manual (repetir la
  acción más adelante), no automático — fuera de alcance para este trabajo.
- **Alcance de roles:** solo `role === 'PROFESSIONAL'` dispara este flujo.
  Los `ADMIN` creados en Medis no provisionan nada en CuidameDoc.
- **Campo género** (requerido `NOT NULL` en CuidameDoc, no recogido hoy en
  el formulario de Medis): se manda un valor neutro por defecto
  (`"No especifica"`) en vez de agregar el campo al modal. Editable después
  directamente en CuidameDoc si hace falta.

## Diseño

### 1. CuidameDoc — esquema: nueva columna

Migración (siguiente número libre en `cuidame_doc_backend/src/scripts/`):

```sql
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS head_professional_id INTEGER
    REFERENCES professionals(professional_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_professionals_head
  ON professionals (head_professional_id)
  WHERE head_professional_id IS NOT NULL;
```

`NULL` = profesional independiente (comportamiento actual, sin cambios).
Un valor = `professional_id` de la cabeza que lo dio de alta.

Agregar el campo a la entidad `Professional` (`professional.model.ts`) como
`head_professional_id?: number`, sin relación `@ManyToOne` eager — evita
cargar la cabeza en queries existentes que ya seleccionan campos explícitos
(`getAllProfessionals`, etc.).

### 2. CuidameDoc — nuevo endpoint: `POST /professionals/team-members`

Nuevo método en `professional.controller.ts` / `professional.service.ts`
(ubicación exacta — método nuevo vs. archivo dedicado — a decidir en el plan
según convenciones del módulo). Protegido por `authMiddleware`, igual que el
resto de `professional.routes.ts`.

Request body (todo lo que Medis ya recoge en `CreateProfessionalModal`):

```
{ email, password, first_name, last_name,
  identification_type, identification_number,
  phone, address,
  medical_license_number?, specialization? }
```

Comportamiento:

1. Resuelve la "cabeza": busca el `Professional` del `req.user.id`
   autenticado. Si quien llama no tiene fila en `professionals`, `403` —
   "Solo un profesional puede dar de alta trabajadores."
2. Verifica email único (mismo chequeo que `auth.service.ts::register`).
3. Crea `User`: `password_hash` vía `PasswordService` (igual que register),
   `status: ACTIVE`, `verified: true`, `gender: 'No especifica'` si no se
   manda.
4. Asigna `UserRole` → rol `professional` (igual que register).
5. Crea `Professional`: `license_number: medical_license_number` (fallback a
   definir en el plan si viene vacío), `status: ACTIVE`,
   `head_professional_id: <cabeza.professional_id>`.
6. Responde `{ success: true, data: { professional_id, user_id } }`.

Nunca envía correo de verificación (a diferencia de `/auth/register`).

### 3. Medis — esquema: nueva columna

Migración `apps/backend/migrations/024_professional_doc_link.sql`:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS doc_professional_id INTEGER;
```

`NULL` = no aprovisionado en CuidameDoc todavía (o el intento falló).

### 4. Medis — motor de aprovisionamiento

`apps/backend/src/services/docProfessionalProvision.service.ts`, mismo
patrón que `docServiceSync.service.ts`:

```ts
async function provisionDocProfessional(params: {
  email: string; password: string; firstName: string; lastName: string;
  idType: string; idNumber: string; phone: string; address: string;
  medicalRegistrationNumber?: string; specialties?: string[];
}): Promise<{ ok: boolean; docProfessionalId?: number; error?: string }>
```

Nunca lanza; usa `getDocToken`/`refreshDocToken` de `docAuth.ts` (con
reintento en 401, igual que `withDocAuth`) para llamar
`POST {DOC_API_URL}/professionals/team-members`.

### 5. Medis — punto de integración: `professional.service.ts::create`

Después de que `ProfessionalRepository.create(...)` termina con éxito, y
solo si el rol resultante es `PROFESSIONAL`: llama
`provisionDocProfessional` con los datos ya validados del DTO. Si `ok`,
guarda `doc_professional_id` en la fila recién creada. El resultado se
agrega a la respuesta del controller como `docSync` (mismo nombre de campo
que ya usa el frontend en otros flujos), para que el modal pueda mostrar el
toast de advertencia si falla.

### 6. Medis — frontend: `CreateProfessionalModal.tsx`

Si la respuesta trae `docSync: { ok: false, error }`, mostrar un toast
adicional: *"Profesional creado, pero no se pudo habilitar su acceso a
CuidameDoc: `<error>`."* No cambia el flujo de éxito local — el profesional
ya quedó creado en Medis.

## Fuera de alcance

- Reintento automático de aprovisionamiento fallido.
- Cualquier uso funcional de `head_professional_id` más allá de guardarlo
  (sin consolidación de Finanzas, sin límites de plan, sin visibilidad
  cruzada de HC/pacientes).
- Cambios al formulario `CreateProfessionalModal` para recoger género
  explícitamente (se usa un valor por defecto).
- Editar/reasignar el vínculo después de creado.
- Sincronizar hacia CuidameDoc ediciones posteriores del profesional hechas
  en Medis (ej. cambiar teléfono) — este trabajo cubre solo la creación.
