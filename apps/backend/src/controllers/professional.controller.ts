import type { Request, Response } from 'express'
import { ProfessionalService } from '@services/professional.service.js'
import type { ProfessionalStatus } from '../types/professional.types.js'
import { pool } from '@config/database.js'
import { ProfessionalScheduleRepository } from '@repositories/professional-schedule.repository.js'

// UTC offset for Colombia (UTC-5, no DST)
const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000

function toColombiaLocal(utcDate: Date): Date {
  return new Date(utcDate.getTime() + COLOMBIA_OFFSET_MS)
}

function timeStr(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

// ─── GET /api/professionals ───────────────────────────────────────────────────
export async function listProfessionals(_req: Request, res: Response): Promise<void> {
  try {
    const professionals = await ProfessionalService.list()
    res.status(200).json({ success: true, data: { professionals } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

// ─── GET /api/professionals/stats ────────────────────────────────────────────
export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await ProfessionalService.getStats()
    res.status(200).json({ success: true, data: { stats } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

// ─── GET /api/professionals/:id ───────────────────────────────────────────────
export async function getProfessional(req: Request, res: Response): Promise<void> {
  try {
    const professional = await ProfessionalService.getById(req.params.id)
    res.status(200).json({ success: true, data: { professional } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

// ─── POST /api/professionals ──────────────────────────────────────────────────
export async function createProfessional(req: Request, res: Response): Promise<void> {
  try {
    const professional = await ProfessionalService.create(req.body)
    res.status(201).json({ success: true, data: { professional } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

// ─── PUT /api/professionals/:id ───────────────────────────────────────────────
export async function updateProfessional(req: Request, res: Response): Promise<void> {
  try {
    const professional = await ProfessionalService.update(req.params.id, req.body)
    res.status(200).json({ success: true, data: { professional } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

// ─── DELETE /api/professionals/:id ────────────────────────────────────────────
export async function deleteProfessional(req: Request, res: Response): Promise<void> {
  try {
    await ProfessionalService.deactivate(req.params.id)
    res.status(200).json({ success: true, message: 'Profesional desactivado.' })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

// ─── GET /api/professionals/:id/availability ─────────────────────────────────
// Query params: start (ISO UTC), end (ISO UTC), excludeOfferId (optional UUID)
export async function checkAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { start, end, excludeOfferId } = req.query as Record<string, string>;

    if (!start || !end) {
      res.status(400).json({ success: false, error: 'start y end son requeridos' });
      return;
    }

    const startDate = new Date(start);
    const endDate   = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      res.status(400).json({ success: false, error: 'Fechas inválidas' });
      return;
    }

    // Get professional type
    const { rows: userRows } = await pool.query<{ professional_type: string }>(
      `SELECT professional_type FROM users WHERE id = $1`, [id]
    );
    const profType = userRows[0]?.professional_type ?? 'dependiente';

    // For independiente: validate against the professional's schedule first
    if (profType === 'independiente') {
      const localStart  = toColombiaLocal(startDate);
      const localEnd    = toColombiaLocal(endDate);
      const dayOfWeek   = localStart.getUTCDay(); // UTC day of the shifted date = local day
      const startTime   = timeStr(localStart);
      const endTime     = timeStr(localEnd);

      const covered = await ProfessionalScheduleRepository.coversSlot(id, dayOfWeek, startTime, endTime);
      if (!covered) {
        const DAY_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        res.json({
          success: true,
          data: {
            available: false,
            reason: 'schedule',
            message: `El profesional no está disponible el ${DAY_ES[dayOfWeek]} de ${startTime} a ${endTime} según su horario registrado.`,
          },
        });
        return;
      }
    }

    // Check for overlapping service offers
    const { rows } = await pool.query<{ id: string; title: string; scheduled_at: Date; duration_minutes: number }>(
      `SELECT id, title, scheduled_at, duration_minutes
       FROM service_offers
       WHERE professional_id = $1
         AND status != 'cancelled'
         AND ($2::uuid IS NULL OR id != $2::uuid)
         AND scheduled_at < $4
         AND (scheduled_at + (duration_minutes * interval '1 minute')) > $3
       LIMIT 1`,
      [id, excludeOfferId || null, startDate.toISOString(), endDate.toISOString()]
    );

    if (rows.length === 0) {
      res.json({ success: true, data: { available: true, professionalType: profType } });
    } else {
      const conflict    = rows[0];
      const conflictEnd = new Date(new Date(conflict.scheduled_at).getTime() + conflict.duration_minutes * 60000);
      res.json({
        success: true,
        data: {
          available: false,
          reason: 'conflict',
          professionalType: profType,
          conflict: {
            id: conflict.id,
            title: conflict.title,
            scheduledAt: conflict.scheduled_at,
            endsAt: conflictEnd,
          },
        },
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── GET /api/professionals/:id/schedule ─────────────────────────────────────
export async function getSchedule(req: Request, res: Response): Promise<void> {
  try {
    const slots = await ProfessionalScheduleRepository.listByUser(req.params.id);
    res.json({ success: true, data: { slots } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── PUT /api/professionals/:id/schedule ─────────────────────────────────────
// Replaces all schedule slots for the professional
export async function replaceSchedule(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { slots } = req.body as { slots: { dayOfWeek: number; startTime: string; endTime: string }[] };
    if (!Array.isArray(slots)) {
      res.status(400).json({ success: false, error: 'slots debe ser un array' });
      return;
    }
    const saved = await ProfessionalScheduleRepository.replaceAll(id, slots);
    // Also update professional_type to independiente if slots are provided
    if (slots.length > 0) {
      await pool.query(`UPDATE users SET professional_type = 'independiente' WHERE id = $1`, [id]);
    }
    res.json({ success: true, data: { slots: saved } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── PATCH /api/professionals/:id/status ─────────────────────────────────────
export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.body as { status: ProfessionalStatus }
    await ProfessionalService.updateStatus(req.params.id, status)
    res.status(200).json({ success: true, message: 'Estado actualizado.' })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}
