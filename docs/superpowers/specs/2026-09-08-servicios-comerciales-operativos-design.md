# Servicios Comerciales vs. Operativos

**Fecha:** 2026-09-08
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto y causa raíz

Hoy existe un único flujo de creación de servicios: `FormularioServicio.tsx` (4
pasos: Ubicación/Salón, Identificación, Clasificación RIPS/CUPS, Condiciones),
que al guardar crea una fila en `service_catalog` + una fila en `service_offers`
(`ServiciosDashboard.tsx:400-512` → `POST /api/services/offers`). Ese mismo
guardado dispara `ensureDocSync` (`apps/backend/src/services/docServiceSync.service.ts`),
que publica el servicio en CuidameDoc (`POST /booking/my-services`) — y es ese
catálogo de CuidameDoc el que la landing page lee y muestra
(`useDocServices.ts` → `GET /booking/professionals/12/services`, consumido por
`Classes.tsx`).

No existe ningún concepto de "comercial" vs. "operativo", ni relación
servicio-a-servicio, en el esquema actual (confirmado: sin coincidencias para
`comercial|operativo|parent_service` en `apps/backend`).

Necesidad del negocio: separar la ficha clínica/RIPS completa (obligatoria para
habilitación, con toda la clasificación CUPS) de la ficha "de venta" que el
paciente ve — permitiendo vender/mostrar un mismo procedimiento clínico bajo
varios nombres o enfoques comerciales, cada uno con su propia imagen y
descripción, sin que crear la ficha clínica interna publique nada por sí sola.

## Decisiones (confirmadas con el usuario)

- **Comercial** necesita solo: nombre, descripción, imagen, y un selector del
  servicio operativo al que pertenece. No captura precio ni duración propios —
  **se heredan del operativo vinculado** cuando llegue el momento de publicar
  (ver "Fuera de alcance").
- **Operativo** sigue siendo exactamente el formulario de 4 pasos que existe
  hoy, sin cambios de campos ni de comportamiento de guardado local
  (`service_catalog` + `service_offers` sin tocar).
- **Cardinalidad:** un operativo puede tener **muchos** comerciales asociados
  (1:N) — no es una relación exclusiva. Vender el mismo procedimiento bajo dos
  nombres comerciales distintos es un caso válido desde el día uno.
- **Landing page:** se queda leyendo de CuidameDoc exactamente como hoy
  (`Classes.tsx` / `useDocServices.ts` sin cambios). El campo imagen del
  comercial no se muestra en ningún lado públicamente todavía — se captura y
  guarda localmente, para cuando exista el flujo de publicación (fuera de
  alcance de esta fase).
- **Datos existentes:** los ~servicios ya creados con el formulario único
  quedan como operativos tal cual están, **sin tocar su sincronización actual
  en CuidameDoc** (siguen publicados como están hoy). No se genera ningún
  comercial automáticamente para ellos — se crea manualmente cuando alguien
  quiera darle una ficha comercial propia a uno existente.

## Modelo de datos

`service_catalog` no cambia de esquema — pasa a representar semánticamente
"servicio operativo", nada más.

Tabla nueva, `service_commercial`:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `description` | TEXT | |
| `image_url` | TEXT | base64 data-URL, mismo patrón que `service_catalog.image_url` (`027_widen_image_columns.sql`) |
| `operativo_id` | UUID NOT NULL REFERENCES service_catalog(id) | **no** único — permite 1 operativo → N comerciales |
| `is_active` | BOOLEAN NOT NULL DEFAULT true | mismo rol que `service_catalog.is_active` hoy; controla estado del comercial |
| `doc_prof_service_id` | INTEGER, NULL | reservado para la fase futura de sincronización (ver más abajo) — **no se usa en esta fase** |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

Ningún cambio a `service_offers`, `cups_catalog`, ni a las tablas de
clasificación RIPS existentes.

## Flujo de creación (UI)

- El botón "Nuevo Servicio" en `ServiciosDashboard.tsx` abre primero un
  selector de tipo: **Comercial** / **Operativo** (reemplaza el punto de
  entrada directo al formulario de 4 pasos).
- **Operativo** → abre `FormularioServicio.tsx` sin ningún cambio.
- **Comercial** → formulario nuevo, un solo paso: Nombre, Descripción, Imagen
  (mismo componente de carga que ya existe, mismo límite de 5MB), selector
  "Servicio operativo asociado" (buscable por nombre, lista los operativos
  **activos** vía `service_catalog` — `is_active = true`), y el toggle "Estado del servicio"
  (activo/inactivo) que ya existe en el paso 4 del formulario actual.
- Guarda vía `POST /api/services/commercial` (nuevo endpoint) →
  `service_commercial`. **No** llama a `ensureDocSync` ni a ningún endpoint de
  CuidameDoc en esta fase.

## Panel admin (`ServiciosDashboard.tsx`)

Se agregan pestañas **Comerciales | Operativos** para listar/editar cada tipo
por separado. La pestaña Comerciales muestra nombre, imagen, operativo
vinculado y estado; la pestaña Operativos se queda con el listado/agrupación
actual (`groupOffers`) sin cambios.

## Fuera de alcance de esta fase (documentado para después)

La sincronización a CuidameDoc **se deja tal como está hoy** — atada a la
creación/edición de operativo, sin tocar `docServiceSync.service.ts` ni
`services.controller.ts`. Cuando se retome (con el código de
`cuidame_doc_backend` a la vista), el cambio a implementar es:

- **Quitar** la llamada a `ensureDocSync` de `createOffer`/`updateOffer`/
  `deleteOffer` en `services.controller.ts` — un operativo por sí solo deja de
  publicar nada.
- **Agregar** la llamada equivalente a la creación/edición/activación de
  `service_commercial`: arma el payload de `POST /booking/my-services` con
  `service_name`/`description` del comercial + `duration_minutes`/`category`
  (vía `CATEGORY_MAP`)/`price` heredados del `service_catalog` (operativo)
  vinculado.
- El `prof_service_id` que devuelve CuidameDoc se guarda en
  `service_commercial.doc_prof_service_id` (columna ya reservada en el
  modelo de esta fase).
- El toggle `is_active` de `service_commercial` pasa a ser el que decide
  publicar/despublicar en CuidameDoc (hoy esa responsabilidad es de
  `service_catalog.is_active`).
- Dado que CuidameDoc no tiene endpoint de edición (`docServiceSync.service.ts:5-8`),
  "actualizar" un comercial sigue siendo borrar + crear en CuidameDoc — mismo
  patrón que existe hoy, solo que disparado desde el comercial en vez del
  operativo.
- Requiere decidir aparte qué pasa si el operativo vinculado a un comercial
  publicado se edita (¿re-sincroniza el comercial automáticamente?) — no
  resuelto en este spec, a definir cuando se implemente.

## Testing

- Backend: tests de `service_commercial` CRUD (incluyendo que `operativo_id`
  debe existir en `service_catalog`, y que un mismo operativo acepta múltiples
  comerciales).
- Frontend: el selector de tipo enruta al formulario correcto; el formulario
  de comercial valida nombre/imagen/operativo requeridos; la pestaña
  Comerciales del dashboard lista/edita correctamente.
- Confirmar explícitamente en los tests que crear/editar un comercial **no**
  dispara ninguna llamada de red hacia `doc-api.cuidame.tech` en esta fase.
