import { pool } from '@config/database.js';
import type { DayOfWeek } from '@acaripole/shared-types';

export interface ScheduleBlock {
  openTime: string;
  closeTime: string;
}

export interface DaySchedule {
  isOpen: boolean;
  blocks: ScheduleBlock[];
}

export type OperatingHoursMap = Record<DayOfWeek, DaySchedule>;

export interface LocationPublic {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function emptyOperatingHours(): OperatingHoursMap {
  const map = {} as OperatingHoursMap;
  for (const day of DAYS) map[day] = { isOpen: false, blocks: [] };
  return map;
}

export const LocationRepository = {
  async findAll(): Promise<(LocationPublic & { operatingHours: OperatingHoursMap })[]> {
    const { rows } = await pool.query(
      `SELECT id, name, address, city, phone, email, is_active AS "isActive"
       FROM locations
       ORDER BY name`
    );
    if (rows.length === 0) return rows;

    const { rows: hourRows } = await pool.query(
      `SELECT location_id AS "locationId", day, opens_at AS "opensAt", closes_at AS "closesAt"
       FROM operating_hours
       WHERE location_id = ANY($1)
       ORDER BY opens_at`,
      [rows.map(r => r.id)]
    );

    const hoursByLocation = new Map<string, OperatingHoursMap>();
    for (const row of hourRows) {
      let map = hoursByLocation.get(row.locationId);
      if (!map) {
        map = emptyOperatingHours();
        hoursByLocation.set(row.locationId, map);
      }
      const day = row.day as DayOfWeek;
      map[day].isOpen = true;
      map[day].blocks.push({
        openTime: String(row.opensAt).slice(0, 5),
        closeTime: String(row.closesAt).slice(0, 5),
      });
    }

    return rows.map(r => ({
      ...r,
      operatingHours: hoursByLocation.get(r.id) ?? emptyOperatingHours(),
    }));
  },

  async create(data: Omit<LocationPublic, 'id' | 'isActive'>): Promise<LocationPublic> {
    const { rows } = await pool.query(
      `INSERT INTO locations (name, address, city, phone, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, address, city, phone, email, is_active AS "isActive"`,
      [data.name, data.address, data.city, data.phone ?? null, data.email ?? null]
    );
    return rows[0];
  },

  async update(id: string, data: Partial<LocationPublic>): Promise<LocationPublic | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (data.name !== undefined)     { sets.push(`name = $${i++}`);    values.push(data.name); }
    if (data.address !== undefined)  { sets.push(`address = $${i++}`); values.push(data.address); }
    if (data.city !== undefined)     { sets.push(`city = $${i++}`);    values.push(data.city); }
    if (data.phone !== undefined)    { sets.push(`phone = $${i++}`);   values.push(data.phone); }
    if (data.email !== undefined)    { sets.push(`email = $${i++}`);   values.push(data.email); }
    if (data.isActive !== undefined) { sets.push(`is_active = $${i++}`); values.push(data.isActive); }
    if (sets.length === 0) return null;

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE locations SET ${sets.join(', ')}
       WHERE id = $${i}
       RETURNING id, name, address, city, phone, email, is_active AS "isActive"`,
      values
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM locations WHERE id = $1`, [id]
    );
    return (rowCount ?? 0) > 0;
  }
};
