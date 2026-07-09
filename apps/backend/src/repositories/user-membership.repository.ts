import { pool } from '@config/database.js';
import type { UserMembershipPublic, UserMembershipRecord, CategoryCredit } from '../types/user-membership.types.js';
import type { MembershipType } from '../types/membership.types.js';

const JOIN = `
  SELECT
    um.*,
    m.name          AS membership_name,
    m.type          AS membership_type,
    m.price         AS membership_price,
    m.benefits      AS membership_benefits,
    m.duration_days AS membership_duration_days,
    m.max_classes   AS membership_max_classes
  FROM user_memberships um
  JOIN memberships m ON m.id = um.membership_id
`;

const JOIN_WITH_USER = `
  SELECT
    um.*,
    m.name          AS membership_name,
    m.type          AS membership_type,
    m.price         AS membership_price,
    m.benefits      AS membership_benefits,
    m.duration_days AS membership_duration_days,
    m.max_classes   AS membership_max_classes,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    u.email         AS user_email
  FROM user_memberships um
  JOIN memberships m ON m.id = um.membership_id
  JOIN users u ON u.id = um.user_id
`;

function toPublic(
  row: UserMembershipRecord & Record<string, unknown>,
  extra: {
    classesRemaining: number | null;
    coversFreeClasses: boolean;
    hasClassCredits: boolean;
    discountPercent: number | null;
    sessionsUsed: number;
    categoryCredits: Record<string, CategoryCredit>;
  } = {
    classesRemaining: (row.classes_remaining as number | null) ?? null,
    coversFreeClasses: false,
    hasClassCredits: false,
    discountPercent: null,
    sessionsUsed: 0,
    categoryCredits: {},
  }
): UserMembershipPublic {
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const isExpired = expiresAt ? new Date() > expiresAt : false;
  const type = (row.membership_type ?? 'per_class') as MembershipType;

  return {
    id: row.id,
    userId: row.user_id,
    membershipId: row.membership_id,
    startedAt: new Date(row.started_at).toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    classesRemaining: extra.classesRemaining,
    isActive: row.is_active,
    paymentStatus: row.payment_status as 'pending' | 'paid' | 'cancelled',
    paymentMethod: (row.payment_method ?? 'cash') as 'cash' | 'wompi' | 'free',
    userName: row.user_name ? String(row.user_name) : undefined,
    userEmail: row.user_email ? String(row.user_email) : undefined,
    membership: {
      id: row.membership_id,
      name: String(row.membership_name ?? ''),
      type,
      price: Number(row.membership_price ?? 0),
      benefits: Array.isArray(row.membership_benefits) ? row.membership_benefits : [],
      durationDays: row.membership_duration_days != null ? Number(row.membership_duration_days) : null,
    },
    isExpired,
    coversFreeClasses: extra.coversFreeClasses,
    hasClassCredits: extra.hasClassCredits,
    discountPercent: extra.discountPercent,
    sessionsUsed: extra.sessionsUsed,
    categoryCredits: extra.categoryCredits,
  };
}

