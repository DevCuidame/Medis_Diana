import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ProfessionalService } from './professional.service.js';

after(async () => {
  await pool.end();
});

function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

function baseDto(overrides: Record<string, unknown> = {}) {
  return {
    email: `doc-sync-${Date.now()}@example.com`,
    password: 'Segura123',
    firstName: 'Ximena', lastName: 'Pérez',
    idType: 'CC', idNumber: String(Date.now()).slice(-9),
    phone: '3000000000', personalAddress: 'Calle 1',
    medicalRegistrationNumber: 'RM-999',
    sisproUsername: 'ximena.sispro', sisproPassword: 'sispro123',
    ...overrides,
  };
}

async function deleteTestUser(email: string) {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
}

test('create: profesional creado + CuidameDoc responde bien → guarda doc_professional_id y docSync.ok=true', async (t) => {
  const dto = baseDto();
  t.after(() => deleteTestUser(dto.email));

  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { professional_id: 99, user_id: 501 } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await ProfessionalService.create(dto as any);

  assert.equal(result.docSync?.ok, true);
  const { rows } = await pool.query('SELECT doc_professional_id FROM users WHERE email = $1', [dto.email]);
  assert.equal(rows[0].doc_professional_id, 99);
});

test('create: profesional creado + CuidameDoc falla → sigue creado localmente, docSync.ok=false, doc_professional_id queda NULL', async (t) => {
  const dto = baseDto();
  t.after(() => deleteTestUser(dto.email));

  fetchMock(t, (url) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    throw new TypeError('fetch failed: network error');
  });

  const result = await ProfessionalService.create(dto as any);

  assert.ok(result.professional);
  assert.equal(result.docSync?.ok, false);
  assert.ok(result.docSync?.error);
  const { rows } = await pool.query('SELECT doc_professional_id FROM users WHERE email = $1', [dto.email]);
  assert.equal(rows[0].doc_professional_id, null);
});

test('create: role ADMIN → no llama a CuidameDoc, docSync es undefined', async (t) => {
  const dto = baseDto({
    role: 'ADMIN',
    medicalRegistrationNumber: undefined, sisproUsername: undefined, sisproPassword: undefined,
  });
  t.after(() => deleteTestUser(dto.email));

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const result = await ProfessionalService.create(dto as any);

  assert.equal(result.docSync, undefined);
});
