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