async function resolveBenefits(
  userId: string,
  benefitNames: string[],
  startedAt: Date,
  expiresAt: Date | null,
  classesRemainingDb: number | null
): Promise<{
  classesRemaining: number | null;
  coversFreeClasses: boolean;
  hasClassCredits: boolean;
  discountPercent: number | null;
  sessionsUsed: number;
  categoryCredits: Record<string, CategoryCredit>;
}> {
  if (!benefitNames.length) {
    return {
      classesRemaining: classesRemainingDb,
      coversFreeClasses: false,
      hasClassCredits: (classesRemainingDb ?? 0) > 0,
      discountPercent: null,
      sessionsUsed: 0,
      categoryCredits: {},
    };
  }

  // Resolve benefit types/values AND categories from catalog
  const { rows: catalog } = await pool.query(
    `SELECT name, benefit_type, benefit_value, service_category
     FROM benefits_catalog WHERE name = ANY($1)`,
    [benefitNames]
  );

  let isUnlimited = false;
  let discountPercent: number | null = null;

  // Build per-category totals from all free_classes benefits
  const categoryCredits: Record<string, CategoryCredit> = {};

  for (const b of catalog) {
    if (b.benefit_type === 'unlimited_classes') {
      isUnlimited = true;
    } else if (b.benefit_type === 'discount_percent' && b.benefit_value != null) {
      discountPercent = Number(b.benefit_value);
    } else if (b.benefit_type === 'free_classes' && b.benefit_value != null) {
      const cat: string = b.service_category ?? 'general';
      if (!categoryCredits[cat]) {
        categoryCredits[cat] = { total: 0, used: 0, remaining: 0 };
      }
      categoryCredits[cat].total += Number(b.benefit_value);
    }
  }

  const hasFreeClasses = Object.keys(categoryCredits).length > 0;

  // Count approved + pending bookings per category within the membership period
  if (hasFreeClasses || isUnlimited) {
    const params: unknown[] = [userId, startedAt];
    const expiryClause = expiresAt ? `AND so.scheduled_at <= $3` : '';
    if (expiresAt) params.push(expiresAt);

    const { rows: usageRows } = await pool.query(
      `SELECT
         CASE
           WHEN d.name ILIKE '%pole%' THEN 'pole'
           WHEN d.name ILIKE '%fuerza%' OR d.name ILIKE '%flexibilidad%' OR d.name ILIKE '%flex%' THEN 'complementary'
           ELSE 'general'
         END AS category,
         COUNT(*) AS cnt
       FROM booking_requests br
       JOIN service_offers so ON so.id = br.offer_id
       LEFT JOIN specialties d ON d.id = so.specialty_id
       WHERE br.user_id = $1
         AND br.status IN ('approved', 'pending')
         AND so.scheduled_at >= $2
         ${expiryClause}
       GROUP BY 1`,
      params
    );

    let totalUsed = 0;
    for (const row of usageRows) {
      const cat: string = row.category;
      const cnt = parseInt(row.cnt, 10);
      totalUsed += cnt;
      if (categoryCredits[cat] !== undefined) {
        categoryCredits[cat].used = cnt;
        categoryCredits[cat].remaining = Math.max(0, categoryCredits[cat].total - cnt);
      } else if (categoryCredits['general'] !== undefined) {
        // If discipline doesn't match a specific category, deduct from general pool
        categoryCredits['general'].used = (categoryCredits['general'].used ?? 0) + cnt;
        categoryCredits['general'].remaining = Math.max(0, categoryCredits['general'].total - categoryCredits['general'].used);
      }
    }

    // Ensure remaining is set for categories with no usage yet
    for (const cat of Object.keys(categoryCredits)) {
      if (categoryCredits[cat].remaining === 0 && categoryCredits[cat].used === 0) {
        categoryCredits[cat].remaining = categoryCredits[cat].total;
      }
    }

    const sessionsUsed = totalUsed;
    const totalRemaining = Object.values(categoryCredits).reduce((s, c) => s + c.remaining, 0);

    let classesRemaining: number | null;
    let coversFreeClasses: boolean;
    let hasClassCredits: boolean;

    if (isUnlimited) {
      classesRemaining = null;
      coversFreeClasses = true;
      hasClassCredits = false;
    } else {
      classesRemaining = totalRemaining;
      coversFreeClasses = totalRemaining > 0;
      hasClassCredits = totalRemaining > 0;
    }

    return { classesRemaining, coversFreeClasses, hasClassCredits, discountPercent, sessionsUsed, categoryCredits };
  }

  return {
    classesRemaining: classesRemainingDb,
    coversFreeClasses: false,
    hasClassCredits: (classesRemainingDb ?? 0) > 0,
    discountPercent,
    sessionsUsed: 0,
    categoryCredits: {},
  };
}

