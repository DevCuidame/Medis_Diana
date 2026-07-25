// apps/backend/src/scripts/generate-consulta-externa-classification.ts
import { pool } from '@config/database.js';
import { readCupsRows } from './xlsx-cups-reader.js';

const TIPOS: Record<string, string> = {
  '01': 'Atención domiciliaria',
  '02': 'Consulta de primera vez',
  '03': 'Consulta de control o seguimiento',
  '04': 'Interconsulta',
  '05': 'Junta médica',
  '06': 'Manejo intrahospitalario',
  '07': 'Consulta de urgencias',
};

async function main() {
  const filePath = process.argv[2];
  if (!filePath) { console.error('Uso: npx tsx src/scripts/generate-consulta-externa-classification.ts "ruta.xlsx"'); process.exit(1); }

  const rows = readCupsRows(filePath);
  // Only real "89-tipo-especialidad" consultation codes: 6 digits, starts with 89, tipo in TIPOS.
  const consultas = rows.filter(r =>
    r.cupsCode.length === 6 && r.cupsCode.startsWith('89') && TIPOS[r.cupsCode.substring(2, 4)]
  );
  console.log(`${consultas.length} códigos de consulta externa encontrados.`);

  // Build especialidad code -> name dictionary from the cleanest pattern: tipo '02' (Consulta de primera vez).
  const especialidadNames = new Map<string, string>();
  const PREFIX_02 = 'CONSULTA DE PRIMERA VEZ POR ';
  for (const r of consultas) {
    if (r.cupsCode.substring(2, 4) !== '02') continue;
    const especialidadCode = r.cupsCode.substring(4, 6);
    const upperName = r.procedureName.toUpperCase();
    if (upperName.startsWith(PREFIX_02)) {
      const stripped = r.procedureName.substring(PREFIX_02.length);
      const capitalized = stripped.charAt(0).toUpperCase() + stripped.slice(1);
      especialidadNames.set(especialidadCode, capitalized);
    }
  }
  // Fallback: any especialidad codes only seen under other tipos get a generic name from that row.
  for (const r of consultas) {
    const especialidadCode = r.cupsCode.substring(4, 6);
    if (!especialidadNames.has(especialidadCode)) {
      especialidadNames.set(especialidadCode, `Especialidad ${especialidadCode}`);
    }
  }

  let categoriesInserted = 0, mappingsInserted = 0;
  for (const tipoCode of Object.keys(TIPOS)) {
    const subgroupCode = `01${tipoCode}`;
    for (const [espCode, espName] of especialidadNames) {
      const match = consultas.find(r => r.cupsCode.substring(2, 4) === tipoCode && r.cupsCode.substring(4, 6) === espCode);
      if (!match) continue; // this tipo/especialidad combination doesn't exist as a real code

      await pool.query(
        `INSERT INTO service_classification_categories (service_group, service_subgroup, service_category, category_name)
         VALUES ('01', $1, $2, $3)
         ON CONFLICT (service_group, service_subgroup, service_category) DO UPDATE SET category_name = EXCLUDED.category_name`,
        [subgroupCode, espCode, espName]
      );
      categoriesInserted++;

      await pool.query(
        `INSERT INTO service_classification_cups_map (service_group, service_subgroup, service_category, service_subcategory, cups_code)
         VALUES ('01', $1, $2, $3, $3)
         ON CONFLICT (service_group, service_subgroup, service_category, service_subcategory, cups_code) DO UPDATE SET is_active = TRUE`,
        [subgroupCode, espCode, match.cupsCode]
      );
      mappingsInserted++;
    }
  }

  console.log(`Listo. ${categoriesInserted} categorías, ${mappingsInserted} mapeos para Grupo 01.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
