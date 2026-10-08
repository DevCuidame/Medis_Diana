# Sincronización Servicios Comerciales → CuidameDoc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover la publicación en CuidameDoc del "operativo" (`service_catalog`) al "comercial" (`service_commercial`) — crear/editar/activar un comercial publica en `POST /booking/my-services` heredando duración/categoría/precio del operativo vinculado; editar un operativo con comerciales ya publicados los re-sincroniza automáticamente.

**Architecture:** El motor `ensureDocSync` (borrar+crear en CuidameDoc, ya probado) se generaliza para escribir su `doc_prof_service_id` en `service_catalog` **o** en `service_commercial` según un parámetro `targetTable`, en vez de estar cableado solo a `service_catalog`. Un servicio nuevo (`commercialDocSync.service.ts`) arma los parámetros de un comercial resolviendo su operativo + la oferta más reciente de ese operativo (duración/profesional viven en `service_offers`, no en `service_catalog`), y expone también la función que re-sincroniza todos los comerciales ya publicados de un operativo cuando ese operativo cambia. `services.controller.ts` deja de llamar al motor directamente (el operativo ya no publica nada por sí solo) y en su lugar dispara esa re-sincronización cuando el guardado de un operativo toca un campo relevante.

**Tech Stack:** TypeScript + Express + `pg` (SQL directo, sin ORM). Tests con `node:test` + `node:assert/strict`, corriendo contra una base de datos real (mismo patrón que `serviceCommercial.repository.test.ts` / `docServiceSync.service.test.ts`) y mockeando `fetch` con `t.mock.method` para las llamadas HTTP a CuidameDoc.

**Spec:** [docs/superpowers/specs/2026-09-08-servicios-comerciales-operativos-design.md](../specs/2026-09-08-servicios-comerciales-operativos-design.md), sección "Fuera de alcance de esta fase (documentado para después)" — este plan implementa exactamente esa sección, más la decisión (tomada en esta sesión, no estaba en el spec) de que editar un operativo con comerciales publicados los re-sincroniza automáticamente.

## Global Constraints

- **Regla crítica #3 (CLAUDE.md):** sin Prisma ni ORM — todo SQL directo vía el pool `pg`, como el resto del repo.
- **Regla crítica #4 (CLAUDE.md):** no inventar campos/endpoints de CuidameDoc. Confirmado en esta sesión contra el código real de `cuidame_doc_backend` (`booking.routes.ts`/`booking.controller.ts`/`booking.service.ts`): `POST /booking/my-services` acepta exactamente `service_name, description, category, duration_minutes, price, target_professional_id`; `DELETE /booking/my-services/:profServiceId`; **no existe** endpoint de edición (solo GET/POST/DELETE en `/my-services`) — "actualizar" sigue siendo borrar+crear.
- **CuidameDoc nunca bloquea el guardado local** — mismo principio que ya usa `ensureDocSync`: toda llamada de red vuelve `{ ok, error? }`, nunca lanza, y el guardado local en Medis se completa aunque CuidameDoc falle.
- **Sin backfill** — los comerciales que ya existen (creados en la fase anterior, todos con `doc_prof_service_id: null`) no se publican automáticamente al desplegar este cambio; se publican la próxima vez que alguien los guarde/active desde el panel.
- **Sin cambios de esquema** — `service_commercial.doc_prof_service_id` ya existe (migración `028_service_commercial.sql`), reservada exactamente para esto. No se crea ninguna migración nueva.
- **Sin cambios de frontend** — todo el trabajo de esta fase es backend puro; el panel admin ya tiene el CRUD de comerciales construido (`ServiciosComercialesTab.tsx`), solo cambia lo que pasa en el servidor al guardar.

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `apps/backend/src/services/docServiceSync.service.ts` | **Modificar.** Motor genérico borrar+crear en CuidameDoc — deja de estar atado a `service_catalog`, acepta `targetTable`. |
| `apps/backend/src/services/docServiceSync.service.test.ts` | **Modificar.** Mismos tests, actualizados al nuevo parámetro, más un test que prueba `targetTable: 'service_commercial'`. |
| `apps/backend/src/repositories/services.repository.ts` | **Modificar.** `ServiceCatalogRepository.findWithRepresentativeOffer(id)` — trae los datos del operativo + su oferta más reciente (duración, profesional) en una sola consulta. |
| `apps/backend/src/repositories/services.repository.test.ts` | **Crear.** Solo prueba el método nuevo (el resto del archivo no tiene tests hoy — fuera de alcance tocarlos). |
| `apps/backend/src/repositories/serviceCommercial.repository.ts` | **Modificar.** `findPublishedByOperativoId(operativoId)` — comerciales de ese operativo que ya están publicados (`doc_prof_service_id IS NOT NULL`). |
| `apps/backend/src/repositories/serviceCommercial.repository.test.ts` | **Modificar.** Agrega el test del método nuevo. |
| `apps/backend/src/services/commercialDocSync.service.ts` | **Crear.** Arma los parámetros de sync de un comercial heredando del operativo vinculado (`syncCommercialToDoc`) y re-sincroniza todos los comerciales publicados de un operativo (`resyncPublishedCommercialsForOperativo`). Vive en `services/` (no en un controller) para que tanto `serviceCommercial.controller.ts` como `services.controller.ts` lo importen sin que un controller importe a otro. |
| `apps/backend/src/services/commercialDocSync.service.test.ts` | **Crear.** |
| `apps/backend/src/controllers/serviceCommercial.controller.ts` | **Modificar.** `createCommercial`/`updateCommercial`/`deleteCommercial` disparan `syncCommercialToDoc`. |
| `apps/backend/src/controllers/serviceCommercial.controller.test.ts` | **Modificar.** Agrega casos que verifican el disparo (mockeando `fetch`) y que confirman explícitamente que los tests existentes (sin mock de `fetch`) siguen sin tocar la red — ver Task 4. |
| `apps/backend/src/controllers/services.controller.ts` | **Modificar.** Quita `ensureDocSync`/`buildDocSyncParams` de `createOffer`/`updateOffer`/`deleteOffer`; `updateOffer` dispara `resyncPublishedCommercialsForOperativo` cuando corresponde. |
| `apps/backend/src/controllers/services.controller.test.ts` | **Crear.** Primer archivo de test de este controller — cubre solo el comportamiento nuevo/cambiado (que un operativo ya no publica nada solo, y que editarlo re-sincroniza comerciales publicados). |
| `decisiones.md` | **Modificar.** Cierra la decisión diferida de la línea 62 con lo implementado. |
| `arquitectura.md` | **Modificar.** Documenta el mecanismo nuevo bajo la sección "Servicios Comerciales vs. Operativos". |

---

### Task 1: Generalizar `ensureDocSync` para publicar en `service_catalog` o `service_commercial`

**Files:**
- Modify: `apps/backend/src/services/docServiceSync.service.ts`
- Modify: `apps/backend/src/services/docServiceSync.service.test.ts`

**Interfaces:**
- Produces: `export type DocSyncTargetTable = 'service_catalog' | 'service_commercial'`; `export interface EnsureDocSyncParams { targetTable: DocSyncTargetTable; targetId: string; active: boolean; serviceName: string; durationMinutes: number; categoryGroup: string; description?: string | null; price: number; professionalUserId?: string | null; }`; `export interface EnsureDocSyncResult { ok: boolean; error?: string }`; `export async function ensureDocSync(params: EnsureDocSyncParams): Promise<EnsureDocSyncResult>`; `export function mapCategoryGroupToDocCategory(categoryGroup: string): string` (sin cambios).

- [ ] **Step 1: Reescribir `docServiceSync.service.ts` con el motor parametrizado**

Reemplazar el contenido completo del archivo por:

```ts
// ============================================================
// apps/backend/src/services/docServiceSync.service.ts
// Motor genérico de sincronización con CuidameDoc (professional_id=12,
// OpiMed). Publica/despublica un servicio a partir de una fila local cuya
// columna `doc_prof_service_id` trackea el `prof_service_id` de
// CuidameDoc — hoy esa fila es un comercial (`service_commercial`), antes
// (fase anterior, ya no se llama así) era el operativo (`service_catalog`);
// `targetTable` es lo único que cambia entre los dos casos, así que el
// motor no se duplica.
// CuidameDoc no tiene endpoint de edición: "actualizar" siempre es borrar
// + crear. Nunca lanza — toda llamada de red vuelve como { ok, error? }
// para que el llamador pueda decidir qué hacer sin que un fallo de
// CuidameDoc tumbe el guardado local.
// ============================================================

import { pool } from '@config/database.js';
import { env } from '@config/env.js';
import { withDocAuth } from '@utils/docAuth.js';

/**
 * Únicas tablas locales que tienen columna `doc_prof_service_id`. Es un
 * tipo literal (no un `string` cualquiera) a propósito: `targetTable` se
 * interpola directo en el SQL de abajo porque Postgres no permite
 * parametrizar nombres de tabla con `$1` — restringirlo a este union en
 * tiempo de compilación es lo que hace esa interpolación segura (no puede
 * llegar un valor arbitrario del request, solo uno de estos dos literales
 * elegidos en el código).
 */
export type DocSyncTargetTable = 'service_catalog' | 'service_commercial';

export interface EnsureDocSyncParams {
  targetTable: DocSyncTargetTable;
  targetId: string;
  active: boolean;
  serviceName: string;
  durationMinutes: number;
  categoryGroup: string;
  description?: string | null;
  price: number;
  /** Medis user id (uuid) del médico asignado a esta oferta, si tiene uno. */
  professionalUserId?: string | null;
}

export interface EnsureDocSyncResult {
  ok: boolean;
  error?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  '01 Consulta externa': 'consultation',
  '02 Apoyo diagnóstico y complementación terapéutica': 'diagnostic',
  '03 Internación': 'procedure',
  '04 Quirúrgico': 'procedure',
  '05 Atención inmediata': 'consultation',
};

export function mapCategoryGroupToDocCategory(categoryGroup: string): string {
  return CATEGORY_MAP[categoryGroup] ?? 'consultation';
}

async function getCurrentDocProfServiceId(table: DocSyncTargetTable, id: string): Promise<number | null> {
  const { rows } = await pool.query(
    `SELECT doc_prof_service_id FROM ${table} WHERE id = $1`, [id]
  );
  return rows[0]?.doc_prof_service_id ?? null;
}

async function setDocProfServiceId(table: DocSyncTargetTable, id: string, value: number | null): Promise<void> {
  await pool.query(
    `UPDATE ${table} SET doc_prof_service_id = $1 WHERE id = $2`, [value, id]
  );
}

/** Busca el professional_id real en CuidameDoc para un usuario local de Medis, si ya fue aprovisionado. */
async function getDocProfessionalIdForUser(userId: string): Promise<number | null> {
  const { rows } = await pool.query(
    'SELECT doc_professional_id FROM users WHERE id = $1', [userId]
  );
  return rows[0]?.doc_professional_id ?? null;
}

async function createDocService(params: {
  serviceName: string; durationMinutes: number; categoryGroup: string;
  description?: string | null; price: number; professionalUserId?: string | null;
}): Promise<{ ok: true; profServiceId: number } | { ok: false; error: string }> {
  try {
    const targetProfessionalId = params.professionalUserId
      ? await getDocProfessionalIdForUser(params.professionalUserId)
      : null;

    const body = JSON.stringify({
      service_name: params.serviceName,
      duration_minutes: params.durationMinutes,
      category: mapCategoryGroupToDocCategory(params.categoryGroup),
      description: params.description ?? undefined,
      price: params.price,
      // Si el doctor asignado a la oferta ya está aprovisionado en
      // CuidameDoc, el servicio queda a su nombre; si no, CuidameDoc lo
      // crea bajo la doctora autenticada (comportamiento de siempre).
      target_professional_id: targetProfessionalId ?? undefined,
    });
    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/booking/my-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
        signal: AbortSignal.timeout(8000),
      })
    );
    const json = await res.json() as { success: boolean; data?: { prof_service_id: number }; message?: string };
    if (!res.ok || !json.success || !json.data) {
      return { ok: false, error: json.message ?? `CuidameDoc respondió ${res.status}` };
    }
    return { ok: true, profServiceId: json.data.prof_service_id };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

async function deleteDocService(profServiceId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/booking/my-services/${profServiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      })
    );
    // 404 = ya no existía en CuidameDoc; lo tratamos como éxito (idempotente).
    if (res.status === 404) return { ok: true };
    const json = await res.json() as { success: boolean; message?: string };
    if (!res.ok || !json.success) {
      return { ok: false, error: json.message ?? `CuidameDoc respondió ${res.status}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function ensureDocSync(params: EnsureDocSyncParams): Promise<EnsureDocSyncResult> {
  try {
    const currentId = await getCurrentDocProfServiceId(params.targetTable, params.targetId);

    if (!params.active) {
      if (currentId === null) return { ok: true }; // ya estaba fuera, nada que hacer
      const del = await deleteDocService(currentId);
      if (!del.ok) return { ok: false, error: del.error };
      await setDocProfServiceId(params.targetTable, params.targetId, null);
      return { ok: true };
    }

    // active === true
    if (currentId !== null) {
      const del = await deleteDocService(currentId);
      if (!del.ok) return { ok: false, error: del.error };
      // Immediately clear DB after successful delete but before create attempt,
      // so if create fails, the DB is left in accurate "not synced" state.
      await setDocProfServiceId(params.targetTable, params.targetId, null);
    }

    const created = await createDocService({
      serviceName: params.serviceName,
      durationMinutes: params.durationMinutes,
      categoryGroup: params.categoryGroup,
      description: params.description,
      price: params.price,
      professionalUserId: params.professionalUserId,
    });
    if (!created.ok) return { ok: false, error: created.error };

    await setDocProfServiceId(params.targetTable, params.targetId, created.profServiceId);
    return { ok: true };
  } catch (err: unknown) {
    // Nunca lanza: cualquier error inesperado (p.ej. las consultas directas a
    // la BD en getCurrentDocProfServiceId/setDocProfServiceId, que no tienen
    // su propio try/catch) se convierte en un resultado { ok: false } en vez
    // de propagarse y tumbar la respuesta del controlador con un 500 cuando
    // el guardado local ya se completó con éxito.
    return { ok: false, error: (err as Error).message };
  }
}
```

- [ ] **Step 2: Run the existing tests to confirm they now fail to compile (old `catalogId` field no longer exists)**

Run: `cd apps/backend && npx tsx --test src/services/docServiceSync.service.test.ts`
Expected: FAIL — TypeScript errors on every call passing `catalogId` (property doesn't exist on `EnsureDocSyncParams`).

- [ ] **Step 3: Update the test file to the new parameter shape, and add one test proving the generic `targetTable` actually works against `service_commercial`**

Replace the full content of `apps/backend/src/services/docServiceSync.service.test.ts` with:

```ts
import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ServiceCatalogRepository } from '@repositories/services.repository.js';
import { ensureDocSync, mapCategoryGroupToDocCategory } from './docServiceSync.service.js';

after(async () => {
  await pool.end();
});

async function createTestCatalog(overrides: Record<string, unknown> = {}) {
  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Consulta de prueba doc-sync',
    categoryGroup: '01 Consulta externa',
    description: 'Servicio de prueba',
    basePrice: 80000,
    isActive: true,
    ...overrides,
  });
  return catalog.id;
}

async function getDocProfServiceId(catalogId: string): Promise<number | null> {
  const { rows } = await pool.query(
    'SELECT doc_prof_service_id FROM service_catalog WHERE id = $1', [catalogId]
  );
  return rows[0]?.doc_prof_service_id ?? null;
}

async function deleteTestCatalog(catalogId: string) {
  await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
}