export const UserMembershipRepository = {
  // Returns the active PLAN (excludes inscription type)
  async findActiveByUserId(userId: string): Promise<UserMembershipPublic | null> {
    const res = await pool.query(
      `${JOIN} WHERE um.user_id = $1 AND um.is_active = TRUE AND um.payment_status = 'paid'
       AND m.type != 'inscription'
       ORDER BY um.created_at DESC LIMIT 1`,
      [userId]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    const benefitNames: string[] = Array.isArray(row.membership_benefits) ? row.membership_benefits : [];
    const extra = await resolveBenefits(
      userId, benefitNames,
      new Date(row.started_at),
      row.expires_at ? new Date(row.expires_at) : null,
      row.classes_remaining != null ? Number(row.classes_remaining) : null
    );
    return toPublic(row, extra);
  },

  // Returns the active inscription (separate from plans).
  // Returns null if none exists OR if the inscription is older than 6 months with no recent bookings.
  async findActiveInscriptionByUserId(userId: string): Promise<UserMembershipPublic | null> {
    const res = await pool.query(
      `${JOIN}
       WHERE um.user_id = $1
         AND um.is_active = TRUE
         AND um.payment_status = 'paid'
         AND m.type = 'inscription'
         AND (
           um.started_at > NOW() - INTERVAL '6 months'
           OR EXISTS (
             SELECT 1 FROM booking_requests br
             WHERE br.user_id = $1
               AND br.status IN ('approved', 'pending')
               AND br.created_at > NOW() - INTERVAL '6 months'
           )
         )
       ORDER BY um.created_at DESC LIMIT 1`,
      [userId]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    const benefitNames: string[] = Array.isArray(row.membership_benefits) ? row.membership_benefits : [];
    const extra = await resolveBenefits(
      userId, benefitNames,
      new Date(row.started_at),
      row.expires_at ? new Date(row.expires_at) : null,
      row.classes_remaining != null ? Number(row.classes_remaining) : null
    );
    return toPublic(row, extra);
  },

  async listByUserId(userId: string): Promise<UserMembershipPublic[]> {
    const res = await pool.query(
      `${JOIN} WHERE um.user_id = $1 ORDER BY um.created_at DESC`,
      [userId]
    );
    return res.rows.map(r => toPublic(r));
  },

  // Returns all memberships awaiting payment confirmation (admin use)
  async listPendingAll(): Promise<UserMembershipPublic[]> {
    const res = await pool.query(
      `${JOIN_WITH_USER} WHERE um.payment_status = 'pending' ORDER BY um.created_at DESC`
    );
    return res.rows.map(r => toPublic(r));
  },

  // Returns all currently active memberships across all users (admin use)
  async listActiveAll(): Promise<UserMembershipPublic[]> {
    const res = await pool.query(
      `${JOIN_WITH_USER}
       WHERE um.is_active = TRUE AND um.payment_status = 'paid'
       ORDER BY um.started_at DESC`
    );
    return Promise.all(res.rows.map(async r => {
      const benefitNames: string[] = Array.isArray(r.membership_benefits) ? r.membership_benefits : [];
      const extra = await resolveBenefits(
        r.user_id, benefitNames,
        new Date(r.started_at),
        r.expires_at ? new Date(r.expires_at) : null,
        r.classes_remaining != null ? Number(r.classes_remaining) : null
      );
      return toPublic(r, extra);
    }));
  },

  // Create a pending membership — old active plan is NOT deactivated until payment is confirmed
  async create(userId: string, membershipId: string, paymentMethod: 'cash' | 'wompi'): Promise<UserMembershipPublic> {
    const mRes = await pool.query(
      'SELECT * FROM memberships WHERE id = $1 AND is_active = TRUE',
      [membershipId]
    );
    if (!mRes.rows.length) {
      throw Object.assign(new Error('Membresía no encontrada o inactiva'), { statusCode: 404 });
    }
    const m = mRes.rows[0];

    // Inscripciones: sin vencimiento por calendario, sin cuota de clases
    let expiresAt: string | null = null;
    let classesRemaining: number | null = null;

    if (m.type === 'inscription') {
      expiresAt = null;
      classesRemaining = null;
    } else {
      if (m.duration_days) {
        const d = new Date();
        d.setDate(d.getDate() + Number(m.duration_days));
        expiresAt = d.toISOString();
      }
      if (m.type === 'per_class' || m.type === 'pack' || m.type === 'private') {
        classesRemaining = m.max_classes ?? (m.type === 'per_class' ? 1 : m.type === 'private' ? 1 : 10);
      }
    }

    const ins = await pool.query(
      `INSERT INTO user_memberships
         (user_id, membership_id, expires_at, classes_remaining, payment_status, payment_method, is_active)
       VALUES ($1, $2, $3, $4, 'pending', $5, FALSE)
       RETURNING id`,
      [userId, membershipId, expiresAt, classesRemaining, paymentMethod]
    );

    const res = await pool.query(`${JOIN} WHERE um.id = $1`, [ins.rows[0].id]);
    return toPublic(res.rows[0]);
  },

  // Admin confirms a cash/wompi payment → deactivate old plans, activate this one
  async confirmPayment(id: string): Promise<UserMembershipPublic> {
    const check = await pool.query(
      `SELECT um.*, m.duration_days, m.type AS membership_type FROM user_memberships um
       JOIN memberships m ON m.id = um.membership_id
       WHERE um.id = $1 AND um.payment_status = 'pending'`,
      [id]
    );
    if (!check.rows.length) {
      throw Object.assign(new Error('Pago no encontrado o ya confirmado'), { statusCode: 404 });
    }
    const row = check.rows[0];
    const userId = row.user_id;
    const membershipType = row.membership_type as string;

    // Inscripciones y planes coexisten: solo se desactiva el mismo tipo.
    // Confirmar una inscripción cancela inscripciones previas (no planes).
    // Confirmar un plan cancela planes previos (no la inscripción).
    if (membershipType === 'inscription') {
      await pool.query(
        `UPDATE user_memberships um SET is_active = FALSE, updated_at = NOW()
         FROM memberships m
         WHERE um.membership_id = m.id
           AND um.user_id = $1 AND um.is_active = TRUE AND m.type = 'inscription'`,
        [userId]
      );
    } else {
      await pool.query(
        `UPDATE user_memberships um SET is_active = FALSE, updated_at = NOW()
         FROM memberships m
         WHERE um.membership_id = m.id
           AND um.user_id = $1 AND um.is_active = TRUE AND m.type != 'inscription'`,
        [userId]
      );
    }

    // Recompute expires_at from today (activation date)
    let newExpiresAt: string | null = null;
    if (membershipType !== 'inscription' && row.duration_days) {
      const d = new Date();
      d.setDate(d.getDate() + Number(row.duration_days));
      newExpiresAt = d.toISOString();
    }

    // Activate the confirmed membership
    await pool.query(
      `UPDATE user_memberships
       SET is_active = TRUE, payment_status = 'paid',
           started_at = NOW(), expires_at = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, newExpiresAt]
    );

    const res = await pool.query(`${JOIN_WITH_USER} WHERE um.id = $1`, [id]);
    const activated = res.rows[0];
    const benefitNames: string[] = Array.isArray(activated.membership_benefits) ? activated.membership_benefits : [];
    const extra = await resolveBenefits(
      userId, benefitNames,
      new Date(activated.started_at),
      activated.expires_at ? new Date(activated.expires_at) : null,
      activated.classes_remaining != null ? Number(activated.classes_remaining) : null
    );
    return toPublic(activated, extra);
  },

  async rejectPayment(id: string): Promise<void> {
    await pool.query(
      `UPDATE user_memberships
       SET payment_status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND payment_status = 'pending'`,
      [id]
    );
  },

  async deleteRecord(id: string): Promise<void> {
    await pool.query(`DELETE FROM user_memberships WHERE id = $1`, [id]);
  },

  async deductClass(id: string): Promise<void> {
    await pool.query(
      `UPDATE user_memberships
       SET classes_remaining = classes_remaining - 1,
           is_active = CASE WHEN classes_remaining - 1 <= 0 THEN FALSE ELSE TRUE END,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },
};
