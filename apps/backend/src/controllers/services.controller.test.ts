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

// NOTE: service_offers.catalog_id, service_offers.location_id y
// service_commercial.operativo_id son todos ON DELETE RESTRICT. Cada test
// registra UN SOLO t.after() que borra todo secuencialmente (hijos antes
// que padres) en vez de varios t.after() separados — contra la BD real,
// el orden (y solapamiento) de varios hooks resultó no ser fiable.

test('createOffer: crear un operativo ya no llama a CuidameDoc ni devuelve docSync', async (t) => {
  const locationId = await createTestLocation();

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
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE catalog_id = $1', [catalogId]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
    await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.docSync, undefined);
});

test('updateOffer: editar un campo relevante del operativo re-sincroniza los comerciales ya publicados', async (t) => {
  const locationId = await createTestLocation();
  const adminId = await getAdminId();

  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo a editar', categoryGroup: '01 Consulta externa', basePrice: 100000, isActive: true,
  });

  const offer = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);

  const commercial = await ServiceCommercialRepository.create({ name: 'Comercial publicado', operativoId: catalog.id });
  await pool.query('UPDATE service_commercial SET doc_prof_service_id = 3131 WHERE id = $1', [commercial.id]);

  t.after(async () => {
    await pool.query('DELETE FROM service_commercial WHERE id = $1', [commercial.id]);
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]);
    await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
  });

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

test('updateOffer: un cambio SOLO en durationMinutes (sin campos de catálogo) también re-sincroniza comerciales publicados', async (t) => {
  const locationId = await createTestLocation();
  const adminId = await getAdminId();

  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo cambio de duración', categoryGroup: '01 Consulta externa', basePrice: 80000, isActive: true,
  });

  const offer = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);

  const commercial = await ServiceCommercialRepository.create({ name: 'Comercial publicado', operativoId: catalog.id });
  await pool.query('UPDATE service_commercial SET doc_prof_service_id = 3232 WHERE id = $1', [commercial.id]);

  t.after(async () => {
    await pool.query('DELETE FROM service_commercial WHERE id = $1', [commercial.id]);
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]);
    await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
  });

  const calls: string[] = [];
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok', refresh_token: 'ref' } }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services/3232') && init?.method === 'DELETE') {
      calls.push('delete-3232');
      return new Response(JSON.stringify({ success: true, message: 'ok' }), { status: 200 });
    }
    if (url.endsWith('/booking/my-services') && init?.method === 'POST') {
      calls.push('create');
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: 4343, service_id: 1, name: 'x' } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  // PATCH con SOLO durationMinutes — ningún campo de catálogo — ejercita el
  // OR de la condición (catalogTouched sería false).
  const req: any = { params: { id: offer.id }, body: { durationMinutes: 60 } };
  const res = makeRes();
  await updateOffer(req, res);

  assert.deepEqual(calls, ['delete-3232', 'create']);
  assert.deepEqual(res.body.commercialResyncs, [{ id: commercial.id, ok: true }]);
});

test('updateOffer: dos PATCH consecutivos con los mismos valores RIPS — el segundo no re-sincroniza', async (t) => {
  const locationId = await createTestLocation();
  const adminId = await getAdminId();

  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo sin cambios reales', categoryGroup: '01 Consulta externa', basePrice: 60000, isActive: true,
  });

  const offer = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);

  const commercial = await ServiceCommercialRepository.create({ name: 'Comercial publicado', operativoId: catalog.id });
  await pool.query('UPDATE service_commercial SET doc_prof_service_id = 3333 WHERE id = $1', [commercial.id]);

  t.after(async () => {
    await pool.query('DELETE FROM service_commercial WHERE id = $1', [commercial.id]);
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]);
    await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
  });

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const sameRipsPayload = {
    serviceName: 'Operativo sin cambios reales', categoryGroup: '01 Consulta externa',
    description: null, isActive: true, basePrice: 60000,
  };

  const req1: any = { params: { id: offer.id }, body: sameRipsPayload };
  const res1 = makeRes();
  await updateOffer(req1, res1);
  assert.equal(res1.body.commercialResyncs, undefined, 'Primer PATCH sin cambios reales no re-sincroniza');

  const req2: any = { params: { id: offer.id }, body: sameRipsPayload };
  const res2 = makeRes();
  await updateOffer(req2, res2);
  assert.equal(res2.body.commercialResyncs, undefined, 'Segundo PATCH sin cambios reales tampoco re-sincroniza');
});

test('updateOffer: PATCH sin campos relevantes de catálogo no re-sincroniza nada', async (t) => {
  const locationId = await createTestLocation();
  const adminId = await getAdminId();

  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo sin cambios relevantes', categoryGroup: '01 Consulta externa', basePrice: 100000, isActive: true,
  });

  const offer = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);

  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]);
    await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
  });

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const req: any = { params: { id: offer.id }, body: { status: 'published' } };
  const res = makeRes();
  await updateOffer(req, res);

  assert.equal(res.body.commercialResyncs, undefined);
});

test('deleteOffer: borrar la última oferta de un operativo ya no llama a CuidameDoc', async (t) => {
  const locationId = await createTestLocation();
  const adminId = await getAdminId();

  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo a borrar', categoryGroup: '01 Consulta externa', basePrice: 100000, isActive: true,
  });

  const offer = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);

  // deleteOffer (bajo prueba) borra la oferta él mismo — solo queda
  // limpiar catálogo/sede, sin dependencia de orden entre ellos.
  t.after(async () => {
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]);
    await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
  });

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const req: any = { params: { id: offer.id } };
  const res = makeRes();
  await deleteOffer(req, res);

  assert.equal(res.body.success, true);
  assert.equal(res.body.docSync, undefined);
});
