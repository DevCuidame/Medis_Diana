// ============================================================
// apps/backend/src/controllers/services.controller.ts
// Controller: Gestión de Servicios
// Protección por roles: Admin = acceso completo
//                       User  = solo crear/cancelar sus reservas
// ============================================================

import type { Request, Response } from 'express';
import { pool } from '@config/database.js';
import {
  OperatingHoursRepository,
  RoomRepository,
  ServiceOfferRepository,
  BookingRequestRepository,
} from '@repositories/services.repository.js';
import { UserMembershipRepository } from '@repositories/user-membership.repository.js';
import { sendServicePaymentConfirmation } from '@utils/email.util.js';
import type {
  CreateServiceOfferPayload,
  UpdateServiceOfferPayload,
  ServiceOffersFilter,
  ResolveBookingRequestPayload,
} from '@acaripole/shared-types';

/** Map a discipline name to a session category (must match resolveBenefits logic) */
function getDisciplineCategory(disciplineName: string | null | undefined): string {
  if (!disciplineName) return 'general';
  const n = disciplineName.toLowerCase();
  if (n.includes('pole')) return 'pole';
  if (n.includes('fuerza') || n.includes('flexibilidad') || n.includes('flex')) return 'complementary';
  return 'general';
}

// ─── OPERATING HOURS ─────────────────────────────────────────

