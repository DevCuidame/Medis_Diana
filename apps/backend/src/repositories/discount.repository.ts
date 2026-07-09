// ============================================================
// apps/backend/src/repositories/discount.repository.ts
// Repositorio: Descuentos y Promociones
// ============================================================

import { pool } from '@config/database.js';
import type {
  DiscountPublic,
  CreateDiscountPayload,
  UpdateDiscountPayload,
} from '@medisdiana/shared-types';

// ─── DISCOUNTS ───────────────────────────────────────────────

function rowToDiscount(row: Record<string, unknown>): DiscountPublic {
  return {
    id:                row['id'] as string,
    name:              row['name'] as string,
    type:              row['type'] as DiscountPublic['type'],
    value:             row['value'] != null ? Number(row['value']) : null,
    buyQty:            (row['buyQty'] as number) ?? null,
    payQty:            (row['payQty'] as number) ?? null,
    code:              (row['code'] as string) ?? null,
    specialtyId:       (row['specialtyId'] as string) ?? null,
    specialtyName:     (row['specialtyName'] as string) ?? null,
    startsAt:          row['startsAt'] ? (row['startsAt'] as Date).toISOString() : null,
    endsAt:            row['endsAt'] ? (row['endsAt'] as Date).toISOString() : null,
    maxTotalUses:      (row['maxTotalUses'] as number) ?? null,
    maxUsesPerPatient: (row['maxUsesPerPatient'] as number) ?? null,
    totalUsesCount:    row['totalUsesCount'] != null ? parseInt(row['totalUsesCount'] as string, 10) : 0,
    isActive:          row['isActive'] as boolean,
    createdAt:         (row['createdAt'] as Date).toISOString(),
  };
}

const DISCOUNT_SELECT = `
  SELECT
    d.id, d.name, d.type, d.value, d.buy_qty AS "buyQty", d.pay_qty AS "payQty",
    d.code, d.specialty_id AS "specialtyId", sp.name AS "specialtyName",
    d.starts_at AS "startsAt", d.ends_at AS "endsAt",
    d.max_total_uses AS "maxTotalUses", d.max_uses_per_patient AS "maxUsesPerPatient",
    d.is_active AS "isActive", d.created_at AS "createdAt",
    COALESCE(uses."totalUsesCount", 0) AS "totalUsesCount"
  FROM discounts d
  LEFT JOIN specialties sp ON sp.id = d.specialty_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS "totalUsesCount"
    FROM discount_redemptions dr
    WHERE dr.discount_id = d.id
  ) uses ON TRUE
`;

