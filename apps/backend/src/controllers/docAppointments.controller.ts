import type { Request, Response } from 'express';
import { env } from '@config/env.js';
import { getDocToken, refreshDocToken } from '@utils/docAuth.js';

async function docFetch(path: string, init?: RequestInit): Promise<Response> {
  let token = await getDocToken();
  let res = await fetch(`${env.DOC_API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers as object | undefined) },
  });
  if (res.status === 401) {
    token = await refreshDocToken();
    res = await fetch(`${env.DOC_API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers as object | undefined) },
    });
  }
  return res;
}

export async function getDianaAppointments(req: Request, res: Response): Promise<void> {
  const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
  const params = new URLSearchParams();
  if (start_date) params.set('start_date', start_date);
  if (end_date) params.set('end_date', end_date);
  const qs = params.size > 0 ? `?${params.toString()}` : '';
  try {
    const upstream = await docFetch(`/clinical-appointments${qs}`);
    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, error: 'Error conectando con CuidameDoc' });
  }
}

export async function createDianaAppointment(req: Request, res: Response): Promise<void> {
  try {
    const upstream = await docFetch('/clinical-appointments', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, error: 'Error conectando con CuidameDoc' });
  }
}

export async function getDianaPatients(req: Request, res: Response): Promise<void> {
  const { q } = req.query as { q?: string };
  const path = q ? `/patients/search?q=${encodeURIComponent(q)}` : '/patients/my-patients';
  try {
    const upstream = await docFetch(path);
    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch {
    res.status(502).json({ success: false, error: 'Error conectando con CuidameDoc' });
  }
}
