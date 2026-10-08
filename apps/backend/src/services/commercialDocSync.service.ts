// ============================================================
// apps/backend/src/services/commercialDocSync.service.ts
// Publica/despublica un service_commercial en CuidameDoc heredando
// duración/categoría/precio/profesional del operativo (service_catalog)
// vinculado — el comercial solo aporta su propio nombre/descripción.
// Ver spec: docs/superpowers/specs/2026-09-08-servicios-comerciales-operativos-design.md
// (sección "Fuera de alcance de esta fase").
// ============================================================

import { ServiceCatalogRepository } from '@repositories/services.repository.js';
import { ServiceCommercialRepository } from '@repositories/serviceCommercial.repository.js';
import { ensureDocSync, type EnsureDocSyncResult } from './docServiceSync.service.js';
import type { ServiceCommercialPublic } from '@medisopimed/shared-types';

/**
 * Publica (active=true) o despublica (active=false) un comercial en
 * CuidameDoc. `active` se recibe explícito en vez de leerse de
 * `commercial.isActive` porque el llamador a veces necesita forzar el
 * valor "de destino" antes de que la fila local ya lo refleje (p.ej.
 * updateCommercial construye el comercial actualizado en memoria).
 */
export async function syncCommercialToDoc(
  commercial: ServiceCommercialPublic,
  active: boolean
): Promise<EnsureDocSyncResult> {
  const operativo = await ServiceCatalogRepository.findWithRepresentativeOffer(commercial.operativoId);
  if (!operativo) {
    return { ok: false, error: 'El servicio operativo vinculado ya no existe' };
  }
  // Publicar requiere duración (vive en la oferta, no en el operativo) —
  // despublicar no la necesita (ensureDocSync con active=false solo borra
  // por doc_prof_service_id, sin tocar estos campos).
  if (active && !operativo.representativeOffer) {
    return { ok: false, error: 'El operativo vinculado no tiene ninguna sesión configurada; no se puede publicar en CuidameDoc' };
  }

  return ensureDocSync({
    targetTable: 'service_commercial',
    targetId: commercial.id,
    active,
    serviceName: commercial.name,
    description: commercial.description,
    durationMinutes: operativo.representativeOffer?.durationMinutes ?? 0,
    categoryGroup: operativo.categoryGroup ?? '01 Consulta externa',
    price: operativo.basePrice,
    professionalUserId: operativo.representativeOffer?.professionalUserId ?? null,
  });
}

/**
 * Cuando se edita un operativo (nombre/precio/categoría/duración/
 * profesional), todo comercial ya publicado que cuelgue de él heredó esos
 * datos en su momento y quedó desactualizado en CuidameDoc — se
 * re-sincroniza cada uno (borrar+crear, con los datos ya actualizados).
 * Los comerciales no publicados (doc_prof_service_id null) se ignoran: no
 * hay nada que actualizar en CuidameDoc para ellos todavía.
 */
export async function resyncPublishedCommercialsForOperativo(
  operativoId: string
): Promise<Array<{ id: string; ok: boolean; error?: string }>> {
  const published = await ServiceCommercialRepository.findPublishedByOperativoId(operativoId);
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const commercial of published) {
    const result = await syncCommercialToDoc(commercial, commercial.isActive);
    // Spread condicional en vez de `error: result.error` — así un éxito
    // produce { id, ok: true } sin una clave `error: undefined` de más
    // (los tests comparan este shape exacto con assert.deepEqual).
    results.push({ id: commercial.id, ok: result.ok, ...(result.error ? { error: result.error } : {}) });
  }
  return results;
}