async function createTestCommercial(operativoId: string): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO service_commercial (name, operativo_id, is_active)
     VALUES ($1, $2, TRUE) RETURNING id`,
    [`Comercial doc-sync test ${Date.now()}`, operativoId]
  );
  return rows[0].id;
}

async function getCommercialDocProfServiceId(commercialId: string): Promise<number | null> {
  const { rows } = await pool.query(
    'SELECT doc_prof_service_id FROM service_commercial WHERE id = $1', [commercialId]
  );
  return rows[0]?.doc_prof_service_id ?? null;
}

// Usa t.mock (no el `mock` global) para que Node restaure fetch automáticamente
// al terminar cada test, aunque el test falle a mitad de camino.
function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

test('mapCategoryGroupToDocCategory: mapea los grupos RIPS conocidos y usa consultation por defecto', () => {
  assert.equal(mapCategoryGroupToDocCategory('01 Consulta externa'), 'consultation');
  assert.equal(mapCategoryGroupToDocCategory('02 Apoyo diagnóstico y complementación terapéutica'), 'diagnostic');
  assert.equal(mapCategoryGroupToDocCategory('03 Internación'), 'procedure');
  assert.equal(mapCategoryGroupToDocCategory('04 Quirúrgico'), 'procedure');
  assert.equal(mapCategoryGroupToDocCategory('05 Atención inmediata'), 'consultation');
  assert.equal(mapCategoryGroupToDocCategory('algo desconocido'), 'consultation');
});

test('ensureDocSync: active=true sin doc_prof_service_id previo → crea en CuidameDoc y guarda el id', async (t) => {
  const catalogId = await createTestCatalog();
  t.after(() => deleteTestCatalog(catalogId));

  const calls: string[] = [];
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      calls.push('login');
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      calls.push('create');
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: 555, service_id: 1, name: 'x' } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await ensureDocSync({
    targetTable: 'service_catalog', targetId: catalogId,
    active: true, serviceName: 'Consulta de prueba doc-sync',
    durationMinutes: 30, categoryGroup: '01 Consulta externa', description: null, price: 80000,
  });

  assert.equal(result.ok, true);
  assert.ok(calls.includes('create'));
  assert.equal(await getDocProfServiceId(catalogId), 555);
});

test('ensureDocSync: active=true con doc_prof_service_id previo → borra el viejo y crea uno nuevo', async (t) => {
  const catalogId = await createTestCatalog();
  await pool.query('UPDATE service_catalog SET doc_prof_service_id = $1 WHERE id = $2', [123, catalogId]);
  t.after(() => deleteTestCatalog(catalogId));

  const calls: string[] = [];
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services/123') && init?.method === 'DELETE') {
      calls.push('delete-123');
      return new Response(JSON.stringify({ success: true, message: 'Servicio eliminado' }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      calls.push('create-new');
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: 777, service_id: 2, name: 'x' } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await ensureDocSync({
    targetTable: 'service_catalog', targetId: catalogId,
    active: true, serviceName: 'Consulta de prueba doc-sync',
    durationMinutes: 45, categoryGroup: '01 Consulta externa', description: 'nueva descripción', price: 95000,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ['delete-123', 'create-new']);
  assert.equal(await getDocProfServiceId(catalogId), 777);
});

test('ensureDocSync: active=true con doc_prof_service_id previo, delete OK pero create falla → DB queda en estado consistente (null)', async (t) => {
  const catalogId = await createTestCatalog();
  await pool.query('UPDATE service_catalog SET doc_prof_service_id = $1 WHERE id = $2', [456, catalogId]);
  t.after(() => deleteTestCatalog(catalogId));

  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services/456') && init?.method === 'DELETE') {
      return new Response(JSON.stringify({ success: true, message: 'Servicio eliminado' }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      throw new TypeError('fetch failed: network error');
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await ensureDocSync({
    targetTable: 'service_catalog', targetId: catalogId,
    active: true, serviceName: 'Consulta de prueba doc-sync',
    durationMinutes: 30, categoryGroup: '01 Consulta externa', description: null, price: 80000,
  });

  assert.equal(result.ok, false);
  assert.ok(result.error);
  // DB should be left in accurate "not synced" state, not with stale ID
  assert.equal(await getDocProfServiceId(catalogId), null);
});

test('ensureDocSync: active=false con doc_prof_service_id previo → borra en CuidameDoc y limpia la columna', async (t) => {
  const catalogId = await createTestCatalog();
  await pool.query('UPDATE service_catalog SET doc_prof_service_id = $1 WHERE id = $2', [321, catalogId]);
  t.after(() => deleteTestCatalog(catalogId));

  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services/321') && init?.method === 'DELETE') {
      return new Response(JSON.stringify({ success: true, message: 'Servicio eliminado' }), { status: 200 });
    }
    throw new Error(`fetch inesperado: ${url}`);
  });

  const result = await ensureDocSync({
    targetTable: 'service_catalog', targetId: catalogId,
    active: false, serviceName: 'x', durationMinutes: 30,
    categoryGroup: '01 Consulta externa', description: null, price: 0,
  });

  assert.equal(result.ok, true);
  assert.equal(await getDocProfServiceId(catalogId), null);
});

test('ensureDocSync: active=false sin doc_prof_service_id previo → no hace ninguna llamada de red', async (t) => {
  const catalogId = await createTestCatalog();
  t.after(() => deleteTestCatalog(catalogId));

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const result = await ensureDocSync({
    targetTable: 'service_catalog', targetId: catalogId,
    active: false, serviceName: 'x', durationMinutes: 30,
    categoryGroup: '01 Consulta externa', description: null, price: 0,
  });

  assert.equal(result.ok, true);
  assert.equal(await getDocProfServiceId(catalogId), null);
});

test('ensureDocSync: si la consulta a la BD falla (targetId inválido), retorna ok:false en vez de lanzar', async (t) => {
  // No debería haber ninguna llamada de red: la excepción ocurre en el
  // primer SELECT (getCurrentDocProfServiceId) antes de tocar la red.
  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  await assert.doesNotReject(async () => {
    const result = await ensureDocSync({
      targetTable: 'service_catalog', targetId: 'not-a-valid-uuid',
      active: true, serviceName: 'x', durationMinutes: 30,
      categoryGroup: '01 Consulta externa', description: null, price: 10000,
    });
    assert.equal(result.ok, false);
    assert.ok(result.error);
  });
});

test('ensureDocSync: si CuidameDoc falla, retorna ok:false y no cambia el estado guardado', async (t) => {
  const catalogId = await createTestCatalog();
  t.after(() => deleteTestCatalog(catalogId));

  fetchMock(t, (url) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    throw new TypeError('fetch failed: network error');
  });

  const result = await ensureDocSync({
    targetTable: 'service_catalog', targetId: catalogId,
    active: true, serviceName: 'x', durationMinutes: 30,
    categoryGroup: '01 Consulta externa', description: null, price: 10000,
  });

  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.equal(await getDocProfServiceId(catalogId), null);
});

test('ensureDocSync: targetTable "service_commercial" escribe en service_commercial, no en service_catalog', async (t) => {
  const operativoId = await createTestCatalog();
  const commercialId = await createTestCommercial(operativoId);
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [commercialId]));
  t.after(() => deleteTestCatalog(operativoId));

  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: 999, service_id: 9, name: 'x' } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await ensureDocSync({
    targetTable: 'service_commercial', targetId: commercialId,
    active: true, serviceName: 'Botox facial', durationMinutes: 30,
    categoryGroup: '01 Consulta externa', description: 'desc', price: 150000,
  });

  assert.equal(result.ok, true);
  assert.equal(await getCommercialDocProfServiceId(commercialId), 999);
  // El operativo vinculado no debe haber sido tocado
  assert.equal(await getDocProfServiceId(operativoId), null);
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx tsx --test src/services/docServiceSync.service.test.ts`
Expected: PASS (9 tests, 0 failures).

- [ ] **Step 5: Fix the two manual one-off scripts that still call `ensureDocSync` with the old `catalogId` field**

`apps/backend/src/scripts/backfill-doc-sync.ts` and `apps/backend/src/scripts/resync-doc-professionals.ts` are historical, already-run-once scripts (see `decisiones.md` history: corridos en producción 2026-08-05 y 2026-08-20 respectivamente) — no se re-ejecutan como parte de este trabajo, pero deben seguir compilando. Ambos operan sobre `service_catalog` (el modelo viejo, operativo-céntrico), así que su `targetTable` es `'service_catalog'`, preservando exactamente su comportamiento histórico.

In `apps/backend/src/scripts/backfill-doc-sync.ts`, change:
```ts
    const result = await ensureDocSync({
      catalogId: row.id,
      active: true,
```
to:
```ts
    const result = await ensureDocSync({
      targetTable: 'service_catalog',
      targetId: row.id,
      active: true,
```

In `apps/backend/src/scripts/resync-doc-professionals.ts`, change:
```ts
    const result = await ensureDocSync({
      catalogId: row.id,
      active: true,
```
to:
```ts
    const result = await ensureDocSync({
      targetTable: 'service_catalog',
      targetId: row.id,
      active: true,
```

- [ ] **Step 6: Type-check the whole backend to confirm nothing else references the old `catalogId` field**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors. (If any other file references `EnsureDocSyncParams.catalogId`, this is where it surfaces — fix it the same way before continuing.)

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/services/docServiceSync.service.ts apps/backend/src/services/docServiceSync.service.test.ts apps/backend/src/scripts/backfill-doc-sync.ts apps/backend/src/scripts/resync-doc-professionals.ts
git commit -m "refactor(backend): generalize ensureDocSync to target service_catalog or service_commercial

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Repositorios — oferta representativa del operativo, comerciales ya publicados de un operativo

