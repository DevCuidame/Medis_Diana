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
    [`Sede de prueba control-price ${Date.now()}`]
  );
  return rows[0].id;
}

async function deleteTestLocation(locationId: string) {
  await pool.query('DELETE FROM service_offers WHERE location_id = $1', [locationId]);
  await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
}

function mockDocApiAlwaysSucceeds(t: TestContext) {
  let nextId = 2000;
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

test('createOffer: guarda control_price en el catálogo cuando se envía', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const req: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Control test',
      capacity: 1, durationMinutes: 20, scheduledAt: new Date().toISOString(),
      price: 0, currency: 'COP',
      serviceName: 'Control test', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 0, controlPrice: 60000,
    },
  };
  const res = makeRes();
  await createOffer(req, res);
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [res.body.data.offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]);
  });

  assert.equal(res.statusCode, 201);
  const { rows } = await pool.query(
    'SELECT control_price FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]
  );
  assert.equal(Number(rows[0].control_price), 60000);
});

test('createOffer: control_price queda NULL cuando no se envía', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const req: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta sin niveles',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 200000, currency: 'COP',
      serviceName: 'Consulta sin niveles', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 200000,
    },
  };
  const res = makeRes();
  await createOffer(req, res);
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [res.body.data.offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]);
  });

  const { rows } = await pool.query(
    'SELECT control_price FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]
  );
  assert.equal(rows[0].control_price, null);
});

test('updateOffer: un PATCH que solo trae {controlPrice} no dispara sync a CuidameDoc', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  const fetchSpy = mockDocApiAlwaysSucceeds(t);

  const createReq: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta con niveles',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 200000, currency: 'COP',
      serviceName: 'Consulta con niveles', categoryGroup: '01 Consulta externa',
      isActive: true, basePrice: 200000,
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

  fetchSpy.mock.resetCalls();

  const updateReq: any = { params: { id: offerId }, body: { controlPrice: 50000 } };
  const updateRes = makeRes();
  await updateOffer(updateReq, updateRes);

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.docSync, undefined);
  assert.equal(fetchSpy.mock.calls.length, 0);

  const { rows } = await pool.query(
    'SELECT control_price FROM service_catalog WHERE id = $1', [catalogId]
  );
  assert.equal(Number(rows[0].control_price), 50000);
});
