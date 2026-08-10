import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ProfessionalService } from '@services/professional.service.js';
import { createProfessional } from './professional.controller.js';

// Este archivo NO toca la base de datos real — ProfessionalService.create se
// mockea por completo, así que solo verificamos la forma exacta de la
// respuesta HTTP que arma el controlador. Aun así cerramos el pool para que
// el proceso de test termine limpio (el pool se abre de forma perezosa al
// importar professional.controller.ts, que a su vez importa @config/database).
after(async () => {
  await pool.end();
});

function makeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (payload: unknown) => { res.body = payload; return res; };
  return res;
}

test('createProfessional: docSync va como hermano de data, no anidado dentro de data', async (t: TestContext) => {
  const fakeProfessional = { id: 'fake-id-1', email: 'doc-sync-ctrl@example.com' };
  const fakeDocSync = { ok: false, error: 'x' };

  t.mock.method(ProfessionalService, 'create', async () => ({
    professional: fakeProfessional,
    docSync: fakeDocSync,
  }));

  const req: any = { body: {} };
  const res = makeRes();
  await createProfessional(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data.professional, fakeProfessional);

  // docSync debe estar presente en la raíz de la respuesta...
  assert.ok('docSync' in res.body);
  assert.deepEqual(res.body.docSync, fakeDocSync);

  // ...y NO anidado dentro de data (si un futuro cambio hiciera
  // `data: { professional, docSync }`, esta aserción lo atraparía).
  assert.equal('docSync' in res.body.data, false);
});

test('createProfessional: cuando docSync es undefined (camino ADMIN), la clave no aparece en absoluto', async (t: TestContext) => {
  const fakeProfessional = { id: 'fake-id-2', email: 'admin-ctrl@example.com' };

  t.mock.method(ProfessionalService, 'create', async () => ({
    professional: fakeProfessional,
    // docSync deliberadamente ausente, como en el camino ADMIN real.
  }));

  const req: any = { body: {} };
  const res = makeRes();
  await createProfessional(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data.professional, fakeProfessional);

  // No solo debe ser `undefined` — la clave no debe existir en absoluto.
  assert.equal('docSync' in res.body, false);
  assert.deepEqual(Object.keys(res.body).sort(), ['data', 'success']);
});
