// ============================================================
// apps/backend/src/scripts/resync-doc-professionals.ts
// Corrida única y manual: fuerza un re-sync (delete+create) en CuidameDoc
// de todo servicio local activo que YA tenía doc_prof_service_id (creado
// antes de que ensureDocSync empezara a mandar target_professional_id).
// Sin esto, esos servicios quedan atados a OpiMed para siempre en
// CuidameDoc aunque localmente estén asignados a otro médico, porque
// updateOffer solo re-sincroniza cuando algún campo relevante cambia de
// verdad — y "ya estaba asignado a Kamala" no es un cambio.
// Uso: cd apps/backend && npx tsx src/scripts/resync-doc-professionals.ts
// ============================================================

import { pool } from '../config/database.js';
import { ensureDocSync } from '../services/docServiceSync.service.js';

interface SyncedCatalog {
  id: string;
  service_name: string;
  category_group: string | null;
  description: string | null;
  base_price: string | null;
  duration_minutes: number | null;
  professional_user_id: string | null;
}

async function run() {
  const { rows } = await pool.query<SyncedCatalog>(`
    SELECT c.id, c.service_name, c.category_group, c.description, c.base_price,
           (SELECT o.duration_minutes FROM service_offers o
             WHERE o.catalog_id = c.id ORDER BY o.created_at ASC LIMIT 1) AS duration_minutes,
           (SELECT o.professional_id FROM service_offers o
             WHERE o.catalog_id = c.id ORDER BY o.created_at ASC LIMIT 1) AS professional_user_id
    FROM service_catalog c
    WHERE c.doc_prof_service_id IS NOT NULL
      AND c.is_active = TRUE
    ORDER BY c.created_at ASC
  `);

  console.log(`🔎 ${rows.length} servicio(s) ya sincronizado(s) en CuidameDoc — forzando re-sync con el médico correcto.`);

  let ok = 0;
  let failed = 0;

  for (const row of rows) {
    if (row.duration_minutes === null) {
      console.log(`⏭️  Omitido "${row.service_name}" (${row.id}) — no tiene ninguna oferta con duración.`);
      continue;
    }
    const result = await ensureDocSync({
      targetTable: 'service_catalog',
      targetId: row.id,
      active: true,
      serviceName: row.service_name,
      durationMinutes: row.duration_minutes,
      categoryGroup: row.category_group ?? '01 Consulta externa',
      description: row.description,
      price: row.base_price ? Number(row.base_price) : 0,
      professionalUserId: row.professional_user_id,
    });
    if (result.ok) {
      ok++;
      console.log(`✅ Re-sincronizado "${row.service_name}" (${row.id}).`);
    } else {
      failed++;
      console.log(`❌ Falló "${row.service_name}" (${row.id}): ${result.error}`);
    }
  }

  console.log(`\n🌟 RE-SYNC COMPLETO — ok: ${ok}, fallidos: ${failed}`);
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
