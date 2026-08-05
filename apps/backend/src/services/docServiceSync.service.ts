// ============================================================
// apps/backend/src/services/docServiceSync.service.ts
// Sincroniza un servicio del catálogo local (service_catalog) con el
// catálogo real de CuidameDoc (professional_id=12, Diana). CuidameDoc no
// tiene endpoint de edición: "actualizar" siempre es borrar + crear.
// Nunca lanza — toda llamada de red vuelve como { ok, error? } para que
// el llamador pueda decidir qué hacer sin que un fallo de CuidameDoc
// tumbe el guardado local.
// ============================================================

import { pool } from '@config/database.js';
import { env } from '@config/env.js';
import { getDocToken, refreshDocToken } from '@utils/docAuth.js';

export interface EnsureDocSyncParams {
  catalogId: string;
  active: boolean;
  serviceName: string;
  durationMinutes: number;
  categoryGroup: string;
  description?: string | null;
  price: number;
}

export interface EnsureDocSyncResult {
  ok: boolean;
  error?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  '01 Consulta externa': 'consultation',
  '02 Apoyo diagnóstico y complementación terapéutica': 'exam',
  '03 Internación': 'procedure',
  '04 Quirúrgico': 'procedure',
  '05 Atención inmediata': 'consultation',
};

export function mapCategoryGroupToDocCategory(categoryGroup: string): string {
  return CATEGORY_MAP[categoryGroup] ?? 'consultation';
}

async function getCurrentDocProfServiceId(catalogId: string): Promise<number | null> {
  const { rows } = await pool.query(
    'SELECT doc_prof_service_id FROM service_catalog WHERE id = $1', [catalogId]
  );
  return rows[0]?.doc_prof_service_id ?? null;
}

async function setDocProfServiceId(catalogId: string, value: number | null): Promise<void> {
  await pool.query(
    'UPDATE service_catalog SET doc_prof_service_id = $1 WHERE id = $2', [value, catalogId]
  );
}

/** Llama `fetchFn` con el token actual; si CuidameDoc responde 401, refresca una vez y reintenta. */
async function withDocAuth(fetchFn: (token: string) => Promise<Response>): Promise<Response> {
  let token = await getDocToken();
  let res = await fetchFn(token);
  if (res.status === 401) {
    token = await refreshDocToken();
    res = await fetchFn(token);
  }
  return res;
}

async function createDocService(params: {
  serviceName: string; durationMinutes: number; categoryGroup: string;
  description?: string | null; price: number;
}): Promise<{ ok: true; profServiceId: number } | { ok: false; error: string }> {
  try {
    const body = JSON.stringify({
      service_name: params.serviceName,
      duration_minutes: params.durationMinutes,
      category: mapCategoryGroupToDocCategory(params.categoryGroup),
      description: params.description ?? undefined,
      price: params.price,
    });
    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/booking/my-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
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
  const currentId = await getCurrentDocProfServiceId(params.catalogId);

  if (!params.active) {
    if (currentId === null) return { ok: true }; // ya estaba fuera, nada que hacer
    const del = await deleteDocService(currentId);
    if (!del.ok) return { ok: false, error: del.error };
    await setDocProfServiceId(params.catalogId, null);
    return { ok: true };
  }

  // active === true
  if (currentId !== null) {
    const del = await deleteDocService(currentId);
    if (!del.ok) return { ok: false, error: del.error };
  }

  const created = await createDocService({
    serviceName: params.serviceName,
    durationMinutes: params.durationMinutes,
    categoryGroup: params.categoryGroup,
    description: params.description,
    price: params.price,
  });
  if (!created.ok) return { ok: false, error: created.error };

  await setDocProfServiceId(params.catalogId, created.profServiceId);
  return { ok: true };
}
