import { pool } from '@config/database.js';
import type { UserRecord, RegisterDTO, UserPublic, UpdateUserDTO } from '../types/auth.types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPublic(u: UserRecord): UserPublic {
  return {
    id:          u.id,
    email:       u.email,
    firstName:   u.first_name,
    lastName:    u.last_name,
    phone:       u.phone,
    role:        u.role,
    bio:         u.bio,
    specialties: u.specialties,
    instagramUrl:u.instagram_url,
    avatarUrl:   u.avatar_url,
    isActive:    u.is_active,
    isVerified:  u.is_verified,
    createdAt:   u.created_at.toISOString(),
  };
}

// ─── Repository ──────────────────────────────────────────────────────────────

export const UserRepository = {

  /** Find full record by email (includes password_hash for auth) */
  async findByEmail(email: string): Promise<UserRecord | null> {
    const { rows } = await pool.query<UserRecord>(
      `SELECT * FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    return rows[0] ?? null;
  },

  /** Find full record by id */
  async findById(id: string): Promise<UserRecord | null> {
    const { rows } = await pool.query<UserRecord>(
      `SELECT * FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  },

  /** Create a new user, returns public profile */
  async create(dto: RegisterDTO & { passwordHash: string }): Promise<UserPublic> {
    const { rows } = await pool.query<UserRecord>(
      `INSERT INTO users
        (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dto.email.toLowerCase().trim(),
        dto.passwordHash,
        dto.firstName.trim(),
        dto.lastName.trim(),
        dto.phone?.trim() ?? null,
        dto.role ?? 'USER',
      ]
    );
    return toPublic(rows[0]);
  },

  /** Check if email already exists */
  async emailExists(email: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    return rows.length > 0;
  },

  /** Get public profile by id */
  async getPublicById(id: string): Promise<UserPublic | null> {
    const record = await this.findById(id);
    return record ? toPublic(record) : null;
  },

  /** List users (admin use) */
  async list(role?: string): Promise<UserPublic[]> {
    const { rows } = role
      ? await pool.query<UserRecord>(`SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC`, [role])
      : await pool.query<UserRecord>(`SELECT * FROM users ORDER BY created_at DESC`);
    return rows.map(toPublic);
  },

  /** Update user profile (non-professional) */
  async update(id: string, dto: UpdateUserDTO): Promise<UserPublic | null> {
    const fields: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (dto.email        !== undefined) { fields.push(`email         = $${idx++}`); values.push(dto.email.toLowerCase().trim()) }
    if (dto.firstName    !== undefined) { fields.push(`first_name    = $${idx++}`); values.push(dto.firstName.trim()) }
    if (dto.lastName     !== undefined) { fields.push(`last_name     = $${idx++}`); values.push(dto.lastName.trim()) }
    if (dto.phone        !== undefined) { fields.push(`phone         = $${idx++}`); values.push(dto.phone?.trim() ?? null) }
    if (dto.bio          !== undefined) { fields.push(`bio           = $${idx++}`); values.push(dto.bio?.trim() ?? null) }
    if (dto.instagramUrl !== undefined) { fields.push(`instagram_url = $${idx++}`); values.push(dto.instagramUrl?.trim() ?? null) }
    if (dto.avatarUrl    !== undefined) { fields.push(`avatar_url    = $${idx++}`); values.push(dto.avatarUrl?.trim() ?? null) }
    if (dto.isActive     !== undefined) { fields.push(`is_active     = $${idx++}`); values.push(dto.isActive) }
    if (dto.isVerified   !== undefined) { fields.push(`is_verified   = $${idx++}`); values.push(dto.isVerified) }

    if (fields.length === 0) return this.getPublicById(id)

    values.push(id)
    const { rows } = await pool.query<UserRecord>(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `, values)

    if (!rows[0]) return null
    return toPublic(rows[0])
  },

  /** Update user password hash */
  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, id]
    )
    return (rowCount ?? 0) > 0
  },

  // ─── Refresh Tokens ───────────────────────────────────────────────

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
  },

  async findRefreshToken(token: string): Promise<{ user_id: string; expires_at: Date } | null> {
    const { rows } = await pool.query(
      `SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );
    return rows[0] ?? null;
  },

  async deleteRefreshToken(token: string): Promise<void> {
    await pool.query(`DELETE FROM refresh_tokens WHERE token = $1`, [token]);
  },

  async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
  },

  /** Hard-delete user with cascade cleanup */
  async delete(id: string): Promise<boolean> {
    // Block only if the instructor has active service_offers (the real managed schedule)
    const { rows: activeOffers } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM service_offers WHERE professional_id = $1 AND status != 'cancelled'`,
      [id]
    );
    if (parseInt(activeOffers[0].cnt, 10) > 0) {
      const e: any = new Error('Este instructor tiene servicios activos asignados. Elimina o reasigna los servicios desde Gestión de Servicios primero.');
      e.code = '23503_instructor';
      throw e;
    }

    // Cascade delete all dependent records
    await pool.query(`DELETE FROM ratings           WHERE user_id = $1 OR professional_id = $1`, [id]);
    await pool.query(`DELETE FROM booking_requests  WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM user_memberships  WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM refresh_tokens    WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM classes            WHERE professional_id = $1`, [id]);

    const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
