import type { Request, Response } from 'express';
import { UserMembershipRepository } from '@repositories/user-membership.repository.js';
import { sendAdminPaymentNotification, sendUserPaymentConfirmation } from '@utils/email.util.js';
import { pool } from '@config/database.js';

export async function getMyActiveInscription(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const inscription = await UserMembershipRepository.findActiveInscriptionByUserId(userId);
    res.json({ success: true, data: { inscription } });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

export async function getMyActiveMembership(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const membership = await UserMembershipRepository.findActiveByUserId(userId);
    res.json({ success: true, data: { membership } });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

export async function getMyMembershipHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const memberships = await UserMembershipRepository.listByUserId(userId);
    res.json({ success: true, data: { memberships } });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

export async function purchaseMembership(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email ?? '';
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }

    const { membershipId, paymentMethod } = req.body;
    if (!membershipId) { res.status(400).json({ success: false, error: 'membershipId requerido' }); return; }

    // Check if the plan requires an active inscription
    const { rows: mRows } = await pool.query(
      'SELECT type FROM memberships WHERE id = $1 AND is_active = TRUE',
      [membershipId]
    );
    if (!mRows.length) { res.status(404).json({ success: false, error: 'Plan no encontrado' }); return; }

    const planType = mRows[0].type as string;
    if (planType !== 'inscription') {
      const insc = await UserMembershipRepository.findActiveInscriptionByUserId(userId);
      if (!insc) {
        res.status(403).json({
          success: false,
          error: 'Se requiere una inscripción activa para adquirir planes. Realiza tu inscripción primero.',
          code: 'INSCRIPTION_REQUIRED',
        });
        return;
      }
    }

    const method: 'cash' | 'wompi' = paymentMethod === 'wompi' ? 'wompi' : 'cash';
    const membership = await UserMembershipRepository.create(userId, membershipId, method);

    res.status(201).json({ success: true, data: { membership } });

    // Fire-and-forget: notify admin of new pending payment
    sendAdminPaymentNotification({
      userName: userEmail,
      userEmail,
      planName: membership.membership.name,
      planType: membership.membership.type,
      planPrice: membership.membership.price,
      paymentMethod: method,
      requestedAt: new Date().toLocaleDateString('es-CO', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
    }).catch(() => { /* never block the response */ });

  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

// Admin: list all currently active memberships
export async function getActiveMemberships(_req: Request, res: Response): Promise<void> {
  try {
    const memberships = await UserMembershipRepository.listActiveAll();
    res.json({ success: true, data: { memberships } });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

// Admin: list all memberships pending payment confirmation
export async function getPendingMemberships(_req: Request, res: Response): Promise<void> {
  try {
    const memberships = await UserMembershipRepository.listPendingAll();
    res.json({ success: true, data: { memberships } });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

// Admin: reject a pending plan payment → marks as cancelled
export async function rejectPlan(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, error: 'id requerido' }); return; }
    await UserMembershipRepository.rejectPayment(id);
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

// Admin: delete a plan purchase record
export async function deletePlan(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, error: 'id requerido' }); return; }
    await UserMembershipRepository.deleteRecord(id);
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

// Admin: confirm a pending payment → activates the membership
export async function confirmPayment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, error: 'id requerido' }); return; }

    const membership = await UserMembershipRepository.confirmPayment(id);

    res.json({ success: true, data: { membership } });

    // Fire-and-forget: send confirmation email to user
    if (membership.userEmail) {
      sendUserPaymentConfirmation(membership.userEmail, {
        userName: membership.userName ?? membership.userEmail,
        planName: membership.membership.name,
        planType: membership.membership.type,
        planPrice: membership.membership.price,
        durationDays: membership.membership.durationDays,
        classesRemaining: membership.classesRemaining,
        benefits: membership.membership.benefits,
        activatedAt: new Date().toLocaleDateString('es-CO', {
          day: 'numeric', month: 'long', year: 'numeric',
        }),
        expiresAt: membership.expiresAt,
      }).catch(() => { /* never block the response */ });
    }

  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}
