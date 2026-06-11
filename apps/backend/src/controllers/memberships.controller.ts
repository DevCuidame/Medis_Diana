import type { Request, Response } from 'express';
import { MembershipRepository } from '@repositories/membership.repository.js';

export async function listMemberships(_req: Request, res: Response): Promise<void> {
  try {
    const memberships = await MembershipRepository.listAll();
    res.json({ success: true, data: { memberships } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function listActiveMemberships(_req: Request, res: Response): Promise<void> {
  try {
    const memberships = await MembershipRepository.listActive();
    res.json({ success: true, data: { memberships } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getMembership(req: Request, res: Response): Promise<void> {
  try {
    const membership = await MembershipRepository.findById(req.params.id);
    if (!membership) { res.status(404).json({ success: false, error: 'Membresía no encontrada' }); return; }
    res.json({ success: true, data: { membership } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createMembership(req: Request, res: Response): Promise<void> {
  try {
    const { code, name, type, price } = req.body;
    if (!code || !name || !type || price === undefined) {
      res.status(400).json({ success: false, error: 'Faltan campos requeridos: code, name, type, price' });
      return;
    }
    const membership = await MembershipRepository.create(req.body);
    res.status(201).json({ success: true, data: { membership } });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg.includes('unique') || msg.includes('duplicate')) {
      res.status(409).json({ success: false, error: 'Ya existe una membresía con ese código' });
    } else {
      res.status(500).json({ success: false, error: msg });
    }
  }
}

export async function updateMembership(req: Request, res: Response): Promise<void> {
  try {
    const membership = await MembershipRepository.update(req.params.id, req.body);
    if (!membership) { res.status(404).json({ success: false, error: 'Membresía no encontrada' }); return; }
    res.json({ success: true, data: { membership } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteMembership(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await MembershipRepository.delete(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, error: 'Membresía no encontrada' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === '23503') {
      res.status(409).json({
        success: false,
        error: 'No se puede eliminar este plan porque ya tiene compras o inscripciones de usuarios asociadas. Desactívalo en su lugar para ocultarlo.',
      });
      return;
    }
    res.status(500).json({ success: false, error: e.message });
  }
}