**Files:**
- Modify: `apps/backend/src/repositories/services.repository.ts`
- Create: `apps/backend/src/repositories/services.repository.test.ts`
- Modify: `apps/backend/src/repositories/serviceCommercial.repository.ts`
- Modify: `apps/backend/src/repositories/serviceCommercial.repository.test.ts`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `ServiceCatalogRepository.findWithRepresentativeOffer(id: string): Promise<{ id: string; serviceName: string; categoryGroup: string | null; basePrice: number; isActive: boolean; representativeOffer: { durationMinutes: number; professionalUserId: string | null } | null } | null>`; `ServiceCommercialRepository.findPublishedByOperativoId(operativoId: string): Promise<ServiceCommercialPublic[]>` — ambos consumidos por Task 3.

- [ ] **Step 1: Write the failing test for `findWithRepresentativeOffer`**

Create `apps/backend/src/repositories/services.repository.test.ts`:

```ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ServiceCatalogRepository, ServiceOfferRepository } from './services.repository.js';

after(async () => {
  await pool.end();
});

async function createTestLocation(): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO locations (name, address) VALUES ($1, 'Dirección de prueba') RETURNING id`,
    [`Sede repo test ${Date.now()}`]
  );
  return rows[0].id;
}

async function createTestAdmin(): Promise<string> {
  const { rows } = await pool.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
  return rows[0].id;
}

test('findWithRepresentativeOffer: operativo sin ofertas → representativeOffer null', async (t) => {
  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo sin ofertas', categoryGroup: '01 Consulta externa', basePrice: 70000, isActive: true,
  });
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]));

  const found = await ServiceCatalogRepository.findWithRepresentativeOffer(catalog.id);
  assert.ok(found);
  assert.equal(found!.serviceName, 'Operativo sin ofertas');
  assert.equal(found!.basePrice, 70000);
  assert.equal(found!.representativeOffer, null);
});

test('findWithRepresentativeOffer: con ofertas → trae duración y profesional de la más reciente', async (t) => {
  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo con ofertas', categoryGroup: '02 Apoyo diagnóstico y complementación terapéutica', basePrice: 120000, isActive: true,
  });
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]));

  const locationId = await createTestLocation();
  t.after(() => pool.query('DELETE FROM locations WHERE id = $1', [locationId]));
  const adminId = await createTestAdmin();

  const offer1 = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión 1',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);
  await new Promise((r) => setTimeout(r, 10)); // asegura created_at distinto
  const offer2 = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión 2',
    capacity: 1, durationMinutes: 45, scheduledAt: new Date(Date.now() + 7200_000).toISOString(),
  } as any, adminId);
  t.after(() => pool.query('DELETE FROM service_offers WHERE id = ANY($1)', [[offer1.id, offer2.id]]));

  const found = await ServiceCatalogRepository.findWithRepresentativeOffer(catalog.id);
  assert.ok(found!.representativeOffer);
  // La más reciente creada (offer2) es la representativa
  assert.equal(found!.representativeOffer!.durationMinutes, 45);
});

test('findWithRepresentativeOffer: operativoId inexistente → null', async () => {
  const found = await ServiceCatalogRepository.findWithRepresentativeOffer('00000000-0000-0000-0000-000000000000');
  assert.equal(found, null);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/backend && npx tsx --test src/repositories/services.repository.test.ts`
Expected: FAIL — `ServiceCatalogRepository.findWithRepresentativeOffer is not a function`.

- [ ] **Step 3: Implement `findWithRepresentativeOffer`**

In `apps/backend/src/repositories/services.repository.ts`, inside `export const ServiceCatalogRepository = { ... }`, add this method right after `listActive` (keep the existing `create`/`update`/`listActive` untouched):

```ts
  /**
   * Datos del operativo + su oferta más reciente (duration_minutes,
   * professional_id) en una sola consulta. `service_catalog` no tiene
   * columnas propias de duración/profesional — esos viven en
   * `service_offers` — así que "la oferta representativa" es la más
   * recientemente creada bajo este operativo. Usado para heredar
   * duración/categoría/precio/profesional al publicar un comercial en
   * CuidameDoc (ver commercialDocSync.service.ts).
   */
  async findWithRepresentativeOffer(id: string): Promise<{
    id: string;
    serviceName: string;
    categoryGroup: string | null;
    basePrice: number;
    isActive: boolean;
    representativeOffer: { durationMinutes: number; professionalUserId: string | null } | null;
  } | null> {
    const { rows } = await pool.query(
      `SELECT
         c.id, c.service_name AS "serviceName", c.category_group AS "categoryGroup",
         c.base_price AS "basePrice", c.is_active AS "isActive",
         o.duration_minutes AS "offerDurationMinutes", o.professional_id AS "offerProfessionalId"
       FROM service_catalog c
       LEFT JOIN LATERAL (
         SELECT duration_minutes, professional_id
         FROM service_offers
         WHERE catalog_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) o ON true
       WHERE c.id = $1`,
      [id]
    );
    if (!rows[0]) return null;
    const row = rows[0];
    return {
      id: row.id,
      serviceName: row.serviceName,
      categoryGroup: row.categoryGroup,
      // NUMERIC llega como string de pg (sin type parser registrado) —
      // mismo guard que ya usa buildDocSyncParams en services.controller.ts.
      basePrice: Number(row.basePrice ?? 0),
      isActive: row.isActive,
      representativeOffer: row.offerDurationMinutes != null
        ? { durationMinutes: row.offerDurationMinutes, professionalUserId: row.offerProfessionalId ?? null }
        : null,
    };
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx tsx --test src/repositories/services.repository.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test for `findPublishedByOperativoId`**

In `apps/backend/src/repositories/serviceCommercial.repository.test.ts`, add at the end (before nothing else — it's the last file):

```ts
test('findPublishedByOperativoId: solo trae comerciales con doc_prof_service_id no nulo, de ese operativo', async (t) => {
  const operativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativo.id]));

  const otroOperativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [otroOperativo.id]));

  const published = await ServiceCommercialRepository.create({ name: 'Publicado', operativoId: operativo.id });
  const unpublished = await ServiceCommercialRepository.create({ name: 'Sin publicar', operativoId: operativo.id });
  const publishedOther = await ServiceCommercialRepository.create({ name: 'Publicado de otro operativo', operativoId: otroOperativo.id });
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = ANY($1)', [[published.id, unpublished.id, publishedOther.id]]));

  await pool.query('UPDATE service_commercial SET doc_prof_service_id = 111 WHERE id = $1', [published.id]);
  await pool.query('UPDATE service_commercial SET doc_prof_service_id = 222 WHERE id = $1', [publishedOther.id]);

  const result = await ServiceCommercialRepository.findPublishedByOperativoId(operativo.id);
  const ids = result.map((c) => c.id);
  assert.deepEqual(ids, [published.id]);
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `cd apps/backend && npx tsx --test src/repositories/serviceCommercial.repository.test.ts`
Expected: FAIL — `ServiceCommercialRepository.findPublishedByOperativoId is not a function`.

- [ ] **Step 7: Implement `findPublishedByOperativoId`**

In `apps/backend/src/repositories/serviceCommercial.repository.ts`, add inside the exported object, right after `findById`:

```ts
  async findPublishedByOperativoId(operativoId: string): Promise<ServiceCommercialPublic[]> {
    const { rows } = await pool.query(
      `${SELECT} WHERE sc.operativo_id = $1 AND sc.doc_prof_service_id IS NOT NULL`,
      [operativoId]
    );
    return rows.map(rowToCommercial);
  },
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd apps/backend && npx tsx --test src/repositories/serviceCommercial.repository.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/repositories/services.repository.ts apps/backend/src/repositories/services.repository.test.ts apps/backend/src/repositories/serviceCommercial.repository.ts apps/backend/src/repositories/serviceCommercial.repository.test.ts
git commit -m "feat(backend): add operativo representative-offer lookup and published-commercials-by-operativo query

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `commercialDocSync.service.ts` — heredar del operativo y re-sincronizar comerciales publicados

**Files:**
- Create: `apps/backend/src/services/commercialDocSync.service.ts`
- Create: `apps/backend/src/services/commercialDocSync.service.test.ts`

**Interfaces:**
- Consumes: `ensureDocSync`, `EnsureDocSyncResult` (Task 1); `ServiceCatalogRepository.findWithRepresentativeOffer` (Task 2); `ServiceCommercialRepository.findPublishedByOperativoId` (Task 2); `ServiceCommercialPublic` (`@medisopimed/shared-types`, ya existe: `{ id, name, description, imageUrl, operativoId, operativoName, isActive, docProfServiceId, createdAt, updatedAt }`).
- Produces: `export async function syncCommercialToDoc(commercial: ServiceCommercialPublic, active: boolean): Promise<EnsureDocSyncResult>`; `export async function resyncPublishedCommercialsForOperativo(operativoId: string): Promise<Array<{ id: string; ok: boolean; error?: string }>>` — ambos consumidos por Task 4 y Task 5.

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/services/commercialDocSync.service.test.ts`:

```ts
import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ServiceCatalogRepository, ServiceOfferRepository } from '@repositories/services.repository.js';
import { ServiceCommercialRepository } from '@repositories/serviceCommercial.repository.js';
import { syncCommercialToDoc, resyncPublishedCommercialsForOperativo } from './commercialDocSync.service.js';

after(async () => {
  await pool.end();
});

function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

async function createOperativoConOferta(overrides: { durationMinutes?: number; basePrice?: number } = {}) {
  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Botox operativo', categoryGroup: '01 Consulta externa',
    basePrice: overrides.basePrice ?? 150000, isActive: true,
  });
  const { rows } = await pool.query(
    `INSERT INTO locations (name, address) VALUES ($1, 'Dirección de prueba') RETURNING id`,
    [`Sede commercialDocSync test ${Date.now()}`]
  );
  const locationId = rows[0].id;
  const { rows: adminRows } = await pool.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
  const adminId = adminRows[0].id;
  const offer = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión',
    capacity: 1, durationMinutes: overrides.durationMinutes ?? 40,
    scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);
  return { catalogId: catalog.id, locationId, offerId: offer.id };
}

