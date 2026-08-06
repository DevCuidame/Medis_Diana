# Arquitectura — Medis Diana / dianamedic.cuidame.tech

> Volver al índice: [CLAUDE.md](CLAUDE.md)

## Visión general del sistema

Este proyecto es la **landing + portal** de la **Dra. Diana Cristina Medina Camargo**,
desplegado en producción en `https://dianamedic.cuidame.tech`.

El código vive en `diana/medis/medisdiana-landing/` (monorepo en `diana/medis/`).
Parte de una copia de la plataforma **medisdiana** (estudio de pole dance)
adaptada para uso médico. El backend propio del proyecto corre en el monorepo
(`diana/medis/apps/backend/`), pero el **agendamiento de citas clínicas** se
delega completamente al backend de CuidameDoc (`https://doc-api.cuidame.tech/api`).

**Diana en CuidameDoc:** `professional_id = 12`.

## Stack (medisdiana-landing)

- Vite + React + TypeScript
- Tailwind CSS
- Framer Motion (animaciones de pasos del booking)
- Deploy: VM `instance-esmart1` (us-east1-b), script `deploy-Dianamedic.ps1`

## Estructura de pantallas / rutas

### Landing pública (`/`)
- medisdiana-landing/src/components/Hero.tsx
- medisdiana-landing/src/components/About.tsx
- medisdiana-landing/src/components/Classes.tsx
- medisdiana-landing/src/components/Instructors.tsx
- medisdiana-landing/src/components/Testimonials.tsx
- medisdiana-landing/src/components/FinalCTA.tsx
- medisdiana-landing/src/components/Navbar.tsx
- medisdiana-landing/src/components/Footer.tsx

### Autenticación (`/login`)
- medisdiana-landing/src/components/ArtistLogin.tsx

### Panel Admin (`/admin/*`)
- medisdiana-landing/src/components/admin/MainDashboard.tsx
- medisdiana-landing/src/components/admin/UsuariosDashboard.tsx
- medisdiana-landing/src/components/admin/AdminClasses.tsx
- medisdiana-landing/src/components/admin/CreateService.tsx
- medisdiana-landing/src/components/admin/SedesDashboard.tsx
- medisdiana-landing/src/components/admin/EspaciosDashboard.tsx
- medisdiana-landing/src/components/admin/FinanzasDashboard.tsx
- medisdiana-landing/src/components/admin/MembresiasDashboard.tsx
- medisdiana-landing/src/components/admin/BeneficiosDashboard.tsx
- medisdiana-landing/src/components/admin/InscripcionesDashboard.tsx

### Portal Paciente (`/user/*`)
- medisdiana-landing/src/components/user/UserLayout.tsx
- medisdiana-landing/src/components/user/UserCalendario.tsx
- medisdiana-landing/src/components/user/UserServicios.tsx
- medisdiana-landing/src/components/user/UserMisServicios.tsx
- medisdiana-landing/src/components/user/UserMembresias.tsx
- medisdiana-landing/src/components/user/UserProfesionales.tsx

### Portal Profesional/Médico (`/professional/*`)
- medisdiana-landing/src/components/professional/ProfessionalDashboard.tsx
- medisdiana-landing/src/components/professional/ProfessionalClasses.tsx
- medisdiana-landing/src/components/professional/ProfessionalProfile.tsx

### Componentes legacy / no enrutados (revisar si eliminar)
- medisdiana-landing/src/components/user/UserClasses.tsx
- medisdiana-landing/src/components/user/UserDashboard.tsx
- medisdiana-landing/src/components/user/UserMemberships.tsx

---

## DianaBookingCalendar — Agendamiento de citas con la Dra. Diana

**Archivo:** `medisdiana-landing/src/components/DianaBookingCalendar.tsx`

Componente standalone (no depende del backend propio del monorepo). Consume
directamente la API de **CuidameDoc** (`https://doc-api.cuidame.tech/api`).

### Flujo de pasos (en orden)

```
service → calendar → slots → form → success
```

| Paso | Key | Descripción |
|------|-----|-------------|
| 0 | `service` | El paciente selecciona qué tipo de consulta quiere |
| 1 | `calendar` | Selecciona el día (calendario mensual con disponibilidad preloaded) |
| 2 | `slots` | Elige el horario disponible |
| 3 | `form` | Ingresa sus datos (paciente existente o nuevo registro) |
| 4 | `success` | Confirmación con resumen de la cita |

### Endpoints que consume (todos contra `doc-api.cuidame.tech`)

