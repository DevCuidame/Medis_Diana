// ============================================================
// apps/backend/src/scripts/backfill-doc-sync.ts
// Corrida única y manual: publica en CuidameDoc todo servicio local
// activo que todavía no tenga su contraparte allá (doc_prof_service_id
// IS NULL). Pensado para correr una sola vez, justo después de desplegar
// la sincronización automática (Task 3).
// Uso: cd apps/backend && npx tsx src/scripts/backfill-doc-sync.ts
// ============================================================

import { pool } from '../config/database.js';
import { ensureDocSync } from '../services/docServiceSync.service.js';

interface PendingCatalog {
  id: string;
  service_name: string;
  category_group: string | null;
  description: string | null;
  base_price: string | null;
  duration_minutes: number | null;
}

async function run() {
  const { rows } = await pool.query<PendingCatalog>(`
    SELECT c.id, c.service_name, c.category_group, c.description, c.base_price,
           (SELECT o.duration_minutes FROM service_offers o
             WHERE o.catalog_id = c.id ORDER BY o.created_at ASC LIMIT 1) AS duration_minutes
    FROM service_catalog c
    WHERE c.doc_prof_service_id IS NULL
      AND c.is_active = TRUE
      AND EXISTS (SELECT 1 FROM service_offers o WHERE o.catalog_id = c.id)
    ORDER BY c.created_at ASC
  `);

  console.log(`🔎 ${rows.length} servicio(s) local(es) activo(s) sin contraparte en CuidameDoc.`);

  let created = 0;
  let failed = 0;

  for (const row of rows) {
    if (row.duration_minutes === null) {
      console.log(`⏭️  Omitido "${row.service_name}" (${row.id}) — no tiene ninguna oferta con duración.`);
      continue;
    }
    const result = await ensureDocSync({
      catalogId: row.id,
      active: true,
      serviceName: row.service_name,
      durationMinutes: row.duration_minutes,
      categoryGroup: row.category_group ?? '01 Consulta externa',
      description: row.description,
      price: row.base_price ? Number(row.base_price) : 0,
    });
    if (result.ok) {
      created++;
      console.log(`✅ Publicado "${row.service_name}" (${row.id}) en CuidameDoc.`);
    } else {
      failed++;
      console.log(`❌ Falló "${row.service_name}" (${row.id}): ${result.error}`);
    }
  }

  console.log(`\n🌟 BACKFILL COMPLETO — publicados: ${created}, fallidos: ${failed}, omitidos: ${rows.length - created - failed}`);
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
