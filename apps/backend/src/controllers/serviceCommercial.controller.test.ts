import { test, after } from 'node:test';
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
