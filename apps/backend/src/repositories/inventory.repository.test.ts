import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { InventoryRepository } from './inventory.repository.js';
import { pool } from '@config/database.js';

after(async () => {
  await pool.end();
});

test('create() inserts an item and listActive() finds it by search', async () => {
  const created = await InventoryRepository.create({
    name: 'Guantes de nitrilo talla M (test)',
    category: 'Insumos médicos',
    unit: 'cajas',
    price: 25000,
    quantity: 10,
    minStock: 3,
  });

  try {
    assert.equal(created.name, 'Guantes de nitrilo talla M (test)');
    assert.equal(created.price, 25000);
    assert.equal(created.isActive, true);

    const found = await InventoryRepository.listActive({ search: 'nitrilo' });
    assert.ok(found.some((i) => i.id === created.id));
  } finally {
    await InventoryRepository.delete(created.id);
  }
});

test('delete() soft-deletes: item disappears from listActive() but findById() still returns it', async () => {
  const created = await InventoryRepository.create({
    name: 'Ítem temporal para borrar (test)',
    category: 'Equipos',
    unit: 'unidades',
    price: 100000,
  });

  const deleted = await InventoryRepository.delete(created.id);
  assert.equal(deleted, true);

  const active = await InventoryRepository.listActive({ search: 'temporal para borrar' });
  assert.equal(active.some((i) => i.id === created.id), false);

  const stillThere = await InventoryRepository.findById(created.id);
  assert.equal(stillThere?.isActive, false);
});
