import { pool } from '@config/database.js';
import type {
  ExternalQuoteRecord,
  ExternalQuotePublic,
  CreateExternalQuoteDto,
  ExternalQuoteStatus,
} from '../types/external-quote.types.js';

function toPublic(r: ExternalQuoteRecord): ExternalQuotePublic {
  return {
    id: r.id,
    source: r.source,
    externalReference: r.external_reference,
    patientName: r.patient_name,
    patientEmail: r.patient_email,
    professionalName: r.professional_name,
    items: r.items,
    totalAmount: r.total_amount,
    status: r.status,
    resolvedBy: r.resolved_by,
    resolvedAt: r.resolved_at ? r.resolved_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
  };
}

export const ExternalQuoteRepository = {
  async listByStatus(status?: ExternalQuoteStatus): Promise<ExternalQuotePublic[]> {
    if (status) {
      const { rows } = await pool.query<ExternalQuoteRecord>(
        `SELECT * FROM external_quotes WHERE status = $1 ORDER BY created_at DESC`,
        [status]
      );
      return rows.map(toPublic);
    }
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `SELECT * FROM external_quotes ORDER BY created_at DESC`
    );
    return rows.map(toPublic);
  },

  async findById(id: string): Promise<ExternalQuotePublic | null> {
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `SELECT * FROM external_quotes WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async create(dto: CreateExternalQuoteDto): Promise<ExternalQuotePublic> {
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `INSERT INTO external_quotes
         (source, external_reference, patient_name, patient_email, professional_name, items, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        dto.source ?? 'cuidamedoc',
        dto.externalReference ?? null,
        dto.patientName,
        dto.patientEmail ?? null,
        dto.professionalName ?? null,
        JSON.stringify(dto.items),
        dto.totalAmount,
      ]
    );
    return toPublic(rows[0]);
  },

  async resolve(id: string, status: 'confirmed' | 'rejected', resolvedBy: string): Promise<ExternalQuotePublic | null> {
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `UPDATE external_quotes
       SET status = $1, resolved_by = $2, resolved_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [status, resolvedBy, id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },
};