| Método | URL | Uso |
|--------|-----|-----|
| `GET` | `/api/booking/professionals/12/services` | Carga los servicios de Diana en el paso 0 |
| `GET` | `/api/booking/professionals/12/slots/:date` | Verifica disponibilidad por día (preloaded + al seleccionar) |
| `POST` | `/api/booking/request` | Agenda cita para paciente **existente** (por número de documento) |
| `POST` | `/api/booking/register-and-book` | Registra paciente **nuevo** y agenda la cita en una sola llamada |

### Campos enviados en los POST

Ambos endpoints reciben `clinical_service_id` (el `prof_service_id` del servicio seleccionado en paso 0, o `undefined` si no hay servicios).

`register-and-book` además envía: `first_name`, `last_name`, `identification_type`, `identification_number`, `email`, `phone`, `professional_id: 12`, `appointment_date`, `start_time`, `end_time`, `notes`.

`request` envía: `identification_number`, `professional_id: 12`, `appointment_date`, `start_time`, `end_time`, `notes`.

### Estado React relevante

```ts
selectedServiceId: number | null   // prof_service_id seleccionado
selectedServiceName: string        // para mostrar en resumen/éxito
services: ProfService[]            // cargados al montar
step: 'service'|'calendar'|'slots'|'form'|'success'
```

### Reglas de navegación (`goBack`)

- `success` → resetea todo y vuelve a `service`
- `form` → vuelve a `slots`
- `slots` → vuelve a `calendar` (limpia `selectedDate`)
- `calendar` → vuelve a `service`
- `service` → llama `onBackToHome()` (vuelve a la landing)

### Servicios de Diana en CuidameDoc

**Desactualizado desde el 2026-08-05** — ya NO se crean desde `doc.cuidame.tech`
→ Mis Servicios; ese formulario quedó deshabilitado para Diana a propósito (ver
"Sincronización de Servicios Medis → CuidameDoc" más abajo). Ahora se crean
desde el formulario "Nuevo Servicio" de este panel admin (Medis) y se
sincronizan automáticamente hacia CuidameDoc. Cada servicio tiene
`prof_service_id`, `name`, `description`, `duration_minutes`, `category`,
`price`. Si no hay servicios configurados, el paso 0 muestra un botón directo
para ir al calendario.

### Sincronización de Servicios Medis → CuidameDoc (2026-08-05)

**Qué resuelve**: el formulario "Nuevo Servicio" del panel admin (Sede, CUPS,
Modalidad, Precio) guardaba solo en la base local de Medis (`service_offers`/
`service_catalog`) — nunca llegaba a CuidameDoc, así que ni el catálogo público
de citas de Diana ni la cotización de sus historias clínicas veían el precio
real. Ver spec/plan completos en
`docs/superpowers/specs/2026-08-05-sync-servicios-cuidamedoc-design.md` y
`docs/superpowers/plans/2026-08-05-sync-servicios-cuidamedoc.md`.

- **Esquema**: `service_catalog.doc_prof_service_id INTEGER` (migración
  `022_service_catalog_doc_sync.sql`) — guarda el `prof_service_id` de
  CuidameDoc correspondiente. `NULL` = no sincronizado o actualmente inactivo
  en CuidameDoc.
