# Sistema de Clasificación RIPS → CUPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text Grupo/Subgrupo/Categoría/Subcategoría cascade and the naive substring-concatenation "CUPS code" in `FormularioServicio.tsx` with a real catalog sourced from the official CUPS Excel, resolved through a classification → CUPS bridge table, exactly like the sibling project's pattern.

**Architecture:** 4 new Postgres tables (`cups_catalog`, `service_classification_cups_map`, `service_classification_categories`, plus backfill of existing `service_catalog`). A one-time import script loads the Excel into `cups_catalog`; five one-time generation scripts (one per RIPS group) seed the bridge table. A small backend API resolves a 4-field classification to a CUPS code (unique / ambiguous / not-found) and lists category/subcategory options. The frontend cascades Grupo → Subgrupo (static, hardcoded) → Categoría → Subcategoría (both fetched from the backend for every non-escape group), then looks up the CUPS code automatically, with a "create mapping on the fly" modal for the not-found case.

**Tech Stack:** PostgreSQL (raw `pg`, no ORM), Express, TypeScript (ESM, `@repositories/...js` import style), React + react-hook-form + zod, `xlsx` (SheetJS, new dependency).

## Global Constraints

- Source file: `C:\Users\julie\Downloads\Proyectos_Trabajo\codigos _cups.xlsx`, sheet matching `/^CUPS \d{4}$/`. Column offsets (0-indexed array per row, position 0 is the literal string `"CUPSRips"` and must be ignored): código=`fila[1]`, nombre=`fila[2]`, sección=`fila[3]`, quirúrgico(S/N)=`fila[5]`, estancia=`fila[10]`.
- Never use `git add -A` — stage files by exact path.
- All new backend files follow the existing import alias style (`@repositories/...js`, `@controllers/...js`) — check `apps/backend/tsconfig.json` paths if unsure, but just copy the pattern from a neighboring file (e.g. `services.repository.ts`).
- All new routes require `authenticate` + `authorize('ADMIN')`, matching every other `/services/*` admin route in `services.routes.ts`.
- No new abstractions beyond what's specified below (no CRUD dashboard, no audit log — explicitly out of scope for this plan).
- Run `npx tsc --noEmit` in `apps/backend` and in `medisdiana-landing` after each task that touches that side — zero new errors is the bar.

---

## File Structure

**Backend (new):**
- `apps/backend/migrations/021_cups_classification_system.sql` — schema
- `apps/backend/src/scripts/xlsx-cups-reader.ts` — shared Excel-parsing helper (reused by import + all 4 generation scripts)
- `apps/backend/src/scripts/import-cups-catalog.ts` — loads `cups_catalog`
- `apps/backend/src/scripts/generate-consulta-externa-classification.ts` — Grupo 01
- `apps/backend/src/scripts/generate-diagnostic-classification.ts` — Grupo 02
- `apps/backend/src/scripts/generate-internacion-classification.ts` — Grupo 03
- `apps/backend/src/scripts/generate-surgical-classification.ts` — Grupo 04
- `apps/backend/src/scripts/generate-urgencias-classification.ts` — Grupo 05
- `apps/backend/src/types/cups.types.ts` — shared types
- `apps/backend/src/repositories/cups.repository.ts`
- `apps/backend/src/controllers/cups.controller.ts`

**Backend (modified):**
- `apps/backend/package.json` — add `xlsx` dependency
- `apps/backend/src/routes/services.routes.ts` — wire 5 new routes

**Frontend (new):**
- `medisdiana-landing/src/components/admin/serviciosCatalogo.ts` — `GRUPOS`, `SUBGRUPOS`, `GRUPOS_DINAMICOS`
- `medisdiana-landing/src/components/admin/CupsMappingModal.tsx`

**Frontend (modified):**
- `medisdiana-landing/src/components/admin/servicioSchema.ts`
- `medisdiana-landing/src/components/admin/FormularioServicio.tsx`

---

## Execution order (for parallel dispatch)

```
Wave 1 (solo, blocking everything):        Task 1
Wave 2 (parallel, all only need Task 1):   Task 2, Task 3, Task 9, Task 10, Task 12
Wave 3 (parallel, need Task 2's data):     Task 4, Task 5, Task 6, Task 7, Task 8
Wave 4 (needs Tasks 3, 9, 10, 12):         Task 11
Wave 5 (needs everything):                 Task 13
```

