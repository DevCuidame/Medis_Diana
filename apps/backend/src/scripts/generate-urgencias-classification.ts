// apps/backend/src/scripts/generate-urgencias-classification.ts
import { pool } from '@config/database.js';
import { readCupsRows, type CupsRow } from './xlsx-cups-reader.js';

// NOTE ON KEYWORD ADJUSTMENTS (vs. the plan's original draft):
// The plan's original regexes were checked against the real CUPS catalog and two of
// them produced zero or medically-wrong matches, so they were replaced:
//  - "ATENCION INICIAL|ATENCION DE URGENCIA" matched 0 rows (that literal phrasing
//    doesn't exist in the catalog). The only real "initial/immediate attention" code
//    present is prehospital care ("Atencion prehospitalaria sin traslado del paciente",
//    818S01), so the keyword now targets that.
//  - "REANIMACION" only matched 4 rows, and all 4 were facial reconstructive surgery
//    ("Reanimacion facial con colgajo muscular...", cups 047104-047107) — an unrelated
//    elective procedure that happens to share the word "reanimacion", not emergency
//    resuscitation. Replaced with "MASAJE CARDIACO|RESUCITACION", which matches the
//    genuine CPR/resuscitation codes (cardiac massage, non-mechanical resuscitation
//    methods, cardiopulmonary resuscitation).
//  - "TRIAGE|CLASIFICACION DE PACIENTE" matched 0 rows — CUPS has no billable triage/
//    patient-classification code at all. Renamed this category to "Procedimientos
//    menores de urgencias" and pointed it at the real minor-procedure-room fee codes
//    (dressing/procedure room, minor-surgery/suture room, casting room — 5DS002/5DS003/5DS004).
//  - "OBSERVACION" (bare) also coincidentally matched an audiometry test
//    ("Audiometria por observacion del comportamiento (boa)", 954102) that has nothing
//    to do with urgencias. Tightened to match only the actual observation-room fee codes.
const CATEGORIES: { code: string; name: string; keyword: RegExp }[] = [
  { code: '01', name: 'Atención inicial de urgencias (prehospitalaria)', keyword: /ATENCION PREHOSPITALARIA/i },
  { code: '02', name: 'Reanimación cardiopulmonar', keyword: /MASAJE CARDIACO|RESUCITACION/i },
  { code: '03', name: 'Procedimientos menores de urgencias', keyword: /DERECHOS DE SALA DE CURACIONES|DERECHOS DE SALA DE PEQUE.A CIRUGIA|DERECHOS DE SALA YESOS/i },
  { code: '04', name: 'Observación de urgencias', keyword: /SALA DE OBSERVACION|OBSERVACION \(URGENCIAS\)/i },
  { code: '05', name: 'Traslado asistencial', keyword: /TRASLADO/i },
];

async function main() {
  const filePath = process.argv[2];
  if (!filePath) { console.error('Uso: npx tsx src/scripts/generate-urgencias-classification.ts "ruta.xlsx"'); process.exit(1); }

  const rows = readCupsRows(filePath);
  // Exclude the 89-07-YY block (Grupo 01, Consulta de urgencias) to avoid double classification.
  const candidates = rows.filter(r => !(r.cupsCode.startsWith('89') && r.cupsCode.substring(2, 4) === '07'));

  const subgroup = '0501';
  let categoriesInserted = 0, mappingsInserted = 0;
  const matchedCodes = new Set<string>();

  for (const cat of CATEGORIES) {
    const matches = candidates.filter((r: CupsRow) => cat.keyword.test(r.procedureName) && !matchedCodes.has(r.cupsCode));
    if (matches.length === 0) { console.warn(`  Advertencia: 0 coincidencias para categoría "${cat.name}"`); continue; }

    await pool.query(
      `INSERT INTO service_classification_categories (service_group, service_subgroup, service_category, category_name)
       VALUES ('05', $1, $2, $3)
       ON CONFLICT (service_group, service_subgroup, service_category) DO UPDATE SET category_name = EXCLUDED.category_name`,
      [subgroup, cat.code, cat.name]
    );
    categoriesInserted++;

    for (const r of matches) {
      await pool.query(
        `INSERT INTO service_classification_cups_map (service_group, service_subgroup, service_category, service_subcategory, cups_code)
         VALUES ('05', $1, $2, $3, $3)
         ON CONFLICT (service_group, service_subgroup, service_category, service_subcategory, cups_code) DO UPDATE SET is_active = TRUE`,
        [subgroup, cat.code, r.cupsCode]
      );
      matchedCodes.add(r.cupsCode);
      mappingsInserted++;
    }
    console.log(`  ${cat.name}: ${matches.length} códigos`);
  }

  console.log(`Listo. ${categoriesInserted} categorías, ${mappingsInserted} mapeos para Grupo 05.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