- **Motor** (`apps/backend/src/services/docServiceSync.service.ts`,
  `ensureDocSync`): dado un catálogo y si debe estar `active` o no, crea/borra
  el servicio en CuidameDoc vía el proxy existente (login como Diana,
  `docAuth.ts`). CuidameDoc no tiene endpoint de edición — "actualizar" es
  siempre borrar + crear, así que cada edición real deja un huérfano en el
  catálogo global de CuidameDoc (limitación aceptada, no resuelta — requeriría
  tocar `cuidame_doc_backend`, fuera de alcance).
  - `active` se decide **solo** por `catalog.isActive` (el toggle "Estado del
    servicio" del formulario) — nunca por `service_offers.status`, porque
    `ServiceOfferRepository.create()` nunca guarda `status` (bug preexistente,
    documentado abajo, no corregido a propósito).
  - Categoría RIPS → categoría de CuidameDoc: `01→consultation`,
    `02→diagnostic`, `03/04→procedure`, `05→consultation`, default
    `consultation`.
  - Precio: Postgres devuelve `NUMERIC` como string vía `pg` (sin type parser
    registrado) — `ensureDocSync` siempre hace `Number(...)` con guard
    `Number.isFinite` antes de mandarlo a CuidameDoc.
- **Disparadores** (`apps/backend/src/controllers/services.controller.ts`):
  `createOffer`/`updateOffer`/`deleteOffer`. `updateOffer` solo sincroniza si
  cambió algo relevante de catálogo O la duración (`durationMinutes`, campo del
  offer, no del catálogo) — para no repetir el ciclo borrar+crear en cada
  guardado del formulario sin cambios reales. `deleteOffer` sincroniza la baja
  solo si era la última oferta de ese catálogo (con lock `FOR UPDATE` en
  `service_catalog` para evitar una condición de carrera si se borran varias
  sesiones a la vez desde el dashboard).
- **Backfill** (`apps/backend/src/scripts/backfill-doc-sync.ts`): script manual
  de una sola corrida para publicar en CuidameDoc los servicios que ya
  existían antes de este feature. Se corrió una vez en producción el
  2026-08-05 (1 servicio publicado).
- **Frontend**: sin cambios — `useDocServices.ts`/`Classes.tsx` (landing,
  sección "Nuestros Servicios") ya leían de CuidameDoc, así que un servicio
  sincronizado aparece ahí solo, sin redeploy de frontend.

### Constantes clave del componente

```ts
const DOC_API = 'https://doc-api.cuidame.tech/api'
const DIANA_PROFESSIONAL_ID = 12
```

---

## Inventario (con precio) — Panel Admin

- **Antes**: `InventarioDashboard.tsx` (`/admin/inventario`) era 100% frontend, persistía en `localStorage` (`MEDIS_inventory`), sin backend y sin campo de precio.
- **Ahora**: tabla real `inventory_items` (migración `019_create_inventory_items.sql`) — `id, name, category, unit, price (INTEGER, COP), quantity, min_stock, notes, is_active, created_at, updated_at`. `is_active` permite "descontinuar" un ítem sin borrarlo (para no romper cotizaciones históricas que lo referencian por id).
- **Backend** (`apps/backend/src/{repositories,controllers,routes}/inventory.*`, mismo patrón que `memberships`):
  - `GET /api/inventory/search?search=&category=&isActive=true` — **público** (sin auth), proyecta solo `{id, name, category, unit, price}` (no expone `quantity`/`minStock`/`notes` a llamadas externas). Consumido por CuidameDoc (proxy `diana-inventory-search`, ver `CuidameDoc/cuidame_doc_frontend_react/arquitectura.md`).
  - `GET /api/inventory` (admin, incluye inactivos), `POST/PATCH/DELETE /api/inventory[/:id]` (admin, `DELETE` es soft-delete → `is_active=false`).
- **Frontend**: `InventarioDashboard.tsx` ya no usa `localStorage`, consume la API real; formulario ganó el campo **Precio** (COP).

## Cotizaciones externas (Finanzas)

- **Qué es**: cuando CuidameDoc cierra una historia clínica con medicamentos/procedimientos/plan de seguimiento vinculados a ítems reales de este Inventario o a un Plan, arma una cotización y la registra aquí como ingreso **pendiente** por confirmar — igual que ya pasa con compras de Planes y Servicios Adicionales.
- **Tabla**: `external_quotes` (migración `020_create_external_quotes.sql`) — `id, source ('cuidamedoc'), external_reference (número de HC), patient_name, patient_email, professional_name, items (JSONB: [{type: 'inventory'|'plan', refId, name, unit_price, quantity, subtotal}]), total_amount, status ('pending'|'confirmed'|'rejected'), resolved_by, resolved_at, created_at, updated_at`. El precio se congela en `items` al momento de cotizar — si el precio del ítem/plan cambia después, las cotizaciones ya emitidas no se alteran.
- **Backend** (`apps/backend/src/{repositories,controllers,routes}/external-quotes.*`):
  - `POST /api/external-quotes` — **protegido con API key compartida** (header `x-internal-api-key`, comparación con `crypto.timingSafeEqual` para evitar timing attacks, contra `DIANA_INTERNAL_API_KEY` en `.env`). Lo llama el backend de CuidameDoc, server-to-server, nunca el navegador.
  - `GET /api/external-quotes?status=` (admin), `PATCH /:id/confirm`, `PATCH /:id/reject` (admin) — el `resolve()` del repositorio tiene guard `WHERE status = 'pending'`, así que una doble-confirmación devuelve 409 en vez de re-confirmar en silencio.
- **Frontend — visible en DOS pantallas** (2026-08-05: antes solo en Finanzas): el panel se extrajo a un componente compartido, `medisdiana-landing/src/components/admin/shared/CotizacionesCuidameDocPanel.tsx` (recibe `showToast` y los callbacks opcionales `onQuoteConfirmed`/`onPendingCountChange` del host), y se monta en:
  - **`FinanzasDashboard.tsx`** (`/admin/finanzas`), pestaña "Cotizaciones CuidameDoc" — comportamiento sin cambios: confirmar suma a "Ingresos del mes"/"Balance neto" vía un acumulador local (`confirmedQuotesTotal`) inicializado sumando `GET /api/external-quotes?status=confirmed` al montar, y el badge de la pestaña (`cotizacionesPendingCount`) se alimenta tanto de un fetch propio en el `useEffect` de montaje (para que muestre el conteo correcto ni bien se abre el dashboard, sin esperar a que se abra esa pestaña) como del callback `onPendingCountChange` del panel (que lo mantiene actualizado mientras esa pestaña está abierta).
  - **`MembresiasDashboard.tsx`** (`/admin/planes`, "Planes y Membresías") — sección nueva "Cotizaciones de pacientes", separada visualmente del catálogo de planes reutilizables (Plan Mensual, etc.) de abajo, con su propio texto explicativo. Mismo componente, mismos endpoints — confirmar/rechazar desde cualquiera de las dos pantallas actualiza el mismo registro en `external_quotes`, sin duplicar datos.
- Planes (`GET /api/memberships/active`, ya existente) se reutiliza tal cual para el selector de "Plan asociado" del lado de CuidameDoc — no se creó ningún endpoint nuevo para eso.
- **Incidente 2026-08-05** — `DIANA_INTERNAL_API_KEY` nunca se configuró en el `.env` de producción, así que `requireInternalApiKey` rechazaba con 401 *toda* petición a `POST /external-quotes` sin importar la clave enviada, y del lado de CuidameDoc `submitExternalQuote` no revisaba `response.ok` — la cotización simplemente desaparecía, sin cerrar la HC con error ni loguear nada en ningún lado. Detalle completo, causa raíz y fix en [errores-conocidos.md](errores-conocidos.md).

## Precios escalonados de control (2026-08-05)

**Qué resuelve**: Diana cobra un precio fijo por "Consulta de primera vez",
pero quiere que el 1er control/seguimiento de un tratamiento no tenga costo, y
que del 2do control en adelante se cobre un precio fijo o promocional —
calculado automáticamente, sin que el profesional tenga que acordarse de
poner el precio correcto a mano en cada seguimiento. Ver spec/plan completos
en `docs/superpowers/specs/2026-08-05-precios-control-y-plan-cotizacion-design.md`
y `docs/superpowers/plans/2026-08-05-precios-control-y-plan-cotizacion.md`
(ambos en el repo `cuidame_doc_backend`, por ser un feature cross-repo).

- **Esquema**: `service_catalog.control_price NUMERIC(10,2)` (migración
  `023_service_catalog_control_price.sql`), nullable. `NULL` = el servicio no
  tiene niveles, se comporta igual que antes (precio plano). Con un valor:
  el servicio queda marcado como "servicio con controles" — la regla es fija,
  no configurable por nivel: el 1er control siempre es gratis ($0), el 2do en
  adelante cobra `control_price`.
- **Formulario** (`FormularioServicio.tsx`): campo nuevo "Precio de control
  (2do en adelante)", opcional, junto al de "Precio por sesión". Ojo con dos
  bugs que la revisión final de rama encontró y corrigió antes de mergear (no
  llegaron a producción rotos):
  - `ServiciosDashboard.tsx` (`handleFormSuccess`) reconstruye el payload
    campo por campo en vez de reenviar el objeto del formulario tal cual —
    `controlPrice` no estaba en esa lista y se perdía silenciosamente antes de
    llegar a la API.
  - El input de precio de control usa `valueAsNumber: true`; vacío se
    convierte en `NaN`, que zod con `.optional()` rechaza (`.optional()` solo
    acepta `undefined`) — un campo vacío bloqueaba el guardado de **cualquier**
    servicio, no solo los que usan niveles. Se resolvió con `z.preprocess`
    (mismo patrón ya usado en este archivo para `tipoAtencion`).
  - `mapGroupToFormValues` tampoco precargaba `controlPrice` al editar un
    servicio existente — el campo aparecía vacío aunque ya tuviera un valor
    guardado.
- **Sincronización hacia CuidameDoc**: viaja por el proxy de solo lectura ya
  existente, `getExternalServices` (`cuidame_doc_backend`), que ahora incluye
  `controlPrice: number | null` en cada servicio devuelto. **No** se agregó a
  `DOC_SYNC_RELEVANT_FIELDS` — un cambio de solo `controlPrice` no dispara el
  ciclo borrar+crear del catálogo de reservas de CuidameDoc, porque es
  irrelevante para ese motor.
- **Cálculo automático** (`cuidame_doc_frontend_react`, `CloseRecordModal.tsx`,
  sección Seguimiento de "Cerrar historia clínica"): dos funciones puras
  exportadas, `countPriorOccurrences` y `computeFollowUpPrice`, cuentan en qué
  posición está un servicio dentro de los seguimientos ya agregados de **esta
  misma historia clínica** (el conteo se reinicia en cada HC nueva) y fijan el
  precio: posición 1 → $0, posición 2+ → `controlPrice`. El precio del
  seguimiento queda bloqueado (no editable) cuando el servicio tiene
  `controlPrice` configurado.
