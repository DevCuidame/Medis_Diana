# Sincronización de Servicios Medis → CuidameDoc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada servicio creado, editado, desactivado o eliminado desde el formulario "Nuevo Servicio" de Medis (`FormularioServicio.tsx`) se refleja automáticamente en CuidameDoc, incluyendo el precio, sin resucitar la vieja pestaña "Catálogo Médico" ni tocar `cuidame_doc_backend`.

**Architecture:** Un módulo nuevo y autocontenido (`docServiceSync.service.ts`) encapsula toda la comunicación con CuidameDoc (login como Diana, crear/borrar servicio, mapeo de categoría). Se invoca desde los tres puntos existentes del ciclo de vida de una oferta (`createOffer`, `updateOffer`, `deleteOffer` en `services.controller.ts`), nunca lanza excepciones hacia el llamador, y persiste el `prof_service_id` de CuidameDoc en una columna nueva (`service_catalog.doc_prof_service_id`) para poder borrar/recrear en updates futuros (CuidameDoc no tiene endpoint de edición).

**Tech Stack:** TypeScript (ESM, `tsx`), Express, `pg` (Postgres crudo, sin ORM), `node:test` + `node:assert/strict` para pruebas (patrón ya usado en el repo — pruebas de integración contra la base de datos real, sin mocks de DB; `node:test`'s `mock.method` para simular `fetch`).

## Global Constraints

- Todo el código backend nuevo vive en `apps/backend/src/` y usa los alias de `tsconfig.json` (`@config/*`, `@services/*`, `@repositories/*`, `@controllers/*`, `@utils/*`).
- No se modifica `cuidame_doc_backend` — ya soporta `price` de punta a punta en `POST /booking/my-services`.
- No se reintroduce la pestaña "Catálogo Médico" en `ServiciosDashboard.tsx`.
- El campo que decide si un servicio debe existir en CuidameDoc es **únicamente** `catalog.isActive` (el toggle "Estado del servicio" del formulario) — **no** `service_offers.status`. Ver la nota en el spec sobre por qué (`ServiceOfferRepository.create()` nunca guarda `status`, así que depender de él rompería la sincronización al crear).
- Toda llamada de red hacia CuidameDoc va en try/catch y **nunca** lanza hacia el llamador — siempre retorna `{ ok: boolean; error?: string }`. Un fallo de sincronización nunca debe impedir que el guardado local se complete.
- Las pruebas nuevas siguen el patrón existente del repo: `node:test`, contra la base de datos real de desarrollo, con limpieza en `finally`. No se agrega ningún framework de testing nuevo (ni supertest, ni un mock de DB).

---

## File Structure

- **Create** `apps/backend/migrations/021_service_catalog_doc_sync.sql` — nueva columna.
- **Modify** `apps/backend/src/scripts/run-migration.ts` — registra la migración 021.
- **Create** `apps/backend/src/services/docServiceSync.service.ts` — motor de sincronización, único punto que habla con CuidameDoc para este flujo.
- **Create** `apps/backend/src/services/docServiceSync.service.test.ts` — pruebas del motor.
- **Modify** `apps/backend/src/controllers/services.controller.ts` — invoca el motor desde `createOffer`, `updateOffer`, `deleteOffer`.
- **Create** `apps/backend/src/controllers/services.controller.docsync.test.ts` — pruebas de la integración a nivel controller (req/res falsos, sin supertest).
- **Modify** `medisdiana-landing/src/components/admin/ServiciosDashboard.tsx` — toast de aviso si `docSync.ok === false`.
- **Create** `apps/backend/src/scripts/backfill-doc-sync.ts` — publica hacia CuidameDoc los servicios locales que quedaron huérfanos.

---

### Task 1: Migración — columna `doc_prof_service_id`

**Files:**
- Create: `apps/backend/migrations/021_service_catalog_doc_sync.sql`
- Modify: `apps/backend/src/scripts/run-migration.ts`

**Interfaces:**
- Produces: columna `service_catalog.doc_prof_service_id INTEGER NULL` — usada por todas las tareas siguientes.

- [ ] **Step 1: Escribir la migración**

```sql
-- ============================================================
-- Migration 021: Doc sync tracking en el catálogo de servicios
-- ============================================================
-- Guarda el prof_service_id que CuidameDoc asignó a este servicio, para
-- poder actualizarlo (borrar+crear, CuidameDoc no tiene endpoint de
-- edición) o eliminarlo más adelante. NULL = no sincronizado todavía, o
-- actualmente no publicado en CuidameDoc.
ALTER TABLE service_catalog
  ADD COLUMN IF NOT EXISTS doc_prof_service_id INTEGER;
```

Guardar en `apps/backend/migrations/021_service_catalog_doc_sync.sql`.

- [ ] **Step 2: Registrar la migración en el script de arranque**

En `apps/backend/src/scripts/run-migration.ts`, justo antes de `console.log('\n🌟 MIGRATIONS COMPLETE! 🌟');`, agregar:

```ts
    // Run migration 021
    console.log('🔄 Running migration 021 (Doc Sync Tracking)...');
    const sql021 = fs.readFileSync(
      path.resolve('migrations', '021_service_catalog_doc_sync.sql'),
      'utf8'
    );
    await pool.query(sql021);
    console.log('✅ Migration 021 successful!');
```

- [ ] **Step 3: Correr la migración contra la base de desarrollo**

Run: `cd apps/backend && npx tsx src/scripts/run-migration.ts`
Expected: termina con `🌟 MIGRATIONS COMPLETE! 🌟` y sin errores. Verificar manualmente con:
`psql "$DATABASE_URL" -c "\d service_catalog"` (o el cliente que uses) y confirmar que aparece `doc_prof_service_id | integer`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/migrations/021_service_catalog_doc_sync.sql apps/backend/src/scripts/run-migration.ts
git commit -m "feat(backend): add doc_prof_service_id column to service_catalog"
```

---

### Task 2: Motor de sincronización — `docServiceSync.service.ts`

**Files:**
- Create: `apps/backend/src/services/docServiceSync.service.ts`
- Test: `apps/backend/src/services/docServiceSync.service.test.ts`

**Interfaces:**
- Consumes: `pool` de `@config/database.js`; `getDocToken`, `refreshDocToken` de `@utils/docAuth.js`; `env.DOC_API_URL` de `@config/env.js`; `ServiceCatalogRepository.create` de `@repositories/services.repository.js` (solo en el test, para crear filas de prueba).
- Produces:
  - `export interface EnsureDocSyncParams { catalogId: string; active: boolean; serviceName: string; durationMinutes: number; categoryGroup: string; description?: string | null; price: number; }`
  - `export interface EnsureDocSyncResult { ok: boolean; error?: string; }`
  - `export async function ensureDocSync(params: EnsureDocSyncParams): Promise<EnsureDocSyncResult>` — usado por Task 3 y Task 5.
  - `export function mapCategoryGroupToDocCategory(categoryGroup: string): string` — exportada aparte para poder probarla directo.

- [ ] **Step 1: Escribir las pruebas (fallando)**

Crear `apps/backend/src/services/docServiceSync.service.test.ts`:

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

// Usa t.mock (no el `mock` global) para que Node restaure fetch automáticamente
// al terminar cada test, aunque el test falle a mitad de camino.
function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

test('mapCategoryGroupToDocCategory: mapea los grupos RIPS conocidos y usa consultation por defecto', () => {
  assert.equal(mapCategoryGroupToDocCategory('01 Consulta externa'), 'consultation');
  assert.equal(mapCategoryGroupToDocCategory('02 Apoyo diagnóstico y complementación terapéutica'), 'exam');
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
    catalogId, active: true, serviceName: 'Consulta de prueba doc-sync',
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
    catalogId, active: true, serviceName: 'Consulta de prueba doc-sync',
    durationMinutes: 45, categoryGroup: '01 Consulta externa', description: 'nueva descripción', price: 95000,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ['delete-123', 'create-new']);
  assert.equal(await getDocProfServiceId(catalogId), 777);
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
    catalogId, active: false, serviceName: 'x', durationMinutes: 30,
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
    catalogId, active: false, serviceName: 'x', durationMinutes: 30,
    categoryGroup: '01 Consulta externa', description: null, price: 0,
  });

  assert.equal(result.ok, true);
  assert.equal(await getDocProfServiceId(catalogId), null);
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
    catalogId, active: true, serviceName: 'x', durationMinutes: 30,
    categoryGroup: '01 Consulta externa', description: null, price: 10000,
  });

  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.equal(await getDocProfServiceId(catalogId), null);
});
```

- [ ] **Step 2: Correr las pruebas para confirmar que fallan**

Run: `cd apps/backend && npx tsx --test src/services/docServiceSync.service.test.ts`
Expected: FAIL — `Cannot find module './docServiceSync.service.js'` (el archivo todavía no existe).

- [ ] **Step 3: Implementar el módulo**

Crear `apps/backend/src/services/docServiceSync.service.ts`:

```ts
// ============================================================
// apps/backend/src/services/docServiceSync.service.ts
// Sincroniza un servicio del catálogo local (service_catalog) con el
// catálogo real de CuidameDoc (professional_id=12, Diana). CuidameDoc no
// tiene endpoint de edición: "actualizar" siempre es borrar + crear.
// Nunca lanza — toda llamada de red vuelve como { ok, error? } para que
// el llamador pueda decidir qué hacer sin que un fallo de CuidameDoc
// tumbe el guardado local.
// ============================================================

import { pool } from '@config/database.js';
import { env } from '@config/env.js';
import { getDocToken, refreshDocToken } from '@utils/docAuth.js';

export interface EnsureDocSyncParams {
  catalogId: string;
  active: boolean;
  serviceName: string;
  durationMinutes: number;
  categoryGroup: string;
  description?: string | null;
  price: number;
}

export interface EnsureDocSyncResult {
  ok: boolean;
  error?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  '01 Consulta externa': 'consultation',
  '02 Apoyo diagnóstico y complementación terapéutica': 'exam',
  '03 Internación': 'procedure',
  '04 Quirúrgico': 'procedure',
  '05 Atención inmediata': 'consultation',
};

export function mapCategoryGroupToDocCategory(categoryGroup: string): string {
  return CATEGORY_MAP[categoryGroup] ?? 'consultation';
}

async function getCurrentDocProfServiceId(catalogId: string): Promise<number | null> {
  const { rows } = await pool.query(
    'SELECT doc_prof_service_id FROM service_catalog WHERE id = $1', [catalogId]
  );
  return rows[0]?.doc_prof_service_id ?? null;
}

async function setDocProfServiceId(catalogId: string, value: number | null): Promise<void> {
  await pool.query(
    'UPDATE service_catalog SET doc_prof_service_id = $1 WHERE id = $2', [value, catalogId]
  );
}

/** Llama `fetchFn` con el token actual; si CuidameDoc responde 401, refresca una vez y reintenta. */
async function withDocAuth(fetchFn: (token: string) => Promise<Response>): Promise<Response> {
  let token = await getDocToken();
  let res = await fetchFn(token);
  if (res.status === 401) {
    token = await refreshDocToken();
    res = await fetchFn(token);
  }
  return res;
}

async function createDocService(params: {
  serviceName: string; durationMinutes: number; categoryGroup: string;
  description?: string | null; price: number;
}): Promise<{ ok: true; profServiceId: number } | { ok: false; error: string }> {
  try {
    const body = JSON.stringify({
      service_name: params.serviceName,
      duration_minutes: params.durationMinutes,
      category: mapCategoryGroupToDocCategory(params.categoryGroup),
      description: params.description ?? undefined,
      price: params.price,
    });
    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/booking/my-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
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
  const currentId = await getCurrentDocProfServiceId(params.catalogId);

  if (!params.active) {
    if (currentId === null) return { ok: true }; // ya estaba fuera, nada que hacer
    const del = await deleteDocService(currentId);
    if (!del.ok) return { ok: false, error: del.error };
    await setDocProfServiceId(params.catalogId, null);
    return { ok: true };
  }

  // active === true
  if (currentId !== null) {
    const del = await deleteDocService(currentId);
    if (!del.ok) return { ok: false, error: del.error };
  }

  const created = await createDocService({
    serviceName: params.serviceName,
    durationMinutes: params.durationMinutes,
    categoryGroup: params.categoryGroup,
    description: params.description,
    price: params.price,
  });
  if (!created.ok) return { ok: false, error: created.error };

  await setDocProfServiceId(params.catalogId, created.profServiceId);
  return { ok: true };
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `cd apps/backend && npx tsx --test src/services/docServiceSync.service.test.ts`
Expected: PASS — los 6 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/docServiceSync.service.ts apps/backend/src/services/docServiceSync.service.test.ts
git commit -m "feat(backend): add ensureDocSync engine to sync services with CuidameDoc"
```

---

### Task 3: Enganchar el motor en `services.controller.ts`

**Files:**
- Modify: `apps/backend/src/controllers/services.controller.ts:143-215` (`createOffer`, `updateOffer`, `deleteOffer`)
- Test: `apps/backend/src/controllers/services.controller.docsync.test.ts`

**Interfaces:**
- Consumes: `ensureDocSync` de `@services/docServiceSync.service.js` (Task 2).
- Produces: las respuestas JSON de `POST/PATCH/DELETE /services/offers[/:id]` ganan un campo opcional `docSync: { ok: boolean; error?: string }` cuando el offer tiene catálogo asociado.

- [ ] **Step 1: Escribir las pruebas (fallando)**

Crear `apps/backend/src/controllers/services.controller.docsync.test.ts`:

```ts
import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
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

async function createTestLocation(): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO locations (name) VALUES ($1) RETURNING id`,
    [`Sede de prueba doc-sync ${Date.now()}`]
  );
  return rows[0].id;
}

