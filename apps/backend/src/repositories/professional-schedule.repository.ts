import { pool } from '@config/database.js';

export interface ScheduleSlot {
  id: string;
  userId: string;
  dayOfWeek: number;   // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string;   // "HH:MM"
  endTime: string;     // "HH:MM"
}

function toPublic(r: any): ScheduleSlot {
  return {
    id: r.id,
    userId: r.user_id,
    dayOfWeek: r.day_of_week,
    startTime: String(r.start_time).slice(0, 5),
    endTime:   String(r.end_time).slice(0, 5),
  };
}

export const ProfessionalScheduleRepository = {
  async listByUser(userId: string): Promise<ScheduleSlot[]> {
    const { rows } = await pool.query(
      `SELECT * FROM professional_schedules WHERE user_id = $1 ORDER BY day_of_week, start_time`,
      [userId]
    );
    return rows.map(toPublic);
  },

  async create(userId: string, dayOfWeek: number, startTime: string, endTime: string): Promise<ScheduleSlot> {
    const { rows } = await pool.query(
      `INSERT INTO professional_schedules (user_id, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, dayOfWeek, startTime, endTime]
    );
    return toPublic(rows[0]);
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM professional_schedules WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  },

  async replaceAll(userId: string, slots: { dayOfWeek: number; startTime: string; endTime: string }[]): Promise<ScheduleSlot[]> {
    await pool.query(`DELETE FROM professional_schedules WHERE user_id = $1`, [userId]);
    if (!slots.length) return [];
    const results: ScheduleSlot[] = [];
    for (const s of slots) {
      results.push(await this.create(userId, s.dayOfWeek, s.startTime, s.endTime));
    }
    return results;
  },

  /** Check if a given local time slot is covered by the professional's schedule */
  async coversSlot(userId: string, dayOfWeek: number, startTime: string, endTime: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM professional_schedules
       WHERE user_id    = $1
         AND day_of_week = $2
         AND start_time  <= $3::time
         AND end_time    >= $4::time
       LIMIT 1`,
      [userId, dayOfWeek, startTime, endTime]
    );
    return rows.length > 0;
  },
};