async function cleanup(t: TestContext, ids: { catalogId: string; locationId: string; offerId: string }) {
  t.after(() => pool.query('DELETE FROM service_offers WHERE id = $1', [ids.offerId]));
  t.after(() => pool.query('DELETE FROM locations WHERE id = $1', [ids.locationId]));
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [ids.catalogId]));
}

test('syncCommercialToDoc: hereda duración/categoría/precio del operativo, nombre/descripción del comercial', async (t) => {
  const ids = await createOperativoConOferta({ durationMinutes: 40, basePrice: 150000 });
  await cleanup(t, ids);

  const commercial = await ServiceCommercialRepository.create({
    name: 'Botox facial premium', description: 'Ficha comercial', operativoId: ids.catalogId,
  });
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [commercial.id]));

  let sentBody: any;
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok', refresh_token: 'ref' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      sentBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: 42, service_id: 1, name: 'x' } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await syncCommercialToDoc(commercial, true);

  assert.equal(result.ok, true);
  assert.equal(sentBody.service_name, 'Botox facial premium');
  assert.equal(sentBody.description, 'Ficha comercial');
  assert.equal(sentBody.duration_minutes, 40);
  assert.equal(sentBody.price, 150000);
  assert.equal(sentBody.category, 'consultation');
});

test('syncCommercialToDoc: operativo sin ninguna oferta configurada y active=true → ok:false sin llamar a CuidameDoc', async (t) => {
  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo sin sesiones', categoryGroup: '01 Consulta externa', basePrice: 90000, isActive: true,
  });
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]));

  const commercial = await ServiceCommercialRepository.create({ name: 'Comercial huérfano de sesión', operativoId: catalog.id });
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [commercial.id]));

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const result = await syncCommercialToDoc(commercial, true);
  assert.equal(result.ok, false);
  assert.ok(result.error);
});

test('syncCommercialToDoc: active=false no requiere que el operativo tenga ofertas', async (t) => {
  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo sin sesiones 2', categoryGroup: '01 Consulta externa', basePrice: 90000, isActive: true,
  });
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]));

  const commercial = await ServiceCommercialRepository.create({ name: 'Comercial a despublicar', operativoId: catalog.id, isActive: false });
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [commercial.id]));

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const result = await syncCommercialToDoc(commercial, false);
  assert.equal(result.ok, true); // sin doc_prof_service_id previo, no hace ninguna llamada
});

