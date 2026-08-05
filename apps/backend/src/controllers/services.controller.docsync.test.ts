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
  // t.after hooks run in registration order (FIFO), and this is always the
  // first one registered in a test (right after createTestLocation). Delete
  // any offers still pointing at this location first so that a later-run
  // offer cleanup can never race against the FK (service_offers.location_id
  // is ON DELETE RESTRICT) regardless of hook ordering.
  await pool.query('DELETE FROM service_offers WHERE location_id = $1', [locationId]);
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
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [res.body.data.offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]);
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.docSync.ok, true);

  const { rows } = await pool.query(
    'SELECT doc_prof_service_id FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]
  );
  assert.ok(rows[0].doc_prof_service_id > 0);
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
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offerId]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
  });

  const callsBefore = fetchSpy.mock.callCount();

  const patchReq: any = { params: { id: offerId }, body: { status: 'draft' } };
  const patchRes = makeRes();
  await updateOffer(patchReq, patchRes);

  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.body.docSync, undefined);
  assert.equal(fetchSpy.mock.callCount(), callsBefore); // no llamadas nuevas a CuidameDoc
});

test('updateOffer: dos PATCH consecutivos con los mismos valores RIPS — el segundo no dispara sync', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  const fetchSpy = mockDocApiAlwaysSucceeds(t);

  const createReq: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta test 2b',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 55000, currency: 'COP',
      serviceName: 'Consulta test 2b', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 55000,
    },
  };
  const createRes = makeRes();
  await createOffer(createReq, createRes);
  const offerId = createRes.body.data.offer.id;
  const catalogId = createRes.body.data.offer.catalogId;
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offerId]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
  });

  const sameRipsPayload = {
    serviceName: 'Consulta test 2b', categoryGroup: '01 Consulta externa',
    description: null, isActive: true, basePrice: 55000,
  };

  // Primer PATCH: mismos valores que ya tiene el catálogo — no debería haber
  // cambiado nada relevante para CuidameDoc, así que tampoco dispara sync.
  const patch1Req: any = { params: { id: offerId }, body: sameRipsPayload };
  const patch1Res = makeRes();
  await updateOffer(patch1Req, patch1Res);
  assert.equal(patch1Res.statusCode, 200);
  assert.equal(patch1Res.body.docSync, undefined, 'Primer PATCH sin cambios reales no dispara sync');

  const callsBefore = fetchSpy.mock.callCount();

  // Segundo PATCH: de nuevo los mismos valores exactos.
  const patch2Req: any = { params: { id: offerId }, body: sameRipsPayload };
  const patch2Res = makeRes();
  await updateOffer(patch2Req, patch2Res);

  assert.equal(patch2Res.statusCode, 200);
  assert.equal(patch2Res.body.docSync, undefined, 'Segundo PATCH sin cambios reales no dispara sync');
  assert.equal(fetchSpy.mock.callCount(), callsBefore, 'No hay fetch nuevo a CuidameDoc');
});

test('updateOffer: un PATCH que sí cambia basePrice dispara sync como antes', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  const fetchSpy = mockDocApiAlwaysSucceeds(t);

  const createReq: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta test 2c',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 55000, currency: 'COP',
      serviceName: 'Consulta test 2c', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 55000,
    },
  };
  const createRes = makeRes();
  await createOffer(createReq, createRes);
  const offerId = createRes.body.data.offer.id;
  const catalogId = createRes.body.data.offer.catalogId;
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offerId]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
  });

  const callsBefore = fetchSpy.mock.callCount();

  const patchReq: any = {
    params: { id: offerId },
    body: {
      serviceName: 'Consulta test 2c', categoryGroup: '01 Consulta externa',
      description: null, isActive: true, basePrice: 99000, // cambia el precio
    },
  };
  const patchRes = makeRes();
  await updateOffer(patchReq, patchRes);

  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.body.docSync.ok, true, 'Un cambio real de basePrice sí dispara sync');
  assert(fetchSpy.mock.callCount() > callsBefore, 'Hay fetch nuevo a CuidameDoc');
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
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offerId]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
  });

  const delReq: any = { params: { id: offerId } };
  const delRes = makeRes();
  await deleteOffer(delReq, delRes);

  assert.equal(delRes.statusCode, 200);
  assert.equal(delRes.body.docSync.ok, true);

  const { rows } = await pool.query(
    'SELECT doc_prof_service_id FROM service_catalog WHERE id = $1', [catalogId]
  );
  assert.equal(rows[0].doc_prof_service_id, null);
});

test('deleteOffer: cuando hay múltiples ofertas del mismo catálogo, solo la última dispara sync', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  const fetchSpy = mockDocApiAlwaysSucceeds(t);

  // 1. Crear primera oferta (con catálogo)
  const req1: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta test 4a',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 70000, currency: 'COP',
      serviceName: 'Consulta test 4', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 70000,
    },
  };
  const res1 = makeRes();
  await createOffer(req1, res1);
  const offerId1 = res1.body.data.offer.id;
  const catalogId = res1.body.data.offer.catalogId;
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offerId1]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
  });

  // 2. Crear segunda oferta (con su propio catálogo) que después apuntará al del primero
  const req2: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta test 4b',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 70000, currency: 'COP',
      serviceName: 'Consulta test 4b-temp', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 70000,
    },
  };
  const res2 = makeRes();
  await createOffer(req2, res2);
  const offerId2 = res2.body.data.offer.id;
  const catalogId2 = res2.body.data.offer.catalogId;
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offerId2]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId2]);
  });

  // 3. Apuntar segunda oferta al mismo catálogo
  await pool.query('UPDATE service_offers SET catalog_id = $1 WHERE id = $2', [catalogId, offerId2]);

  const callsBefore = fetchSpy.mock.callCount();

  // 4. Borrar la primera oferta — NO debe disparar sync
  const delReq1: any = { params: { id: offerId1 } };
  const delRes1 = makeRes();
  await deleteOffer(delReq1, delRes1);

  assert.equal(delRes1.statusCode, 200);
  assert.equal(delRes1.body.docSync, undefined, 'No docSync cuando quedan ofertas del catálogo');
  assert.equal(fetchSpy.mock.callCount(), callsBefore, 'No fetch cuando quedan ofertas');

  // 5. Borrar la segunda oferta (última) — SÍ debe disparar sync
  const delReq2: any = { params: { id: offerId2 } };
  const delRes2 = makeRes();
  await deleteOffer(delReq2, delRes2);

  assert.equal(delRes2.statusCode, 200);
  assert.equal(delRes2.body.docSync.ok, true, 'docSync cuando borra la última oferta');
  assert(fetchSpy.mock.callCount() > callsBefore, 'Fetch cuando borra la última');
});
