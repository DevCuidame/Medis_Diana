// ============================================================
// apps/backend/src/services/docServiceSync.service.ts
// Motor genérico de sincronización con CuidameDoc (professional_id=12,
// Diana). Publica/despublica un servicio a partir de una fila local cuya
// columna `doc_prof_service_id` trackea el `prof_service_id` de
// CuidameDoc — hoy esa fila es un comercial (`service_commercial`), antes
// (fase anterior, ya no se llama así) era el operativo (`service_catalog`);
// `targetTable` es lo único que cambia entre los dos casos, así que el
// motor no se duplica.
// CuidameDoc no tiene endpoint de edición: "actualizar" siempre es borrar
// + crear. Nunca lanza — toda llamada de red vuelve como { ok, error? }
// para que el llamador pueda decidir qué hacer sin que un fallo de
// CuidameDoc tumbe el guardado local.
// ============================================================

import { pool } from '@config/database.js';
import { env } from '@config/env.js';
import { withDocAuth } from '@utils/docAuth.js';

/**
 * Únicas tablas locales que tienen columna `doc_prof_service_id`. Es un
 * tipo literal (no un `string` cualquiera) a propósito: `targetTable` se
 * interpola directo en el SQL de abajo porque Postgres no permite
 * parametrizar nombres de tabla con `$1` — restringirlo a este union en
 * tiempo de compilación es lo que hace esa interpolación segura (no puede
 * llegar un valor arbitrario del request, solo uno de estos dos literales
 * elegidos en el código).
 */
export type DocSyncTargetTable = 'service_catalog' | 'service_commercial';

export interface EnsureDocSyncParams {
  targetTable: DocSyncTargetTable;
  targetId: string;
  active: boolean;
  serviceName: string;
  durationMinutes: number;
  categoryGroup: string;
  description?: string | null;
  price: number;
  /** Medis user id (uuid) del médico asignado a esta oferta, si tiene uno. */
  professionalUserId?: string | null;
}

export interface EnsureDocSyncResult {
  ok: boolean;
  error?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  '01 Consulta externa': 'consultation',
  '02 Apoyo diagnóstico y complementación terapéutica': 'diagnostic',
  '03 Internación': 'procedure',
  '04 Quirúrgico': 'procedure',
  '05 Atención inmediata': 'consultation',
};

export function mapCategoryGroupToDocCategory(categoryGroup: string): string {
  return CATEGORY_MAP[categoryGroup] ?? 'consultation';
}

async function getCurrentDocProfServiceId(table: DocSyncTargetTable, id: string): Promise<number | null> {
  const { rows } = await pool.query(
    `SELECT doc_prof_service_id FROM ${table} WHERE id = $1`, [id]
  );
  return rows[0]?.doc_prof_service_id ?? null;
}

async function setDocProfServiceId(table: DocSyncTargetTable, id: string, value: number | null): Promise<void> {
  await pool.query(
    `UPDATE ${table} SET doc_prof_service_id = $1 WHERE id = $2`, [value, id]
  );
}

/** Busca el professional_id real en CuidameDoc para un usuario local de Medis, si ya fue aprovisionado. */
async function getDocProfessionalIdForUser(userId: string): Promise<number | null> {
  const { rows } = await pool.query(
    'SELECT doc_professional_id FROM users WHERE id = $1', [userId]
  );
  return rows[0]?.doc_professional_id ?? null;
}

async function createDocService(params: {
  serviceName: string; durationMinutes: number; categoryGroup: string;
  description?: string | null; price: number; professionalUserId?: string | null;
}): Promise<{ ok: true; profServiceId: number } | { ok: false; error: string }> {
  try {
    const targetProfessionalId = params.professionalUserId
      ? await getDocProfessionalIdForUser(params.professionalUserId)
      : null;

    const body = JSON.stringify({
      service_name: params.serviceName,
      duration_minutes: params.durationMinutes,
      category: mapCategoryGroupToDocCategory(params.categoryGroup),
      description: params.description ?? undefined,
      price: params.price,
      // Si el doctor asignado a la oferta ya está aprovisionado en
      // CuidameDoc, el servicio queda a su nombre; si no, CuidameDoc lo
      // crea bajo la doctora autenticada (comportamiento de siempre).
      target_professional_id: targetProfessionalId ?? undefined,
    });
    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/booking/my-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
        signal: AbortSignal.timeout(8000),
      })
    );
    const json = await res.json() as { success: boolean; data?: { prof_service_id: number }; message?: string };
    if (!res.ok || !json.success || !json.data) {
      return { ok: false, error: json.message ?? `CuidameDoc respondió ${res.status}` };
    }
    return { ok: true, profServiceId: json.data.prof_service_id };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

async function deleteDocService(profServiceId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/booking/my-services/${profServiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      })
    );
    // 404 = ya no existía en CuidameDoc; lo tratamos como éxito (idempotente).
    if (res.status === 404) return { ok: true };
    const json = await res.json() as { success: boolean; message?: string };
    if (!res.ok || !json.success) {
      return { ok: false, error: json.message ?? `CuidameDoc respondió ${res.status}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function ensureDocSync(params: EnsureDocSyncParams): Promise<EnsureDocSyncResult> {
  try {
    const currentId = await getCurrentDocProfServiceId(params.targetTable, params.targetId);

    if (!params.active) {
      if (currentId === null) return { ok: true }; // ya estaba fuera, nada que hacer
      const del = await deleteDocService(currentId);
      if (!del.ok) return { ok: false, error: del.error };
      await setDocProfServiceId(params.targetTable, params.targetId, null);
      return { ok: true };
    }

    // active === true
    if (currentId !== null) {
      const del = await deleteDocService(currentId);
      if (!del.ok) return { ok: false, error: del.error };
      // Immediately clear DB after successful delete but before create attempt,
      // so if create fails, the DB is left in accurate "not synced" state.
      await setDocProfServiceId(params.targetTable, params.targetId, null);
    }

    const created = await createDocService({
      serviceName: params.serviceName,
      durationMinutes: params.durationMinutes,
      categoryGroup: params.categoryGroup,
      description: params.description,
      price: params.price,
      professionalUserId: params.professionalUserId,
    });
    if (!created.ok) return { ok: false, error: created.error };

    await setDocProfServiceId(params.targetTable, params.targetId, created.profServiceId);
    return { ok: true };
  } catch (err: unknown) {
    // Nunca lanza: cualquier error inesperado (p.ej. las consultas directas a
    // la BD en getCurrentDocProfServiceId/setDocProfServiceId, que no tienen
    // su propio try/catch) se convierte en un resultado { ok: false } en vez
    // de propagarse y tumbar la respuesta del controlador con un 500 cuando
    // el guardado local ya se completó con éxito.
    return { ok: false, error: (err as Error).message };
  }
}
