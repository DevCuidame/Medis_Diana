# Sincronización de Servicios Medis → CuidameDoc

**Fecha:** 2026-08-05
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto y causa raíz

El formulario "Nuevo Servicio" del panel admin de Medis (`FormularioServicio.tsx` /
`ServiciosDashboard.tsx`, en `medisdiana-landing`) — el que tiene los campos Sede,
CUPS, Modalidad y **Precio por sesión (COP)** — guarda **solo** en la base de datos
propia de Medis, vía `POST/PATCH /api/services/offers`. Nunca ha escrito nada en
CuidameDoc, desde que existe (9 de julio).

Sí existe un proxy real y funcional hacia CuidameDoc, construido el 16 de julio:
`apps/backend/src/controllers/docServices.controller.ts`, montado en
`/api/services/catalog`. Hace login como Diana (`apps/backend/src/utils/docAuth.ts`,
credenciales de servicio) y llama a CuidameDoc de verdad
(`GET/POST /booking/my-services`, `DELETE /booking/my-services/:profServiceId`).
La única UI que lo llamaba era una pestaña separada "Catálogo Médico" en
`ServiciosDashboard.tsx`, eliminada el 25 de julio (commit `5325b2c`) al traer de
vuelta trabajo suelto de otra sesión — no fue una decisión deliberada de
arquitectura, quedó huérfana. Desde entonces nada en Medis crea servicios visibles
en CuidameDoc.

Además, ese proxy nunca reenvió el precio (`createCatalogService` solo mandaba
`service_name`, `duration_minutes`, `category`, `description`). Confirmado que
`cuidame_doc_backend` (`POST /booking/my-services` →
`booking.controller.ts::createServiceHandler`) **sí** acepta y persiste `price`
end-to-end — no requiere cambios de ese lado.

Dato importante confirmado por lectura de código: CuidameDoc **no tiene endpoint
de edición** para `/booking/my-services` (solo GET/POST/DELETE). "Actualizar" un
servicio ahí solo es posible borrando el anterior y creando uno nuevo.

## Objetivo

Crear, editar, activar/desactivar o eliminar un servicio desde el formulario RIPS
actual de Medis debe reflejarse automáticamente en CuidameDoc, incluyendo el
precio — sin resucitar la pestaña "Catálogo Médico" separada, sin cambios en
`cuidame_doc_backend`.

## Decisiones (confirmadas con el usuario)

- **Alcance:** todos los tipos de servicio del catálogo (Cita Individual, Consulta
  Abierta, Sesión Grupal, Evento) se sincronizan, no solo las citas 1-a-1.
- **Disparador:** automático en cada guardado (crear/editar), sin acción manual
  tipo "Publicar en CuidameDoc".
- **Fallos de sincronización:** el guardado local **siempre se completa** aunque
  CuidameDoc no responda. Se informa el fallo, no se bloquea ni se pierde el
  trabajo del admin.
- **Desactivar/eliminar:** se refleja 1:1 — desactivar en Medis elimina el
  servicio en CuidameDoc; reactivar lo vuelve a crear; eliminar en Medis elimina
  en CuidameDoc.
- **Servicios existentes (huérfanos):** se publican todos hacia CuidameDoc en un
  backfill de una sola corrida al desplegar este fix.

## Diseño

### 1. Esquema — nueva columna

Migración `019_service_catalog_doc_sync.sql`:

```sql
ALTER TABLE service_catalog
  ADD COLUMN IF NOT EXISTS doc_prof_service_id INTEGER;
```

Guarda el `prof_service_id` que CuidameDoc asignó al servicio correspondiente.
`NULL` significa "no sincronizado todavía" o "actualmente no publicado en
CuidameDoc".

### 2. Motor de sincronización — `apps/backend/src/services/docServiceSync.service.ts`

Función central, reutilizable desde el controller y desde el script de backfill:

```ts
async function ensureDocSync(params: {
  catalogId: string;
  active: boolean;           // ¿debe existir en CuidameDoc ahora mismo?
  serviceName: string;
  durationMinutes: number;
  categoryGroup: string;     // RIPS de Medis, ej '01 Consulta externa'
  description?: string | null;
  price: number;
}): Promise<{ ok: boolean; error?: string }>
```

Comportamiento:
- Relee de `service_catalog` el `doc_prof_service_id` actual antes de actuar
  (no confía en estado en memoria).
