// ============================================================
// apps/backend/src/controllers/discounts.controller.ts
// Controller: Descuentos y Promociones
// ============================================================

import type { Request, Response } from 'express';
import { pool } from '@config/database.js';
import { DiscountRepository } from '@repositories/discount.repository.js';
import { ServiceOfferRepository } from '@repositories/services.repository.js';
import type { CreateDiscountPayload, UpdateDiscountPayload } from '@medisdiana/shared-types';

// ─── SPECIALTIES (para el selector de restricción de descuentos) ─────
export async function listSpecialties(_req: Request, res: Response): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT id, name FROM specialties WHERE is_active = TRUE ORDER BY name`
    );
    res.json({ success: true, data: { specialties: rows } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

// ─── ADMIN: CRUD ─────────────────────────────────────────────

export async function listDiscounts(_req: Request, res: Response): Promise<void> {
  try {
    const discounts = await DiscountRepository.findAll();
    res.json({ success: true, data: { discounts } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createDiscount(req: Request, res: Response): Promise<void> {
  try {
    const createdBy = req.user?.id;
    if (!createdBy) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }

    const payload = req.body as CreateDiscountPayload;
    if (!payload.name || !payload.type) {
      res.status(400).json({ success: false, error: 'name y type son requeridos' }); return;
    }
    if (payload.type === 'buy_x_get_y') {
      if (payload.buyQty == null || payload.payQty == null || payload.payQty >= payload.buyQty) {
        res.status(400).json({ success: false, error: 'buyQty y payQty son requeridos, y payQty debe ser menor que buyQty' }); return;
      }
    } else {
      if (payload.value == null) {
        res.status(400).json({ success: false, error: 'value es requerido para este tipo de descuento' }); return;
      }
      if (payload.type === 'percentage' && (payload.value <= 0 || payload.value > 100)) {
        res.status(400).json({ success: false, error: 'El porcentaje debe estar entre 1 y 100' }); return;
      }
    }

    const discount = await DiscountRepository.create(payload, createdBy);
    res.status(201).json({ success: true, data: { discount } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function updateDiscount(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const payload = req.body as UpdateDiscountPayload;
    const discount = await DiscountRepository.update(id!, payload);
    if (!discount) { res.status(404).json({ success: false, error: 'Descuento no encontrado' }); return; }
    res.json({ success: true, data: { discount } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteDiscount(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await DiscountRepository.delete(id!);
    if (!deleted) { res.status(404).json({ success: false, error: 'Descuento no encontrado' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

// ─── PUBLIC ──────────────────────────────────────────────────

export async function listActiveDiscounts(req: Request, res: Response): Promise<void> {
  try {
    const specialtyId = req.query['specialtyId'] as string | undefined;
    const discounts = await DiscountRepository.findActiveAutomatic(specialtyId);
    res.json({ success: true, data: { discounts } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function validateDiscount(req: Request, res: Response): Promise<void> {
  try {
    const { code, offerId, sessionCount } = req.body as { code?: string; offerId: string; sessionCount?: number };
    if (!offerId) { res.status(400).json({ success: false, error: 'offerId es requerido' }); return; }

    const offer = await ServiceOfferRepository.findById(offerId);
    if (!offer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    const count = sessionCount ?? 1;
    const pricePerSession = offer.price ?? 0;
    const originalTotal = pricePerSession * count;

    const resolution = await DiscountRepository.resolveForBooking({
      code, offerId, specialtyId: offer.specialty?.id ?? null, sessionCount: count,
    });

    if (!resolution.discount) {
      res.json({
        success: true,
        data: {
          valid: false, discount: null, pricePerSession,
          originalTotal, discountedTotal: originalTotal, amountSaved: 0,
          error: resolution.error,
        },
      });
      return;
    }

    const computed = DiscountRepository.computePrice(resolution.discount, pricePerSession, count);
    res.json({
      success: true,
      data: {
        valid: true, discount: resolution.discount, pricePerSession,
        originalTotal, discountedTotal: computed.total, amountSaved: computed.amountSaved,
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