async function deleteTestLocation(locationId: string) {
  await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
}

// Usa t.mock (no el `mock` global) para que Node restaure fetch automáticamente
// al terminar cada test, aunque el test falle a mitad de camino.
function mockDocApiAlwaysSucceeds(t: TestContext) {
  let nextId = 1000;
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => {
    const u = String(url);
    if (u.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 't', refresh_token: 'r' } }), { status: 200 });
    }
    if (u.endsWith('/booking/my-services') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: nextId++, service_id: 1, name: 'x' } }), { status: 201 });
    }
    if (u.includes('/booking/my-services/') && init?.method === 'DELETE') {
      return new Response(JSON.stringify({ success: true, message: 'Servicio eliminado' }), { status: 200 });
    }
    throw new Error(`fetch inesperado: ${u}`);
  });
}

test('createOffer: crea el catálogo+oferta y sincroniza con CuidameDoc cuando isActive=true', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const req: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta test',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 90000, currency: 'COP',
      serviceName: 'Consulta test', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 90000,
    },
  };
  const res = makeRes();
  await createOffer(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.docSync.ok, true);

  const { rows } = await pool.query(
    'SELECT doc_prof_service_id FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]
  );
  assert.ok(rows[0].doc_prof_service_id > 0);

  await pool.query('DELETE FROM service_offers WHERE id = $1', [res.body.data.offer.id]);
  await pool.query('DELETE FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]);
});