- `active === false`: si hay `doc_prof_service_id`, llama `DELETE` en
  CuidameDoc (ignora 404 — ya no existía), pone la columna en `NULL`.
- `active === true`:
  - Si hay `doc_prof_service_id` existente → primero `DELETE` (best-effort,
    ignora error de "no encontrado"), porque CuidameDoc no tiene edición.
  - Luego `POST /booking/my-services` con los datos actuales
    (`service_name`, `duration_minutes`, `category`, `description`, `price`).
  - Guarda el `prof_service_id` devuelto en `doc_prof_service_id`.
- Toda llamada de red va en try/catch. Si algo falla, **no lanza** — devuelve
  `{ ok: false, error: mensaje }` y deja el estado local (`doc_prof_service_id`)
  como estaba antes de intentar, para que el próximo guardado reintente solo.
- Reutiliza `getDocToken`/`refreshDocToken` de `docAuth.ts` (login como Diana,
  igual que el proxy existente — se mantiene el comportamiento actual de que
  todo se asocia a `professional_id=12` sin importar el "Profesional a cargo"
  elegido en el formulario de Medis).

**Mapeo de categoría** (RIPS de Medis → categoría simple de CuidameDoc):

| `categoryGroup` (Medis)                                    | `category` (CuidameDoc) |
|--------------------------------------------------------------|--------------------------|
| `01 Consulta externa`                                        | `consultation`           |
| `02 Apoyo diagnóstico y complementación terapéutica`          | `exam`                   |
| `03 Internación`                                              | `procedure`               |
| `04 Quirúrgico`                                               | `procedure`               |
| `05 Atención inmediata`                                       | `consultation`           |
| (cualquier otro valor)                                        | `consultation` (default) |

### 3. Puntos de integración — `apps/backend/src/controllers/services.controller.ts`

- **`createOffer`**: después de crear `service_catalog` + `service_offers`,
  llama `ensureDocSync({ ..., active: offer.status === 'published' })`.
  Agrega el resultado a la respuesta como `docSync`.
- **`updateOffer`**: después de aplicar los cambios (tanto guardado completo
  del formulario como el toggle Activo/Inactivo, que hoy solo manda
  `{status}`), relee el registro completo (catálogo + oferta actualizados) y
  calcula `active = offer.status === 'published' && catalog.isActive !== false`.
  Llama `ensureDocSync` con eso. Agrega `docSync` a la respuesta.
- **`deleteOffer`**: antes de borrar la oferta, si esta es la última oferta
  publicada que referencia ese `catalogId` (`COUNT` de otras ofertas activas
  con el mismo `catalog_id`), llama `ensureDocSync({ active: false, ... })`.
  Luego procede con el borrado local normal.

### 4. Frontend — `ServiciosDashboard.tsx`

- `handleFormSuccess` y `handleToggleGroup`: si la respuesta trae
  `docSync: { ok: false, error }`, muestra un toast adicional (o agrega al
  toast existente): `"Guardado, pero no se pudo publicar en CuidameDoc: <error>"`.
  No cambia el flujo de éxito local — el guardado ya se completó.

### 5. Backfill — `apps/backend/src/scripts/backfill-doc-sync.ts`

Script de una sola corrida manual (mismo patrón que `alter-catalog.ts` /
`run-migration.ts` ya existentes):

- Selecciona todo `service_catalog` con `doc_prof_service_id IS NULL` que
  tenga al menos una `service_offers` con `status='published'`.
- Para cada uno, toma la duración de una oferta representativa y llama
  `ensureDocSync({ active: true, ... })`.
- Imprime resumen: creados / ya sincronizados / fallidos (con motivo).
- Se ejecuta a mano una vez, después de desplegar — no se engancha a ningún
  arranque automático.

## Fuera de alcance

- No se toca `cuidame_doc_backend` (ya soporta `price` de punta a punta).
- No se resucita la pestaña "Catálogo Médico".
- No hay mapeo de "Profesional a cargo" de Medis → profesional real en
  CuidameDoc; todo sigue asociado a Diana (`professional_id=12`), como ya
  funcionaba el proxy antes de este fix.
- No hay reintento automático en segundo plano para syncs fallidos — el
  próximo guardado del mismo servicio reintenta de forma natural.
