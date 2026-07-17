import { pool } from '@config/database.js';
import type {
  InventoryItemRecord,
  InventoryItemPublic,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventorySearchFilters,
} from '../types/inventory.types.js';

function toPublic(r: InventoryItemRecord): InventoryItemPublic {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    unit: r.unit,
    price: r.price,
    quantity: r.quantity,
    minStock: r.min_stock,
    notes: r.notes,
    isActive: r.is_active,
  };
}

export const InventoryRepository = {
  async listAll(): Promise<InventoryItemPublic[]> {
    const { rows } = await pool.query<InventoryItemRecord>(
      `SELECT * FROM inventory_items ORDER BY name ASC`
    );
    return rows.map(toPublic);
  },

  async listActive(filters: InventorySearchFilters = {}): Promise<InventoryItemPublic[]> {
    const conditions: string[] = ['is_active = TRUE'];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.search) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${filters.search}%`);
    }
    if (filters.category) {
      conditions.push(`category = $${idx++}`);
      values.push(filters.category);
    }

    const { rows } = await pool.query<InventoryItemRecord>(
      `SELECT * FROM inventory_items WHERE ${conditions.join(' AND ')} ORDER BY name ASC`,
      values
    );
    return rows.map(toPublic);
  },

  async findById(id: string): Promise<InventoryItemPublic | null> {
    const { rows } = await pool.query<InventoryItemRecord>(
      `SELECT * FROM inventory_items WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async create(dto: CreateInventoryItemDto): Promise<InventoryItemPublic> {
    const { rows } = await pool.query<InventoryItemRecord>(
      `INSERT INTO inventory_items (name, category, unit, price, quantity, min_stock, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.name,
        dto.category,
        dto.unit,
        dto.price,
        dto.quantity ?? 0,
        dto.minStock ?? 0,
        dto.notes ?? null,
        dto.isActive ?? true,
      ]
    );
    return toPublic(rows[0]);
  },

  async update(id: string, dto: UpdateInventoryItemDto): Promise<InventoryItemPublic | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined)      { fields.push(`name = $${idx++}`);      values.push(dto.name); }
    if (dto.category !== undefined)  { fields.push(`category = $${idx++}`);  values.push(dto.category); }
    if (dto.unit !== undefined)      { fields.push(`unit = $${idx++}`);      values.push(dto.unit); }
    if (dto.price !== undefined)     { fields.push(`price = $${idx++}`);     values.push(dto.price); }
    if (dto.quantity !== undefined)  { fields.push(`quantity = $${idx++}`);  values.push(dto.quantity); }
    if (dto.minStock !== undefined)  { fields.push(`min_stock = $${idx++}`); values.push(dto.minStock); }
    if (dto.notes !== undefined)     { fields.push(`notes = $${idx++}`);     values.push(dto.notes); }
    if (dto.isActive !== undefined)  { fields.push(`is_active = $${idx++}`); values.push(dto.isActive); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query<InventoryItemRecord>(
      `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE inventory_items SET is_active = FALSE WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  },
};
