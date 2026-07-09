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
} from '@medisdiana/shared-types';

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

// ─── SERVICE CATALOG ──────────────────────────────────────────

export const ServiceCatalogRepository = {
  async create(data: any): Promise<{ id: string }> {
    // Serialize modality array to JSON string for VARCHAR storage
    const modalityStr = Array.isArray(data.modality)
      ? JSON.stringify(data.modality)
      : (data.modality ? String(data.modality) : null);

    const { rows } = await pool.query(
      `INSERT INTO service_catalog
         (service_name, description, category_group, subcategory_group, category, subcategory,
          service_code, modality, is_active, base_price, image_url, preparation_instructions,
          gender_restriction, risks, contraindications)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        data.serviceName, data.description ?? null, data.categoryGroup, data.subcategoryGroup ?? null,
        data.category ?? null, data.subcategory ?? null, data.serviceCode ?? null,
        modalityStr, data.isActive ?? true, data.basePrice ?? 0,
        data.imageUrl ?? null, data.preparationInstructions ?? null, data.genderRestriction ?? null,
        data.risks ?? null, data.contraindications ?? null
      ]
    );
    return rows[0];
  },
  
  async update(id: string, data: any): Promise<void> {
    const map: Record<string, string> = {
      serviceName: 'service_name', description: 'description', categoryGroup: 'category_group',
      subcategoryGroup: 'subcategory_group', category: 'category', subcategory: 'subcategory',
      serviceCode: 'service_code', modality: 'modality', isActive: 'is_active',
      basePrice: 'base_price', imageUrl: 'image_url', preparationInstructions: 'preparation_instructions',
      genderRestriction: 'gender_restriction', risks: 'risks', contraindications: 'contraindications'
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        sets.push(`${col} = $${i++}`);
        if (key === 'modality') {
          // Always serialize modality as JSON string
          const val = data[key];
          values.push(Array.isArray(val) ? JSON.stringify(val) : (val ? String(val) : null));
        } else {
          values.push(data[key]);
        }
      }
    }
    if (sets.length === 0) return;
    sets.push(`updated_at = NOW()`);
    values.push(id);
    await pool.query(`UPDATE service_catalog SET ${sets.join(', ')} WHERE id = $${i}`, values);
  }
};

// ─── SERVICE OFFERS ──────────────────────────────────────────

function rowToOffer(row: Record<string, unknown>): ServiceOfferPublic & { catalog?: any } {
  return {
    id:              row['id'] as string,
    catalogId:       (row['catalog_id'] as string) ?? null,
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
    specialty: row['specialty_id'] ? {
      id:    row['specialty_id'] as string,
      name:  row['specialty_name'] as string,
      level: row['specialty_level'] as string,
    } : null,
    catalog: row['catalog_id'] ? {
      serviceName: row['c_service_name'],
      description: row['c_description'],
      categoryGroup: row['c_category_group'],
      subcategoryGroup: row['c_subcategory_group'],
      category: row['c_category'],
      subcategory: row['c_subcategory'],
      serviceCode: row['c_service_code'],
      modality: (() => {
        const raw = row['c_modality'];
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try { return JSON.parse(raw as string); } catch { return [String(raw)]; }
      })(),
      isActive: row['c_is_active'],
      basePrice: row['c_base_price'],
      imageUrl: row['c_image_url'],
      preparationInstructions: row['c_preparation_instructions'],
      genderRestriction: row['c_gender_restriction'],
      risks: row['c_risks'],
      contraindications: row['c_contraindications'],
    } : null,
  };
}

const OFFER_SELECT = `
  SELECT
    so.id, so.catalog_id, so.title, so.description, so.offer_type, so.status,
    so.scheduled_at, so.duration_minutes, so.capacity, so.enrolled_count,
    so.price, so.currency,
    l.id AS location_id, l.name AS location_name,
    r.id AS room_id, r.name AS room_name, r.capacity AS room_capacity,
    u.id AS professional_id, u.first_name AS professional_first,
    u.last_name AS professional_last, u.avatar_url AS professional_avatar,
    sp.id AS specialty_id, sp.name AS specialty_name, sp.level AS specialty_level,
    c.service_name AS c_service_name, c.description AS c_description,
    c.category_group AS c_category_group, c.subcategory_group AS c_subcategory_group,
    c.category AS c_category, c.subcategory AS c_subcategory,
    c.service_code AS c_service_code, c.modality AS c_modality,
    c.is_active AS c_is_active, c.base_price AS c_base_price,
    c.image_url AS c_image_url, c.preparation_instructions AS c_preparation_instructions,
    c.gender_restriction AS c_gender_restriction, c.risks AS c_risks,
    c.contraindications AS c_contraindications
  FROM service_offers so
  JOIN locations l ON l.id = so.location_id
  LEFT JOIN rooms r ON r.id = so.room_id
  LEFT JOIN users u ON u.id = so.professional_id
  LEFT JOIN specialties sp ON sp.id = so.specialty_id
  LEFT JOIN service_catalog c ON c.id = so.catalog_id
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
         (catalog_id, location_id, room_id, offer_type, title, description,
          professional_id, specialty_id, capacity, duration_minutes,
          scheduled_at, price, currency, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        data.catalogId ?? null, data.locationId, data.roomId ?? null, data.offerType, data.title,
        data.description ?? null, data.professionalId ?? null,
        data.specialtyId ?? null, data.capacity, data.durationMinutes,
        data.scheduledAt, data.price ?? null, data.currency ?? 'COP', createdBy,
      ]
    );
    return (await this.findById(rows[0].id))!;
  },

  async update(id: string, data: UpdateServiceOfferPayload): Promise<ServiceOfferPublic | null> {
    const map: Record<string, string> = {
      catalogId: 'catalog_id', title: 'title', description: 'description', roomId: 'room_id',
      professionalId: 'professional_id', specialtyId: 'specialty_id',
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
