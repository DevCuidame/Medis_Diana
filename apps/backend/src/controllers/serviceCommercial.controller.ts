// ============================================================
// apps/backend/src/controllers/serviceCommercial.controller.ts
// Controller: Servicios Comerciales (ficha pública de venta)
// Sin sincronización a CuidameDoc en esta fase — ver spec
// docs/superpowers/specs/2026-09-08-servicios-comerciales-operativos-design.md
// ============================================================

import type { Request, Response } from 'express';
import { ServiceCommercialRepository } from '@repositories/serviceCommercial.repository.js';
import { ServiceCatalogRepository } from '@repositories/services.repository.js';

function isForeignKeyViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23503';
}

/** ADMIN ONLY */
export async function listCommercial(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ServiceCommercialRepository.findAll();
    res.json({ success: true, data });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function createCommercial(req: Request, res: Response): Promise<void> {
  try {
    const { name, operativoId } = req.body as { name?: string; operativoId?: string };
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
      return;
    }
    if (!operativoId) {
      res.status(400).json({ success: false, error: 'El servicio operativo es obligatorio' });
      return;
    }
    const commercial = await ServiceCommercialRepository.create({
      name: name.trim(),
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      operativoId,
      isActive: req.body.isActive,
    });
    res.status(201).json({ success: true, data: commercial });
  } catch (err: unknown) {
    if (isForeignKeyViolation(err)) {
      res.status(400).json({ success: false, error: 'El servicio operativo seleccionado no existe' });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function updateCommercial(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    const updated = await ServiceCommercialRepository.update(id, req.body);
    if (!updated) { res.status(404).json({ success: false, error: 'Servicio comercial no encontrado' }); return; }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    if (isForeignKeyViolation(err)) {
      res.status(400).json({ success: false, error: 'El servicio operativo seleccionado no existe' });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function deleteCommercial(req: Request, res: Response): Promise<void> {
  try {
    const ok = await ServiceCommercialRepository.delete(req.params['id']!);
    if (!ok) { res.status(404).json({ success: false, error: 'Servicio comercial no encontrado' }); return; }
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — lista ligera de operativos activos, para el selector del formulario comercial */
export async function listOperativos(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ServiceCatalogRepository.listActive();
    res.json({ success: true, data });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
