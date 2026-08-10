import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { CupsRepository } from './cups.repository.js';
import { pool } from '@config/database.js';

after(async () => {
  await pool.end();
});

test('listRepsServiceCodes() returns only active REPS codes, ordered by group then code', async () => {
  const codes = await CupsRepository.listRepsServiceCodes();

  assert.equal(codes.length, 154, 'seeded migration 025 has 154 active rows (157 total, 3 inactive)');
  assert.ok(codes.every((c) => c.code && c.name && c.serviceGroup));

  const medicinaGeneral = codes.find((c) => c.code === '328');
  assert.deepEqual(medicinaGeneral, { code: '328', name: 'MEDICINA GENERAL', serviceGroup: '01' });

  // The 3 inactive transporte-asistencial codes must not appear
  assert.equal(codes.some((c) => c.code === '1103'), false);

  // Ordered by service_group then code
  for (let i = 1; i < codes.length; i++) {
    const prev = codes[i - 1]!, cur = codes[i]!;
    assert.ok(
      prev.serviceGroup < cur.serviceGroup ||
      (prev.serviceGroup === cur.serviceGroup && prev.code <= cur.code)
    );
  }
});
