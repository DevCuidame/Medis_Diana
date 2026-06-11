import { pool } from '@config/database.js';

export type BenefitType = 'informational' | 'free_classes' | 'discount_percent' | 'unlimited_classes';
export type ServiceCategory = 'pole' | 'complementary' | 'general';

export interface BenefitRecord {
  id: string;
  name: string;
  description: string | null;
  benefit_type: BenefitType;
  benefit_value: number | null;
  service_category: ServiceCategory | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface BenefitPublic {
  id: string;
  name: string;
  description: string | null;
  benefitType: BenefitType;
  benefitValue: number | null;
  serviceCategory: ServiceCategory | null;
  isActive: boolean;
  sortOrder: number;
}

function toPublic(r: BenefitRecord): BenefitPublic {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    benefitType: r.benefit_type,
    benefitValue: r.benefit_value !== null ? Number(r.benefit_value) : null,
    serviceCategory: r.service_category ?? null,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  };
}

export const BenefitRepository = {
  async listAll(): Promise<BenefitPublic[]> {
    const { rows } = await pool.query<BenefitRecord>(
      `SELECT * FROM benefits_catalog ORDER BY sort_order ASC, name ASC`
    );
    return rows.map(toPublic);
  },

  async listActive(): Promise<BenefitPublic[]> {
    const { rows } = await pool.query<BenefitRecord>(
      `SELECT * FROM benefits_catalog WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC`
    );
    return rows.map(toPublic);
  },

  async create(
    name: string,
    description?: string | null,
    benefitType: BenefitType = 'informational',
    benefitValue?: number | null,
    serviceCategory?: ServiceCategory | null,
  ): Promise<BenefitPublic> {
    const { rows } = await pool.query<BenefitRecord>(
      `INSERT INTO benefits_catalog (name, description, benefit_type, benefit_value, service_category)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), description ?? null, benefitType, benefitValue ?? null, serviceCategory ?? null]
    );
    return toPublic(rows[0]);
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      benefitType?: BenefitType;
      benefitValue?: number | null;
      serviceCategory?: ServiceCategory | null;
      isActive?: boolean;
      sortOrder?: number;
    }
  ): Promise<BenefitPublic | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.name !== undefined)             { fields.push(`name = $${idx++}`);             values.push(data.name.trim()); }
    if (data.description !== undefined)      { fields.push(`description = $${idx++}`);      values.push(data.description); }
    if (data.benefitType !== undefined)      { fields.push(`benefit_type = $${idx++}`);     values.push(data.benefitType); }
    if (data.benefitValue !== undefined)     { fields.push(`benefit_value = $${idx++}`);    values.push(data.benefitValue); }
    if (data.serviceCategory !== undefined)  { fields.push(`service_category = $${idx++}`); values.push(data.serviceCategory); }
    if (data.isActive !== undefined)         { fields.push(`is_active = $${idx++}`);        values.push(data.isActive); }
    if (data.sortOrder !== undefined)        { fields.push(`sort_order = $${idx++}`);       values.push(data.sortOrder); }
    if (!fields.length) return this.findById(id);
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await pool.query<BenefitRecord>(
      `UPDATE benefits_catalog SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async findById(id: string): Promise<BenefitPublic | null> {
    const { rows } = await pool.query<BenefitRecord>(
      `SELECT * FROM benefits_catalog WHERE id = $1`, [id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM benefits_catalog WHERE id = $1`, [id]
    );
    return (rowCount ?? 0) > 0;
  },
};
