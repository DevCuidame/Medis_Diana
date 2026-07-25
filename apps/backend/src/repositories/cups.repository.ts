// ============================================================
// apps/backend/src/repositories/cups.repository.ts
// Repositorio: Clasificación RIPS -> CUPS
// ============================================================

import { pool } from '@config/database.js';
import type {
  CupsLookupResult, ClassificationCategory, ClassificationSubcategory,
  CreateMappingDTO, CupsCandidate,
} from '../types/cups.types.js';

export const CupsRepository = {
  async findByClassification(
    serviceGroup: string, serviceSubgroup: string, serviceCategory: string, serviceSubcategory: string
  ): Promise<CupsLookupResult | null> {
    const { rows } = await pool.query<{ cups_code: string; procedure_name: string }>(
      `SELECT DISTINCT m.cups_code, c.procedure_name
       FROM service_classification_cups_map m
       JOIN cups_catalog c ON c.cups_code = m.cups_code
       WHERE m.service_group = $1 AND m.service_subgroup = $2
         AND m.service_category = $3 AND m.service_subcategory = $4
         AND m.is_active = TRUE AND c.is_active = TRUE`,
      [serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory]
    );
    if (rows.length === 0) return null;
    if (rows.length === 1) {
      return { match: 'unique', cupsCode: rows[0].cups_code, procedureName: rows[0].procedure_name };
    }
    const candidates: CupsCandidate[] = rows.map(r => ({ cupsCode: r.cups_code, procedureName: r.procedure_name }));
    return { match: 'ambiguous', candidates };
  },

  async listCategories(serviceGroup: string, serviceSubgroup: string): Promise<ClassificationCategory[]> {
    const { rows } = await pool.query<{ service_category: string; category_name: string }>(
      `SELECT service_category, category_name
       FROM service_classification_categories
       WHERE service_group = $1 AND service_subgroup = $2
       ORDER BY category_name`,
      [serviceGroup, serviceSubgroup]
    );
    return rows.map(r => ({ serviceCategory: r.service_category, categoryName: r.category_name }));
  },

  async listSubcategories(serviceGroup: string, serviceSubgroup: string, serviceCategory: string): Promise<ClassificationSubcategory[]> {
    const { rows } = await pool.query<{ service_subcategory: string; procedure_name: string }>(
      `SELECT DISTINCT m.service_subcategory, c.procedure_name
       FROM service_classification_cups_map m
       JOIN cups_catalog c ON c.cups_code = m.cups_code
       WHERE m.service_group = $1 AND m.service_subgroup = $2 AND m.service_category = $3
         AND m.is_active = TRUE AND c.is_active = TRUE
       ORDER BY c.procedure_name`,
      [serviceGroup, serviceSubgroup, serviceCategory]
    );
    return rows.map(r => ({ serviceSubcategory: r.service_subcategory, procedureName: r.procedure_name }));
  },

  async listCatalog(): Promise<CupsCandidate[]> {
    const { rows } = await pool.query<{ cups_code: string; procedure_name: string }>(
      `SELECT cups_code, procedure_name FROM cups_catalog WHERE is_active = TRUE ORDER BY cups_code`
    );
    return rows.map(r => ({ cupsCode: r.cups_code, procedureName: r.procedure_name }));
  },

  async createMapping(dto: CreateMappingDTO): Promise<{ id: number }> {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO service_classification_cups_map
         (service_group, service_subgroup, service_category, service_subcategory, cups_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (service_group, service_subgroup, service_category, service_subcategory, cups_code)
       DO UPDATE SET is_active = TRUE
       RETURNING id`,
      [dto.serviceGroup, dto.serviceSubgroup, dto.serviceCategory, dto.serviceSubcategory, dto.cupsCode]
    );
    return rows[0];
  },
};
