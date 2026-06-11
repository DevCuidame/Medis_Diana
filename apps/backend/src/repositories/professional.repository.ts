import { pool } from '@config/database.js'
import type {
  ProfessionalRecord,
  ProfessionalPublic,
  CreateProfessionalDTO,
  UpdateProfessionalDTO,
  ProfessionalStatus,
  ProfessionalStats,
} from '../types/professional.types.js'

// ─── Helper ───────────────────────────────────────────────────────────────────

function toPublic(r: ProfessionalRecord): ProfessionalPublic {
  return {
    id:               r.id,
    email:            r.email,
    firstName:        r.first_name,
    lastName:         r.last_name,
    phone:            r.phone,
    bio:              r.bio,
    specialties:      r.specialties ?? [],
    instagramUrl:     r.instagram_url,
    avatarUrl:        r.avatar_url,
    status:           r.status,
    isActive:         r.is_active,
    isVerified:       r.is_verified,
    professionalType: r.professional_type ?? 'dependiente',
    avgScore:         r.avg_score ? parseFloat(r.avg_score) : 0,
    totalReviews:     r.total_reviews ? parseInt(r.total_reviews, 10) : 0,
    createdAt:        r.created_at.toISOString(),
  }
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const ProfessionalRepository = {

  /** List all active professionals with their rating summary */
  async list(): Promise<ProfessionalPublic[]> {
    const { rows } = await pool.query<ProfessionalRecord>(`
      SELECT
        u.*,
        prs.avg_score,
        prs.total_reviews
      FROM users u
      LEFT JOIN professional_rating_summary prs ON prs.professional_id = u.id
      WHERE u.role = 'PROFESSIONAL'
        AND u.is_active = TRUE
      ORDER BY u.first_name, u.last_name
    `)
    return rows.map(toPublic)
  },

  /** Get a single professional by id */
  async findById(id: string): Promise<ProfessionalPublic | null> {
    const { rows } = await pool.query<ProfessionalRecord>(`
      SELECT
        u.*,
        prs.avg_score,
        prs.total_reviews
      FROM users u
      LEFT JOIN professional_rating_summary prs ON prs.professional_id = u.id
      WHERE u.id = $1
        AND u.role = 'PROFESSIONAL'
      LIMIT 1
    `, [id])
    return rows[0] ? toPublic(rows[0]) : null
  },

  /** Create a professional (insert as PROFESSIONAL role) */
  async create(dto: CreateProfessionalDTO & { passwordHash: string }): Promise<ProfessionalPublic> {
    const { rows } = await pool.query<ProfessionalRecord>(`
      INSERT INTO users
        (email, password_hash, first_name, last_name, phone, role,
         bio, specialties, instagram_url, avatar_url, status, is_verified, professional_type)
      VALUES ($1,$2,$3,$4,$5,'PROFESSIONAL',$6,$7,$8,$9,'offline',TRUE,$10)
      RETURNING *,
        NULL::NUMERIC AS avg_score,
        NULL::BIGINT  AS total_reviews
    `, [
      dto.email.toLowerCase().trim(),
      dto.passwordHash,
      dto.firstName.trim(),
      dto.lastName.trim(),
      dto.phone?.trim() ?? null,
      dto.bio?.trim() ?? null,
      dto.specialties ?? null,
      dto.instagramUrl?.trim() ?? null,
      dto.avatarUrl?.trim() ?? null,
      dto.professionalType ?? 'dependiente',
    ])
    return toPublic(rows[0])
  },

  /** Update professional profile */
  async update(id: string, dto: UpdateProfessionalDTO): Promise<ProfessionalPublic | null> {
    const fields: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (dto.firstName   !== undefined) { fields.push(`first_name    = $${idx++}`); values.push(dto.firstName.trim()) }
    if (dto.lastName    !== undefined) { fields.push(`last_name     = $${idx++}`); values.push(dto.lastName.trim()) }
    if (dto.phone       !== undefined) { fields.push(`phone         = $${idx++}`); values.push(dto.phone?.trim() ?? null) }
    if (dto.bio         !== undefined) { fields.push(`bio           = $${idx++}`); values.push(dto.bio?.trim() ?? null) }
    if (dto.specialties !== undefined) { fields.push(`specialties   = $${idx++}`); values.push(dto.specialties) }
    if (dto.instagramUrl!== undefined) { fields.push(`instagram_url = $${idx++}`); values.push(dto.instagramUrl?.trim() ?? null) }
    if (dto.avatarUrl   !== undefined) { fields.push(`avatar_url    = $${idx++}`); values.push(dto.avatarUrl?.trim() ?? null) }
    if (dto.isActive    !== undefined) { fields.push(`is_active     = $${idx++}`); values.push(dto.isActive) }
    if (dto.isVerified  !== undefined) { fields.push(`is_verified   = $${idx++}`); values.push(dto.isVerified) }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    const { rows } = await pool.query<ProfessionalRecord>(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${idx} AND role = 'PROFESSIONAL'
      RETURNING *,
        NULL::NUMERIC AS avg_score,
        NULL::BIGINT  AS total_reviews
    `, values)

    if (!rows[0]) return null
    return toPublic(rows[0])
  },

  /** Soft-delete: set is_active = false */
  async deactivate(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE users SET is_active = FALSE WHERE id = $1 AND role = 'PROFESSIONAL'`,
      [id]
    )
    return (rowCount ?? 0) > 0
  },

  /** Update online status (available / in_session / offline) */
  async updateStatus(id: string, status: ProfessionalStatus): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE users SET status = $1 WHERE id = $2 AND role = 'PROFESSIONAL'`,
      [status, id]
    )
    return (rowCount ?? 0) > 0
  },

  /** Dashboard stats */
  async getStats(): Promise<ProfessionalStats> {
    const [profResult, bookingsResult, disciplinesResult, ratingResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE role = 'PROFESSIONAL')                              AS total,
          COUNT(*) FILTER (WHERE role = 'PROFESSIONAL' AND is_active = TRUE)        AS active
        FROM users
      `),
      pool.query(`
        SELECT COUNT(*) AS weekly_bookings
        FROM bookings b
        JOIN classes c ON c.id = b.class_id
        WHERE b.status = 'confirmed'
          AND c.scheduled_at >= NOW() - INTERVAL '7 days'
      `),
      pool.query(`SELECT COUNT(*) AS total FROM disciplines WHERE is_active = TRUE`),
      pool.query(`SELECT ROUND(AVG(score)::NUMERIC, 1) AS avg FROM ratings`),
    ])

    return {
      totalProfessionals:  parseInt(profResult.rows[0].total, 10),
      activeProfessionals: parseInt(profResult.rows[0].active, 10),
      weeklyBookings:      parseInt(bookingsResult.rows[0].weekly_bookings, 10),
      totalDisciplines:    parseInt(disciplinesResult.rows[0].total, 10),
      avgSatisfaction:     ratingResult.rows[0].avg ? parseFloat(ratingResult.rows[0].avg) * 20 : 98,
    }
  },
}
