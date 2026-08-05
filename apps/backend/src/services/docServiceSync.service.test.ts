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
    catalogId, active: true, serviceName: 'Consulta de prueba doc-sync',
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

test('ensureDocSync: si la consulta a la BD falla (catalogId inválido), retorna ok:false en vez de lanzar', async (t) => {
  // No debería haber ninguna llamada de red: la excepción ocurre en el
  // primer SELECT (getCurrentDocProfServiceId) antes de tocar la red.
  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  await assert.doesNotReject(async () => {
    const result = await ensureDocSync({
      catalogId: 'not-a-valid-uuid', active: true, serviceName: 'x', durationMinutes: 30,
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
    catalogId, active: true, serviceName: 'x', durationMinutes: 30,
    categoryGroup: '01 Consulta externa', description: null, price: 10000,
  });

  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.equal(await getDocProfServiceId(catalogId), null);
});
