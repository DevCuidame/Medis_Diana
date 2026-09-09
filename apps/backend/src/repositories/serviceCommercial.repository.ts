// ============================================================
// apps/backend/src/repositories/serviceCommercial.repository.ts
// Repositorio: Servicios Comerciales (ficha pública de venta)
// ============================================================

import { pool } from '@config/database.js';
import type {
  ServiceCommercialPublic,
  CreateServiceCommercialPayload,
  UpdateServiceCommercialPayload,
} from '@medisdiana/shared-types';

const SELECT = `
  SELECT
    sc.id, sc.name, sc.description, sc.image_url, sc.operativo_id,
    sc.is_active, sc.doc_prof_service_id, sc.created_at, sc.updated_at,
    op.service_name AS operativo_name
  FROM service_commercial sc
  JOIN service_catalog op ON op.id = sc.operativo_id
`;

function rowToCommercial(row: Record<string, unknown>): ServiceCommercialPublic {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    description: (row['description'] as string) ?? null,
    imageUrl: (row['image_url'] as string) ?? null,
    operativoId: row['operativo_id'] as string,
    operativoName: row['operativo_name'] as string,
    isActive: row['is_active'] as boolean,
    docProfServiceId: (row['doc_prof_service_id'] as number) ?? null,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  };
}

export const ServiceCommercialRepository = {
  async findAll(): Promise<ServiceCommercialPublic[]> {
    const { rows } = await pool.query(`${SELECT} ORDER BY sc.created_at DESC`);
    return rows.map(rowToCommercial);
  },

  async findById(id: string): Promise<ServiceCommercialPublic | null> {
    const { rows } = await pool.query(`${SELECT} WHERE sc.id = $1`, [id]);
    return rows[0] ? rowToCommercial(rows[0]) : null;
  },

  async findPublishedByOperativoId(operativoId: string): Promise<ServiceCommercialPublic[]> {
    const { rows } = await pool.query(
      `${SELECT} WHERE sc.operativo_id = $1 AND sc.doc_prof_service_id IS NOT NULL`,
      [operativoId]
    );
    return rows.map(rowToCommercial);
  },

  async create(data: CreateServiceCommercialPayload): Promise<ServiceCommercialPublic> {
    const { rows } = await pool.query(
      `INSERT INTO service_commercial (name, description, image_url, operativo_id, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        data.name,
        data.description ?? null,
        data.imageUrl ?? null,
        data.operativoId,
        data.isActive ?? true,
      ]
    );
    return (await this.findById(rows[0].id))!;
  },

  async update(id: string, data: UpdateServiceCommercialPayload): Promise<ServiceCommercialPublic | null> {
    const map: Record<string, string> = {
      name: 'name',
      description: 'description',
      imageUrl: 'image_url',
      operativoId: 'operativo_id',
      isActive: 'is_active',
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

    values.push(id);
    await pool.query(`UPDATE service_commercial SET ${sets.join(', ')} WHERE id = $${i}`, values);
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM service_commercial WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
