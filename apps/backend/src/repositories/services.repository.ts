// ============================================================
// apps/backend/src/repositories/services.repository.ts
// Repositorio: Gestión de Servicios
// ============================================================

import { pool } from '@config/database.js';
import type {
  ServiceOfferPublic,
  BookingRequestPublic,
  OperatingHour,
  RoomPublic,
  CreateServiceOfferPayload,
  UpdateServiceOfferPayload,
  CreateRoomPayload,
  UpdateRoomPayload,
  ServiceOffersFilter,
  UpsertOperatingHourPayload,
} from '@acaripole/shared-types';

// ─── OPERATING HOURS ─────────────────────────────────────────

export const OperatingHoursRepository = {

  async findByLocation(locationId: string): Promise<OperatingHour[]> {
    const { rows } = await pool.query(
      `SELECT id, location_id AS "locationId", day, opens_at AS "opensAt",
              closes_at AS "closesAt"
       FROM operating_hours
       WHERE location_id = $1
       ORDER BY CASE day
         WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
         WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5
         WHEN 'saturday' THEN 6 WHEN 'sunday' THEN 7
       END, opens_at`,
      [locationId]
    );
    return rows;
  },

  async upsertMany(
    locationId: string,
    hours: UpsertOperatingHourPayload[]
  ): Promise<OperatingHour[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM operating_hours WHERE location_id = $1`, [locationId]);
      for (const h of hours) {
        await client.query(
          `INSERT INTO operating_hours (location_id, day, opens_at, closes_at)
           VALUES ($1, $2, $3, $4)`,
          [locationId, h.day, h.opensAt, h.closesAt]
        );
      }
      await client.query('COMMIT');
      return this.findByLocation(locationId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

// ─── ROOMS ───────────────────────────────────────────────────

export const RoomRepository = {
  async findAll(): Promise<{rows: RoomPublic[]}> {
    const { rows } = await pool.query(
      `SELECT id, location_id AS "locationId", name, capacity,
              description, resources, is_active AS "isActive"
       FROM rooms
       ORDER BY name`
    );
    return { rows };
  },

  async findByLocation(locationId: string): Promise<RoomPublic[]> {
    const { rows } = await pool.query(
      `SELECT id, location_id AS "locationId", name, capacity,
              description, resources, is_active AS "isActive"
       FROM rooms
       WHERE location_id = $1 AND is_active = TRUE
       ORDER BY name`,
      [locationId]
    );
    return rows;
  },

  async create(data: CreateRoomPayload): Promise<RoomPublic> {
    const { rows } = await pool.query(
      `INSERT INTO rooms (location_id, name, capacity, description, resources)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, location_id AS "locationId", name, capacity,
                 description, resources, is_active AS "isActive"`,
      [
        data.locationId,
        data.name,
        data.capacity,
        data.description ?? null,
        JSON.stringify(data.resources ?? []),
      ]
    );
    return rows[0];
  },

  async update(id: string, data: UpdateRoomPayload): Promise<RoomPublic | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (data.name !== undefined)        { sets.push(`name = $${i++}`);        values.push(data.name); }
    if (data.capacity !== undefined)    { sets.push(`capacity = $${i++}`);    values.push(data.capacity); }
    if (data.description !== undefined) { sets.push(`description = $${i++}`); values.push(data.description); }
    if (data.resources !== undefined)   { sets.push(`resources = $${i++}`);   values.push(JSON.stringify(data.resources)); }
    if (data.isActive !== undefined)    { sets.push(`is_active = $${i++}`);   values.push(data.isActive); }
    if (sets.length === 0) return null;

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE rooms SET ${sets.join(', ')}
       WHERE id = $${i}
       RETURNING id, location_id AS "locationId", name, capacity,
                 description, resources, is_active AS "isActive"`,
      values
    );
    return rows[0] ?? null;
  },
};

// ─── SERVICE OFFERS ──────────────────────────────────────────