test('resyncPublishedCommercialsForOperativo: re-sincroniza cada comercial publicado, ignora los no publicados', async (t) => {
  const ids = await createOperativoConOferta({ durationMinutes: 50, basePrice: 200000 });
  await cleanup(t, ids);

  const published = await ServiceCommercialRepository.create({ name: 'Publicado', operativoId: ids.catalogId });
  const unpublished = await ServiceCommercialRepository.create({ name: 'Sin publicar', operativoId: ids.catalogId });
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = ANY($1)', [[published.id, unpublished.id]]));
  await pool.query('UPDATE service_commercial SET doc_prof_service_id = 999 WHERE id = $1', [published.id]);

  const calls: string[] = [];
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok', refresh_token: 'ref' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services/999') && init?.method === 'DELETE') {
      calls.push('delete-999');
      return new Response(JSON.stringify({ success: true, message: 'ok' }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      calls.push('create');
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: 1000, service_id: 1, name: 'x' } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const results = await resyncPublishedCommercialsForOperativo(ids.catalogId);

  assert.deepEqual(results.map((r) => r.id), [published.id]);
  assert.equal(results[0]!.ok, true);
  assert.deepEqual(calls, ['delete-999', 'create']);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/backend && npx tsx --test src/services/commercialDocSync.service.test.ts`
Expected: FAIL — cannot find module `./commercialDocSync.service.js`.

- [ ] **Step 3: Implement `commercialDocSync.service.ts`**

Create `apps/backend/src/services/commercialDocSync.service.ts`:

```ts
// ============================================================
// apps/backend/src/services/commercialDocSync.service.ts
// Publica/despublica un service_commercial en CuidameDoc heredando
// duración/categoría/precio/profesional del operativo (service_catalog)
// vinculado — el comercial solo aporta su propio nombre/descripción.
// Ver spec: docs/superpowers/specs/2026-09-08-servicios-comerciales-operativos-design.md
// (sección "Fuera de alcance de esta fase").
// ============================================================

import { ServiceCatalogRepository } from '@repositories/services.repository.js';
import { ServiceCommercialRepository } from '@repositories/serviceCommercial.repository.js';
import { ensureDocSync, type EnsureDocSyncResult } from './docServiceSync.service.js';
import type { ServiceCommercialPublic } from '@medisopimed/shared-types';

/**
 * Publica (active=true) o despublica (active=false) un comercial en
 * CuidameDoc. `active` se recibe explícito en vez de leerse de
 * `commercial.isActive` porque el llamador a veces necesita forzar el
 * valor "de destino" antes de que la fila local ya lo refleje (p.ej.
 * updateCommercial construye el comercial actualizado en memoria).
 */
export async function syncCommercialToDoc(
  commercial: ServiceCommercialPublic,
  active: boolean
): Promise<EnsureDocSyncResult> {
  const operativo = await ServiceCatalogRepository.findWithRepresentativeOffer(commercial.operativoId);
  if (!operativo) {
    return { ok: false, error: 'El servicio operativo vinculado ya no existe' };
  }
  // Publicar requiere duración (vive en la oferta, no en el operativo) —
  // despublicar no la necesita (ensureDocSync con active=false solo borra
  // por doc_prof_service_id, sin tocar estos campos).
  if (active && !operativo.representativeOffer) {
    return { ok: false, error: 'El operativo vinculado no tiene ninguna sesión configurada; no se puede publicar en CuidameDoc' };
  }

  return ensureDocSync({
    targetTable: 'service_commercial',
    targetId: commercial.id,
    active,
    serviceName: commercial.name,
    description: commercial.description,
    durationMinutes: operativo.representativeOffer?.durationMinutes ?? 0,
    categoryGroup: operativo.categoryGroup ?? '01 Consulta externa',
    price: operativo.basePrice,
    professionalUserId: operativo.representativeOffer?.professionalUserId ?? null,
  });
}

/**
 * Cuando se edita un operativo (nombre/precio/categoría/duración/
 * profesional), todo comercial ya publicado que cuelgue de él heredó esos
 * datos en su momento y quedó desactualizado en CuidameDoc — se
 * re-sincroniza cada uno (borrar+crear, con los datos ya actualizados).
 * Los comerciales no publicados (doc_prof_service_id null) se ignoran: no
 * hay nada que actualizar en CuidameDoc para ellos todavía.
 */
export async function resyncPublishedCommercialsForOperativo(
  operativoId: string
): Promise<Array<{ id: string; ok: boolean; error?: string }>> {
  const published = await ServiceCommercialRepository.findPublishedByOperativoId(operativoId);
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const commercial of published) {
    const result = await syncCommercialToDoc(commercial, commercial.isActive);
    // Spread condicional en vez de `error: result.error` — así un éxito
    // produce { id, ok: true } sin una clave `error: undefined` de más
    // (los tests comparan este shape exacto con assert.deepEqual).
    results.push({ id: commercial.id, ok: result.ok, ...(result.error ? { error: result.error } : {}) });
  }
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx tsx --test src/services/commercialDocSync.service.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/commercialDocSync.service.ts apps/backend/src/services/commercialDocSync.service.test.ts
git commit -m "feat(backend): add commercialDocSync — publish/resync service_commercial to CuidameDoc

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Disparar la publicación desde el ciclo de vida del comercial

**Files:**
- Modify: `apps/backend/src/controllers/serviceCommercial.controller.ts`
- Modify: `apps/backend/src/controllers/serviceCommercial.controller.test.ts`

**Interfaces:**
- Consumes: `syncCommercialToDoc` (Task 3); `ServiceCommercialRepository` (existente, sin cambios de forma).
- Produces: `createCommercial`/`updateCommercial`/`deleteCommercial` ahora devuelven `docSync?: { ok: boolean; error?: string }` en el JSON de respuesta cuando intentaron sincronizar (mismo shape que ya usan `createOffer`/`updateOffer`/`deleteOffer` en `services.controller.ts`).

- [ ] **Step 1: Write the failing tests**

In `apps/backend/src/controllers/serviceCommercial.controller.test.ts`:

1. Change line 1 from `import { test, after } from 'node:test';` to `import { test, after, type TestContext } from 'node:test';` (needed for the `fetchMock` helper's type annotation).
2. Add at the end of the file (the `fetchMock` helper, then the new test cases):

```ts
function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

async function createTestOperativoConOferta(): Promise<string> {
  const operativoId = await createTestOperativo();
  const { rows: locRows } = await pool.query(
    `INSERT INTO locations (name, address) VALUES ($1, 'Dirección de prueba') RETURNING id`,
    [`Sede serviceCommercial controller test ${Date.now()}`]
  );
  const { rows: adminRows } = await pool.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
  await pool.query(
    `INSERT INTO service_offers (catalog_id, location_id, offer_type, title, capacity, duration_minutes, scheduled_at, created_by)
     VALUES ($1, $2, 'appointment', 'Sesión', 1, 40, NOW() + interval '1 day', $3)`,
    [operativoId, locRows[0].id, adminRows[0].id]
  );
  return operativoId;
}

test('createCommercial: isActive=true publica en CuidameDoc y guarda docProfServiceId', async (t) => {
  const operativoId = await createTestOperativoConOferta();
  t.after(() => pool.query('DELETE FROM service_offers WHERE catalog_id = $1', [operativoId]));
  t.after(() => pool.query('DELETE FROM locations WHERE name LIKE $1', ['Sede serviceCommercial controller test%']));
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok', refresh_token: 'ref' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: 4242, service_id: 1, name: 'x' } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const req: any = { body: { name: 'Botox facial', operativoId } };
  const res = makeRes();
  await createCommercial(req, res);
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [res.body.data.id]));

  assert.equal(res.body.docSync.ok, true);
  assert.equal(res.body.data.docProfServiceId, 4242);
});

test('updateCommercial: activar un comercial ya creado inactivo lo publica en CuidameDoc', async (t) => {
  const operativoId = await createTestOperativoConOferta();
  t.after(() => pool.query('DELETE FROM service_offers WHERE catalog_id = $1', [operativoId]));
  t.after(() => pool.query('DELETE FROM locations WHERE name LIKE $1', ['Sede serviceCommercial controller test%']));
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });
  const createReq: any = { body: { name: 'Inicialmente inactivo', operativoId, isActive: false } };
  const createRes = makeRes();
  await createCommercial(createReq, createRes);
  const id = createRes.body.data.id;
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [id]));
  assert.equal(createRes.body.docSync.ok, true); // active=false, sin llamadas de red

  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok', refresh_token: 'ref' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: 5151, service_id: 1, name: 'x' } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const updateReq: any = { params: { id }, body: { isActive: true } };
  const updateRes = makeRes();
  await updateCommercial(updateReq, updateRes);

  assert.equal(updateRes.body.docSync.ok, true);
  assert.equal(updateRes.body.data.docProfServiceId, 5151);
});

test('deleteCommercial: si estaba publicado, lo despublica en CuidameDoc antes de borrar', async (t) => {
  const operativoId = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  const createReq: any = { body: { name: 'A borrar publicado', operativoId, isActive: false } };
  const createRes = makeRes();
  await createCommercial(createReq, createRes);
  const id = createRes.body.data.id;
  await pool.query('UPDATE service_commercial SET doc_prof_service_id = 7171 WHERE id = $1', [id]);

  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok', refresh_token: 'ref' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services/7171') && init?.method === 'DELETE') {
      return new Response(JSON.stringify({ success: true, message: 'ok' }), { status: 200 });
    }
    throw new Error(`fetch inesperado: ${url}`);
  });

  const deleteReq: any = { params: { id } };
  const deleteRes = makeRes();
  await deleteCommercial(deleteReq, deleteRes);

  assert.equal(deleteRes.body.success, true);
  assert.equal(deleteRes.body.docSync.ok, true);
});

test('createCommercial/updateCommercial/deleteCommercial ya probados arriba (sin este mock) no llaman a la red: confirma que editar sin tocar campos relevantes no re-sincroniza', async (t) => {
  const operativoId = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const createReq: any = { body: { name: 'Sin cambios relevantes', operativoId, isActive: false } };
  const createRes = makeRes();
  await createCommercial(createReq, createRes);
  const id = createRes.body.data.id;
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [id]));

  // Update que no toca name/description/operativoId/isActive → no debe llamar ensureDocSync
  const updateReq: any = { params: { id }, body: { imageUrl: 'data:image/png;base64,AAA=' } };
  const updateRes = makeRes();
  await updateCommercial(updateReq, updateRes);
  assert.equal(updateRes.body.docSync, undefined);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/backend && npx tsx --test src/controllers/serviceCommercial.controller.test.ts`
Expected: FAIL — `res.body.docSync` is `undefined` where tests expect `{ ok: true }` (the controller doesn't sync yet), and the network-mocked tests throw `fetch inesperado` because nothing calls `fetch` yet in the paths that should.

- [ ] **Step 3: Wire `syncCommercialToDoc` into the controller**

Replace `apps/backend/src/controllers/serviceCommercial.controller.ts` with:

```ts
// ============================================================
// apps/backend/src/controllers/serviceCommercial.controller.ts
// Controller: Servicios Comerciales (ficha pública de venta)
// Publica/despublica en CuidameDoc vía commercialDocSync.service.ts —
// ver spec docs/superpowers/specs/2026-09-08-servicios-comerciales-operativos-design.md
// ============================================================

import type { Request, Response } from 'express';
import { ServiceCommercialRepository } from '@repositories/serviceCommercial.repository.js';
import { ServiceCatalogRepository } from '@repositories/services.repository.js';
import { syncCommercialToDoc } from '@services/commercialDocSync.service.js';
import type { ServiceCommercialPublic } from '@medisopimed/shared-types';

function isForeignKeyViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23503';
}

/** Campos que le importan a CuidameDoc — solo un cambio en alguno de estos justifica un delete+create. */
const DOC_SYNC_RELEVANT_FIELDS = ['name', 'description', 'operativoId', 'isActive'] as const;

function docSyncRelevantFieldsChanged(before: ServiceCommercialPublic, after: ServiceCommercialPublic): boolean {
  return DOC_SYNC_RELEVANT_FIELDS.some((f) => before[f] !== after[f]);
}

/** ADMIN ONLY */
export async function listCommercial(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ServiceCommercialRepository.findAll();
    res.json({ success: true, data });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function createCommercial(req: Request, res: Response): Promise<void> {
  try {
    const { name, operativoId } = req.body as { name?: string; operativoId?: string };
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
      return;
    }
    if (!operativoId) {
      res.status(400).json({ success: false, error: 'El servicio operativo es obligatorio' });
      return;
    }
    const commercial = await ServiceCommercialRepository.create({
      name: name.trim(),
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      operativoId,
      isActive: req.body.isActive,
    });

    const docSync = await syncCommercialToDoc(commercial, commercial.isActive);
    const refreshed = docSync.ok ? await ServiceCommercialRepository.findById(commercial.id) : commercial;

    res.status(201).json({ success: true, data: refreshed, docSync });
  } catch (err: unknown) {
    if (isForeignKeyViolation(err)) {
      res.status(400).json({ success: false, error: 'El servicio operativo seleccionado no existe' });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function updateCommercial(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    const before = await ServiceCommercialRepository.findById(id);
    if (!before) { res.status(404).json({ success: false, error: 'Servicio comercial no encontrado' }); return; }

    const updated = await ServiceCommercialRepository.update(id, req.body);
    if (!updated) { res.status(404).json({ success: false, error: 'Servicio comercial no encontrado' }); return; }

    let docSync: { ok: boolean; error?: string } | undefined;
    if (docSyncRelevantFieldsChanged(before, updated)) {
      docSync = await syncCommercialToDoc(updated, updated.isActive);
    }

    const refreshed = docSync?.ok ? await ServiceCommercialRepository.findById(id) : updated;
    res.json({ success: true, data: refreshed, ...(docSync ? { docSync } : {}) });
  } catch (err: unknown) {
    if (isForeignKeyViolation(err)) {
      res.status(400).json({ success: false, error: 'El servicio operativo seleccionado no existe' });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function deleteCommercial(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    const existing = await ServiceCommercialRepository.findById(id);
    if (!existing) { res.status(404).json({ success: false, error: 'Servicio comercial no encontrado' }); return; }

    let docSync: { ok: boolean; error?: string } | undefined;
    if (existing.docProfServiceId !== null) {
      docSync = await syncCommercialToDoc(existing, false);
    }

    const ok = await ServiceCommercialRepository.delete(id);
    if (!ok) { res.status(404).json({ success: false, error: 'Servicio comercial no encontrado' }); return; }
    res.json({ success: true, ...(docSync ? { docSync } : {}) });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — lista ligera de operativos activos, para el selector del formulario comercial */
export async function listOperativos(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ServiceCatalogRepository.listActive();
    res.json({ success: true, data });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
```

Nota: `createCommercial`/`updateCommercial` re-consultan el comercial (`findById`) después de un sync exitoso porque `syncCommercialToDoc` escribe `doc_prof_service_id` directo en la BD (vía `ensureDocSync`) sin devolver la fila completa — el objeto `commercial`/`updated` en memoria quedaría con ese campo desactualizado si no se refresca.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx tsx --test src/controllers/serviceCommercial.controller.test.ts`
Expected: PASS (todos, los 5 preexistentes + los nuevos).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/controllers/serviceCommercial.controller.ts apps/backend/src/controllers/serviceCommercial.controller.test.ts
git commit -m "feat(backend): publish/unpublish service_commercial to CuidameDoc on create/update/delete

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Quitar la publicación del operativo, re-sincronizar comerciales publicados al editarlo

**Files:**
- Modify: `apps/backend/src/controllers/services.controller.ts`
- Create: `apps/backend/src/controllers/services.controller.test.ts`

**Interfaces:**
- Consumes: `resyncPublishedCommercialsForOperativo` (Task 3).
- Produces: `updateOffer` ahora puede devolver `commercialResyncs?: Array<{ id: string; ok: boolean; error?: string }>` en vez de `docSync`; `createOffer`/`deleteOffer` ya no devuelven `docSync` en absoluto.

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/controllers/services.controller.test.ts` — cubre solo el comportamiento que cambia en esta tarea (el resto del controller no tiene tests hoy, fuera de alcance ampliarlos):

```ts
import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ServiceCatalogRepository, ServiceOfferRepository } from '@repositories/services.repository.js';
import { ServiceCommercialRepository } from '@repositories/serviceCommercial.repository.js';
import { createOffer, updateOffer, deleteOffer } from './services.controller.js';

after(async () => {
  await pool.end();
});

function makeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (payload: unknown) => { res.body = payload; return res; };
  return res;
}

function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

async function createTestLocation(): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO locations (name, address) VALUES ($1, 'Dirección de prueba') RETURNING id`,
    [`Sede services controller test ${Date.now()}`]
  );
  return rows[0].id;
}

async function getAdminId(): Promise<string> {
  const { rows } = await pool.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
  return rows[0].id;
}

test('createOffer: crear un operativo ya no llama a CuidameDoc ni devuelve docSync', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => pool.query('DELETE FROM locations WHERE id = $1', [locationId]));

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const req: any = {
    body: {
      serviceName: 'Operativo nuevo sin publicar', categoryGroup: '01 Consulta externa', basePrice: 100000, isActive: true,
      locationId, offerType: 'appointment', title: 'Sesión', capacity: 1, durationMinutes: 30,
      scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
    },
    user: { id: await getAdminId() },
  };
  const res = makeRes();
  await createOffer(req, res);

  const catalogId = res.body.data.offer.catalogId;
  t.after(() => pool.query('DELETE FROM service_offers WHERE catalog_id = $1', [catalogId]));
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]));

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.docSync, undefined);
});

