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
- Deploy: VM `cuidame-app` (zona `us-central1-a`, proyecto `esmart-health`), script `deploy-Dianamedic.ps1`

## Estructura de pantallas / rutas

### Landing pública (`/`)
- medisdiana-landing/src/components/Hero.tsx
- medisdiana-landing/src/components/About.tsx
- medisdiana-landing/src/components/Classes.tsx
- medisdiana-landing/src/components/Instructors.tsx — sección "Sobre la Doctora"; retrato real (`medisdiana-landing/public/doctora/diana-medina.jpg`) en vez del placeholder de iniciales "DM".
- medisdiana-landing/src/components/Spaces.tsx — sección "Mis Espacios", `id="espacios"`, galería bento (1 tile grande + 3 pequeños) de las instalaciones del consultorio (Recepción, Sala de espera, Consultorio, Fachada). Fotos reales servidas desde `medisdiana-landing/public/espacios/` (sin optimizar, 3.7–6.6 MB cada una — pendiente comprimir).
- medisdiana-landing/src/components/Testimonials.tsx
- medisdiana-landing/src/components/FinalCTA.tsx
- medisdiana-landing/src/components/Navbar.tsx
- medisdiana-landing/src/components/Footer.tsx — WhatsApp real (`+57 312 587 3244`, ícono social + bloque Contacto, ambos enlazan a `wa.me/573125873244`) y email real (`dradianamedfamiliar@gmail.com`) en vez de placeholders; "Horarios" removido (pendiente de definir).

### Autenticación (`/login`)
- medisdiana-landing/src/components/ArtistLogin.tsx

### Panel Admin (`/admin/*`)
- medisdiana-landing/src/components/admin/MainDashboard.tsx
- medisdiana-landing/src/components/admin/UsuariosDashboard.tsx
- medisdiana-landing/src/components/admin/AdminClasses.tsx
- medisdiana-landing/src/components/admin/CreateService.tsx
- medisdiana-landing/src/components/admin/SedesDashboard.tsx — sección "Inspiración de Espacios" con fotos reales del consultorio (recepción, sala de espera, consultorio); antes tenía 3 fotos de stock de Pinterest con alt text "Pole Dance" (última infracción de la regla de oro que quedaba en el código).
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

### Código de servicio REPS (habilitación) — Panel Admin (2026-08-10)

**Qué es**: catálogo oficial de los 157 servicios habilitables REPS
(Resolución 3100), distinto del código **CUPS** ya capturado en la
clasificación RIPS del formulario. Ver spec/plan completos en
`docs/superpowers/specs/2026-08-10-reps-service-code-design.md` y
`docs/superpowers/plans/2026-08-10-reps-service-code.md`.

- **Esquema**: `reps_service_catalog(code VARCHAR(4) PK, name, service_group,
  is_active)` (migración `025_reps_service_codes.sql`, sembrada con las 157
  filas del Excel — 154 activas, 3 inactivas de transporte
  asistencial/prehospitalario). `service_group` reutiliza el mismo dominio
  `'01'..'05'` que `service_catalog.category_group` (no existe grupo `06` en
  este catálogo). Nueva columna `service_catalog.reps_service_code
  VARCHAR(4)` (FK a `reps_service_catalog.code`), nullable.
- **Backend**: `GET /services/reps-service-codes` (ADMIN) devuelve el
  catálogo completo activo de una sola vez — mismo patrón de "traer todo y
  filtrar en cliente" que `GET /services/cups-catalog`. `repsServiceCode` se
  suma a `CATALOG_PAYLOAD_KEYS` y al create/update de
  `ServiceCatalogRepository`, igual que el resto de campos RIPS.
- **Frontend** (`FormularioServicio.tsx`): nuevo select "Código del
  servicio", justo después de "Código CUPS" y antes de "Modalidad de
  servicio", filtrado client-side por el `categoryGroup` ya elegido. Se
  oculta por completo en el grupo `06 Otros servicios` (mismo
  `isEscapeGroup` que ya oculta Subgrupo/Categoría/Subcategoría/CUPS) y es
  obligatorio en el resto de grupos.
- **Sin sync a CuidameDoc**: es un dato puramente regulatorio/local a Medis
  — el modelo de servicios de CuidameDoc no tiene un campo equivalente.
- **Actualización (2026-08-10)**: las tarjetas de `ServiciosDashboard.tsx`
  ahora muestran un badge "Servicio {code}" junto al de "CUPS {code}"
  cuando el servicio tiene `repsServiceCode` (mismo patrón visual, ícono
  `Tag`).

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

## Aprovisionamiento automático de doctores en CuidameDoc + vínculo cabeza-trabajador (2026-08-10)