test('updateOffer: un PATCH que solo trae {status} no dispara sync (no toca campos de catálogo)', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  const fetchSpy = mockDocApiAlwaysSucceeds(t);

  const createReq: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta test 2',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 50000, currency: 'COP',
      serviceName: 'Consulta test 2', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 50000,
    },
  };
  const createRes = makeRes();
  await createOffer(createReq, createRes);
  const offerId = createRes.body.data.offer.id;
  const catalogId = createRes.body.data.offer.catalogId;

  const callsBefore = fetchSpy.mock.callCount();

  const patchReq: any = { params: { id: offerId }, body: { status: 'draft' } };
  const patchRes = makeRes();
  await updateOffer(patchReq, patchRes);

  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.body.docSync, undefined);
  assert.equal(fetchSpy.mock.callCount(), callsBefore); // no llamadas nuevas a CuidameDoc

  await pool.query('DELETE FROM service_offers WHERE id = $1', [offerId]);
  await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
});

test('deleteOffer: al borrar la última oferta de un catálogo sincronizado, también borra en CuidameDoc', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const createReq: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta test 3',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 60000, currency: 'COP',
      serviceName: 'Consulta test 3', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 60000,
    },
  };
  const createRes = makeRes();
  await createOffer(createReq, createRes);
  const offerId = createRes.body.data.offer.id;
  const catalogId = createRes.body.data.offer.catalogId;

  const delReq: any = { params: { id: offerId } };
  const delRes = makeRes();
  await deleteOffer(delReq, delRes);

  assert.equal(delRes.statusCode, 200);
  assert.equal(delRes.body.docSync.ok, true);

  const { rows } = await pool.query(
    'SELECT doc_prof_service_id FROM service_catalog WHERE id = $1', [catalogId]
  );
  assert.equal(rows[0].doc_prof_service_id, null);

  await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
});
```

- [ ] **Step 2: Correr las pruebas para confirmar que fallan**

Run: `cd apps/backend && npx tsx --test src/controllers/services.controller.docsync.test.ts`
Expected: FAIL — `res.body.docSync` es `undefined` en el primer test (`createOffer` todavía no llama a `ensureDocSync`).

- [ ] **Step 3: Implementar — modificar `createOffer`, `updateOffer`, `deleteOffer`**

En `apps/backend/src/controllers/services.controller.ts`, agregar el import junto a los demás:

```ts
import { ensureDocSync } from '@services/docServiceSync.service.js';
```

Reemplazar el cuerpo de `createOffer` (líneas 143-171 actuales) por:

```ts
/** ADMIN ONLY — auth guard desactivado temporalmente para desarrollo */
export async function createOffer(req: Request, res: Response): Promise<void> {
  try {
    let adminId = req.user?.id;
    if (!adminId) {
      const adminRes = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
      adminId = adminRes.rows[0]?.id;
    }
    if (!adminId) {
      res.status(400).json({ success: false, error: 'No se encontró un administrador en la BD para asignar creador.' });
      return;
    }
    const payload = req.body as any;

    // 1. Create Catalog Entry
    const catalogEntry = await ServiceCatalogRepository.create(payload);
    payload.catalogId = catalogEntry.id;

    // 2. Create Offer
    const offer = await ServiceOfferRepository.create(payload, adminId);

    // 3. Sync with CuidameDoc
    const docSync = await ensureDocSync({
      catalogId: offer.catalogId!,
      active: offer.catalog?.isActive !== false,
      serviceName: offer.catalog?.serviceName ?? offer.title,
      durationMinutes: offer.durationMinutes,
      categoryGroup: offer.catalog?.categoryGroup ?? '01 Consulta externa',
      description: offer.catalog?.description ?? null,
      price: offer.catalog?.basePrice ?? offer.price ?? 0,
    });

    res.status(201).json({ success: true, data: { offer }, docSync });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status = msg.includes('supera la del salón') ? 400 : 500;
    res.status(status).json({ success: false, error: msg });
  }
}
```

Reemplazar el cuerpo de `updateOffer` (líneas 174-204 actuales) por:

```ts
const CATALOG_PAYLOAD_KEYS = [
  'serviceName', 'description', 'categoryGroup', 'subcategoryGroup', 'category',
  'subcategory', 'serviceCode', 'modality', 'isActive', 'basePrice', 'imageUrl',
  'preparationInstructions', 'genderRestriction', 'risks', 'contraindications',
];

