// apps/backend/src/scripts/generate-surgical-classification.ts
import { pool } from '@config/database.js';
import { readCupsRows, type CupsRow } from './xlsx-cups-reader.js';

// Standard ICD-9-CM Volume 3 procedure sections (chapters CUPS inherits from CIE-9-MC).
const SUBGROUPS: { code: string; name: string; range: [number, number] }[] = [
  { code: '0401', name: 'Sistema nervioso', range: [1, 5] },
  { code: '0402', name: 'Sistema endocrino', range: [6, 7] },
  { code: '0403', name: 'Ojo', range: [8, 16] },
  { code: '0404', name: 'Oído', range: [18, 20] },
  { code: '0405', name: 'Nariz, boca y faringe', range: [21, 29] },
  { code: '0406', name: 'Sistema respiratorio', range: [30, 34] },
  { code: '0407', name: 'Sistema cardiovascular', range: [35, 39] },
  { code: '0408', name: 'Sistema hemático y linfático', range: [40, 41] },
  { code: '0409', name: 'Sistema digestivo', range: [42, 54] },
  { code: '0410', name: 'Sistema urinario', range: [55, 59] },
  { code: '0411', name: 'Órganos genitales masculinos', range: [60, 64] },
  { code: '0412', name: 'Órganos genitales femeninos', range: [65, 71] },
  { code: '0413', name: 'Procedimientos obstétricos', range: [72, 75] },
  { code: '0414', name: 'Sistema osteomuscular', range: [76, 84] },
  { code: '0415', name: 'Sistema tegumentario', range: [85, 86] },
];

function subgroupForChapter(chapterNum: number): { code: string; name: string } | null {
  const found = SUBGROUPS.find(s => chapterNum >= s.range[0] && chapterNum <= s.range[1]);
  return found ? { code: found.code, name: found.name } : null;
}

/** Derives a short category name for a chapter from the most frequent first 2 words across its procedure names. */
function deriveCategoryName(chapterRows: CupsRow[]): string {
  const wordCounts = new Map<string, number>();
  for (const r of chapterRows) {
    const words = r.procedureName.split(/\s+/).slice(0, 2).join(' ');
    wordCounts.set(words, (wordCounts.get(words) ?? 0) + 1);
  }
  const [topPhrase] = [...wordCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  return topPhrase;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) { console.error('Uso: npx tsx src/scripts/generate-surgical-classification.ts "ruta.xlsx"'); process.exit(1); }

  const rows = readCupsRows(filePath);
  const quirurgicos = rows.filter(r => r.quirurgico === 'S' && /^\d{2}/.test(r.cupsCode));
  console.log(`${quirurgicos.length} códigos quirúrgicos encontrados.`);

  const byChapter = new Map<string, CupsRow[]>();
  for (const r of quirurgicos) {
    const chapter = r.cupsCode.substring(0, 2);
    if (!byChapter.has(chapter)) byChapter.set(chapter, []);
    byChapter.get(chapter)!.push(r);
  }

  let categoriesInserted = 0, mappingsInserted = 0, skippedChapters = 0;
  for (const [chapter, chapterRows] of byChapter) {
    const chapterNum = parseInt(chapter, 10);
    const subgroup = subgroupForChapter(chapterNum);
    if (!subgroup) { skippedChapters++; continue; } // chapter outside the 15 known surgical sections (e.g. stray non-numeric prefixes)

    const categoryName = deriveCategoryName(chapterRows);
    await pool.query(
      `INSERT INTO service_classification_categories (service_group, service_subgroup, service_category, category_name)
       VALUES ('04', $1, $2, $3)
       ON CONFLICT (service_group, service_subgroup, service_category) DO UPDATE SET category_name = EXCLUDED.category_name`,
      [subgroup.code, chapter, categoryName]
    );
    categoriesInserted++;

    for (const r of chapterRows) {
      await pool.query(
        `INSERT INTO service_classification_cups_map (service_group, service_subgroup, service_category, service_subcategory, cups_code)
         VALUES ('04', $1, $2, $3, $3)
         ON CONFLICT (service_group, service_subgroup, service_category, service_subcategory, cups_code) DO UPDATE SET is_active = TRUE`,
        [subgroup.code, chapter, r.cupsCode]
      );
      mappingsInserted++;
    }
  }

  console.log(`Listo. ${categoriesInserted} categorías, ${mappingsInserted} mapeos para Grupo 04. ${skippedChapters} capítulos fuera de las 15 secciones conocidas (revisar si son relevantes).`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