function rowToOffer(row: Record<string, unknown>): ServiceOfferPublic {
  return {
    id:              row['id'] as string,
    title:           row['title'] as string,
    description:     (row['description'] as string) ?? null,
    offerType:       row['offer_type'] as ServiceOfferPublic['offerType'],
    status:          row['status'] as ServiceOfferPublic['status'],
    scheduledAt:     (row['scheduled_at'] as Date).toISOString(),
    durationMinutes: row['duration_minutes'] as number,
    capacity:        row['capacity'] as number,
    enrolledCount:   row['enrolled_count'] as number,
    price:           (row['price'] as number) ?? null,
    currency:        row['currency'] as string,
    location: {
      id:   row['location_id'] as string,
      name: row['location_name'] as string,
    },
    room: row['room_id'] ? {
      id:       row['room_id'] as string,
      name:     row['room_name'] as string,
      capacity: row['room_capacity'] as number,
    } : null,
    professional: row['professional_id'] ? {
      id:        row['professional_id'] as string,
      firstName: row['professional_first'] as string,
      lastName:  row['professional_last'] as string,
      avatarUrl: (row['professional_avatar'] as string) ?? null,
    } : null,
    discipline: row['discipline_id'] ? {
      id:    row['discipline_id'] as string,
      name:  row['discipline_name'] as string,
      level: row['discipline_level'] as string,
    } : null,
  };
}

const OFFER_SELECT = `
  SELECT
    so.id, so.title, so.description, so.offer_type, so.status,
    so.scheduled_at, so.duration_minutes, so.capacity, so.enrolled_count,
    so.price, so.currency,
    l.id AS location_id, l.name AS location_name,
    r.id AS room_id, r.name AS room_name, r.capacity AS room_capacity,
    u.id AS professional_id, u.first_name AS professional_first,
    u.last_name AS professional_last, u.avatar_url AS professional_avatar
  FROM service_offers so
  JOIN locations l ON l.id = so.location_id
  LEFT JOIN rooms r ON r.id = so.room_id
  LEFT JOIN users u ON u.id = so.professional_id
`;

