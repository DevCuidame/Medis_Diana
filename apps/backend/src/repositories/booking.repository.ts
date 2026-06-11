import { pool } from '@config/database.js';


export const BookingRepository = {
  async listByUser(userId: string): Promise<any[]> {
    // Basic implementation for upcoming user bookings
    const { rows } = await pool.query(
      `SELECT
        b.id AS booking_id,
        b.status,
        b.created_at,
        c.id AS class_id,
        c.scheduled_at,
        c.duration_minutes,
        c.capacity,
        c.enrolled_count,
        d.id AS discipline_id,
        d.name AS discipline_name,
        d.level AS discipline_level,
        u.id AS instructor_id,
        u.first_name AS instructor_first,
        u.last_name AS instructor_last
       FROM bookings b
       JOIN classes c ON c.id = b.class_id
       JOIN disciplines d ON d.id = c.discipline_id
       JOIN users u ON u.id = c.professional_id
       WHERE b.user_id = $1 AND c.scheduled_at >= NOW()
       ORDER BY c.scheduled_at ASC`,
      [userId]
    );

    return rows.map((r: any) => ({
      id: r.booking_id,
      status: r.status,
      createdAt: r.created_at.toISOString(),
      classInfo: {
        id: r.class_id,
        scheduledAt: r.scheduled_at.toISOString(),
        durationMinutes: r.duration_minutes,
        capacity: r.capacity,
        enrolledCount: r.enrolled_count,
        discipline: {
          id: r.discipline_id,
          name: r.discipline_name,
          level: r.discipline_level,
        },
        instructor: {
          id: r.instructor_id,
          firstName: r.instructor_first,
          lastName: r.instructor_last,
        }
      }
    }));
  },

  async create(classId: string, userId: string): Promise<any> {
    const { rows } = await pool.query(
      `INSERT INTO bookings (class_id, user_id, status)
       VALUES ($1, $2, 'confirmed')
       RETURNING *`,
      [classId, userId]
    );
    return rows[0];
  }
};