/** ADMIN ONLY */
export async function updateOffer(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as any;
    const offerId = req.params['id']!;

    // Verify offer exists
    const existingOffer = await ServiceOfferRepository.findById(offerId);
    if (!existingOffer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    let catalogId = existingOffer.catalogId;
    const catalogTouched = CATALOG_PAYLOAD_KEYS.some((k) => payload[k] !== undefined);

    // 1. Upsert catalog — create if not exists, update if exists
    if (catalogId) {
      if (catalogTouched) await ServiceCatalogRepository.update(catalogId, payload);
    } else if (payload.serviceName) {
      // Old offer without catalog — create one now and link it
      const newCatalog = await ServiceCatalogRepository.create(payload);
      catalogId = newCatalog.id;
      // Link to offer
      await ServiceOfferRepository.update(offerId, { catalogId });
    }

    // 2. Update the rest of the offer fields
    const offer = await ServiceOfferRepository.update(offerId, { ...payload, catalogId: catalogId ?? undefined });

    // 3. Sync with CuidameDoc — solo cuando el guardado realmente tocó datos
    //    de catálogo (nombre/precio/estado/etc). Un PATCH de solo {status}
    //    (el toggle Activo/Inactivo de la tarjeta) no dispara re-sync.
    let docSync: { ok: boolean; error?: string } | undefined;
    if (offer?.catalogId && catalogTouched) {
      docSync = await ensureDocSync({
        catalogId: offer.catalogId,
        active: offer.catalog?.isActive !== false,
        serviceName: offer.catalog?.serviceName ?? offer.title,
        durationMinutes: offer.durationMinutes,
        categoryGroup: offer.catalog?.categoryGroup ?? '01 Consulta externa',
        description: offer.catalog?.description ?? null,
        price: offer.catalog?.basePrice ?? offer.price ?? 0,
      });
    }

    res.json({ success: true, data: { offer }, ...(docSync ? { docSync } : {}) });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status = msg.includes('supera la del salón') ? 400 : 500;
    res.status(status).json({ success: false, error: msg });
  }
}
```

Reemplazar el cuerpo de `deleteOffer` (líneas 207-215 actuales) por:

```ts
/** ADMIN ONLY */
export async function deleteOffer(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    const existing = await ServiceOfferRepository.findById(id);
    if (!existing) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    const deleted = await ServiceOfferRepository.delete(id);
    if (!deleted) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    let docSync: { ok: boolean; error?: string } | undefined;
    if (existing.catalogId) {
      const { rows } = await pool.query(
        'SELECT COUNT(*)::int AS count FROM service_offers WHERE catalog_id = $1',
        [existing.catalogId]
      );
      const remaining = rows[0].count as number;
      if (remaining === 0) {
        docSync = await ensureDocSync({
          catalogId: existing.catalogId,
          active: false,
          serviceName: existing.catalog?.serviceName ?? existing.title,
          durationMinutes: existing.durationMinutes,
          categoryGroup: existing.catalog?.categoryGroup ?? '01 Consulta externa',
          description: existing.catalog?.description ?? null,
          price: existing.catalog?.basePrice ?? existing.price ?? 0,
        });
      }
    }

    res.json({ success: true, data: null, ...(docSync ? { docSync } : {}) });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `cd apps/backend && npx tsx --test src/controllers/services.controller.docsync.test.ts`
Expected: PASS — los 3 tests en verde.

- [ ] **Step 5: Correr toda la suite de backend para confirmar que nada se rompió**

Run: `cd apps/backend && npm test`
Expected: PASS — todos los tests existentes (`external-quote.repository.test.ts`, `inventory.repository.test.ts`, los nuevos) en verde.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/controllers/services.controller.ts apps/backend/src/controllers/services.controller.docsync.test.ts
git commit -m "feat(backend): sync services with CuidameDoc on create/update/delete"
```

---

### Task 4: Aviso en el frontend cuando la sincronización falla

**Files:**
- Modify: `medisdiana-landing/src/components/admin/ServiciosDashboard.tsx` (función `handleFormSuccess`)

**Interfaces:**
- Consumes: el campo `docSync?: { ok: boolean; error?: string }` que ahora devuelven `POST/PATCH /api/services/offers[/:id]` (Task 3).

No hay test automatizado para este paso — el repo `medisdiana-landing` no tiene ningún framework de pruebas de frontend configurado (no hay `vitest` ni `@testing-library` en `package.json`); se verifica manualmente en el Step 3.

- [ ] **Step 1: Modificar `handleFormSuccess` para detectar fallos de `docSync`**

En `medisdiana-landing/src/components/admin/ServiciosDashboard.tsx`, dentro de `handleFormSuccess`, el bloque que procesa cada respuesta ya hace `const json = await res.json();`. Agregar, justo después de declarar `let errCount = 0; let lastError = ''; let totalAttempts = 0;`, una variable nueva:

```ts
    let docSyncWarning = '';
```

En la rama de edición (`if (editingGroup) { ... }`), dentro del bloque `try` que ya existe, después de `const json = await res.json();` y antes del `if (!res.ok || !json.success) { ... }`, agregar:

```ts
          if (json.docSync && json.docSync.ok === false && !docSyncWarning) {
            docSyncWarning = json.docSync.error ?? 'motivo desconocido';
          }
```

Hacer el mismo agregado en la rama de creación (`else { ... }`), en el mismo punto (después de parsear `json`, antes de revisar `res.ok`/`json.success`).

Al final de la función, reemplazar el bloque final de toasts:

```ts
    if (errCount > 0) {
      const created = totalAttempts - errCount;
      showToast(
        created > 0
          ? `${created}/${totalAttempts} sesiones ${editingGroup ? 'actualizadas' : 'creadas'}. Error: ${lastError}`
          : `No se ${editingGroup ? 'actualizaron' : 'crearon'} sesiones. Error: ${lastError}`,
        false
      );
    } else {
      showToast(`${totalAttempts} sesión${totalAttempts !== 1 ? 'es' : ''} ${editingGroup ? 'actualizadas' : 'creadas'} ✓`, true);
    }
```

por:

```ts
    if (errCount > 0) {
      const created = totalAttempts - errCount;
      showToast(
        created > 0
          ? `${created}/${totalAttempts} sesiones ${editingGroup ? 'actualizadas' : 'creadas'}. Error: ${lastError}`
          : `No se ${editingGroup ? 'actualizaron' : 'crearon'} sesiones. Error: ${lastError}`,
        false
      );
    } else if (docSyncWarning) {
      showToast(`Guardado, pero no se pudo publicar en CuidameDoc: ${docSyncWarning}`, false);
    } else {
      showToast(`${totalAttempts} sesión${totalAttempts !== 1 ? 'es' : ''} ${editingGroup ? 'actualizadas' : 'creadas'} ✓`, true);
    }
```

- [ ] **Step 2: Revisar con TypeScript**

Run: `cd medisdiana-landing && npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `ServiciosDashboard.tsx`.

- [ ] **Step 3: Verificación manual**

Levantar backend (`cd apps/backend && npm run dev`) y frontend (`cd medisdiana-landing && npm run dev`) en local. Con el backend corriendo pero apuntando a un `DOC_API_URL` inválido (para forzar el fallo), crear un servicio desde "Nuevo Servicio" y confirmar que:
1. El servicio se crea igual en la lista local (no se pierde el guardado).
2. Aparece el toast rojo "Guardado, pero no se pudo publicar en CuidameDoc: …".

Luego, con `DOC_API_URL` apuntando al valor real de CuidameDoc, repetir la creación y confirmar el toast normal de éxito.

- [ ] **Step 4: Commit**

```bash
git add medisdiana-landing/src/components/admin/ServiciosDashboard.tsx
git commit -m "feat(frontend): warn when a service fails to sync to CuidameDoc"
```

---

### Task 5: Backfill de servicios existentes

**Files:**
- Create: `apps/backend/src/scripts/backfill-doc-sync.ts`

**Interfaces:**
- Consumes: `ensureDocSync` de `@services/docServiceSync.service.js` (Task 2).

- [ ] **Step 1: Escribir el script**

Crear `apps/backend/src/scripts/backfill-doc-sync.ts`:

```ts
// ============================================================
// apps/backend/src/scripts/backfill-doc-sync.ts
// Corrida única y manual: publica en CuidameDoc todo servicio local
// activo que todavía no tenga su contraparte allá (doc_prof_service_id
// IS NULL). Pensado para correr una sola vez, justo después de desplegar
// la sincronización automática (Task 3).
// Uso: cd apps/backend && npx tsx src/scripts/backfill-doc-sync.ts
// ============================================================

import { pool } from '../config/database.js';
import { ensureDocSync } from '../services/docServiceSync.service.js';

interface PendingCatalog {
  id: string;
  service_name: string;
  category_group: string | null;
  description: string | null;
  base_price: string | null;
  duration_minutes: number | null;
}

async function run() {
  const { rows } = await pool.query<PendingCatalog>(`
    SELECT c.id, c.service_name, c.category_group, c.description, c.base_price,
           (SELECT o.duration_minutes FROM service_offers o
             WHERE o.catalog_id = c.id ORDER BY o.created_at ASC LIMIT 1) AS duration_minutes
    FROM service_catalog c
    WHERE c.doc_prof_service_id IS NULL
      AND c.is_active = TRUE
      AND EXISTS (SELECT 1 FROM service_offers o WHERE o.catalog_id = c.id)
    ORDER BY c.created_at ASC
  `);

  console.log(`🔎 ${rows.length} servicio(s) local(es) activo(s) sin contraparte en CuidameDoc.`);

  let created = 0;
  let failed = 0;

  for (const row of rows) {
    if (row.duration_minutes === null) {
      console.log(`⏭️  Omitido "${row.service_name}" (${row.id}) — no tiene ninguna oferta con duración.`);
      continue;
    }
    const result = await ensureDocSync({
      catalogId: row.id,
      active: true,
      serviceName: row.service_name,
      durationMinutes: row.duration_minutes,
      categoryGroup: row.category_group ?? '01 Consulta externa',
      description: row.description,
      price: row.base_price ? Number(row.base_price) : 0,
    });
    if (result.ok) {
      created++;
      console.log(`✅ Publicado "${row.service_name}" (${row.id}) en CuidameDoc.`);
    } else {
      failed++;
      console.log(`❌ Falló "${row.service_name}" (${row.id}): ${result.error}`);
    }
  }

  console.log(`\n🌟 BACKFILL COMPLETO — publicados: ${created}, fallidos: ${failed}, omitidos: ${rows.length - created - failed}`);
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Correr en desarrollo para validar el flujo antes de tocar producción**

Run: `cd apps/backend && npx tsx src/scripts/backfill-doc-sync.ts`
Expected: imprime el resumen (`🌟 BACKFILL COMPLETO — publicados: N, fallidos: 0, omitidos: 0`) contra la base de datos de desarrollo, sin excepciones sin capturar.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/scripts/backfill-doc-sync.ts
git commit -m "feat(backend): add one-off backfill script to publish orphaned services to CuidameDoc"
```

- [ ] **Step 4: Nota para el humano — correr en producción**

Este script se corre a mano, una sola vez, contra la base de datos real, **después** de desplegar las Tasks 1-3 a producción (`deploy-Dianamedic.ps1 -Target back`, o `both`). No se ejecuta automáticamente en ningún arranque. Requiere `DATABASE_URL`, `DOC_API_URL`, `DOC_DIANA_EMAIL`, `DOC_DIANA_PASSWORD` apuntando a producción — pedir confirmación explícita antes de correrlo ahí, igual que con cualquier script que escribe en la base de datos real o en CuidameDoc real.

---

## Verificación final end-to-end (manual, contra CuidameDoc real)

Después de completar las Tasks 1-5 y desplegar:

1. Crear un servicio nuevo desde "Nuevo Servicio" en Medis con un precio distinto de cero.
2. Confirmar en `https://doc.cuidame.tech` (o vía `GET https://doc-api.cuidame.tech/api/booking/professionals/12/services`) que el servicio aparece con el mismo nombre, duración y precio.
3. Editar el precio del mismo servicio en Medis y guardar. Confirmar que el precio también cambió en CuidameDoc (el `prof_service_id` habrá cambiado, por el ciclo borrar+crear — es esperado).
4. Desactivar el servicio (toggle "Estado del servicio" dentro del formulario, no el botón de la tarjeta) y guardar. Confirmar que desapareció de CuidameDoc.
5. Reactivarlo y confirmar que vuelve a aparecer.
6. Eliminarlo por completo desde la tarjeta (ícono de basurero) y confirmar que también desaparece de CuidameDoc.