**Qué resuelve**: cuando el admin crea un profesional (doctor) desde "Nueva
Cuenta" en Usuarios (`UsuariosDashboard.tsx`/`AdminProfessionals.tsx`), ese
profesional solo existía en la BD propia de Medis — no había cuenta
correspondiente en CuidameDoc. Esto se volvió un problema real con el fix de
login de esa misma fecha (`ArtistLogin.tsx`: un `PROFESSIONAL` ahora hace
handoff SSO hacia `doc.cuidame.tech` con las mismas credenciales) — si esa
cuenta nunca se creó del otro lado, el SSO fallaba. Ver diseño completo en
`docs/superpowers/specs/2026-08-10-doctores-cuidamedoc-provision-design.md` y
plan en `docs/superpowers/plans/2026-08-10-doctores-cuidamedoc-provision.md`.

- **Esquema (Medis)**: `users.doc_professional_id INTEGER` (migración
  `024_professional_doc_link.sql`, registrada en `run-migration.ts`). `NULL`
  = no aprovisionado todavía, o el intento falló.
- **Esquema (CuidameDoc, repo `cuidame_doc_backend`)**:
  `professionals.head_professional_id INTEGER` (self-FK, `ON DELETE SET
  NULL`, migración `051-professional-head-link.sql`). `NULL` = profesional
  independiente (comportamiento de siempre). Un valor = `professional_id` de
  la cabeza que lo dio de alta. Puramente organizacional — **cada doctor ve
  solo lo suyo** clínicamente, no habilita ningún acceso cruzado a HC ni
  pacientes.
- **Endpoint nuevo (CuidameDoc)**: `POST /professionals/team-members`
  (autenticado — quien llama se vuelve la cabeza). Crea `User` + rol
  `professional` + `Professional`, todo en una transacción, ya
  **activo/verificado** (sin correo de verificación — quien da de alta ya es
  de confianza). `gender` no se recoge del caller → se manda `'Otro'` por
  defecto (el valor `'No especifica'` original no cabía en
  `users.gender VARCHAR(10)` — bug real encontrado en la revisión final,
  corregido antes de mergear). `city_id` hereda el de la cabeza (necesario:
  `auth.service.ts::login` asume que todo usuario activo tiene una ciudad
  resoluble). Valida email único y `license_number` único (409 en ambos
  casos) y los 6 campos obligatorios del DTO (400 si falta alguno).
- **Motor (Medis)**: `apps/backend/src/services/docProfessionalProvision.service.ts`
  — mismo patrón best-effort que `docServiceSync.service.ts` (nunca lanza,
  siempre `{ ok, docProfessionalId?, error? }`). Reutiliza `withDocAuth`
  (extraído a `docAuth.ts` desde `docServiceSync.service.ts` para
  compartirlo entre ambos motores de sincronización).
- **Disparador**: `ProfessionalService.create()` — solo si `role ===
  'PROFESSIONAL'` (un `ADMIN` nunca llama a CuidameDoc). Un fallo de
  CuidameDoc **nunca bloquea ni revierte** la creación local ya exitosa; el
  guardado de `doc_professional_id` en sí también está envuelto en su propio
  try/catch para que un error ahí tampoco pueda tumbar una respuesta que ya
  era exitosa. `POST /api/professionals` ahora responde
  `{ success, data: { professional }, docSync? }` — `docSync` como hermano
  de `data`, ausente por completo (no `undefined`) cuando no aplica.
- **Frontend**: `CreateProfessionalModal.tsx`'s `onSuccess` ahora recibe
  `docSync` como segundo argumento opcional. `UsuariosDashboard.tsx` y
  `AdminProfessionals.tsx` muestran un toast de advertencia (ícono/color
  diferenciado, no solo texto) si `docSync.ok === false`, sin cambiar el
  flujo de éxito local.
- **Multi-tenant por diseño**: la "cabeza" nunca se hardcodea a Diana — es,
  en cada deployment de Medis, quien sea que autentique `docAuth.ts` (sus
  propias credenciales de `.env`). El mismo mecanismo sirve tal cual para
  Ximena (`professional_id 2` en CuidameDoc) o futuros clientes del plan.
- **Limitación abierta, sin resolver a propósito**: el reintento manual que
  describe el spec no funciona en la práctica una vez que el email ya quedó
  registrado localmente (choca con el guard 409 de `ProfessionalService.create`).
  Detalle en [errores-conocidos.md](errores-conocidos.md) — pendiente de
  decisión de producto, no es un bug de código.

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
- **Actualización (2026-08-10)**: el campo "Precio de control (2do en
  adelante)" se **quitó de `FormularioServicio.tsx`** (confundía en el
  formulario). Deja de pedirse/enviarse desde ahí — `ServiciosDashboard.tsx`
  ya no manda `controlPrice` en el payload de guardado (ni siquiera `null`,
  para no pisar valores ya guardados en servicios existentes). La columna
  `service_catalog.control_price`, el backend (`ServiceCatalogRepository`,
  `docSyncRelevantFieldsChanged`, tests) y el proxy hacia CuidameDoc
  **quedan intactos** — un servicio que ya tenía niveles configurados sigue
  cobrando igual, solo que ya no hay forma de editarlo desde este
  formulario.