export const DiscountRepository = {

  async findAll(): Promise<DiscountPublic[]> {
    const { rows } = await pool.query(
      `${DISCOUNT_SELECT} ORDER BY d.created_at DESC`
    );
    return rows.map(rowToDiscount);
  },

  async findById(id: string): Promise<DiscountPublic | null> {
    const { rows } = await pool.query(
      `${DISCOUNT_SELECT} WHERE d.id = $1`, [id]
    );
    return rows[0] ? rowToDiscount(rows[0]) : null;
  },

  async findByCode(code: string): Promise<DiscountPublic | null> {
    const { rows } = await pool.query(
      `${DISCOUNT_SELECT} WHERE UPPER(TRIM(d.code)) = UPPER(TRIM($1)) AND d.is_active = TRUE`,
      [code]
    );
    return rows[0] ? rowToDiscount(rows[0]) : null;
  },

  async findActiveAutomatic(specialtyId?: string): Promise<DiscountPublic[]> {
    const conditions: string[] = [
      'd.code IS NULL',
      'd.is_active = TRUE',
      '(d.starts_at IS NULL OR d.starts_at <= NOW())',
      '(d.ends_at IS NULL OR d.ends_at >= NOW())',
    ];
    const values: unknown[] = [];

    if (specialtyId) {
      values.push(specialtyId);
      conditions.push(`(d.specialty_id IS NULL OR d.specialty_id = $${values.length})`);
    } else {
      conditions.push('d.specialty_id IS NULL');
    }

    const { rows } = await pool.query(
      `${DISCOUNT_SELECT}
       WHERE ${conditions.join(' AND ')}
       ORDER BY (d.specialty_id IS NOT NULL) DESC, d.created_at DESC`,
      values
    );
    return rows.map(rowToDiscount);
  },

  async create(data: CreateDiscountPayload, createdBy: string): Promise<DiscountPublic> {
    const normalizedCode = data.code && data.code.trim() !== ''
      ? data.code.trim().toUpperCase()
      : null;

    const { rows } = await pool.query(
      `INSERT INTO discounts
         (name, type, value, buy_qty, pay_qty, code, specialty_id,
          starts_at, ends_at, max_total_uses, max_uses_per_patient, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        data.name,
        data.type,
        data.value ?? null,
        data.buyQty ?? null,
        data.payQty ?? null,
        normalizedCode,
        data.specialtyId ?? null,
        data.startsAt ?? null,
        data.endsAt ?? null,
        data.maxTotalUses ?? null,
        data.maxUsesPerPatient ?? null,
        createdBy,
      ]
    );
    return (await this.findById(rows[0].id))!;
  },

  async update(id: string, data: UpdateDiscountPayload): Promise<DiscountPublic | null> {
    const map: Record<string, string> = {
      name: 'name', type: 'type', value: 'value', buyQty: 'buy_qty', payQty: 'pay_qty',
      code: 'code', specialtyId: 'specialty_id', startsAt: 'starts_at', endsAt: 'ends_at',
      maxTotalUses: 'max_total_uses', maxUsesPerPatient: 'max_uses_per_patient',
      isActive: 'is_active',
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, col] of Object.entries(map)) {
      const raw = (data as Record<string, unknown>)[key];
      if (raw === undefined) continue;

      if (key === 'code') {
        const normalizedCode = typeof raw === 'string' && raw.trim() !== ''
          ? raw.trim().toUpperCase()
          : null;
        sets.push(`${col} = $${i++}`);
        values.push(normalizedCode);
        continue;
      }

      sets.push(`${col} = $${i++}`);
      values.push(raw);
    }
    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);
    await pool.query(`UPDATE discounts SET ${sets.join(', ')} WHERE id = $${i}`, values);
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM discounts WHERE id = $1`, [id]
    );
    return (rowCount ?? 0) > 0;
  },

  async countTotalUses(discountId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = $1`,
      [discountId]
    );
    return parseInt(rows[0].count, 10);
  },

  async countUsesForUser(discountId: string, userId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = $1 AND user_id = $2`,
      [discountId, userId]
    );
    return parseInt(rows[0].count, 10);
  },

  async recordRedemption(
    discountId: string,
    userId: string,
    bookingRequestId: string | null,
    amountSaved: number
  ): Promise<void> {
    await pool.query(
      `INSERT INTO discount_redemptions (discount_id, user_id, booking_request_id, amount_saved)
       VALUES ($1, $2, $3, $4)`,
      [discountId, userId, bookingRequestId, amountSaved]
    );
  },

  computePrice(
    discount: DiscountPublic,
    pricePerSession: number,
    sessionCount: number
  ): { total: number; amountSaved: number } {
    const originalTotal = pricePerSession * sessionCount;

    if (discount.type === 'percentage') {
      const total = Math.round(originalTotal * (1 - (discount.value ?? 0) / 100));
      return { total, amountSaved: originalTotal - total };
    }

    if (discount.type === 'fixed_amount') {
      const perSessionDiscounted = Math.max(0, pricePerSession - (discount.value ?? 0));
      const total = perSessionDiscounted * sessionCount;
      return { total, amountSaved: originalTotal - total };
    }

    // buy_x_get_y
    const buyQty = discount.buyQty ?? 1;
    const payQty = discount.payQty ?? 1;
    if (sessionCount < buyQty) return { total: originalTotal, amountSaved: 0 };
    const groups = Math.floor(sessionCount / buyQty);
    const remainder = sessionCount % buyQty;
    const chargedSessions = groups * payQty + remainder;
    const total = chargedSessions * pricePerSession;
    return { total, amountSaved: originalTotal - total };
  },

  async resolveForBooking(params: {
    code?: string | null;
    offerId: string;
    specialtyId: string | null;
    userId?: string;
    sessionCount: number;
  }): Promise<{ discount: DiscountPublic | null; error?: string }> {
    if (params.code && params.code.trim() !== '') {
      const discount = await this.findByCode(params.code);
      if (!discount) {
        return { discount: null, error: 'Código de descuento inválido.' };
      }

      const now = Date.now();
      if (discount.startsAt && new Date(discount.startsAt).getTime() > now) {
        return { discount: null, error: 'Este código aún no está vigente.' };
      }
      if (discount.endsAt && new Date(discount.endsAt).getTime() < now) {
        return { discount: null, error: 'Este código ha expirado.' };
      }
      if (discount.specialtyId && discount.specialtyId !== params.specialtyId) {
        return { discount: null, error: 'Este código no aplica para este servicio.' };
      }
      if (discount.maxTotalUses != null) {
        const totalUses = await this.countTotalUses(discount.id);
        if (totalUses >= discount.maxTotalUses) {
          return { discount: null, error: 'Este código ya alcanzó su límite de usos.' };
        }
      }
      if (params.userId && discount.maxUsesPerPatient != null) {
        const userUses = await this.countUsesForUser(discount.id, params.userId);
        if (userUses >= discount.maxUsesPerPatient) {
          return { discount: null, error: 'Ya has usado este código el máximo de veces permitido.' };
        }
      }

      return { discount };
    }

    const candidates = await this.findActiveAutomatic(params.specialtyId ?? undefined);
    const now = Date.now();

    for (const candidate of candidates) {
      if (candidate.startsAt && new Date(candidate.startsAt).getTime() > now) continue;
      if (candidate.endsAt && new Date(candidate.endsAt).getTime() < now) continue;
      if (candidate.specialtyId && candidate.specialtyId !== params.specialtyId) continue;

      if (candidate.maxTotalUses != null) {
        const totalUses = await this.countTotalUses(candidate.id);
        if (totalUses >= candidate.maxTotalUses) continue;
      }
      if (params.userId && candidate.maxUsesPerPatient != null) {
        const userUses = await this.countUsesForUser(candidate.id, params.userId);
        if (userUses >= candidate.maxUsesPerPatient) continue;
      }

      return { discount: candidate };
    }

    return { discount: null };
  },
};
