import type { Request, Response } from 'express';
import { env } from '@config/env.js';
import { getDocToken, refreshDocToken } from '@utils/docAuth.js';

export async function getCatalog(_req: Request, res: Response): Promise<void> {
  try {
    const upstream = await fetch(`${env.DOC_API_URL}/booking/professionals/12/services`);
    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, error: 'Error conectando con CuidameDoc' });
  }
}

export async function createCatalogService(req: Request, res: Response): Promise<void> {
  const { name, duration_minutes, category, description } = req.body as {
    name: string;
    duration_minutes: number;
    category?: string;
    description?: string;
  };

  const body = JSON.stringify({ service_name: name, duration_minutes, category, description });

  try {
    let token = await getDocToken();

    let upstream = await fetch(`${env.DOC_API_URL}/booking/my-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body,
    });

    if (upstream.status === 401) {
      token = await refreshDocToken();
      upstream = await fetch(`${env.DOC_API_URL}/booking/my-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
      });
    }

    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, error: 'Error conectando con CuidameDoc' });
  }
}

export async function deleteCatalogService(req: Request, res: Response): Promise<void> {
  const { profServiceId } = req.params;

  try {
    let token = await getDocToken();

    let upstream = await fetch(`${env.DOC_API_URL}/booking/my-services/${profServiceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (upstream.status === 401) {
      token = await refreshDocToken();
      upstream = await fetch(`${env.DOC_API_URL}/booking/my-services/${profServiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, error: 'Error conectando con CuidameDoc' });
  }
}
