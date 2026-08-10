import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { createOffer, updateOffer } from './services.controller.js';

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
    [`Sede de prueba reps-code ${Date.now()}`]
  );
  return rows[0].id;
}

async function deleteTestLocation(locationId: string) {
  await pool.query('DELETE FROM service_offers WHERE location_id = $1', [locationId]);
  await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
}

function mockDocApiAlwaysSucceeds(t: TestContext) {
  let nextId = 3000;
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

test('createOffer: guarda reps_service_code en el catálogo cuando se envía', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const req: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta medicina general',
      capacity: 1, durationMinutes: 20, scheduledAt: new Date().toISOString(),
      price: 0, currency: 'COP',
      serviceName: 'Consulta medicina general', categoryGroup: '01',
      isActive: true, basePrice: 0, repsServiceCode: '328',
    },
  };
  const res = makeRes();
  await createOffer(req, res);
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [res.body.data.offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]);
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.offer.catalog.repsServiceCode, '328');

  const { rows } = await pool.query(
    'SELECT reps_service_code FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]
  );
  assert.equal(rows[0].reps_service_code, '328');
});

test('createOffer: reps_service_code queda NULL cuando no se envía', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const req: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Otros servicios',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 0, currency: 'COP',
      serviceName: 'Otros servicios', categoryGroup: '06',
      isActive: true, basePrice: 0,
    },
  };
  const res = makeRes();
  await createOffer(req, res);
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [res.body.data.offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]);
  });

  assert.equal(res.body.data.offer.catalog.repsServiceCode, null);
});

test('updateOffer: PATCH con solo {repsServiceCode} lo actualiza', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const createReq: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Endocrinologia',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 0, currency: 'COP',
      serviceName: 'Endocrinologia', categoryGroup: '01',
      isActive: true, basePrice: 0, repsServiceCode: '310',
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

  const updateReq: any = { params: { id: offerId }, body: { repsServiceCode: '328' } };
  const updateRes = makeRes();
  await updateOffer(updateReq, updateRes);

  assert.equal(updateRes.statusCode, 200);
  const { rows } = await pool.query(
    'SELECT reps_service_code FROM service_catalog WHERE id = $1', [catalogId]
  );
  assert.equal(rows[0].reps_service_code, '328');
});
