// apps/backend/src/scripts/xlsx-cups-reader.ts
import XLSX from 'xlsx';

export interface CupsRow {
  cupsCode: string;
  procedureName: string;
  quirurgico: 'S' | 'N';
  estancia: string;
}

function toSentenceCase(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Reads the official CUPS excel and returns normalized rows. Skips the header row and any row missing code+name. */
export function readCupsRows(filePath: string): CupsRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find(n => /^CUPS \d{4}$/.test(n));
  if (!sheetName) {
    throw new Error(`No se encontró una hoja "CUPS AAAA" en ${filePath}. Hojas disponibles: ${workbook.SheetNames.join(', ')}`);
  }
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 1 }); // skip header row

  const rows: CupsRow[] = [];
  for (const fila of raw) {
    const cupsCode = String(fila[1] ?? '').trim().toUpperCase().padStart(6, '0'); // CUPS codes are always stored/compared uppercase
    const procedureNameRaw = String(fila[2] ?? '').trim();
    if (!cupsCode || !procedureNameRaw) continue;
    rows.push({
      cupsCode,
      procedureName: toSentenceCase(procedureNameRaw),
      quirurgico: (String(fila[5] ?? '').trim().toUpperCase() === 'S' ? 'S' : 'N'),
      estancia: String(fila[10] ?? '').trim(),
    });
  }
  return rows;
}
