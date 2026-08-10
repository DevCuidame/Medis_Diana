import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { provisionDocProfessional } from './docProfessionalProvision.service.js';

function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

const baseParams = {
  email: 'ximena@example.com', password: 'Segura123',
  firstName: 'Ximena', lastName: 'Pérez',
  idType: 'CC', idNumber: '123456', phone: '3000000000',
  address: 'Calle 1', medicalRegistrationNumber: 'RM-999',
};

test('provisionDocProfessional: éxito → devuelve ok y el professional_id de CuidameDoc', async (t) => {
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { professional_id: 99, user_id: 501 } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await provisionDocProfessional(baseParams);

  assert.equal(result.ok, true);
  assert.equal(result.docProfessionalId, 99);
});

test('provisionDocProfessional: CuidameDoc responde error (ej. email duplicado) → ok:false con el mensaje', async (t) => {
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Este correo ya está registrado.' }), { status: 409 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await provisionDocProfessional(baseParams);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Este correo ya está registrado.');
});

test('provisionDocProfessional: success:true pero data sin professional_id → ok:false, no reporta éxito falso', async (t) => {
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await provisionDocProfessional(baseParams);

  assert.equal(result.ok, false);
  assert.equal(result.docProfessionalId, undefined);
  assert.ok(result.error);
});

test('provisionDocProfessional: fallo de red → ok:false, nunca lanza', async (t) => {
  fetchMock(t, (url) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    throw new TypeError('fetch failed: network error');
  });

  await assert.doesNotReject(async () => {
    const result = await provisionDocProfessional(baseParams);
    assert.equal(result.ok, false);
    assert.ok(result.error);
  });
});
