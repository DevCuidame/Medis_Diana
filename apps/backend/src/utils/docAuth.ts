import { env } from '@config/env.js';

let accessToken: string | null = null;
let refreshToken: string | null = null;

async function loginDiana(): Promise<void> {
  const res = await fetch(`${env.DOC_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.DOC_DIANA_EMAIL, password: env.DOC_DIANA_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`CuidameDoc login failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { success: boolean; data: { access_token: string; refresh_token: string } };

  if (!json.success) {
    throw new Error('CuidameDoc login returned success=false');
  }

  accessToken = json.data.access_token;
  refreshToken = json.data.refresh_token;
}

async function tryRefresh(): Promise<void> {
  try {
    const res = await fetch(`${env.DOC_API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      throw new Error(`Refresh failed: ${res.status}`);
    }

    const json = (await res.json()) as { success: boolean; data: { access_token: string; refresh_token: string } };

    if (!json.success) {
      throw new Error('Refresh returned success=false');
    }

    accessToken = json.data.access_token;
    refreshToken = json.data.refresh_token;
  } catch {
    await loginDiana();
  }
}

export async function getDocToken(): Promise<string> {
  if (!accessToken) {
    await loginDiana();
  }
  return accessToken!;
}

export async function refreshDocToken(): Promise<string> {
  await tryRefresh();
  return accessToken!;
}