Note Task 12 moved into Wave 2 (it only needs Task 3's routes to exist, not any generated data) so Task 11 — which imports Task 12's component — isn't blocked on it in Wave 4.

## Design notes needed by every task below

**Grupos (fixed, 6):**
```
01  Consulta externa
02  Apoyo diagnóstico y complementación terapéutica
03  Internación
04  Quirúrgico
05  Atención inmediata
06  Otros servicios
```

**Subgrupos (fixed, hardcoded in frontend `serviciosCatalogo.ts` AND used verbatim by the matching generation script — these must match exactly):**
```
Grupo 01: 0101 Atención domiciliaria, 0102 Consulta de primera vez,
          0103 Consulta de control o seguimiento, 0104 Interconsulta,
          0105 Junta médica, 0106 Manejo intrahospitalario,
          0107 Consulta de urgencias
Grupo 02: 0201 Diagnóstico, 0202 Complementación terapéutica
Grupo 03: 0301 Manejo intrahospitalario
Grupo 04: 0401 Sistema nervioso (chapters 01-05), 0402 Sistema endocrino (06-07),
          0403 Ojo (08-16), 0404 Oído (18-20), 0405 Nariz boca y faringe (21-29),
          0406 Sistema respiratorio (30-34), 0407 Sistema cardiovascular (35-39),
          0408 Sistema hemático y linfático (40-41), 0409 Sistema digestivo (42-54),
          0410 Sistema urinario (55-59), 0411 Órganos genitales masculinos (60-64),
          0412 Órganos genitales femeninos (65-71), 0413 Procedimientos obstétricos (72-75),
          0414 Sistema osteomuscular (76-84), 0415 Sistema tegumentario (85-86)
          (chapter = first 2 characters of cups_code; ranges are the standard
          ICD-9-CM Volume 3 procedure sections that CUPS inherits)
Grupo 05: 0501 Atención inicial de urgencias
Grupo 06: (none — hidden in the UI)
```

**Categoría/Subcategoría for Grupos 01-05**: always fetched from the backend (`GET /classification-categories`, `GET /classification-subcategories`) — never hardcoded in the frontend. `service_subcategory` is always the real `cups_code` (1:1), so its "name" is `cups_catalog.procedure_name` via join — never stored redundantly.

---

### Task 1: Database schema

**Files:**
- Create: `apps/backend/migrations/021_cups_classification_system.sql`
- Modify: `apps/backend/src/scripts/run-migration.ts`

**Interfaces:**
- Produces: tables `cups_catalog`, `service_classification_cups_map`, `service_classification_categories`; backfilled `service_catalog.category_group` (2-char codes).

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- Migration 021: CUPS Classification System
-- ============================================================

CREATE TABLE IF NOT EXISTS cups_catalog (
  cups_code       VARCHAR(10)  PRIMARY KEY,
  procedure_name  VARCHAR(255) NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_classification_categories (
  service_group     VARCHAR(10)  NOT NULL,
  service_subgroup  VARCHAR(10)  NOT NULL,
  service_category  VARCHAR(10)  NOT NULL,
  category_name     VARCHAR(255) NOT NULL,
  PRIMARY KEY (service_group, service_subgroup, service_category)
);

CREATE TABLE IF NOT EXISTS service_classification_cups_map (
  id                   BIGSERIAL PRIMARY KEY,
  service_group        VARCHAR(10) NOT NULL,
  service_subgroup     VARCHAR(10) NOT NULL,
  service_category     VARCHAR(10) NOT NULL,
  service_subcategory  VARCHAR(10) NOT NULL,
  cups_code            VARCHAR(10) NOT NULL REFERENCES cups_catalog(cups_code),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (service_group, service_subgroup, service_category, service_subcategory, cups_code)
);

CREATE INDEX IF NOT EXISTS idx_cups_map_lookup
  ON service_classification_cups_map (service_group, service_subgroup, service_category, service_subcategory)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_cups_map_group_subgroup
  ON service_classification_cups_map (service_group, service_subgroup)
  WHERE is_active = TRUE;

-- Normalize existing service_catalog rows: '01 Consulta externa' -> '01'
UPDATE service_catalog
SET category_group = LEFT(category_group, 2)
WHERE category_group IS NOT NULL AND LENGTH(category_group) > 2;
```

- [ ] **Step 2: Apply the migration**

This repo's convention (confirmed from `apps/backend/src/scripts/run-migration.ts`, which already runs migrations 011, 018, 019, 020 this exact way) is to append a new block to `setupDatabase()` in that file, then run the whole script. Add this block right after the migration 020 block (before the final `console.log('\n🌟 MIGRATIONS COMPLETE! 🌟');`):

```typescript
    // Run migration 021
    console.log('🔄 Running migration 021 (CUPS Classification System)...');
    const sql021 = fs.readFileSync(
      path.resolve('migrations', '021_cups_classification_system.sql'),
      'utf8'
    );
    await pool.query(sql021);
    console.log('✅ Migration 021 successful!');
```

Then run:
```bash
cd apps/backend && npx tsx src/scripts/run-migration.ts
```

All statements in the migration use `CREATE TABLE IF NOT EXISTS` and the `UPDATE` backfill is naturally idempotent (re-running it after codes are already 2 chars is a no-op due to the `LENGTH(category_group) > 2` guard), so re-running the whole script is safe.

- [ ] **Step 3: Verify**

Run: `psql "$DATABASE_URL" -c "\d cups_catalog" -c "\d service_classification_cups_map" -c "\d service_classification_categories"`
Expected: all three tables exist with the columns above.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/migrations/021_cups_classification_system.sql apps/backend/src/scripts/run-migration.ts
git commit -m "feat(db): add CUPS classification schema (migration 021)"
```

---

### Task 2: Excel reader helper + catalog import script

**Files:**
- Create: `apps/backend/src/scripts/xlsx-cups-reader.ts`
- Create: `apps/backend/src/scripts/import-cups-catalog.ts`
- Modify: `apps/backend/package.json` (add `xlsx` dependency)

**Interfaces:**
- Produces: `readCupsRows(filePath: string): CupsRow[]` where
  `interface CupsRow { cupsCode: string; procedureName: string; seccion: string; quirurgico: 'S' | 'N'; estancia: string }` — used by this task's import script AND by all 4 generation scripts in later tasks.
- Consumes: nothing (first data task, only needs Task 1's tables).

- [ ] **Step 1: Add the `xlsx` dependency**

```bash
cd apps/backend && npm install xlsx
```

- [ ] **Step 2: Write the shared reader**

```typescript
// apps/backend/src/scripts/xlsx-cups-reader.ts
import * as XLSX from 'xlsx';

export interface CupsRow {
  cupsCode: string;
  procedureName: string;
  seccion: string;
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
    const cupsCode = String(fila[1] ?? '').trim().toUpperCase(); // CUPS codes are always stored/compared uppercase
    const procedureNameRaw = String(fila[2] ?? '').trim();
    if (!cupsCode || !procedureNameRaw) continue;
    rows.push({
      cupsCode,
      procedureName: toSentenceCase(procedureNameRaw),
      seccion: String(fila[3] ?? '').trim(),
      quirurgico: (String(fila[5] ?? '').trim().toUpperCase() === 'S' ? 'S' : 'N'),
      estancia: String(fila[10] ?? '').trim(),
    });
  }
  return rows;
}
```

- [ ] **Step 3: Write the import script**

```typescript
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
```

- [ ] **Step 4: Run it against the real file**

```bash
cd apps/backend && npx tsx src/scripts/import-cups-catalog.ts "C:\Users\julie\Downloads\Proyectos_Trabajo\codigos _cups.xlsx"
```

Expected: completes without error, ends with `Listo. <N> códigos CUPS en catálogo.` where N is close to 13,640.

- [ ] **Step 5: Verify**

Run: `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM cups_catalog"`
Expected: count matches the number reported by the script. Spot check: `SELECT * FROM cups_catalog WHERE cups_code = '890201'` returns "Consulta de primera vez por medicina general" (sentence-cased).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/package.json apps/backend/package-lock.json apps/backend/src/scripts/xlsx-cups-reader.ts apps/backend/src/scripts/import-cups-catalog.ts
git commit -m "feat(cups): import official CUPS catalog from Excel"
```

---

### Task 3: Backend API (repository + controller + routes) — parallelizable with Tasks 2, 4-8

**Files:**
- Create: `apps/backend/src/types/cups.types.ts`
- Create: `apps/backend/src/repositories/cups.repository.ts`
- Create: `apps/backend/src/controllers/cups.controller.ts`
- Modify: `apps/backend/src/routes/services.routes.ts`

**Interfaces:**
- Consumes: `pool` from `@config/database.js` (same as every other repository); tables from Task 1 (does NOT need Task 2's data — this task seeds its own fixture rows for testing).
- Produces: `CupsRepository.findByClassification`, `.listCategories`, `.listSubcategories`, `.listCatalog`, `.createMapping` — consumed by Task 11/12's frontend fetch calls via the HTTP routes below.

- [ ] **Step 1: Types**

```typescript
// apps/backend/src/types/cups.types.ts
export interface CupsLookupParams {
  serviceGroup: string;
  serviceSubgroup: string;
  serviceCategory: string;
  serviceSubcategory: string;
}

export interface CupsCandidate {
  cupsCode: string;
  procedureName: string;
}

export type CupsLookupResult =
  | { match: 'unique'; cupsCode: string; procedureName: string }
  | { match: 'ambiguous'; candidates: CupsCandidate[] };

export interface ClassificationCategory {
  serviceCategory: string;
  categoryName: string;
}

export interface ClassificationSubcategory {
  serviceSubcategory: string;
  procedureName: string;
}

export interface CreateMappingDTO {
  serviceGroup: string;
  serviceSubgroup: string;
  serviceCategory: string;
  serviceSubcategory: string;
  cupsCode: string;
}
```

- [ ] **Step 2: Repository**

```typescript
// apps/backend/src/repositories/cups.repository.ts
import { pool } from '@config/database.js';
import type {
  CupsLookupResult, ClassificationCategory, ClassificationSubcategory,
  CreateMappingDTO, CupsCandidate,
} from '../types/cups.types.js';

export const CupsRepository = {
  async findByClassification(
    serviceGroup: string, serviceSubgroup: string, serviceCategory: string, serviceSubcategory: string
  ): Promise<CupsLookupResult | null> {
    const { rows } = await pool.query<{ cups_code: string; procedure_name: string }>(
      `SELECT DISTINCT m.cups_code, c.procedure_name
       FROM service_classification_cups_map m
       JOIN cups_catalog c ON c.cups_code = m.cups_code
       WHERE m.service_group = $1 AND m.service_subgroup = $2
         AND m.service_category = $3 AND m.service_subcategory = $4
         AND m.is_active = TRUE AND c.is_active = TRUE`,
      [serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory]
    );
    if (rows.length === 0) return null;
    if (rows.length === 1) {
      return { match: 'unique', cupsCode: rows[0].cups_code, procedureName: rows[0].procedure_name };
    }
    const candidates: CupsCandidate[] = rows.map(r => ({ cupsCode: r.cups_code, procedureName: r.procedure_name }));
    return { match: 'ambiguous', candidates };
  },

  async listCategories(serviceGroup: string, serviceSubgroup: string): Promise<ClassificationCategory[]> {
    const { rows } = await pool.query<{ service_category: string; category_name: string }>(
      `SELECT service_category, category_name
       FROM service_classification_categories
       WHERE service_group = $1 AND service_subgroup = $2
       ORDER BY category_name`,
      [serviceGroup, serviceSubgroup]
    );
    return rows.map(r => ({ serviceCategory: r.service_category, categoryName: r.category_name }));
  },

  async listSubcategories(serviceGroup: string, serviceSubgroup: string, serviceCategory: string): Promise<ClassificationSubcategory[]> {
    const { rows } = await pool.query<{ service_subcategory: string; procedure_name: string }>(
      `SELECT DISTINCT m.service_subcategory, c.procedure_name
       FROM service_classification_cups_map m
       JOIN cups_catalog c ON c.cups_code = m.cups_code
       WHERE m.service_group = $1 AND m.service_subgroup = $2 AND m.service_category = $3
         AND m.is_active = TRUE AND c.is_active = TRUE
       ORDER BY c.procedure_name`,
      [serviceGroup, serviceSubgroup, serviceCategory]
    );
    return rows.map(r => ({ serviceSubcategory: r.service_subcategory, procedureName: r.procedure_name }));
  },

  async listCatalog(): Promise<CupsCandidate[]> {
    const { rows } = await pool.query<{ cups_code: string; procedure_name: string }>(
      `SELECT cups_code, procedure_name FROM cups_catalog WHERE is_active = TRUE ORDER BY cups_code`
    );
    return rows.map(r => ({ cupsCode: r.cups_code, procedureName: r.procedure_name }));
  },

  async createMapping(dto: CreateMappingDTO): Promise<{ id: number }> {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO service_classification_cups_map
         (service_group, service_subgroup, service_category, service_subcategory, cups_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (service_group, service_subgroup, service_category, service_subcategory, cups_code)
       DO UPDATE SET is_active = TRUE
       RETURNING id`,
      [dto.serviceGroup, dto.serviceSubgroup, dto.serviceCategory, dto.serviceSubcategory, dto.cupsCode]
    );
    return rows[0];
  },
};
```

- [ ] **Step 3: Controller**

```typescript
// apps/backend/src/controllers/cups.controller.ts
import type { Request, Response } from 'express';
import { CupsRepository } from '@repositories/cups.repository.js';

export async function lookupCups(req: Request, res: Response): Promise<void> {
  const { serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory } = req.query;
  if (!serviceGroup || !serviceSubgroup || !serviceCategory || !serviceSubcategory) {
    res.status(400).json({ success: false, error: 'Faltan parámetros de clasificación.' });
    return;
  }
  const result = await CupsRepository.findByClassification(
    String(serviceGroup), String(serviceSubgroup), String(serviceCategory), String(serviceSubcategory)
  );
  if (!result) {
    res.status(404).json({ success: false, error: 'No existe un mapeo CUPS para esta clasificación.' });
    return;
  }
  res.status(200).json({ success: true, data: result });
}

export async function listClassificationCategories(req: Request, res: Response): Promise<void> {
  const { serviceGroup, serviceSubgroup } = req.query;
  if (!serviceGroup || !serviceSubgroup) {
    res.status(400).json({ success: false, error: 'Faltan parámetros.' });
    return;
  }
  const categories = await CupsRepository.listCategories(String(serviceGroup), String(serviceSubgroup));
  res.status(200).json({ success: true, data: categories });
}

export async function listClassificationSubcategories(req: Request, res: Response): Promise<void> {
  const { serviceGroup, serviceSubgroup, serviceCategory } = req.query;
  if (!serviceGroup || !serviceSubgroup || !serviceCategory) {
    res.status(400).json({ success: false, error: 'Faltan parámetros.' });
    return;
  }
  const subcategories = await CupsRepository.listSubcategories(String(serviceGroup), String(serviceSubgroup), String(serviceCategory));
  res.status(200).json({ success: true, data: subcategories });
}

export async function listCupsCatalog(_req: Request, res: Response): Promise<void> {
  const catalog = await CupsRepository.listCatalog();
  res.status(200).json({ success: true, data: catalog });
}

export async function createCupsMapping(req: Request, res: Response): Promise<void> {
  const { serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode } = req.body;
  if (!serviceGroup || !serviceSubgroup || !serviceCategory || !serviceSubcategory || !cupsCode) {
    res.status(400).json({ success: false, error: 'Faltan campos obligatorios.' });
    return;
  }
  const created = await CupsRepository.createMapping({ serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode });
  res.status(201).json({ success: true, data: created });
}
```

- [ ] **Step 4: Wire routes**

In `apps/backend/src/routes/services.routes.ts`, add to the imports from `@controllers/services.controller.js` block a new separate import, and register routes (follow the exact `authenticate, authorize('ADMIN')` pattern already used for `createOffer` etc. in this file):

```typescript
import {
  lookupCups, listClassificationCategories, listClassificationSubcategories,
  listCupsCatalog, createCupsMapping,
} from '@controllers/cups.controller.js';
```

```typescript
router.get('/cups-lookup', authenticate, authorize('ADMIN'), lookupCups);
router.get('/classification-categories', authenticate, authorize('ADMIN'), listClassificationCategories);
router.get('/classification-subcategories', authenticate, authorize('ADMIN'), listClassificationSubcategories);
router.get('/cups-catalog', authenticate, authorize('ADMIN'), listCupsCatalog);
router.post('/cups-mappings', authenticate, authorize('ADMIN'), createCupsMapping);
```

- [ ] **Step 5: Manual verification with fixture data**

```bash
psql "$DATABASE_URL" -c "
INSERT INTO cups_catalog (cups_code, procedure_name) VALUES ('999999','Prueba de plan') ON CONFLICT DO NOTHING;
INSERT INTO service_classification_categories (service_group, service_subgroup, service_category, category_name)
  VALUES ('99','9901','01','Categoría de prueba') ON CONFLICT DO NOTHING;
INSERT INTO service_classification_cups_map (service_group, service_subgroup, service_category, service_subcategory, cups_code)
  VALUES ('99','9901','01','999999','999999') ON CONFLICT DO NOTHING;
"
```

Start the backend dev server, then:
```bash
curl -s "http://localhost:PORT/api/services/cups-lookup?serviceGroup=99&serviceSubgroup=9901&serviceCategory=01&serviceSubcategory=999999" -H "Authorization: Bearer <admin-token>"
```
Expected: `{"success":true,"data":{"match":"unique","cupsCode":"999999","procedureName":"Prueba de plan"}}`

Clean up the fixture rows afterward:
```bash
psql "$DATABASE_URL" -c "DELETE FROM service_classification_cups_map WHERE service_group='99'; DELETE FROM service_classification_categories WHERE service_group='99'; DELETE FROM cups_catalog WHERE cups_code='999999';"
```

- [ ] **Step 6: Type-check**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/types/cups.types.ts apps/backend/src/repositories/cups.repository.ts apps/backend/src/controllers/cups.controller.ts apps/backend/src/routes/services.routes.ts
git commit -m "feat(cups): add classification lookup API"
```

---

### Task 4: Generate Grupo 01 — Consulta externa (mechanical) — parallelizable with Tasks 3, 5-8 (after Task 2)

**Files:**
- Create: `apps/backend/src/scripts/generate-consulta-externa-classification.ts`

**Interfaces:**
- Consumes: `readCupsRows` from Task 2's `xlsx-cups-reader.ts`; requires Task 2's import to have run (FK on `cups_code`).
- Produces: rows in `service_classification_categories` and `service_classification_cups_map` for `service_group='01'`.

- [ ] **Step 1: Write the script**

```typescript
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
      especialidadNames.set(especialidadCode, r.procedureName.substring(PREFIX_02.length));
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
  for (const [tipoCode, tipoName] of Object.entries(TIPOS)) {
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
```

Note: `service_category` here is the especialidad code (e.g. `'01'`, `'63'`) and `service_subcategory` is the real `cups_code` itself (e.g. `'890201'`) — matching the 1:1 subcategory=cups_code convention. Since both `service_subcategory` and `cups_code` columns hold the same value in this row, the FK is trivially satisfied.

- [ ] **Step 2: Run it**

```bash
cd apps/backend && npx tsx src/scripts/generate-consulta-externa-classification.ts "C:\Users\julie\Downloads\Proyectos_Trabajo\codigos _cups.xlsx"
```

Expected: prints a count of consultation codes found (should be in the low hundreds) and ends with the categories/mappings summary.

- [ ] **Step 3: Verify**

Run: `psql "$DATABASE_URL" -c "SELECT service_subgroup, COUNT(*) FROM service_classification_cups_map WHERE service_group='01' GROUP BY service_subgroup ORDER BY 1"`
Expected: 7 rows (one per tipo `0101`..`0107`), each with a plausible count of specialties.

Spot check: `SELECT * FROM service_classification_cups_map WHERE service_group='01' AND service_category='01' AND service_subcategory='890201'` returns exactly 1 row.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/generate-consulta-externa-classification.ts
git commit -m "feat(cups): generate Grupo 01 (Consulta externa) classification"
```

---

### Task 5: Generate Grupo 02 — Apoyo diagnóstico (mechanical) — parallelizable with Tasks 3, 4, 6-8

**Files:**
- Create: `apps/backend/src/scripts/generate-diagnostic-classification.ts`

**Interfaces:**
- Consumes: `readCupsRows` from Task 2.
- Produces: rows for `service_group='02'`.

- [ ] **Step 1: Write the script**

```typescript
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
```

- [ ] **Step 2: Run it**

```bash
cd apps/backend && npx tsx src/scripts/generate-diagnostic-classification.ts "C:\Users\julie\Downloads\Proyectos_Trabajo\codigos _cups.xlsx"
```

Expected: ~2,700-2,800 codes found, 12 categories, matching count of mappings.

- [ ] **Step 3: Verify**

Run: `psql "$DATABASE_URL" -c "SELECT service_subgroup, COUNT(DISTINCT service_category) FROM service_classification_cups_map WHERE service_group='02' GROUP BY 1"`
Expected: `0201` with 6 categories, `0202` with 6 categories.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/generate-diagnostic-classification.ts
git commit -m "feat(cups): generate Grupo 02 (Apoyo diagnóstico) classification"
```

---

### Task 6: Generate Grupo 04 — Quirúrgico (mechanical, largest) — parallelizable with Tasks 3-5, 7-8

**Files:**
- Create: `apps/backend/src/scripts/generate-surgical-classification.ts`

**Interfaces:**
- Consumes: `readCupsRows` from Task 2.
- Produces: rows for `service_group='04'`.

- [ ] **Step 1: Write the script**

The 15 subgroups (standard ICD-9-CM Vol.3 sections 1-15) are fixed and given below. The category name per individual 2-digit chapter is NOT hand-typed here — the script derives a working name automatically from the most common leading words across that chapter's procedure names (deterministic, no manual guessing), which is good enough since the *subgroup* (anatomical system) is what the RIPS classification actually cares about; the chapter-level name is a finer label for UX only.

```typescript
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
```

- [ ] **Step 2: Run it**

```bash
cd apps/backend && npx tsx src/scripts/generate-surgical-classification.ts "C:\Users\julie\Downloads\Proyectos_Trabajo\codigos _cups.xlsx"
```

Expected: ~9,200+ codes found, roughly 80-99 categories (one per chapter present), a handful of skipped chapters reported.

- [ ] **Step 3: Verify**

Run: `psql "$DATABASE_URL" -c "SELECT service_subgroup, COUNT(DISTINCT service_category) cats, COUNT(*) codes FROM service_classification_cups_map WHERE service_group='04' GROUP BY 1 ORDER BY 1"`
Expected: 15 distinct subgroups, total codes close to what Step 2 reported.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/generate-surgical-classification.ts
git commit -m "feat(cups): generate Grupo 04 (Quirúrgico) classification"
```

---

### Task 7: Generate Grupo 03 — Internación (curated) — parallelizable with Tasks 3-6, 8

**Files:**
- Create: `apps/backend/src/scripts/generate-internacion-classification.ts`

**Interfaces:**
- Consumes: `readCupsRows` from Task 2.
- Produces: rows for `service_group='03'` — a small curated set (~5 categories), NOT the full 1,938-row `estancia='H'` universe (that's the raw candidate pool, not the target — matches what the reference project did, per design spec Part 2).

- [ ] **Step 1: Write the script**

```typescript
// apps/backend/src/scripts/generate-internacion-classification.ts
import { pool } from '@config/database.js';
import { readCupsRows, type CupsRow } from './xlsx-cups-reader.js';

// Curated: 5 categories of common hospitalization-management procedures, drawn from
// estancia='H' candidates, excluding consultation codes (already in Grupo 01) and
// excluding surgical codes (already in Grupo 04, quirurgico='S').
const CATEGORIES: { code: string; name: string; keyword: RegExp }[] = [
  { code: '01', name: 'Manejo médico intrahospitalario', keyword: /MANEJO|CUIDADO/i },
  { code: '02', name: 'Cuidados de enfermería', keyword: /ENFERMERIA/i },
  { code: '03', name: 'Nutrición hospitalaria', keyword: /NUTRICION/i },
  { code: '04', name: 'Terapia respiratoria hospitalaria', keyword: /RESPIRATORIA/i },
  { code: '05', name: 'Interconsulta hospitalaria', keyword: /INTERCONSULTA/i },
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
```

- [ ] **Step 2: Run it**

```bash
cd apps/backend && npx tsx src/scripts/generate-internacion-classification.ts "C:\Users\julie\Downloads\Proyectos_Trabajo\codigos _cups.xlsx"
```

Expected: prints candidate count (order of hundreds to ~1,900), then per-category match counts. If any category logs "0 coincidencias", that keyword needs adjusting against the real candidate list — inspect a sample with `candidates.filter(r => !CATEGORIES.some(c => c.keyword.test(r.procedureName))).slice(0,20)` added temporarily to the script to see what's left uncategorized, and adjust keywords, not just accept an empty category silently.

- [ ] **Step 3: Verify**

Run: `psql "$DATABASE_URL" -c "SELECT service_category, COUNT(*) FROM service_classification_cups_map WHERE service_group='03' GROUP BY 1 ORDER BY 1"`
Expected: up to 5 categories, none with 0 (categories with 0 matches should not have been inserted per Step 1's logic).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/generate-internacion-classification.ts
git commit -m "feat(cups): generate Grupo 03 (Internación) classification"
```

---

### Task 8: Generate Grupo 05 — Atención inmediata (curated) — parallelizable with Tasks 3-7

**Files:**
- Create: `apps/backend/src/scripts/generate-urgencias-classification.ts`

**Interfaces:**
- Consumes: `readCupsRows` from Task 2.
- Produces: rows for `service_group='05'` — small curated set (~5 categories), excludes `89-07-YY` (already Grupo 01 "Consulta de urgencias").

- [ ] **Step 1: Write the script**

```typescript
// apps/backend/src/scripts/generate-urgencias-classification.ts
import { pool } from '@config/database.js';
import { readCupsRows, type CupsRow } from './xlsx-cups-reader.js';

const CATEGORIES: { code: string; name: string; keyword: RegExp }[] = [
  { code: '01', name: 'Atención inicial de urgencias', keyword: /ATENCION INICIAL|ATENCION DE URGENCIA/i },
  { code: '02', name: 'Reanimación', keyword: /REANIMACION/i },
  { code: '03', name: 'Triage y clasificación', keyword: /TRIAGE|CLASIFICACION DE PACIENTE/i },
  { code: '04', name: 'Observación de urgencias', keyword: /OBSERVACION/i },
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
```

- [ ] **Step 2: Run it**

```bash
cd apps/backend && npx tsx src/scripts/generate-urgencias-classification.ts "C:\Users\julie\Downloads\Proyectos_Trabajo\codigos _cups.xlsx"
```

Expected: per-category match counts logged. If any category shows 0 matches, adjust that keyword against real data before accepting the result (same rule as Task 7 Step 2).

- [ ] **Step 3: Verify**

Run: `psql "$DATABASE_URL" -c "SELECT service_category, COUNT(*) FROM service_classification_cups_map WHERE service_group='05' GROUP BY 1 ORDER BY 1"`

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/generate-urgencias-classification.ts
git commit -m "feat(cups): generate Grupo 05 (Atención inmediata) classification"
```

---

### Task 9: Frontend catalog constants — parallelizable with Tasks 2-8

**Files:**
- Create: `medisdiana-landing/src/components/admin/serviciosCatalogo.ts`

**Interfaces:**
- Produces: `GRUPOS`, `SUBGRUPOS`, `GRUPOS_DINAMICOS` — consumed by Task 10 (`servicioSchema.ts`) and Task 11 (`FormularioServicio.tsx`).

- [ ] **Step 1: Write the file**

```typescript
// medisdiana-landing/src/components/admin/serviciosCatalogo.ts

export interface Grupo {
  code: string;
  name: string;
}

export const GRUPOS: Grupo[] = [
  { code: '01', name: 'Consulta externa' },
  { code: '02', name: 'Apoyo diagnóstico y complementación terapéutica' },
  { code: '03', name: 'Internación' },
  { code: '04', name: 'Quirúrgico' },
  { code: '05', name: 'Atención inmediata' },
  { code: '06', name: 'Otros servicios' },
];

export interface Subgrupo {
  code: string;
  name: string;
}

/** Subgrupo is always a small, fixed enumeration hardcoded here — Categoría/Subcategoría always come from the backend. */
export const SUBGRUPOS: Record<string, Subgrupo[]> = {
  '01': [
    { code: '0101', name: 'Atención domiciliaria' },
    { code: '0102', name: 'Consulta de primera vez' },
    { code: '0103', name: 'Consulta de control o seguimiento' },
    { code: '0104', name: 'Interconsulta' },
    { code: '0105', name: 'Junta médica' },
    { code: '0106', name: 'Manejo intrahospitalario' },
    { code: '0107', name: 'Consulta de urgencias' },
  ],
  '02': [
    { code: '0201', name: 'Diagnóstico' },
    { code: '0202', name: 'Complementación terapéutica' },
  ],
  '03': [
    { code: '0301', name: 'Manejo intrahospitalario' },
  ],
  '04': [
    { code: '0401', name: 'Sistema nervioso' },
    { code: '0402', name: 'Sistema endocrino' },
    { code: '0403', name: 'Ojo' },
    { code: '0404', name: 'Oído' },
    { code: '0405', name: 'Nariz, boca y faringe' },
    { code: '0406', name: 'Sistema respiratorio' },
    { code: '0407', name: 'Sistema cardiovascular' },
    { code: '0408', name: 'Sistema hemático y linfático' },
    { code: '0409', name: 'Sistema digestivo' },
    { code: '0410', name: 'Sistema urinario' },
    { code: '0411', name: 'Órganos genitales masculinos' },
    { code: '0412', name: 'Órganos genitales femeninos' },
    { code: '0413', name: 'Procedimientos obstétricos' },
    { code: '0414', name: 'Sistema osteomuscular' },
    { code: '0415', name: 'Sistema tegumentario' },
  ],
  '05': [
    { code: '0501', name: 'Atención inicial de urgencias' },
  ],
  '06': [],
};

/** Every non-escape group fetches Categoría/Subcategoría from the backend. */
export const GRUPOS_DINAMICOS = ['01', '02', '03', '04', '05'];
```

- [ ] **Step 2: Type-check**

Run: `cd medisdiana-landing && npx tsc --noEmit`
Expected: no new errors (this file has no consumers yet, so it can only fail on its own syntax).

- [ ] **Step 3: Commit**

```bash
git add medisdiana-landing/src/components/admin/serviciosCatalogo.ts
git commit -m "feat(cups): add frontend Grupo/Subgrupo catalog constants"
```

---

### Task 10: Update `servicioSchema.ts` — parallelizable with Tasks 2-9

**Files:**
- Modify: `medisdiana-landing/src/components/admin/servicioSchema.ts`

**Interfaces:**
- Consumes: nothing new (uses its own literal group codes, matching Task 9's `GRUPOS`).
- Produces: `RIPS_GRUPO_SERVICIO` (now 6 short codes), `servicioSchema` with the `06` escape-valve rule — consumed by Task 11.

- [ ] **Step 1: Replace `RIPS_GRUPO_SERVICIO` and the `superRefine` block**

In `medisdiana-landing/src/components/admin/servicioSchema.ts`, replace:

```typescript
export const RIPS_GRUPO_SERVICIO = [
  '01 Consulta externa',
  '02 Apoyo diagnóstico y complementación terapéutica',
  '03 Internación',
  '04 Quirúrgico',
  '05 Atención inmediata'
] as const;
```

with:

```typescript
export const RIPS_GRUPO_SERVICIO = ['01', '02', '03', '04', '05', '06'] as const;
```

Replace the field named `serviceCode` with `cups` throughout this file (rename, to match the plan's naming) — find `serviceCode: z.string().optional(), // CUPS` in `baseSchema` and rename to `cups: z.string().optional(), // CUPS`.

Replace the `servicioSchema` export:

```typescript
export const servicioSchema = baseSchema.superRefine((data, ctx) => {
  // Logic: "Si el grupo de servicio es 03, 04 y 05, no se diligencia el campo 5,6,7"
  const isGroup345 = ['03', '04', '05'].some(prefix => data.categoryGroup.startsWith(prefix));
  
  if (!isGroup345) {
    if (!data.subcategoryGroup) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El subgrupo es obligatorio para este grupo', path: ['subcategoryGroup'] });
    }
    if (!data.category) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La categoría es obligatoria para este grupo', path: ['category'] });
    }
    if (!data.subcategory) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La subcategoría es obligatoria para este grupo', path: ['subcategory'] });
    }
  }
});
```

with:

```typescript
export const servicioSchema = baseSchema.superRefine((data, ctx) => {
  const isEscapeGroup = data.categoryGroup === '06';

  if (!isEscapeGroup) {
    if (!data.subcategoryGroup) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El subgrupo es obligatorio para este grupo', path: ['subcategoryGroup'] });
    }
    if (!data.category) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La categoría es obligatoria para este grupo', path: ['category'] });
    }
    if (!data.subcategory) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La subcategoría es obligatoria para este grupo', path: ['subcategory'] });
    }
    if (!data.cups || !/^[A-Za-z0-9]{6}$/.test(data.cups)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El código CUPS es obligatorio y debe tener 6 caracteres alfanuméricos', path: ['cups'] });
    }
  }
});
```

And update the `categoryGroup` field declaration in `baseSchema` from `z.enum(RIPS_GRUPO_SERVICIO, ...)` (unchanged mechanism, now validates against the 6 short codes instead of the 5 long strings) — no code change needed there beyond the constant itself already being replaced.

- [ ] **Step 2: Type-check**

Run: `cd medisdiana-landing && npx tsc --noEmit`
Expected: errors will appear in `FormularioServicio.tsx` (still referencing old field/constant names) — that's expected and gets fixed in Task 11. No errors should appear in `servicioSchema.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add medisdiana-landing/src/components/admin/servicioSchema.ts
git commit -m "feat(cups): switch categoryGroup to short codes, add cups validation"
```

---

### Task 11: Rewrite `FormularioServicio.tsx` cascading + CUPS lookup — depends on Tasks 3, 9, 10, 12 (Task 11 imports `CupsMappingModal` from Task 12 — do Task 12 first, they are NOT parallel with each other despite both depending on Task 3)

**Files:**
- Modify: `medisdiana-landing/src/components/admin/FormularioServicio.tsx`
- Modify: `medisdiana-landing/src/components/admin/ServiciosDashboard.tsx:355,359,407` (parent component — reads/writes the `serviceCode`/`categoryGroup` fields being renamed; must be fixed in the same task or the form silently breaks end-to-end)

**Interfaces:**
- Consumes: `GRUPOS`, `SUBGRUPOS`, `GRUPOS_DINAMICOS` (Task 9); `servicioSchema`, `RIPS_GRUPO_SERVICIO` (Task 10); `GET /api/services/cups-lookup`, `GET /api/services/classification-categories`, `GET /api/services/classification-subcategories` (Task 3).
- Produces: renders `<CupsMappingModal>` (Task 12) when lookup is not-found — Task 12 must expose `{ serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, onClose, onCreated }` props.

**Important — parent wiring fix (do this first, it's easy to miss):** `ServiciosDashboard.tsx` reads and writes the exact form field being renamed (`serviceCode` → `cups`) and has a stale default value for the old long-string `categoryGroup`. In `medisdiana-landing/src/components/admin/ServiciosDashboard.tsx`:

- Line 355: change
  ```typescript
  categoryGroup: (cat.categoryGroup || '01 Consulta externa') as typeof import('./servicioSchema').RIPS_GRUPO_SERVICIO[number],
  ```
  to
  ```typescript
  categoryGroup: (cat.categoryGroup || '01') as typeof import('./servicioSchema').RIPS_GRUPO_SERVICIO[number],
  ```
- Line 359: change `serviceCode: cat.serviceCode || '',` to `cups: cat.serviceCode || '',` (the backend/DB column is still called `service_code` via `ServiceCatalogRepository` — only the frontend form field is renamed).
- Line 407 (inside `handleFormSuccess`): change `serviceCode: data.serviceCode,` to `serviceCode: data.cups,` (translates the renamed form field back to the payload key the backend already expects — do not rename the payload key itself, `ServiceCatalogRepository.create/update` still reads `data.serviceCode` server-side).

Skipping this makes every service save silently send `serviceCode: undefined` to the backend — verify with Task 13's E2E check.

- [ ] **Step 1: Replace the import of `RIPS_GRUPO_SERVICIO` etc.**

Replace:
```typescript
import {
  servicioSchema, RIPS_GRUPO_SERVICIO, RIPS_MODALIDAD, tipoAtencionEnum
} from './servicioSchema';
```
with:
```typescript
import {
  servicioSchema, RIPS_MODALIDAD, tipoAtencionEnum
} from './servicioSchema';
import { GRUPOS, SUBGRUPOS, GRUPOS_DINAMICOS } from './serviciosCatalogo';
import { CupsMappingModal } from './CupsMappingModal';
```

- [ ] **Step 2: Replace the auto-calculate CUPS effect with lookup state + effect**

Remove the existing block (currently around line 121-134):
```typescript
  // 6. Auto-calculate CUPS
  const isMounted = React.useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      if (initialData?.serviceCode) return;
    }
    if (categoryGroup) {
      const code = `${categoryGroup.substring(0, 2)}${subcategoryGroup ? subcategoryGroup.substring(0, 2) : ''}${category ? category.substring(0, 2) : ''}${subcategory ? subcategory.substring(0, 2) : ''}`.toUpperCase().replace(/\s/g, '');
      setValue('serviceCode', code, { shouldValidate: true });
    }
  }, [categoryGroup, subcategoryGroup, category, subcategory, setValue]);

  const isGroup345 = categoryGroup && ['03', '04', '05'].some(prefix => categoryGroup.startsWith(prefix));
```

Replace with:

```typescript
  const isEscapeGroup = categoryGroup === '06';
  const isDynamicGroup = categoryGroup ? GRUPOS_DINAMICOS.includes(categoryGroup) : false;

  const [categoryOptions, setCategoryOptions] = useState<{ serviceCategory: string; categoryName: string }[]>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<{ serviceSubcategory: string; procedureName: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [cupsLookupState, setCupsLookupState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'unique'; procedureName: string }
    | { status: 'ambiguous'; candidates: { cupsCode: string; procedureName: string }[] }
    | { status: 'not-found' }
  >({ status: 'idle' });
  const [showMappingModal, setShowMappingModal] = useState(false);
  const cupsTouchedRef = useRef(false);

  function authHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Fetch Categoría options when Grupo/Subgrupo change (dynamic groups only)
  useEffect(() => {
    if (!isDynamicGroup || !categoryGroup || !subcategoryGroup) { setCategoryOptions([]); return; }
    setLoadingCategories(true);
    fetch(`/api/services/classification-categories?serviceGroup=${categoryGroup}&serviceSubgroup=${subcategoryGroup}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { if (j.success) setCategoryOptions(j.data); })
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, [isDynamicGroup, categoryGroup, subcategoryGroup]);

  // Fetch Subcategoría options when Categoría changes
  useEffect(() => {
    if (!isDynamicGroup || !categoryGroup || !subcategoryGroup || !category) { setSubcategoryOptions([]); return; }
    setLoadingSubcategories(true);
    fetch(`/api/services/classification-subcategories?serviceGroup=${categoryGroup}&serviceSubgroup=${subcategoryGroup}&serviceCategory=${category}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { if (j.success) setSubcategoryOptions(j.data); })
      .catch(() => {})
      .finally(() => setLoadingSubcategories(false));
  }, [isDynamicGroup, categoryGroup, subcategoryGroup, category]);

  const runCupsLookup = React.useCallback(() => {
    if (isEscapeGroup || !categoryGroup || !subcategoryGroup || !category || !subcategory) {
      setCupsLookupState({ status: 'idle' });
      return;
    }
    setCupsLookupState({ status: 'loading' });
    fetch(`/api/services/cups-lookup?serviceGroup=${categoryGroup}&serviceSubgroup=${subcategoryGroup}&serviceCategory=${category}&serviceSubcategory=${subcategory}`, { headers: authHeaders() })
      .then(async r => {
        if (r.status === 404) { setCupsLookupState({ status: 'not-found' }); return; }
        const j = await r.json();
        if (j.data.match === 'unique') {
          setValue('cups', j.data.cupsCode, { shouldValidate: true });
          if (!cupsTouchedRef.current && !watch('serviceName')) {
            setValue('serviceName', j.data.procedureName);
          }
          setCupsLookupState({ status: 'unique', procedureName: j.data.procedureName });
        } else {
          setCupsLookupState({ status: 'ambiguous', candidates: j.data.candidates });
        }
      })
      .catch(() => setCupsLookupState({ status: 'not-found' }));
  }, [isEscapeGroup, categoryGroup, subcategoryGroup, category, subcategory, setValue, watch]);

  useEffect(() => { runCupsLookup(); }, [runCupsLookup]);

  const subgrupoOptions = categoryGroup ? (SUBGRUPOS[categoryGroup] ?? []) : [];
```

- [ ] **Step 3: Replace the classification fields JSX**

Replace the existing block (the `Grupo de servicio` / `Subgrupo` / `Categoría` / `Subcategoría` / `Código CUPS` `InputField`s):

```jsx
            <InputField label="Grupo de servicio" required icon={Box} error={errors.categoryGroup}>
              <select {...register('categoryGroup')} style={inlineInputStyle} className={FOCUS_RING}>
                <option value="">Selecciona el grupo...</option>
                {RIPS_GRUPO_SERVICIO.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </InputField>
            <InputField label="Subgrupo" icon={Box} error={errors.subcategoryGroup}>
              <input {...register('subcategoryGroup')} placeholder="Elige un subgrupo" disabled={isGroup345} style={{ ...inlineInputStyle, background: isGroup345 ? '#F1F5F9' : C.bgPanel }} className={FOCUS_RING} />
            </InputField>
            <InputField label="Categoría" icon={Tag} error={errors.category}>
              <input {...register('category')} placeholder="Elige una categoría" disabled={isGroup345} style={{ ...inlineInputStyle, background: isGroup345 ? '#F1F5F9' : C.bgPanel }} className={FOCUS_RING} />
            </InputField>
            <InputField label="Subcategoría" icon={Tag} error={errors.subcategory}>
              <input {...register('subcategory')} placeholder="Elige una subcategoría" disabled={isGroup345} style={{ ...inlineInputStyle, background: isGroup345 ? '#F1F5F9' : C.bgPanel }} className={FOCUS_RING} />
            </InputField>
            <InputField label="Código CUPS" required icon={Box} error={errors.serviceCode}>
              <input {...register('serviceCode')} placeholder="Ej. 890201" style={inlineInputStyle} className={FOCUS_RING} />
            </InputField>
```

with:

```jsx
            <InputField label="Grupo de servicio" required icon={Box} error={errors.categoryGroup}>
              <select {...register('categoryGroup')} style={inlineInputStyle} className={FOCUS_RING}>
                <option value="">Selecciona el grupo...</option>
                {GRUPOS.map(g => <option key={g.code} value={g.code}>{g.code} {g.name}</option>)}
              </select>
            </InputField>
            {!isEscapeGroup && (
              <>
                <InputField label="Subgrupo" required icon={Box} error={errors.subcategoryGroup}>
                  <select {...register('subcategoryGroup')} style={inlineInputStyle} className={FOCUS_RING} disabled={!categoryGroup}>
                    <option value="">Elige un subgrupo...</option>
                    {subgrupoOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </InputField>
                <InputField label="Categoría" required icon={Tag} error={errors.category}>
                  <select {...register('category')} style={inlineInputStyle} className={FOCUS_RING} disabled={!subcategoryGroup || loadingCategories}>
                    <option value="">{loadingCategories ? 'Cargando...' : 'Elige una categoría...'}</option>
                    {categoryOptions.map(c => <option key={c.serviceCategory} value={c.serviceCategory}>{c.categoryName}</option>)}
                  </select>
                </InputField>
                <InputField label="Subcategoría" required icon={Tag} error={errors.subcategory}>
                  <select {...register('subcategory')} style={inlineInputStyle} className={FOCUS_RING} disabled={!category || loadingSubcategories}>
                    <option value="">{loadingSubcategories ? 'Cargando...' : 'Elige una subcategoría...'}</option>
                    {subcategoryOptions.map(s => <option key={s.serviceSubcategory} value={s.serviceSubcategory}>{s.procedureName}</option>)}
                  </select>
                </InputField>
                <div style={{ gridColumn: '1 / -1' }}>
                  <InputField label="Código CUPS" required icon={Box} error={cupsLookupState.status === 'not-found' ? errors.cups : undefined}>
                    <input
                      {...register('cups')}
                      readOnly
                      placeholder="Se completa automáticamente"
                      style={{ ...inlineInputStyle, background: '#F1F5F9' }}
                      className={FOCUS_RING}
                      onChange={() => { cupsTouchedRef.current = true; }}
                    />
                    {cupsLookupState.status === 'loading' && (
                      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Buscando código CUPS...</p>
                    )}
                    {cupsLookupState.status === 'ambiguous' && (
                      <select
                        style={{ ...inlineInputStyle, marginTop: 8 }}
                        className={FOCUS_RING}
                        onChange={e => setValue('cups', e.target.value, { shouldValidate: true })}
                      >
                        <option value="">Elige el procedimiento exacto...</option>
                        {cupsLookupState.candidates.map(c => (
                          <option key={c.cupsCode} value={c.cupsCode}>{c.cupsCode} — {c.procedureName}</option>
                        ))}
                      </select>
                    )}
                    {cupsLookupState.status === 'not-found' && (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
                          No existe un mapeo CUPS para esta clasificación todavía.
                        </p>
                        <button type="button" onClick={() => setShowMappingModal(true)}
                          style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.gold}`, background: 'transparent', color: C.gold, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                          Crear mapeo
                        </button>
                      </div>
                    )}
                  </InputField>
                </div>
              </>
            )}
```

- [ ] **Step 4: Render the mapping modal**

Near the end of the component's JSX (alongside other conditionally-rendered modals, or just before the closing `</form>`/wrapper if there are none), add:

```jsx
      {showMappingModal && categoryGroup && subcategoryGroup && category && subcategory && (
        <CupsMappingModal
          serviceGroup={categoryGroup}
          serviceSubgroup={subcategoryGroup}
          serviceCategory={category}
          serviceSubcategory={subcategory}
          onClose={() => setShowMappingModal(false)}
          onCreated={() => { setShowMappingModal(false); runCupsLookup(); }}
        />
      )}
```

- [ ] **Step 5: Fix remaining `serviceCode` references**

Search the file for any other remaining uses of `serviceCode` (the old field name) and rename to `cups` (`errors.serviceCode` → `errors.cups` if any remain, `initialData?.serviceCode` if any remain → `initialData?.cups`).

- [ ] **Step 6: Type-check**

Run: `cd medisdiana-landing && npx tsc --noEmit`
Expected: no errors (Task 12's `CupsMappingModal.tsx` must already exist — this task imports it).

- [ ] **Step 7: Commit**

```bash
git add medisdiana-landing/src/components/admin/FormularioServicio.tsx medisdiana-landing/src/components/admin/ServiciosDashboard.tsx
git commit -m "feat(cups): rewrite classification cascade to use real CUPS lookup"
```

---

### Task 12: `CupsMappingModal.tsx` — depends on Task 3 only (do this before Task 11)

**Files:**
- Create: `medisdiana-landing/src/components/admin/CupsMappingModal.tsx`

**Interfaces:**
- Consumes: `GET /api/services/cups-catalog`, `POST /api/services/cups-mappings` (Task 3).
- Produces: `<CupsMappingModal serviceGroup serviceSubgroup serviceCategory serviceSubcategory onClose onCreated />` — consumed by Task 11.

- [ ] **Step 1: Write the component**

```tsx
// medisdiana-landing/src/components/admin/CupsMappingModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';

interface CupsCandidate {
  cupsCode: string;
  procedureName: string;
}

interface Props {
  serviceGroup: string;
  serviceSubgroup: string;
  serviceCategory: string;
  serviceSubcategory: string;
  onClose: () => void;
  onCreated: () => void;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export const CupsMappingModal: React.FC<Props> = ({ serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, onClose, onCreated }) => {
  const [catalog, setCatalog] = useState<CupsCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/services/cups-catalog', { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { if (j.success) setCatalog(j.data); })
      .catch(() => setError('No se pudo cargar el catálogo CUPS.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim().length < 2 ? [] : catalog.filter(c =>
    c.cupsCode.includes(search.trim()) || c.procedureName.toUpperCase().includes(search.trim().toUpperCase())
  ).slice(0, 50);

  const selectCandidate = async (candidate: CupsCandidate) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/services/cups-mappings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode: candidate.cupsCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al crear el mapeo');
      onCreated();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Crear mapeo CUPS</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
            <Loader2 size={16} className="animate-spin" /> Cargando catálogo CUPS...
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por código o nombre del procedimiento..."
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1.5px solid #DDD6FE', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {search.trim().length < 2 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Escribe al menos 2 caracteres para buscar.</p>
              ) : filtered.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin resultados.</p>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.cupsCode}
                    disabled={saving}
                    onClick={() => selectCandidate(c)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F3F0FB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <strong>{c.cupsCode}</strong> — {c.procedureName}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `cd medisdiana-landing && npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add medisdiana-landing/src/components/admin/CupsMappingModal.tsx
git commit -m "feat(cups): add CupsMappingModal for on-the-fly mapping creation"
```

---

### Task 13: Final integration verification — depends on ALL previous tasks

**Files:** none (verification only)

- [ ] **Step 1: Full type-check both projects**

```bash
cd apps/backend && npx tsc --noEmit
cd ../../medisdiana-landing && npx tsc --noEmit
```

Expected: zero errors in both.

- [ ] **Step 2: Start backend + frontend dev servers**

Use the project's normal dev-start mechanism (check `flujo-de-trabajo.md` if unsure of the exact command).

- [ ] **Step 3: Manual E2E — Consulta externa (unique match)**

In the admin panel, Servicios → Nuevo Servicio → fill Sede/Espacio/Nombre → Grupo de servicio = "01 Consulta externa" → Subgrupo = "Consulta de primera vez" → Categoría = pick "Medicina general" (or whatever specialty name Task 4 produced) → Subcategoría should auto-select the single available option → confirm Código CUPS auto-fills with `890201` (or the analogous real code) and is read-only.

- [ ] **Step 4: Manual E2E — Not-found + create mapping**

Pick a Grupo/Subgrupo/Categoría/Subcategoría combination guaranteed to have no mapping (e.g. temporarily pick a Grupo 04 subgrupo/categoría combo not yet exercised, or delete one mapping row manually first). Confirm the "Crear mapeo" button appears, the modal opens, searching/selecting a real CUPS code from the catalog works, and after creation the CUPS field auto-fills without closing/reopening the form.

- [ ] **Step 5: Manual E2E — Grupo 06 escape valve**

Select Grupo de servicio = "06 Otros servicios" → confirm Subgrupo/Categoría/Subcategoría/Código CUPS all disappear and the form can be submitted without a CUPS code.

- [ ] **Step 6: Confirm existing services still load**

Open the edit flow for a service created before this change (from `service_catalog`) and confirm it doesn't crash (the backfilled `category_group` should now be a 2-char code that matches one of `GRUPOS`).

- [ ] **Step 7: Final commit (if any fixups were needed)**

```bash
git add -u
git commit -m "fix(cups): integration fixes found during E2E verification"
```
