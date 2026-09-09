import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { listCommercial, createCommercial, updateCommercial, deleteCommercial, listOperativos } from './serviceCommercial.controller.js';

after(async () => {
  await pool.end();
});

function makeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (payload: unknown) => { res.body = payload; return res; };
  return res;
}

async function createTestOperativo(): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO service_catalog (service_name, category_group, is_active, base_price)
     VALUES ($1, '01 Consulta externa', TRUE, 90000)
     RETURNING id`,
    [`Operativo controller test ${Date.now()}`]
  );
  return rows[0].id;
}

async function createInactiveTestOperativo(): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO service_catalog (service_name, category_group, is_active, base_price)
     VALUES ($1, '01 Consulta externa', FALSE, 90000)
     RETURNING id`,
    [`Operativo inactivo controller test ${Date.now()}`]
  );
  return rows[0].id;
}

test('createCommercial: crea un comercial vinculado a un operativo existente', async (t) => {
  // NOTE: t.after() hooks run in FIFO (registration) order, and
  // service_commercial.operativo_id is ON DELETE RESTRICT — so the
  // service_commercial cleanup below is registered first (right after
  // createCommercial runs) so it always runs before the operativo cleanup
  // registered further up.
  const operativoId = await createTestOperativo();

  const req: any = { body: { name: 'Botox facial', description: 'Tratamiento estético', operativoId } };
  const res = makeRes();
  await createCommercial(req, res);
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [res.body.data.id]));
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.name, 'Botox facial');
  assert.equal(res.body.data.operativoId, operativoId);
  assert.equal(res.body.data.isActive, true);
});

test('createCommercial: rechaza un operativoId inexistente con 400', async () => {
  const req: any = { body: { name: 'Comercial huérfano', operativoId: '00000000-0000-0000-0000-000000000000' } };
  const res = makeRes();
  await createCommercial(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test('createCommercial: rechaza nombre vacío con 400', async (t) => {
  const operativoId = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  const req: any = { body: { name: '  ', operativoId } };
  const res = makeRes();
  await createCommercial(req, res);

  assert.equal(res.statusCode, 400);
});

test('listCommercial → updateCommercial → deleteCommercial: ciclo completo', async (t) => {
  const operativoId = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  const createReq: any = { body: { name: 'Limpieza facial', operativoId } };
  const createRes = makeRes();
  await createCommercial(createReq, createRes);
  const id = createRes.body.data.id;

  const listRes = makeRes();
  await listCommercial({} as any, listRes);
  assert.ok(listRes.body.data.some((c: any) => c.id === id));

  const updateReq: any = { params: { id }, body: { isActive: false } };
  const updateRes = makeRes();
  await updateCommercial(updateReq, updateRes);
  assert.equal(updateRes.body.data.isActive, false);

  const deleteReq: any = { params: { id } };
  const deleteRes = makeRes();
  await deleteCommercial(deleteReq, deleteRes);
  assert.equal(deleteRes.body.success, true);

  const listAfterRes = makeRes();
  await listCommercial({} as any, listAfterRes);
  assert.equal(listAfterRes.body.data.some((c: any) => c.id === id), false);
});

test('listOperativos: devuelve solo operativos activos', async (t) => {
  const operativoId = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  const inactiveOperativoId = await createInactiveTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [inactiveOperativoId]));

  const res = makeRes();
  await listOperativos({} as any, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body.data.some((o: any) => o.id === operativoId));
  assert.equal(res.body.data.some((o: any) => o.id === inactiveOperativoId), false);
});

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
  // service_offers.catalog_id y service_commercial.operativo_id son ON
  // DELETE RESTRICT — un solo hook con deletes secuenciales (hijos antes
  // que padres).
  t.after(async () => {
    await pool.query('DELETE FROM service_commercial WHERE id = $1', [res.body.data.id]);
    await pool.query('DELETE FROM service_offers WHERE catalog_id = $1', [operativoId]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]);
    await pool.query('DELETE FROM locations WHERE name LIKE $1', ['Sede serviceCommercial controller test%']);
  });

  assert.equal(res.body.docSync.ok, true);
  assert.equal(res.body.data.docProfServiceId, 4242);
});

test('updateCommercial: activar un comercial ya creado inactivo lo publica en CuidameDoc', async (t) => {
  const operativoId = await createTestOperativoConOferta();

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });
  const createReq: any = { body: { name: 'Inicialmente inactivo', operativoId, isActive: false } };
  const createRes = makeRes();
  await createCommercial(createReq, createRes);
  const id = createRes.body.data.id;
  t.after(async () => {
    await pool.query('DELETE FROM service_commercial WHERE id = $1', [id]);
    await pool.query('DELETE FROM service_offers WHERE catalog_id = $1', [operativoId]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]);
    await pool.query('DELETE FROM locations WHERE name LIKE $1', ['Sede serviceCommercial controller test%']);
  });
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

test('updateCommercial: editar sin tocar campos relevantes no re-sincroniza', async (t) => {
  const operativoId = await createTestOperativo();

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const createReq: any = { body: { name: 'Sin cambios relevantes', operativoId, isActive: false } };
  const createRes = makeRes();
  await createCommercial(createReq, createRes);
  const id = createRes.body.data.id;
  t.after(async () => {
    await pool.query('DELETE FROM service_commercial WHERE id = $1', [id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]);
  });

  // Update que no toca name/description/operativoId/isActive → no debe llamar ensureDocSync
  const updateReq: any = { params: { id }, body: { imageUrl: 'data:image/png;base64,AAA=' } };
  const updateRes = makeRes();
  await updateCommercial(updateReq, updateRes);
  assert.equal(updateRes.body.docSync, undefined);
});