export async function getOperatingHours(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const hours = await OperatingHoursRepository.findByLocation(locationId);
    res.json({ success: true, data: { hours } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function upsertOperatingHours(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const { hours } = req.body;
    if (!Array.isArray(hours)) {
      res.status(400).json({ success: false, error: 'hours debe ser un array' });
      return;
    }
    const result = await OperatingHoursRepository.upsertMany(locationId, hours);
    res.json({ success: true, data: { hours: result } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

// ─── ROOMS ───────────────────────────────────────────────────

export async function getAllRooms(_req: Request, res: Response): Promise<void> {
  try {
    const { rows } = await RoomRepository.findAll();
    res.json({ success: true, data: { rooms: rows } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getRoomsByLocation(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const rooms = await RoomRepository.findByLocation(locationId);
    res.json({ success: true, data: { rooms } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function createRoom(req: Request, res: Response): Promise<void> {
  try {
    const room = await RoomRepository.create(req.body);
    res.status(201).json({ success: true, data: { room } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function updateRoom(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const room = await RoomRepository.update(id, req.body);
    if (!room) { res.status(404).json({ success: false, error: 'Salón no encontrado' }); return; }
    res.json({ success: true, data: { room } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

// ─── SERVICE OFFERS ──────────────────────────────────────────

export async function listOffers(req: Request, res: Response): Promise<void> {
  try {
    const filter: ServiceOffersFilter = {
      locationId: req.query['locationId'] as string | undefined,
      offerType:  req.query['offerType']  as ServiceOffersFilter['offerType'],
      status:     req.query['status']     as ServiceOffersFilter['status'],
      from:       req.query['from']       as string | undefined,
      to:         req.query['to']         as string | undefined,
      page:       req.query['page']  ? parseInt(req.query['page']  as string, 10) : 1,
      limit:      req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20,
    };
    const { data, total } = await ServiceOfferRepository.findAll(filter);
    const limit = filter.limit ?? 20;
    res.json({
      success: true,
      data: {
        offers: data,
        total,
        page: filter.page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getOffer(req: Request, res: Response): Promise<void> {
  try {
    const offer = await ServiceOfferRepository.findById(req.params['id']!);
    if (!offer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }
    res.json({ success: true, data: { offer } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — auth guard desactivado temporalmente para desarrollo */
export async function createOffer(req: Request, res: Response): Promise<void> {
  try {
    let adminId = req.user?.id;
    if (!adminId) {
      const adminRes = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
      adminId = adminRes.rows[0]?.id;
    }
    if (!adminId) {
      res.status(400).json({ success: false, error: 'No se encontró un administrador en la BD para asignar creador.' });
      return;
    }
    const payload = req.body as CreateServiceOfferPayload;
    const offer = await ServiceOfferRepository.create(payload, adminId);
    res.status(201).json({ success: true, data: { offer } });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status = msg.includes('supera la del salón') ? 400 : 500;
    res.status(status).json({ success: false, error: msg });
  }
}

/** ADMIN ONLY */
export async function updateOffer(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as UpdateServiceOfferPayload;
    const offer = await ServiceOfferRepository.update(req.params['id']!, payload);
    if (!offer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }
    res.json({ success: true, data: { offer } });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status = msg.includes('supera la del salón') ? 400 : 500;
    res.status(status).json({ success: false, error: msg });
  }
}

/** ADMIN ONLY */
export async function deleteOffer(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await ServiceOfferRepository.delete(req.params['id']!);
    if (!deleted) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

// ─── BOOKING REQUESTS ────────────────────────────────────────

/** ADMIN: ver todas las solicitudes de una oferta */
export async function listBookingRequests(req: Request, res: Response): Promise<void> {
  try {
    const requests = await BookingRequestRepository.findByOffer(req.params['offerId']!);
    res.json({ success: true, data: { requests } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN: todas las inscripciones con filtro opcional por status */
export async function listAllBookingRequests(req: Request, res: Response): Promise<void> {
  try {
    const status = req.query['status'] as string | undefined;
    const requests = await BookingRequestRepository.findAll(status);
    res.json({ success: true, data: { requests } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** USER: ver mis propias solicitudes */
export async function myBookingRequests(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const requests = await BookingRequestRepository.findByUser(userId);
    res.json({ success: true, data: { requests } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** USER: inscribirse a un servicio recurrente — crea UNA solicitud que el admin aprueba */
export async function createBulkBookingRequests(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { offerIds, paymentMethod } = req.body as {
      offerIds: string[]; paymentMethod?: 'cash' | 'wompi';
    };
    if (!Array.isArray(offerIds) || offerIds.length === 0) {
      res.status(400).json({ success: false, error: 'offerIds debe ser un array no vacío' }); return;
    }

    // Validate the lead offer (first session)
    const lead = await ServiceOfferRepository.findById(offerIds[0]);
    if (!lead) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }
    if (lead.enrolledCount >= lead.capacity) {
      res.status(409).json({ success: false, error: 'No hay cupos disponibles' }); return;
    }
    if (lead.status !== 'published') {
      res.status(400).json({ success: false, error: 'La oferta no está disponible' }); return;
    }

    // ── Server-side per-category session quota check ──────────────────────
    const activeMembership = await UserMembershipRepository.findActiveByUserId(userId);
    const sessionCount = offerIds.length;

    // If the plan has no discount, check if the inscription provides one
    let inscriptionDiscountPct: number | null = null;
    if (activeMembership?.discountPercent == null) {
      const inscription = await UserMembershipRepository.findActiveInscriptionByUserId(userId);
      inscriptionDiscountPct = inscription?.discountPercent ?? null;
    }
    // Effective discount: plan discount takes precedence over inscription discount
    const effectiveDiscountPct = activeMembership?.discountPercent ?? inscriptionDiscountPct;

    let computedExpectedAmount: number | undefined;
    let computedDiscountPct: number | undefined;

    if (activeMembership?.coversFreeClasses && activeMembership.classesRemaining === null) {
      // Unlimited plan — always free
      computedExpectedAmount = undefined;
    } else if (activeMembership && Object.keys(activeMembership.categoryCredits).length > 0) {
      // Per-category plan — check credits for this specific service type
      const offerCategory = getDisciplineCategory(lead.discipline?.name);
      const credits = activeMembership.categoryCredits[offerCategory]
        ?? activeMembership.categoryCredits['general'];

      const freeSessionsAvailable = credits?.remaining ?? 0;
      const freeToUse = Math.min(freeSessionsAvailable, sessionCount);
      const paidSessions = sessionCount - freeToUse;

      if (paidSessions > 0 && (lead.price ?? 0) > 0) {
        const discPct = effectiveDiscountPct ?? 0;
        const pricePerSession = Math.round((lead.price ?? 0) * (1 - discPct / 100));
        computedExpectedAmount = paidSessions * pricePerSession;
        computedDiscountPct = discPct > 0 ? discPct : undefined;
      } else {
        computedExpectedAmount = undefined; // all free
      }
    } else if (activeMembership?.hasClassCredits) {
      // Legacy single-pool plan (classes_remaining)
      const remaining = activeMembership.classesRemaining ?? 0;
      const paidSessions = Math.max(0, sessionCount - remaining);
      if (paidSessions > 0 && (lead.price ?? 0) > 0) {
        const discPct = effectiveDiscountPct ?? 0;
        computedExpectedAmount = paidSessions * Math.round((lead.price ?? 0) * (1 - discPct / 100));
        computedDiscountPct = discPct > 0 ? discPct : undefined;
      }
    } else if (effectiveDiscountPct != null && (lead.price ?? 0) > 0) {
      // No free classes — apply plan or inscription discount
      computedExpectedAmount = sessionCount * Math.round((lead.price ?? 0) * (1 - effectiveDiscountPct / 100));
      computedDiscountPct = effectiveDiscountPct;
    } else if ((lead.price ?? 0) > 0) {
      // No membership or credits — full price
      computedExpectedAmount = sessionCount * (lead.price ?? 0);
    }

    const request = await BookingRequestRepository.createGroupEnrollment(
      offerIds, userId,
      {
        paymentMethod: paymentMethod ?? 'cash',
        expectedAmount: computedExpectedAmount,
        discountPct: computedDiscountPct,
      }
    );
    res.status(201).json({ success: true, data: { request, sessionCount } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** USER: obtener todas las sesiones aprobadas para el calendario */
export async function myCalendarSessions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const sessions = await BookingRequestRepository.findApprovedSessionsByUser(userId);
    res.json({ success: true, data: { sessions } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN: asignar monto a una inscripción gratuita → la mueve a Finanzas */
export async function setBookingPayment(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { id } = req.params;
    const { expectedAmount, discountPct, paymentMethod } = req.body as {
      expectedAmount: number; discountPct?: number; paymentMethod?: 'cash' | 'wompi';
    };
    if (!expectedAmount || expectedAmount <= 0) {
      res.status(400).json({ success: false, error: 'expectedAmount debe ser mayor a 0' }); return;
    }
    await pool.query(
      `UPDATE booking_requests
       SET expected_amount = $1, discount_pct = $2, payment_method = $3, updated_at = NOW()
       WHERE id = $4`,
      [expectedAmount, discountPct ?? null, paymentMethod ?? 'cash', id]
    );
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** USER: solicitar reserva */
export async function createBookingRequest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { offerId } = req.body as { offerId: string };
    if (!offerId) { res.status(400).json({ success: false, error: 'offerId es requerido' }); return; }

    // Verificar que la oferta existe y tiene cupo
    const offer = await ServiceOfferRepository.findById(offerId);
    if (!offer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }
    if (offer.enrolledCount >= offer.capacity) {
      res.status(409).json({ success: false, error: 'No hay cupos disponibles' }); return;
    }
    if (offer.status !== 'published') {
      res.status(400).json({ success: false, error: 'La oferta no está disponible' }); return;
    }

    const request = await BookingRequestRepository.create(offerId, userId);
    res.status(201).json({ success: true, data: { request } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: listar pagos de servicios pendientes (expectedAmount > 0) */
export async function listPendingServicePayments(_req: Request, res: Response): Promise<void> {
  try {
    const requests = await BookingRequestRepository.findPendingServicePayments();
    res.json({ success: true, data: { requests } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: confirmar pago de un servicio y auto-aprobar la inscripción */
export async function confirmServicePayment(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }

    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, error: 'id es requerido' }); return; }

    const request = await BookingRequestRepository.confirmServicePayment(id, adminId);
    if (!request) { res.status(404).json({ success: false, error: 'Solicitud no encontrada' }); return; }

    // Send service confirmation email to the user
    try {
      await sendServicePaymentConfirmation(request.user.email, {
        userName:      `${request.user.firstName} ${request.user.lastName}`.trim(),
        serviceName:   (request as any).offerTitle ?? 'Servicio',
        scheduledAt:   (request as any).scheduledAt ?? null,
        sessionCount:  (request as any).sessionCount ?? 1,
        amountPaid:    (request as any).expectedAmount ?? 0,
        paymentMethod: (request as any).paymentMethod ?? 'cash',
        locationName:  (request as any).locationName ?? null,
      });
    } catch {
      // Non-fatal: email failure should not block the confirmation response
    }

    res.json({ success: true, data: { request } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: rechazar un pago de servicio pendiente → marca la solicitud como rechazada */
export async function rejectServicePayment(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, error: 'id es requerido' }); return; }
    await pool.query(
      `UPDATE booking_requests
       SET status = 'rejected', resolved_by = $1, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [adminId, id]
    );
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: eliminar permanentemente una solicitud de servicio */
export async function deleteServicePayment(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, error: 'id es requerido' }); return; }
    await pool.query(`DELETE FROM booking_requests WHERE id = $1`, [id]);
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: aprobar o rechazar una solicitud */
export async function resolveBookingRequest(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }

    const { id } = req.params;
    const { status, rejectReason } = req.body as ResolveBookingRequestPayload;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, error: 'status debe ser approved o rejected' });
      return;
    }
    if (status === 'rejected' && !rejectReason) {
      res.status(400).json({ success: false, error: 'rejectReason es requerido al rechazar' });
      return;
    }

    const request = await BookingRequestRepository.resolve(id!, adminId, status, rejectReason);
    if (!request) { res.status(404).json({ success: false, error: 'Solicitud no encontrada' }); return; }
    res.json({ success: true, data: { request } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