export const ServiceOfferRepository = {

  async findAll(filter: ServiceOffersFilter): Promise<{ data: ServiceOfferPublic[]; total: number }> {
    const where: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (filter.locationId) { where.push(`so.location_id = $${i++}`); values.push(filter.locationId); }
    if (filter.offerType)  { where.push(`so.offer_type  = $${i++}`); values.push(filter.offerType); }
    if (filter.status)     { where.push(`so.status      = $${i++}`); values.push(filter.status); }
    if (filter.from)       { where.push(`so.scheduled_at >= $${i++}`); values.push(filter.from); }
    if (filter.to)         { where.push(`so.scheduled_at <= $${i++}`); values.push(filter.to); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM service_offers so ${whereClause}`, values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit  = filter.limit ?? 20;
    const offset = ((filter.page ?? 1) - 1) * limit;
    values.push(limit, offset);

    const { rows } = await pool.query(
      `${OFFER_SELECT} ${whereClause} ORDER BY so.scheduled_at ASC LIMIT $${i++} OFFSET $${i++}`,
      values
    );
    return { data: rows.map(rowToOffer), total };
  },

  async findById(id: string): Promise<ServiceOfferPublic | null> {
    const { rows } = await pool.query(
      `${OFFER_SELECT} WHERE so.id = $1`, [id]
    );
    return rows[0] ? rowToOffer(rows[0]) : null;
  },

  async create(data: CreateServiceOfferPayload, createdBy: string): Promise<ServiceOfferPublic> {
    const { rows } = await pool.query(
      `INSERT INTO service_offers
         (location_id, room_id, offer_type, title, description,
          professional_id, discipline_id, capacity, duration_minutes,
          scheduled_at, price, currency, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        data.locationId, data.roomId ?? null, data.offerType, data.title,
        data.description ?? null, data.professionalId ?? null,
        data.disciplineId ?? null, data.capacity, data.durationMinutes,
        data.scheduledAt, data.price ?? null, data.currency ?? 'COP', createdBy,
      ]
    );
    return (await this.findById(rows[0].id))!;
  },

  async update(id: string, data: UpdateServiceOfferPayload): Promise<ServiceOfferPublic | null> {
    const map: Record<string, string> = {
      title: 'title', description: 'description', roomId: 'room_id',
      professionalId: 'professional_id', disciplineId: 'discipline_id',
      capacity: 'capacity', durationMinutes: 'duration_minutes',
      scheduledAt: 'scheduled_at', price: 'price', currency: 'currency',
      status: 'status',
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, col] of Object.entries(map)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        sets.push(`${col} = $${i++}`);
        values.push((data as Record<string, unknown>)[key]);
      }
    }
    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);
    await pool.query(`UPDATE service_offers SET ${sets.join(', ')} WHERE id = $${i}`, values);
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM service_offers WHERE id = $1`, [id]
    );
    return (rowCount ?? 0) > 0;
  },
};

// ─── BOOKING REQUESTS ────────────────────────────────────────

function mapBooking(r: Record<string, unknown>): BookingRequestPublic {
  return {
    ...r,
    scheduledAt: (r['scheduledAt'] as Date)?.toISOString?.() ?? r['scheduledAt'] as string,
    user: {
      id:        r['userId']    as string,
      firstName: r['firstName'] as string,
      lastName:  r['lastName']  as string,
      email:     r['email']     as string,
    },
  } as BookingRequestPublic;
}

export const BookingRequestRepository = {

  async findByOffer(offerId: string): Promise<BookingRequestPublic[]> {
    const { rows } = await pool.query(
      `SELECT br.id, br.offer_id AS "offerId", so.title AS "offerTitle",
              so.scheduled_at AS "scheduledAt", br.status,
              br.resolved_by AS "resolvedBy", br.resolved_at AS "resolvedAt",
              br.reject_reason AS "rejectReason", br.created_at AS "createdAt",
              u.id AS "userId", u.first_name AS "firstName",
              u.last_name AS "lastName", u.email
       FROM booking_requests br
       JOIN service_offers so ON so.id = br.offer_id
       JOIN users u ON u.id = br.user_id
       WHERE br.offer_id = $1
       ORDER BY br.created_at DESC`,
      [offerId]
    );
    return rows.map(mapBooking);
  },

  // Returns one record per enrollment (group leads only) — used by Mis Servicios
  async findByUser(userId: string): Promise<BookingRequestPublic[]> {
    const { rows } = await pool.query(
      `SELECT br.id, br.offer_id AS "offerId", so.title AS "offerTitle",
              so.scheduled_at AS "scheduledAt", so.duration_minutes AS "durationMinutes",
              so.price AS "offerPrice", so.offer_type AS "offerType",
              br.status,
              br.resolved_by AS "resolvedBy", br.resolved_at AS "resolvedAt",
              br.reject_reason AS "rejectReason", br.created_at AS "createdAt",
              u.id AS "userId", u.first_name AS "firstName",
              u.last_name AS "lastName", u.email,
              l.name AS "locationName",
              p.first_name AS "profFirstName", p.last_name AS "profLastName",
              COALESCE(jsonb_array_length(br.sibling_offer_ids), 0) + 1 AS "sessionCount"
       FROM booking_requests br
       JOIN service_offers so ON so.id = br.offer_id
       JOIN users u ON u.id = br.user_id
       LEFT JOIN locations l ON l.id = so.location_id
       LEFT JOIN users p ON p.id = so.professional_id
       WHERE br.user_id = $1 AND br.is_group_lead = TRUE
       ORDER BY so.scheduled_at ASC`,
      [userId]
    );
    return rows.map(mapBooking);
  },

  // Returns all approved sessions (lead + siblings) — used by the user calendar
  async findApprovedSessionsByUser(userId: string): Promise<BookingRequestPublic[]> {
    const { rows } = await pool.query(
      `SELECT br.id, br.offer_id AS "offerId", so.title AS "offerTitle",
              so.scheduled_at AS "scheduledAt", so.duration_minutes AS "durationMinutes",
              so.offer_type AS "offerType",
              l.name AS "locationName",
              p.first_name AS "profFirstName", p.last_name AS "profLastName"
       FROM booking_requests br
       JOIN service_offers so ON so.id = br.offer_id
       LEFT JOIN locations l ON l.id = so.location_id
       LEFT JOIN users p ON p.id = so.professional_id
       WHERE br.user_id = $1 AND br.status = 'approved'
       ORDER BY so.scheduled_at ASC`,
      [userId]
    );
    return rows.map((r) => ({
      ...r,
      scheduledAt: (r['scheduledAt'] as Date)?.toISOString?.() ?? r['scheduledAt'],
      user: { id: userId, firstName: '', lastName: '', email: '' },
    })) as BookingRequestPublic[];
  },

  // Returns one record per enrollment (admin view — group leads only)
  // Only returns FREE bookings (expectedAmount IS NULL or 0) — paid bookings go to FinanzasDashboard
  async findAll(status?: string): Promise<BookingRequestPublic[]> {
    const conditions: string[] = ['br.is_group_lead = TRUE'];
    const values: unknown[] = [];
    if (status) { conditions.push(`br.status = $${values.length + 1}`); values.push(status); }
    const where = `WHERE ${conditions.join(' AND ')} AND (br.expected_amount IS NULL OR br.expected_amount = 0)`;

    const { rows } = await pool.query(
      `SELECT br.id, br.offer_id AS "offerId", so.title AS "offerTitle",
              so.scheduled_at AS "scheduledAt", so.price AS "offerPrice",
              so.offer_type AS "offerType",
              br.status, br.resolved_by AS "resolvedBy",
              br.resolved_at AS "resolvedAt", br.reject_reason AS "rejectReason",
              br.created_at AS "createdAt",
              u.id AS "userId", u.first_name AS "firstName",
              u.last_name AS "lastName", u.email,
              l.name AS "locationName",
              p.first_name AS "profFirstName", p.last_name AS "profLastName",
              COALESCE(jsonb_array_length(br.sibling_offer_ids), 0) + 1 AS "sessionCount",
       br.payment_method AS "paymentMethod",
       br.expected_amount AS "expectedAmount",
       br.discount_pct    AS "discountPct"
       FROM booking_requests br
       JOIN service_offers so ON so.id = br.offer_id
       JOIN users u ON u.id = br.user_id
       LEFT JOIN locations l ON l.id = so.location_id
       LEFT JOIN users p ON p.id = so.professional_id
       ${where}
       ORDER BY br.created_at DESC`,
      values
    );
    return rows.map(mapBooking);
  },

  // Returns pending paid service bookings — used by FinanzasDashboard
  async findPendingServicePayments(): Promise<BookingRequestPublic[]> {
    const { rows } = await pool.query(
      `SELECT br.id, br.offer_id AS "offerId", so.title AS "offerTitle",
              so.scheduled_at AS "scheduledAt", so.price AS "offerPrice",
              br.status, br.created_at AS "createdAt",
              br.payment_method AS "paymentMethod",
              br.expected_amount AS "expectedAmount",
              br.discount_pct AS "discountPct",
              COALESCE(jsonb_array_length(br.sibling_offer_ids), 0) + 1 AS "sessionCount",
              u.id AS "userId", u.first_name AS "firstName", u.last_name AS "lastName", u.email,
              l.name AS "locationName"
       FROM booking_requests br
       JOIN service_offers so ON so.id = br.offer_id
       JOIN users u ON u.id = br.user_id
       LEFT JOIN locations l ON l.id = so.location_id
       WHERE br.is_group_lead = TRUE AND br.expected_amount > 0 AND br.status = 'pending'
       ORDER BY br.created_at DESC`
    );
    return rows.map(mapBooking);
  },

  // Confirms payment for a paid service booking and auto-approves it
  async confirmServicePayment(id: string, resolvedBy: string): Promise<BookingRequestPublic | null> {
    return this.resolve(id, resolvedBy, 'approved');
  },

  async create(offerId: string, userId: string): Promise<BookingRequestPublic> {
    await pool.query(
      `INSERT INTO booking_requests (offer_id, user_id, status)
       VALUES ($1, $2, 'approved')
       ON CONFLICT (offer_id, user_id) DO NOTHING`,
      [offerId, userId]
    );
    const list = await this.findByUser(userId);
    return list.find((b) => b.offerId === offerId)!;
  },

  // Creates ONE lead booking for a recurring service group.
  // Free bookings (no expectedAmount) are auto-approved.
  async createGroupEnrollment(
    offerIds: string[],
    userId: string,
    payment: { paymentMethod: 'cash' | 'wompi'; expectedAmount?: number; discountPct?: number } = { paymentMethod: 'cash' }
  ): Promise<BookingRequestPublic> {
    const leadId    = offerIds[0];
    const siblings  = offerIds.slice(1);
    const isPaid    = payment.expectedAmount != null && payment.expectedAmount > 0;
    const initStatus = isPaid ? 'pending' : 'approved';

    await pool.query(
      `INSERT INTO booking_requests
         (offer_id, user_id, sibling_offer_ids, is_group_lead, payment_method, expected_amount, discount_pct, status)
       VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7)
       ON CONFLICT (offer_id, user_id) DO NOTHING`,
      [
        leadId, userId,
        siblings.length > 0 ? JSON.stringify(siblings) : null,
        payment.paymentMethod,
        payment.expectedAmount ?? null,
        payment.discountPct ?? null,
        initStatus,
      ]
    );

    if (!isPaid && siblings.length > 0) {
      for (const sibId of siblings) {
        await pool.query(
          `INSERT INTO booking_requests (offer_id, user_id, status, is_group_lead)
           VALUES ($1, $2, 'approved', FALSE)
           ON CONFLICT (offer_id, user_id) DO NOTHING`,
          [sibId, userId]
        );
      }
    }

    const list = await this.findByUser(userId);
    return list.find((b) => b.offerId === leadId)!;
  },

  async resolve(
    id: string,
    resolvedBy: string,
    status: 'approved' | 'rejected',
    rejectReason?: string
  ): Promise<BookingRequestPublic | null> {
    const { rows } = await pool.query(
      `UPDATE booking_requests
       SET status = $1, resolved_by = $2, resolved_at = NOW(),
           reject_reason = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING offer_id, user_id, sibling_offer_ids, is_group_lead`,
      [status, resolvedBy, rejectReason ?? null, id]
    );
    if (!rows[0]) return null;

    const { user_id, sibling_offer_ids, is_group_lead } = rows[0];

    // On approval of a group lead → auto-create approved bookings for all siblings
    if (is_group_lead && Array.isArray(sibling_offer_ids) && sibling_offer_ids.length > 0 && status === 'approved') {
      for (const siblingOfferId of sibling_offer_ids) {
        await pool.query(
          `INSERT INTO booking_requests (offer_id, user_id, status, is_group_lead, resolved_by, resolved_at)
           VALUES ($1, $2, 'approved', FALSE, $3, NOW())
           ON CONFLICT (offer_id, user_id) DO UPDATE
             SET status = 'approved', resolved_by = $3, resolved_at = NOW()`,
          [siblingOfferId, user_id, resolvedBy]
        );
      }
    }

    const list = await this.findByUser(user_id);
    return list.find((b) => b.offerId === rows[0].offer_id) ?? null;
  },
};
