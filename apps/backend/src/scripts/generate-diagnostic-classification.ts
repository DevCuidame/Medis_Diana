// apps/backend/src/scripts/generate-diagnostic-classification.ts
import { pool } from '@config/database.js';
import { readCupsRows } from './xlsx-cups-reader.js';

// Standard ICD-9-CM Vol.3 "Miscellaneous Diagnostic and Therapeutic Procedures" chapters (87-99), which CUPS inherits.
const CHAPTER_NAMES: Record<string, string> = {
  '87': 'Radiografía diagnóstica',
  '88': 'Otras técnicas de radiología diagnóstica (ecografía, tomografía, resonancia)',
  '90': 'Examen microscópico de citología y patología',
  '91': 'Examen microscópico de microbiología y serología',
  '92': 'Medicina nuclear',
  '93': 'Terapia física, respiratoria y rehabilitación',
  '94': 'Procedimientos relacionados con la psique',
  '95': 'Procedimientos diagnósticos de ojo, oído, nariz y garganta',
  '96': 'Intubación e irrigación no operatoria',
  '97': 'Reemplazo y retiro de dispositivos terapéuticos',
  '98': 'Extracción no operatoria de cuerpo extraño o cálculo',
  '99': 'Otros procedimientos no operatorios (inyecciones, vacunación, transfusión)',
};
const SUBGROUP_OF_CHAPTER: Record<string, string> = {
  '87': '0201', '88': '0201', '90': '0201', '91': '0201', '92': '0201', '95': '0201',
  '93': '0202', '94': '0202', '96': '0202', '97': '0202', '98': '0202', '99': '0202',
};

async function main() {
  const filePath = process.argv[2];
  if (!filePath) { console.error('Uso: npx tsx src/scripts/generate-diagnostic-classification.ts "ruta.xlsx"'); process.exit(1); }

  const rows = readCupsRows(filePath);
  const target = rows.filter(r => CHAPTER_NAMES[r.cupsCode.substring(0, 2)]);
  console.log(`${target.length} códigos de apoyo diagnóstico/terapéutico encontrados.`);

  const seenCategories = new Set<string>();
  let mappingsInserted = 0;
  for (const r of target) {
    const chapter = r.cupsCode.substring(0, 2);
    const subgroup = SUBGROUP_OF_CHAPTER[chapter];
    const categoryKey = `${subgroup}|${chapter}`;
    if (!seenCategories.has(categoryKey)) {
      await pool.query(
        `INSERT INTO service_classification_categories (service_group, service_subgroup, service_category, category_name)
         VALUES ('02', $1, $2, $3)
         ON CONFLICT (service_group, service_subgroup, service_category) DO UPDATE SET category_name = EXCLUDED.category_name`,
        [subgroup, chapter, CHAPTER_NAMES[chapter]]
      );
      seenCategories.add(categoryKey);
    }
    await pool.query(
      `INSERT INTO service_classification_cups_map (service_group, service_subgroup, service_category, service_subcategory, cups_code)
       VALUES ('02', $1, $2, $3, $3)
       ON CONFLICT (service_group, service_subgroup, service_category, service_subcategory, cups_code) DO UPDATE SET is_active = TRUE`,
      [subgroup, chapter, r.cupsCode]
    );
    mappingsInserted++;
  }

  console.log(`Listo. ${seenCategories.size} categorías, ${mappingsInserted} mapeos para Grupo 02.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
