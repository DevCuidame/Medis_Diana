import { pool } from '@config/database.js';
import type { ClassPublic } from '../types/class.types.js';
import type { MembershipPublic } from '../types/membership.types.js';

interface ClassRow {
  id: string;
  scheduled_at: Date;
  duration_minutes: number;
  capacity: number;
  enrolled_count: number;
  location: string | null;
  notes: string | null;
  is_cancelled: boolean;
  discipline_id: string;
  discipline_name: string;
  discipline_level: string;
  discipline_duration: number;
  instructor_id: string;
  instructor_first: string;
  instructor_last: string;
  membership_id: string | null;
  membership_code: string | null;
  membership_name: string | null;
  membership_description: string | null;
  membership_type: MembershipPublic['type'] | null;
  membership_price: number | null;
  membership_currency: string | null;
  membership_duration: number | null;
}

function toMembership(row: ClassRow): MembershipPublic | null {
  if (!row.membership_id) return null;
  return {
    id: row.membership_id,
    code: row.membership_code ?? '',
    name: row.membership_name ?? '',
    description: row.membership_description ?? null,
    type: row.membership_type ?? 'per_class',
    price: row.membership_price ?? 0,
    currency: row.membership_currency ?? 'COP',
    durationDays: row.membership_duration ?? null,
    maxClasses: null,
    benefits: [],
    isActive: true,
  };
}

function toPublic(row: ClassRow): ClassPublic {
  return {
    id: row.id,
    scheduledAt: row.scheduled_at.toISOString(),
    durationMinutes: row.duration_minutes,
    capacity: row.capacity,
    enrolledCount: row.enrolled_count,
    location: row.location,
    notes: row.notes,
    isCancelled: row.is_cancelled,
    discipline: {
      id: row.discipline_id,
      name: row.discipline_name,
      level: row.discipline_level,
      durationMinutes: row.discipline_duration,
    },
    instructor: {
      id: row.instructor_id,
      firstName: row.instructor_first,
      lastName: row.instructor_last,
    },
    membership: toMembership(row),
  };
}

export const ClassRepository = {
  async create(data: {
    discipline_id: string;
    professional_id: string;
    room_id?: string;
    membership_id?: string;
    scheduled_at: string;
    duration_minutes: number;
    capacity: number;
    location?: string;
    notes?: string;
  }): Promise<ClassPublic> {
    const { rows } = await pool.query(
      `INSERT INTO classes (discipline_id, professional_id, room_id, membership_id, scheduled_at, duration_minutes, capacity, location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        data.discipline_id,
        data.professional_id,
        data.room_id || null,
        data.membership_id || null,
        data.scheduled_at,
        data.duration_minutes,
        data.capacity,
        data.location || null,
        data.notes || null,
      ]
    );

    // Fetch the fully joined object
    const createdClassId = rows[0].id;
    const finalClass = await pool.query<ClassRow>(
      `SELECT
        c.id,
        c.scheduled_at,
        c.duration_minutes,
        c.capacity,
        c.enrolled_count,
        c.location,
        c.notes,
        c.is_cancelled,
        d.id AS discipline_id,
        d.name AS discipline_name,
        d.level AS discipline_level,
        d.duration_minutes AS discipline_duration,
        u.id AS instructor_id,
        u.first_name AS instructor_first,
        u.last_name AS instructor_last,
        m.id AS membership_id,
        m.code AS membership_code,
        m.name AS membership_name,
        m.description AS membership_description,
        m.type AS membership_type,
        m.price AS membership_price,
        m.currency AS membership_currency,
        m.duration_days AS membership_duration
      FROM classes c
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN users u ON u.id = c.professional_id
      LEFT JOIN memberships m ON m.id = c.membership_id
      WHERE c.id = $1`,
      [createdClassId]
    );
    
    return toPublic(finalClass.rows[0]);
  },

  async listUpcoming(from?: string, to?: string): Promise<ClassPublic[]> {

    const values: unknown[] = [];

    let where = 'WHERE c.is_cancelled = FALSE';
    if (from) {
      values.push(from);
      where += ` AND c.scheduled_at >= $${values.length}`;
    }
    if (to) {
      values.push(to);
      where += ` AND c.scheduled_at <= $${values.length}`;
    }

    const { rows } = await pool.query<ClassRow>(
      `SELECT
        c.id,
        c.scheduled_at,
        c.duration_minutes,
        c.capacity,
        c.enrolled_count,
        c.location,
        c.notes,
        c.is_cancelled,
        d.id AS discipline_id,
        d.name AS discipline_name,
        d.level AS discipline_level,
        d.duration_minutes AS discipline_duration,
        u.id AS instructor_id,
        u.first_name AS instructor_first,
        u.last_name AS instructor_last,
        m.id AS membership_id,
        m.code AS membership_code,
        m.name AS membership_name,
        m.description AS membership_description,
        m.type AS membership_type,
        m.price AS membership_price,
        m.currency AS membership_currency,
        m.duration_days AS membership_duration
      FROM classes c
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN users u ON u.id = c.professional_id
      LEFT JOIN memberships m ON m.id = c.membership_id
      ${where}
      ORDER BY c.scheduled_at ASC`,
      values
    );

    return rows.map(toPublic);
  },
};
