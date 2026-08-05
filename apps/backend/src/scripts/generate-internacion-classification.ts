// apps/backend/src/scripts/generate-internacion-classification.ts
import { pool } from '@config/database.js';
import { readCupsRows, type CupsRow } from './xlsx-cups-reader.js';

// Curated: 5 categories of common hospitalization-management procedures, drawn from
// estancia='H' candidates, excluding consultation codes (already in Grupo 01) and
// excluding surgical codes (already in Grupo 04, quirurgico='S').
//
// NOTE: the originally planned keywords (ENFERMERIA / NUTRICION / RESPIRATORIA /
// INTERCONSULTA) had 0 matches against the real 58-row candidate pool for this
// worktree's CUPS Excel — those concepts simply aren't separate line items here
// (and INTERCONSULTA codes live under the "89" prefix, which is excluded above,
// since interconsulta is already covered by Grupo 01). Inspecting the actual
// unmatched rows surfaced five real, medically coherent clusters instead:
// ICU/intermediate care stays, chronic-terminal-patient care, mental health unit
// stays, partial hospitalization, and general room-based internación by
// complexity level (plus the single transplant-unit code). Order matters below:
// "crónico terminal" and "salud mental" run before the generic "complejidad"
// keyword because their names also contain the word "complejidad", and
// `matchedCodes` prevents a code from being claimed twice.
const CATEGORIES: { code: string; name: string; keyword: RegExp }[] = [
  { code: '01', name: 'Cuidado intensivo e intermedio', keyword: /CUIDADO (INTENSIVO|INTERMEDIO|BASICO)/i },
  { code: '02', name: 'Internación de paciente crónico terminal', keyword: /CRONICO TERMINAL/i },
  { code: '03', name: 'Internación en salud mental', keyword: /SALUD MENTAL/i },
  { code: '04', name: 'Internación parcial', keyword: /PARCIAL/i },
  { code: '05', name: 'Manejo médico intrahospitalario por complejidad', keyword: /COMPLEJIDAD|COMPLEGIDAD|TRASPLANTE/i },
];

async function main() {
  const filePath = process.argv[2];
  if (!filePath) { console.error('Uso: npx tsx src/scripts/generate-internacion-classification.ts "ruta.xlsx"'); process.exit(1); }

  const rows = readCupsRows(filePath);
  const candidates = rows.filter(r =>
    r.estancia === 'H' && r.quirurgico === 'N' && !r.cupsCode.startsWith('89')
  );
  console.log(`${candidates.length} candidatos con estancia='H' (no quirúrgicos, no consulta externa).`);

  const subgroup = '0301';
  let categoriesInserted = 0, mappingsInserted = 0;
  const matchedCodes = new Set<string>();

  for (const cat of CATEGORIES) {
    const matches = candidates.filter((r: CupsRow) => cat.keyword.test(r.procedureName) && !matchedCodes.has(r.cupsCode));
    if (matches.length === 0) { console.warn(`  Advertencia: 0 coincidencias para categoría "${cat.name}"`); continue; }

    await pool.query(
      `INSERT INTO service_classification_categories (service_group, service_subgroup, service_category, category_name)
       VALUES ('03', $1, $2, $3)
       ON CONFLICT (service_group, service_subgroup, service_category) DO UPDATE SET category_name = EXCLUDED.category_name`,
      [subgroup, cat.code, cat.name]
    );
    categoriesInserted++;

    for (const r of matches) {
      await pool.query(
        `INSERT INTO service_classification_cups_map (service_group, service_subgroup, service_category, service_subcategory, cups_code)
         VALUES ('03', $1, $2, $3, $3)
         ON CONFLICT (service_group, service_subgroup, service_category, service_subcategory, cups_code) DO UPDATE SET is_active = TRUE`,
        [subgroup, cat.code, r.cupsCode]
      );
      matchedCodes.add(r.cupsCode);
      mappingsInserted++;
    }
    console.log(`  ${cat.name}: ${matches.length} códigos`);
  }

  console.log(`Listo. ${categoriesInserted} categorías, ${mappingsInserted} mapeos para Grupo 03.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