test('updateOffer: editar un campo relevante del operativo re-sincroniza los comerciales ya publicados', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => pool.query('DELETE FROM locations WHERE id = $1', [locationId]));
  const adminId = await getAdminId();

  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo a editar', categoryGroup: '01 Consulta externa', basePrice: 100000, isActive: true,
  });
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]));

  const offer = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);
  t.after(() => pool.query('DELETE FROM service_offers WHERE id = $1', [offer.id]));

  const commercial = await ServiceCommercialRepository.create({ name: 'Comercial publicado', operativoId: catalog.id });
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [commercial.id]));
  await pool.query('UPDATE service_commercial SET doc_prof_service_id = 3131 WHERE id = $1', [commercial.id]);

  const calls: string[] = [];
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok', refresh_token: 'ref' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services/3131') && init?.method === 'DELETE') {
      calls.push('delete-3131');
      return new Response(JSON.stringify({ success: true, message: 'ok' }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      calls.push('create');
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: 4141, service_id: 1, name: 'x' } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const req: any = { params: { id: offer.id }, body: { basePrice: 130000 } };
  const res = makeRes();
  await updateOffer(req, res);

  assert.deepEqual(calls, ['delete-3131', 'create']);
  assert.deepEqual(res.body.commercialResyncs, [{ id: commercial.id, ok: true }]);
});

test('updateOffer: PATCH sin campos relevantes de catálogo no re-sincroniza nada', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => pool.query('DELETE FROM locations WHERE id = $1', [locationId]));
  const adminId = await getAdminId();

  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo sin cambios relevantes', categoryGroup: '01 Consulta externa', basePrice: 100000, isActive: true,
  });
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]));

  const offer = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);
  t.after(() => pool.query('DELETE FROM service_offers WHERE id = $1', [offer.id]));

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const req: any = { params: { id: offer.id }, body: { status: 'published' } };
  const res = makeRes();
  await updateOffer(req, res);

  assert.equal(res.body.commercialResyncs, undefined);
});

test('deleteOffer: borrar la última oferta de un operativo ya no llama a CuidameDoc', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => pool.query('DELETE FROM locations WHERE id = $1', [locationId]));
  const adminId = await getAdminId();

  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo a borrar', categoryGroup: '01 Consulta externa', basePrice: 100000, isActive: true,
  });
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]));

  const offer = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const req: any = { params: { id: offer.id } };
  const res = makeRes();
  await deleteOffer(req, res);

  assert.equal(res.body.success, true);
  assert.equal(res.body.docSync, undefined);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/backend && npx tsx --test src/controllers/services.controller.test.ts`
Expected: FAIL — `createOffer`/`updateOffer`/`deleteOffer` aún llaman a `ensureDocSync` directo (los tests que mockean `fetch` para lanzar `fetch inesperado` van a explotar; el de `commercialResyncs` va a fallar porque esa clave no existe todavía).

- [ ] **Step 3: Quitar la publicación directa del operativo, disparar la re-sincronización de comerciales**

In `apps/backend/src/controllers/services.controller.ts`:

1. Cambiar el import (línea 20) de:
```ts
import { ensureDocSync } from '@services/docServiceSync.service.js';
```
a:
```ts
import { resyncPublishedCommercialsForOperativo } from '@services/commercialDocSync.service.js';
```

2. Borrar por completo la función `buildDocSyncParams` (el bloque que empieza en `/** Build parameters for ensureDocSync call from offer data */` y termina justo antes de `// ─── OPERATING HOURS ─────────────────────────────────────────`) — ya no la usa nadie.

