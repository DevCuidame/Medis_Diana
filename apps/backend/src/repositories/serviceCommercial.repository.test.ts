import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ServiceCommercialRepository } from './serviceCommercial.repository.js';

after(async () => {
  await pool.end();
});

async function createTestOperativo(): Promise<{ id: string; name: string }> {
  const name = `Operativo repo test ${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO service_catalog (service_name, category_group, is_active, base_price)
     VALUES ($1, '01 Consulta externa', TRUE, 50000)
     RETURNING id`,
    [name]
  );
  return { id: rows[0].id, name };
}

test('create() + findById(): guarda y recupera un comercial con el nombre del operativo unido', async (t) => {
  // NOTE: t.after() hooks run in FIFO (registration) order, and
  // service_commercial.operativo_id is ON DELETE RESTRICT — so the
  // service_commercial row must be deleted before the service_catalog row.
  // This hook is registered first (using a closure variable set below) so
  // it always runs before the operativo cleanup registered further down.
  let commercialId: string | undefined;
  t.after(() => commercialId && pool.query('DELETE FROM service_commercial WHERE id = $1', [commercialId]));

  const operativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativo.id]));

  const created = await ServiceCommercialRepository.create({
    name: 'Consulta Bioreguladora Premium',
    description: 'Ficha comercial de prueba',
    operativoId: operativo.id,
  });
  commercialId = created.id;

  assert.equal(created.name, 'Consulta Bioreguladora Premium');
  assert.equal(created.operativoId, operativo.id);
  assert.equal(created.operativoName, operativo.name);
  assert.equal(created.isActive, true);
  assert.equal(created.docProfServiceId, null);

  const found = await ServiceCommercialRepository.findById(created.id);
  assert.deepEqual(found, created);
});

test('findAll(): un operativo puede respaldar varios comerciales (1:N)', async (t) => {
  let commercialIds: string[] = [];
  t.after(() => commercialIds.length && pool.query('DELETE FROM service_commercial WHERE id = ANY($1)', [commercialIds]));

  const operativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativo.id]));

  const c1 = await ServiceCommercialRepository.create({ name: 'Nombre comercial A', operativoId: operativo.id });
  const c2 = await ServiceCommercialRepository.create({ name: 'Nombre comercial B', operativoId: operativo.id });
  commercialIds = [c1.id, c2.id];

  const all = await ServiceCommercialRepository.findAll();
  const ids = all.map(c => c.id);
  assert.ok(ids.includes(c1.id));
  assert.ok(ids.includes(c2.id));
});

test('update(): cambia solo los campos enviados', async (t) => {
  let commercialId: string | undefined;
  t.after(() => commercialId && pool.query('DELETE FROM service_commercial WHERE id = $1', [commercialId]));

  const operativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativo.id]));

  const created = await ServiceCommercialRepository.create({ name: 'Original', operativoId: operativo.id });
  commercialId = created.id;

  const updated = await ServiceCommercialRepository.update(created.id, { isActive: false });
  assert.equal(updated!.isActive, false);
  assert.equal(updated!.name, 'Original');
});

test('delete(): elimina el comercial y devuelve true', async (t) => {
  const operativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativo.id]));

  const created = await ServiceCommercialRepository.create({ name: 'A borrar', operativoId: operativo.id });

  const ok = await ServiceCommercialRepository.delete(created.id);
  assert.equal(ok, true);

  const found = await ServiceCommercialRepository.findById(created.id);
  assert.equal(found, null);
});

test('create(): rechaza un operativoId que no existe (FK)', async () => {
  await assert.rejects(
    () => ServiceCommercialRepository.create({ name: 'Huérfano', operativoId: '00000000-0000-0000-0000-000000000000' })
  );
});
