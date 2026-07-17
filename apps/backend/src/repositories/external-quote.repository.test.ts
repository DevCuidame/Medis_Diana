import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { ExternalQuoteRepository } from './external-quote.repository.js';
import { pool } from '@config/database.js';

after(async () => {
  await pool.end();
});

const SAMPLE_ITEMS = [
  { type: 'inventory' as const, refId: 'fake-inv-1', name: 'Acetaminofén 500mg (test)', unitPrice: 5000, quantity: 2, subtotal: 10000 },
  { type: 'plan' as const, refId: 'fake-plan-1', name: 'Consulta Privada (test)', unitPrice: 120000, quantity: 1, subtotal: 120000 },
];

test('create() inserts a pending quote, listByStatus("pending") finds it, resolve() confirms it', async () => {
  const created = await ExternalQuoteRepository.create({
    externalReference: 'HC-TEST-0001',
    patientName: 'Paciente de Prueba',
    patientEmail: 'paciente-test@example.com',
    professionalName: 'Dra. Diana (test)',
    items: SAMPLE_ITEMS,
    totalAmount: 130000,
  });

  assert.equal(created.status, 'pending');
  assert.equal(created.totalAmount, 130000);
  assert.equal(created.items.length, 2);
  assert.equal(created.source, 'cuidamedoc');

  const pending = await ExternalQuoteRepository.listByStatus('pending');
  assert.ok(pending.some((q) => q.id === created.id));

  const resolved = await ExternalQuoteRepository.resolve(created.id, 'confirmed', 'admin-test@medis.com');
  assert.equal(resolved?.status, 'confirmed');
  assert.equal(resolved?.resolvedBy, 'admin-test@medis.com');
  assert.ok(resolved?.resolvedAt);

  const stillPending = await ExternalQuoteRepository.listByStatus('pending');
  assert.equal(stillPending.some((q) => q.id === created.id), false);
});
