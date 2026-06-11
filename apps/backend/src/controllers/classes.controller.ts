import type { Request, Response } from 'express';
import { ClassRepository } from '@repositories/class.repository.js';
import { BookingRepository } from '@repositories/booking.repository.js';
import { UserMembershipRepository } from '@repositories/user-membership.repository.js';
import { pool } from '@config/database.js';

export async function getClassOptions(_req: Request, res: Response): Promise<void> {
  try {
    const [disciplinesRes, locationsRes, roomsRes, membershipsRes] = await Promise.all([
      pool.query('SELECT * FROM disciplines WHERE is_active = TRUE ORDER BY name ASC'),
      pool.query('SELECT * FROM locations WHERE is_active = TRUE ORDER BY name ASC'),
      pool.query('SELECT * FROM rooms WHERE is_active = TRUE ORDER BY name ASC'),
      pool.query('SELECT * FROM memberships WHERE is_active = TRUE ORDER BY price ASC'),
    ]);
    res.status(200).json({
      success: true,
      data: {
        disciplines: disciplinesRes.rows,
        locations: locationsRes.rows,
        rooms: roomsRes.rows,
        memberships: membershipsRes.rows,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function createClass(req: Request, res: Response): Promise<void> {
  try {
    const newClass = await ClassRepository.create(req.body);
    res.status(201).json({ success: true, data: { class: newClass } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function listUpcoming(_req: Request, res: Response): Promise<void> {
  try {
    const classes = await ClassRepository.listUpcoming();
    res.status(200).json({ success: true, data: { classes } });
  } catch (err: any) {
    console.error('Error in listUpcoming:', err);
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

export async function getUserBookings(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return }
    const bookings = await BookingRepository.listByUser(userId)
    res.status(200).json({ success: true, data: { bookings } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { classId } = req.body;
    if (!classId) { res.status(400).json({ success: false, error: 'classId requerido' }); return; }

    // Check user's active membership
    const userMembership = await UserMembershipRepository.findActiveByUserId(userId);
    let isFree = false;
    let bookingSource: 'membership_unlimited' | 'membership_credit' | 'no_membership' = 'no_membership';

    if (userMembership) {
      if (userMembership.coversFreeClasses) {
        isFree = true;
        bookingSource = 'membership_unlimited';
      } else if (userMembership.hasClassCredits) {
        isFree = true;
        bookingSource = 'membership_credit';
        await UserMembershipRepository.deductClass(userMembership.id);
      }
    }

    const booking = await BookingRepository.create(classId, userId);
    res.status(201).json({
      success: true,
      data: {
        booking,
        isFree,
        bookingSource,
        classesRemaining: bookingSource === 'membership_credit'
          ? (userMembership!.classesRemaining ?? 1) - 1
          : null,
      },
    });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}
