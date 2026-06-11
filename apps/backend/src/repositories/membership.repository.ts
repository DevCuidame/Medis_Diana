import { pool } from '@config/database.js';
import type { MembershipRecord, MembershipPublic, CreateMembershipDto, UpdateMembershipDto } from '../types/membership.types.js';

function toPublic(r: MembershipRecord): MembershipPublic {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    type: r.type,
    price: r.price,
    currency: r.currency,
    durationDays: r.duration_days,
    maxClasses: r.max_classes ?? null,
    benefits: Array.isArray(r.benefits) ? r.benefits : [],
    isActive: r.is_active,
  };
}

export const MembershipRepository = {
  async listAll(): Promise<MembershipPublic[]> {
    const { rows } = await pool.query<MembershipRecord>(
      `SELECT * FROM memberships ORDER BY price ASC`
    );
    return rows.map(toPublic);
  },

  async listActive(): Promise<MembershipPublic[]> {
    const { rows } = await pool.query<MembershipRecord>(
      `SELECT * FROM memberships WHERE is_active = TRUE ORDER BY price ASC`
    );
    return rows.map(toPublic);
  },

  async findById(id: string): Promise<MembershipPublic | null> {
    const { rows } = await pool.query<MembershipRecord>(
      `SELECT * FROM memberships WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async create(dto: CreateMembershipDto): Promise<MembershipPublic> {
    const { rows } = await pool.query<MembershipRecord>(
      `INSERT INTO memberships (code, name, description, type, price, currency, duration_days, benefits, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        dto.code,
        dto.name,
        dto.description ?? null,
        dto.type,
        dto.price,
        dto.currency ?? 'COP',
        dto.durationDays ?? null,
        JSON.stringify(dto.benefits ?? []),
        dto.isActive ?? true,
      ]
    );
    return toPublic(rows[0]);
  },

  async update(id: string, dto: UpdateMembershipDto): Promise<MembershipPublic | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.code !== undefined)        { fields.push(`code = $${idx++}`);          values.push(dto.code); }
    if (dto.name !== undefined)        { fields.push(`name = $${idx++}`);          values.push(dto.name); }
    if (dto.description !== undefined) { fields.push(`description = $${idx++}`);   values.push(dto.description); }
    if (dto.type !== undefined)        { fields.push(`type = $${idx++}`);          values.push(dto.type); }
    if (dto.price !== undefined)       { fields.push(`price = $${idx++}`);         values.push(dto.price); }
    if (dto.currency !== undefined)    { fields.push(`currency = $${idx++}`);      values.push(dto.currency); }
    if (dto.durationDays !== undefined){ fields.push(`duration_days = $${idx++}`); values.push(dto.durationDays); }
    if (dto.benefits !== undefined)    { fields.push(`benefits = $${idx++}`);      values.push(JSON.stringify(dto.benefits)); }
    if (dto.isActive !== undefined)    { fields.push(`is_active = $${idx++}`);     values.push(dto.isActive); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<MembershipRecord>(
      `UPDATE memberships SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM memberships WHERE id = $1`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  },
};
