// apps/backend/src/scripts/import-cups-catalog.ts
import { pool } from '@config/database.js';
import { readCupsRows } from './xlsx-cups-reader.js';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: npx tsx src/scripts/import-cups-catalog.ts "ruta.xlsx"');
    process.exit(1);
  }

  const rows = readCupsRows(filePath);
  console.log(`Leídas ${rows.length} filas del Excel.`);

  const BATCH_SIZE = 500;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders = batch.map((r, idx) => {
      values.push(r.cupsCode, r.procedureName);
      return `($${idx * 2 + 1}, $${idx * 2 + 2})`;
    }).join(', ');

    await pool.query(
      `INSERT INTO cups_catalog (cups_code, procedure_name)
       VALUES ${placeholders}
       ON CONFLICT (cups_code) DO UPDATE SET procedure_name = EXCLUDED.procedure_name`,
      values
    );
    upserted += batch.length;
    console.log(`  ${upserted}/${rows.length} filas procesadas...`);
  }

  console.log(`Listo. ${upserted} códigos CUPS en catálogo.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