3. En `createOffer`, borrar el paso 3 completo:
```ts
    // 3. Sync with CuidameDoc
    const docSync = await ensureDocSync(buildDocSyncParams(offer, offer.catalog?.isActive !== false));

    res.status(201).json({ success: true, data: { offer }, docSync });
```
y dejar en su lugar:
```ts
    res.status(201).json({ success: true, data: { offer } });
```

4. En `updateOffer`, reemplazar el bloque de sync (desde el comentario `// 3. Sync with CuidameDoc` hasta el `res.json` de esa función) por:

```ts
    // 3. Re-sincronizar en CuidameDoc los comerciales YA PUBLICADOS de este
    //    operativo — el operativo mismo no publica nada por sí solo (eso lo
    //    decide el toggle "Estado del servicio" de cada comercial, no este
    //    endpoint). Mismas condiciones que antes decidían el delete+create
    //    directo del operativo: un cambio real de campo relevante de
    //    catálogo, o un cambio de duración/médico asignado (campos de la
    //    oferta) — así reasignar la oferta a otro médico o cambiarle la
    //    duración también actualiza lo que ven los comerciales publicados.
    const professionalChanged = offer?.professional?.id !== existingOffer.professional?.id;
    let commercialResyncs: Array<{ id: string; ok: boolean; error?: string }> | undefined;
    if (offer?.catalogId && ((catalogTouched && docSyncRelevantFieldsChanged(catalogBefore, offer.catalog)) || offer.durationMinutes !== existingOffer.durationMinutes || professionalChanged)) {
      const results = await resyncPublishedCommercialsForOperativo(offer.catalogId);
      if (results.length > 0) commercialResyncs = results;
    }

    res.json({ success: true, data: { offer }, ...(commercialResyncs ? { commercialResyncs } : {}) });
```

5. En `deleteOffer`, borrar:
```ts
    let docSync: { ok: boolean; error?: string } | undefined;
    if (existing.catalogId && remaining === 0) {
      docSync = await ensureDocSync(buildDocSyncParams(existing, false));
    }

    res.json({ success: true, data: null, ...(docSync ? { docSync } : {}) });
```
y dejar:
```ts
    res.json({ success: true, data: null });
```

`DOC_SYNC_RELEVANT_FIELDS`/`docSyncRelevantFieldsChanged`/`CATALOG_PAYLOAD_KEYS` **no se tocan** — siguen usándose, ahora para decidir cuándo re-sincronizar comerciales en vez de cuándo re-sincronizar el operativo directo.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx tsx --test src/controllers/services.controller.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full backend test suite and a full type-check to confirm nothing else broke**

Run: `cd apps/backend && npx tsx --test 'src/**/*.test.ts' && npx tsc --noEmit`
Expected: PASS — todos los tests (Tasks 1-5) y cero errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/controllers/services.controller.ts apps/backend/src/controllers/services.controller.test.ts
git commit -m "refactor(backend): operativo no publica en CuidameDoc por sí solo; editarlo re-sincroniza comerciales publicados

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Documentación (regla crítica #1)

**Files:**
- Modify: `decisiones.md`
- Modify: `arquitectura.md`

**Interfaces:** ninguna — solo texto.

- [ ] **Step 1: Cerrar la decisión diferida en `decisiones.md`**

En la sección "Servicios Comerciales vs. Operativos — decisiones clave" (línea 62), reemplazar el bullet:

```
- **Sincronización a CuidameDoc explícitamente diferida, no implementada en esta fase** — crear/editar/activar un comercial no llama a `ensureDocSync` ni a ningún endpoint de `doc-api.cuidame.tech`; el diseño de cuándo y cómo publicarla (heredando precio/duración/categoría del operativo vinculado, columna `doc_prof_service_id` ya reservada) queda documentado en el spec como trabajo futuro, no implícito ni parcialmente construido.
```

por:

```
- **Sincronización a CuidameDoc implementada (2026-09-09)** — el comercial, no el operativo, decide qué se publica: `service_commercial.is_active` reemplazó a `service_catalog.is_active` como gatillo de publicar/despublicar. `ensureDocSync` (motor ya existente) se generalizó para escribir su `doc_prof_service_id` en `service_catalog` o en `service_commercial` según un parámetro `targetTable`, en vez de estar cableado solo al operativo. Un comercial hereda `duration_minutes`/`category`/`price` de la **oferta más recientemente creada** bajo su operativo vinculado (`service_catalog.findWithRepresentativeOffer` — el operativo en sí no tiene columnas de duración, esas viven en `service_offers`); si el operativo no tiene ninguna oferta todavía, publicar falla con un error explícito sin bloquear el guardado local. **Editar un operativo con comerciales ya publicados los re-sincroniza automáticamente** (decisión tomada explícitamente al retomar este trabajo, no estaba resuelta en el spec original): un cambio en nombre/precio/categoría/descripción del operativo, o en duración/médico asignado de su oferta, dispara un borrar+crear en CuidameDoc para cada comercial publicado que cuelgue de él. El operativo dejó de llamar a CuidameDoc por sí solo (se quitó de `createOffer`/`updateOffer`/`deleteOffer`).
```

- [ ] **Step 2: Agregar la fila al historial de cambios**

En `decisiones.md`, agregar como primera fila de la tabla "Historial de cambios" (antes de la fila `2026-09-08`):

```
| 2026-09-09 | Sincronización comercial→CuidameDoc: se retomó el trabajo diferido de la fase anterior. `ensureDocSync` generalizado para publicar `service_catalog` o `service_commercial` (`targetTable`); nuevo `commercialDocSync.service.ts` arma el payload heredando del operativo (vía `ServiceCatalogRepository.findWithRepresentativeOffer`, que resuelve la oferta más reciente para duración/profesional) y re-sincroniza los comerciales publicados de un operativo cuando este se edita. El operativo ya no publica nada por sí solo. Detalle en [arquitectura.md](arquitectura.md#servicios-comerciales-vs-operativos-2026-09-08). |
```

- [ ] **Step 3: Actualizar `arquitectura.md`**

En la sección "## Servicios Comerciales vs. Operativos (2026-09-08)", después del bloque que describe los 5 endpoints (justo antes de que empiece la siguiente sección `##`), agregar:

```markdown
- **Sincronización a CuidameDoc (2026-09-09)**: implementada — ver
  `apps/backend/src/services/commercialDocSync.service.ts`. El toggle
  "Estado del servicio" del comercial (no del operativo) decide
  publicar/despublicar. `syncCommercialToDoc(commercial, active)` arma el
  payload de `POST /booking/my-services` con `service_name`/`description`
  del comercial + `duration_minutes` (de la oferta más recientemente creada
  bajo el operativo vinculado — `service_catalog` no tiene columna de
  duración propia), `category` (vía `mapCategoryGroupToDocCategory` sobre
  `service_catalog.category_group`) y `price` (`service_catalog.base_price`).
  Si el operativo no tiene ninguna oferta configurada, publicar falla con un
  error explícito (`docSync.error`) sin bloquear el guardado local del
  comercial. `resyncPublishedCommercialsForOperativo(operativoId)` — llamada
  desde `updateOffer` en `services.controller.ts` con las mismas condiciones
  que antes disparaban el delete+create directo del operativo (cambio de
  nombre/precio/categoría/descripción, o de duración/médico asignado de la
  oferta) — re-sincroniza cada comercial ya publicado (`doc_prof_service_id
  IS NOT NULL`) de ese operativo. El operativo (`createOffer`/`updateOffer`/
  `deleteOffer`) dejó de llamar a CuidameDoc directamente.
- **Motor genérico**: `ensureDocSync` (antes solo `service_catalog`) ahora
  recibe `targetTable: 'service_catalog' | 'service_commercial'` y
  `targetId`, y lee/escribe `doc_prof_service_id` en la tabla que le
  indiquen — mismo motor borrar+crear, sin duplicar lógica entre operativo y
  comercial.
```

- [ ] **Step 4: Commit**

```bash
git add decisiones.md arquitectura.md
git commit -m "docs: document comercial→CuidameDoc sync implementation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