- **Cálculo automático** (`cuidame_doc_frontend_react`, `CloseRecordModal.tsx`,
  sección Seguimiento de "Cerrar historia clínica"): dos funciones puras
  exportadas, `countPriorOccurrences` y `computeFollowUpPrice`, cuentan en qué
  posición está un servicio dentro de los seguimientos ya agregados de **esta
  misma historia clínica** (el conteo se reinicia en cada HC nueva) y fijan el
  precio: posición 1 → $0, posición 2+ → `controlPrice`. El precio del
  seguimiento queda bloqueado (no editable) cuando el servicio tiene
  `controlPrice` configurado.

## Gastos del consultorio — submenú Finanzas Pagos/Gastos (2026-08-10)

**Qué resuelve**: "Finanzas" era una sola pantalla con el KPI "Egresos del
mes" hardcodeado en `$0` (no existía ningún concepto de gasto). Ahora
"Finanzas" en el sidebar se expande en dos submenús — **Pagos** (la pantalla
que ya existía, sin cambios de contenido) y **Gastos** (pantalla nueva) —,
igual mecanismo que ya usaba "Infraestructura" (Sedes/Espacios). Ver
spec/plan completos en
`docs/superpowers/specs/2026-08-10-gastos-finanzas-design.md` y
`docs/superpowers/plans/2026-08-10-gastos-finanzas.md`.

- **Esquema**: `expenses(id, description, amount NUMERIC(10,2), category
  VARCHAR(100), expense_date DATE, created_by, created_at, updated_at)`
  (migración `026_expenses.sql`). `category` es texto libre — el frontend
  ofrece autocompletado (`<datalist>`) con las categorías ya usadas, sin
  restringir a una lista cerrada (decisión explícita de diseño).
- **Backend**: CRUD completo en `/expenses` (`expense.{types,repository,
  controller,routes}.ts`, mismo patrón que Inventario), **todas** las rutas
  protegidas con `authenticate + authorize('ADMIN')` — a diferencia de
  Sedes/Espacios (sin guard por una decisión de desarrollo previa), datos
  financieros no llevan excepción. El repositorio selecciona
  `expense_date` con `TO_CHAR(expense_date, 'YYYY-MM-DD')` en vez de dejar
  que `pg` lo parsee a `Date` — evita el desfase de un día que produciría
  `new Date(...)` en zona horaria de Colombia (UTC-5) sobre una columna
  `DATE` pura.
- **Cuidado con `amount`**: Postgres `NUMERIC` llega como **string** desde
  `pg` (no hay type parser registrado para ese OID) — `"50000.00"`, no
  `50000` — pese a que `ExpensePublic.amount` está tipado como `number`.
  Tanto `GastosDashboard.tsx` (al cargar, en `loadData`) como
  `FinanzasDashboard.tsx` (en `fetchMonthlyExpenses`) hacen `Number(...)`
  explícito antes de sumar — sin eso, `.reduce((sum, e) => sum + e.amount,
  0)` concatena texto en vez de sumar. Encontrado y corregido en la
  verificación manual de esta feature (no estaba cubierto por el
  typecheck, que no detecta el tipo real en tiempo de ejecución).
- **Frontend**: `GastosDashboard.tsx` + `FormularioGasto.tsx`
  (`medisdiana-landing/src/components/admin/`), mismo esqueleto que
  `EspaciosDashboard.tsx`/`FormularioEspacio.tsx` (sin la relación a sede
  ni el toggle activo/inactivo, que no aplican a un gasto). Filtros:
  descripción, categoría, mes (`<input type="month">`).
- **Sidebar** (`AdminSidebar.tsx`): "Finanzas" pasa de `path` fijo a
  `match: ['/admin/finances']` con expansión propia
  (`isFinanzasExpanded`/`FINANZAS_SUBITEMS`), generalizando el mecanismo
  que antes solo servía a "Infraestructura". El resaltado de cada subitem
  usa comparación **exacta** (`pathname === path`), no `startsWith` —
  "Pagos" (`/admin/finances`) es prefijo literal de "Gastos"
  (`/admin/finances/expenses`), así que `startsWith` marcaría ambos
  activos a la vez (detectado en la autorevisión del plan, antes de
  escribir el código).
- **KPIs en Pagos**: "Egresos del mes" y "Balance neto"
  (`FinanzasDashboard.tsx`) ya no están hardcodeados — suman los gastos
  cuyo `expenseDate` cae en el mes calendario actual. Verificado extremo a
  extremo contra el backend y la BD reales: crear un gasto de este mes vía
  la API y confirmar que el total se calcula correctamente como número.
