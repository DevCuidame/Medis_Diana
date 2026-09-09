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
