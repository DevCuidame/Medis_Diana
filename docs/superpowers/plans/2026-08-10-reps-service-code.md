# Código de servicio REPS (habilitación) — Implementation Plan

> **Estado: completado (2026-08-10).** Task 1 (migración) ejecutada
> directamente. Tasks 2-4 despachadas como 3 subagentes en paralelo (un
> reintento tras denegaciones accidentales de permisos que mataron la
> primera tanda). Verificación final: suite backend 36/36 en verde,
> `tsc --noEmit` limpio en frontend y backend (salvo errores preexistentes
> no relacionados en `docAppointments.*`/`docServices.routes.ts`/
> `run-migration.ts`, confirmados con `git stash` contra HEAD limpio),
> y prueba manual end-to-end contra la BD real vía HTTP (`GET
> /services/reps-service-codes`, `POST`/`DELETE /services/offers` con
> `repsServiceCode`). Documentado en
> [arquitectura.md](../../../arquitectura.md#código-de-servicio-reps-habilitación--panel-admin-2026-08-10).
> Commits: `1fda7a3` (migración), `01fac53` (endpoint), `72bc388`
> (persistencia), `5915b4b` (frontend).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Código del servicio" (REPS habilitación) selector to the service-creation form, backed by a new DB table seeded from the official 157-row Excel reference table, filtered by the already-selected "Grupo de servicio".

**Architecture:** One new table (`reps_service_catalog`) seeded directly in its migration, one new read-only endpoint (`GET /services/reps-service-codes`) mirroring the existing `GET /services/cups-catalog` full-fetch pattern, a new nullable FK column on `service_catalog` wired into the existing catalog create/update repository methods, and a new form field in `FormularioServicio.tsx` filtered client-side by the selected group — placed right after "Código CUPS" and hidden for group `06`, exactly like the existing Subgrupo/Categoría/Subcategoría/CUPS fields.

**Tech Stack:** PostgreSQL (raw SQL via `pg`, no ORM), Express + TypeScript backend, React + Vite + react-hook-form + zod frontend, `node:test` for backend tests (no frontend test runner exists in this repo — verify frontend changes manually).

## Global Constraints

- No ORM — all DB access is raw SQL via the `pool` from `@config/database.js` (CLAUDE.md regla crítica #3).
- Migrations are idempotent and re-run in full on every `pnpm -F @medisdiana/backend migrate` (there is no migrations-applied tracking table) — every `CREATE TABLE`/`ALTER TABLE` must use `IF NOT EXISTS`, and the seed `INSERT` must use `ON CONFLICT ... DO UPDATE` so re-running the migration never errors or duplicates rows.
- New migration file: `apps/backend/migrations/025_reps_service_codes.sql`, and it must be added to `apps/backend/src/scripts/run-migration.ts` (migrations are not auto-discovered — each one is manually listed and run in that script).
- Naming: the new table/column are `reps_service_catalog` / `reps_service_code` — deliberately distinct from `service_catalog.service_code`, which already stores the **CUPS** code. Never call the new concept `service_code` or `serviceCode` alone (ambiguous with the existing CUPS field).
- No sync to CuidameDoc — its service model has no REPS-habilitación equivalent (only a generic `category` string), so `repsServiceCode` must NOT be added to `DOC_SYNC_RELEVANT_FIELDS` or `buildDocSyncParams`.
- Backend path aliases: `@config/*`, `@repositories/*`, `@controllers/*`, `@middleware/*` resolve via the existing `tsconfig`/`tsx` setup — follow the `.js`-suffixed ESM import style already used in every file this plan touches.
- Backend tests (`node:test`, run via `pnpm -F @medisdiana/backend test`) hit the real configured `DATABASE_URL` — no mocking of the DB layer, matching every existing test in `apps/backend/src/**/*.test.ts`.
- There is no frontend test runner configured anywhere in this repo (`medisdiana-landing` has no `test` script, no vitest config) — frontend tasks are verified manually via the dev server, not via new test infrastructure invented for this feature.

---

## Task 1: Database migration — `reps_service_catalog` table + seed + `service_catalog.reps_service_code`

**Files:**
- Create: `apps/backend/migrations/025_reps_service_codes.sql`
- Modify: `apps/backend/src/scripts/run-migration.ts`

**Interfaces:**
- Produces: table `reps_service_catalog(code VARCHAR(4) PK, name VARCHAR(255), service_group VARCHAR(10), is_active BOOLEAN)`, 154 active + 3 inactive rows (codes are 3-4 digits — `1101`-`1105` are the only 4-digit codes). Column `service_catalog.reps_service_code VARCHAR(4) REFERENCES reps_service_catalog(code)`, nullable.
- No code-level interface (pure SQL) — Tasks 2 and 3 depend on this table/column existing in the target database before their tests can pass.

- [ ] **Step 1: Write the migration file**

Create `apps/backend/migrations/025_reps_service_codes.sql` with this exact content:

```sql
-- ============================================================
-- Migration 025: REPS Service Codes (habilitación)
-- ============================================================
-- Catálogo oficial de servicios habilitables REPS (Resolución 3100),
-- distinto del código CUPS ya guardado en service_catalog.service_code.
-- Fuente: TablaReferencia_Servicios__1.xlsx (157 filas).

CREATE TABLE IF NOT EXISTS reps_service_catalog (
  code          VARCHAR(4)   PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  service_group VARCHAR(10)  NOT NULL,  -- '01'..'05', mismo dominio que category_group
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_reps_service_catalog_group
  ON reps_service_catalog (service_group)
  WHERE is_active = TRUE;

ALTER TABLE service_catalog
  ADD COLUMN IF NOT EXISTS reps_service_code VARCHAR(4) REFERENCES reps_service_catalog(code);

INSERT INTO reps_service_catalog (code, name, service_group, is_active) VALUES
  ('105', 'CUIDADO INTERMEDIO NEONATAL', '03', TRUE),
  ('106', 'CUIDADO INTERMEDIO PEDIATRICO', '03', TRUE),
  ('107', 'CUIDADO INTERMEDIO ADULTOS', '03', TRUE),
  ('108', 'CUIDADO INTENSIVO NEONATAL', '03', TRUE),
  ('109', 'CUIDADO INTENSIVO PEDIATRICO', '03', TRUE),
  ('110', 'CUIDADO INTENSIVO ADULTOS', '03', TRUE),
  ('1101', 'ATENCION DEL PARTO', '05', TRUE),
  ('1102', 'URGENCIAS', '05', TRUE),
  ('1103', 'TRANSPORTE ASISTENCIAL BASICO', '05', FALSE),
  ('1104', 'TRANSPORTE ASISTENCIAL MEDICALIZADO', '05', FALSE),
  ('1105', 'ATENCION PREHOSPITALARIA', '05', FALSE),
  ('120', 'CUIDADO BASICO NEONATAL', '03', TRUE),
  ('129', 'HOSPITALIZACION ADULTOS', '03', TRUE),
  ('130', 'HOSPITALIZACION PEDIATRICA', '03', TRUE),
  ('131', 'HOSPITALIZACION EN SALUD MENTAL', '03', TRUE),
  ('132', 'HOSPITALIZACION PARCIAL', '03', TRUE),
  ('133', 'HOSPITALIZACION PACIENTE CRONICO CON VENTILADOR', '03', TRUE),
  ('134', 'HOSPITALIZACION PACIENTE CRONICO SIN VENTILADOR', '03', TRUE),
  ('135', 'HOSPITALIZACION EN  CONSUMO DE SUSTANCIAS PSICOACTIVAS', '03', TRUE),
  ('138', 'CUIDADO BASICO DEL CONSUMO DE SUSTANCIAS PSICOACTIVAS', '03', TRUE),
  ('201', 'CIRUGIA DE CABEZA Y CUELLO', '04', TRUE),
  ('202', 'CIRUGIA CARDIOVASCULAR', '04', TRUE),
  ('203', 'CIRUGIA GENERAL', '04', TRUE),
  ('204', 'CIRUGIA GINECOLOGICA', '04', TRUE),
  ('205', 'CIRUGIA MAXILOFACIAL', '04', TRUE),
  ('207', 'CIRUGIA ORTOPEDICA', '04', TRUE),
  ('208', 'CIRUGIA OFTALMOLOGICA', '04', TRUE),
  ('209', 'CIRUGIA OTORRINOLARINGOLOGIA', '04', TRUE),
  ('210', 'CIRUGIA ONCOLOGICA', '04', TRUE),
  ('211', 'CIRUGIA ORAL', '04', TRUE),
  ('212', 'CIRUGIA PEDIATRICA', '04', TRUE),
  ('213', 'CIRUGIA PLASTICA Y ESTETICA', '04', TRUE),
  ('214', 'CIRUGIA VASCULAR Y ANGIOLOGICA', '04', TRUE),
  ('215', 'CIRUGIA UROLOGICA', '04', TRUE),
  ('217', 'OTRAS CIRUGIAS', '04', TRUE),
  ('218', 'CIRUGIA ENDOVASCULAR NEUROLOGICA', '04', TRUE),
  ('227', 'CIRUGIA ONCOLOGICA PEDIATRICA', '04', TRUE),
  ('231', 'CIRUGIA DE LA MANO', '04', TRUE),
  ('232', 'CIRUGIA DE MAMA Y TUMORES TEJIDOS BLANDOS', '04', TRUE),
  ('233', 'CIRUGIA DERMATOLOGICA', '04', TRUE),
  ('234', 'CIRUGIA DE TORAX', '04', TRUE),
  ('235', 'CIRUGIA GASTROINTESTINAL', '04', TRUE),
  ('237', 'CIRUGIA PLASTICA ONCOLOGICA', '04', TRUE),
  ('245', 'NEUROCIRUGIA', '04', TRUE),
  ('301', 'ANESTESIA', '01', TRUE),
  ('302', 'CARDIOLOGIA', '01', TRUE),
  ('303', 'CIRUGIA CARDIOVASCULAR', '01', TRUE),
  ('304', 'CIRUGIA GENERAL', '01', TRUE),
  ('306', 'CIRUGIA PEDIATRICA', '01', TRUE),
  ('308', 'DERMATOLOGIA', '01', TRUE),
  ('309', 'DOLOR Y CUIDADOS PALIATIVOS', '01', TRUE),
  ('310', 'ENDOCRINOLOGIA', '01', TRUE),
  ('311', 'ENDODONCIA', '01', TRUE),
  ('312', 'ENFERMERIA', '01', TRUE),
  ('313', 'ESTOMATOLOGIA', '01', TRUE),
  ('316', 'GASTROENTEROLOGIA', '01', TRUE),
  ('317', 'GENETICA', '01', TRUE),
  ('318', 'GERIATRIA', '01', TRUE),
  ('320', 'GINECOBSTETRICIA', '01', TRUE),
  ('321', 'HEMATOLOGIA', '01', TRUE),
  ('323', 'INFECTOLOGIA', '01', TRUE),
  ('324', 'INMUNOLOGIA', '01', TRUE),
  ('325', 'MEDICINA FAMILIAR', '01', TRUE),
  ('326', 'MEDICINA FISICA Y DEL DEPORTE', '01', TRUE),
  ('327', 'MEDICINA FISICA Y REHABILITACION', '01', TRUE),
  ('328', 'MEDICINA GENERAL', '01', TRUE),
  ('329', 'MEDICINA INTERNA', '01', TRUE),
  ('330', 'NEFROLOGIA', '01', TRUE),
  ('331', 'NEUMOLOGIA', '01', TRUE),
  ('332', 'NEUROLOGIA', '01', TRUE),
  ('333', 'NUTRICION Y DIETETICA', '01', TRUE),
  ('334', 'ODONTOLOGIA GENERAL', '01', TRUE),
  ('335', 'OFTALMOLOGIA', '01', TRUE),
  ('336', 'ONCOLOGIA CLINICA', '01', TRUE),
  ('337', 'OPTOMETRIA', '01', TRUE),
  ('338', 'ORTODONCIA', '01', TRUE),
  ('339', 'ORTOPEDIA Y/O TRAUMATOLOGIA', '01', TRUE),
  ('340', 'OTORRINOLARINGOLOGIA', '01', TRUE),
  ('342', 'PEDIATRIA', '01', TRUE),
  ('343', 'PERIODONCIA', '01', TRUE),
  ('344', 'PSICOLOGIA', '01', TRUE),
  ('345', 'PSIQUIATRIA', '01', TRUE),
  ('346', 'REHABILITACION ONCOLOGICA', '01', TRUE),
  ('347', 'REHABILITACION ORAL', '01', TRUE),
  ('348', 'REUMATOLOGIA', '01', TRUE),
  ('354', 'TOXICOLOGIA', '01', TRUE),
  ('355', 'UROLOGIA', '01', TRUE),
  ('356', 'OTRAS CONSULTAS DE ESPECIALIDAD', '01', TRUE),
  ('361', 'CARDIOLOGIA PEDIATRICA', '01', TRUE),
  ('362', 'CIRUGIA DE CABEZA Y CUELLO', '01', TRUE),
  ('363', 'CIRUGIA DE MANO', '01', TRUE),
  ('364', 'CIRUGIA DE MAMA Y TUMORES TEJIDOS BLANDOS', '01', TRUE),
  ('365', 'CIRUGIA DERMATOLOGICA', '01', TRUE),
  ('366', 'CIRUGIA DE TORAX', '01', TRUE),
  ('367', 'CIRUGIA GASTROINTESTINAL', '01', TRUE),
  ('368', 'CIRUGIA GINECOLOGICA LAPAROSCOPICA', '01', TRUE),
  ('369', 'CIRUGIA PLASTICA Y ESTETICA', '01', TRUE),
  ('370', 'CIRUGIA PLASTICA ONCOLOGICA', '01', TRUE),
  ('371', 'OTRAS CONSULTAS GENERALES', '01', TRUE),
  ('372', 'CIRUGIA VASCULAR', '01', TRUE),
  ('373', 'CIRUGIA ONCOLOGICA', '01', TRUE),
  ('374', 'CIRUGIA ONCOLOGICA PEDIATRICA', '01', TRUE),
  ('375', 'DERMATOLOGIA ONCOLOGICA', '01', TRUE),
  ('377', 'COLOPROCTOLOGIA', '01', TRUE),
  ('379', 'GINECOLOGIA ONCOLOGICA', '01', TRUE),
  ('383', 'MEDICINA NUCLEAR', '01', TRUE),
  ('384', 'NEFROLOGIA PEDIATRICA', '01', TRUE),
  ('385', 'NEONATOLOGIA', '01', TRUE),
  ('386', 'NEUMOLOGIA PEDIATRICA', '01', TRUE),
  ('387', 'NEUROCIRUGIA', '01', TRUE),
  ('388', 'NEUROPEDIATRIA', '01', TRUE),
  ('390', 'OFTALMOLOGIA ONCOLOGICA', '01', TRUE),
  ('391', 'ONCOLOGIA Y HEMATOLOGIA PEDIATRICA', '01', TRUE),
  ('393', 'ORTOPEDIA ONCOLOGICA', '01', TRUE),
  ('395', 'UROLOGIA ONCOLOGICA', '01', TRUE),
  ('396', 'ODONTOPEDIATRIA', '01', TRUE),
  ('397', 'MEDICINA ESTETICA', '01', TRUE),
  ('406', 'HEMATOLOGIA ONCOLOGICA', '01', TRUE),
  ('407', 'MEDICINA DEL TRABAJO Y MEDICINA LABORAL', '01', TRUE),
  ('408', 'RADIOTERAPIA', '01', TRUE),
  ('409', 'ORTOPEDIA PEDIATRICA', '01', TRUE),
  ('410', 'CIRUGIA ORAL', '01', TRUE),
  ('411', 'CIRUGIA MAXILOFACIAL', '01', TRUE),
  ('412', 'MEDICINA ALTERNATIVA Y COMPLEMENTARIA - HOMEOPATICA', '01', TRUE),
  ('413', 'MEDICINA ALTERNATIVA Y COMPLEMENTARIA - AYURVEDICA', '01', TRUE),
  ('414', 'MEDICINA ALTERNATIVA Y COMPLEMENTARIA - TRADICIONAL CHINA', '01', TRUE),
  ('415', 'MEDICINA ALTERNATIVA Y COMPLEMENTARIA - NATUROPATICA', '01', TRUE),
  ('416', 'MEDICINA ALTERNATIVA Y COMPLEMENTARIA - NEURALTERAPEUTICA', '01', TRUE),
  ('417', 'TERAPIAS ALTERNATIVAS Y COMPLEMENTARIAS - BIOENERGETICA', '01', TRUE),
  ('418', 'TERAPIAS ALTERNATIVAS Y COMPLEMENTARIAS - TERAPIA  CON FILTROS', '01', TRUE),
  ('419', 'TERAPIAS ALTERNATIVAS Y COMPLEMENTARIAS - TERAPIAS  MANUALES', '01', TRUE),
  ('420', 'VACUNACION', '01', TRUE),
  ('421', 'PATOLOGIA', '01', TRUE),
  ('422', 'MEDICINA ALTERNATIVA Y COMPLEMENTARIA - OSTEOPATICA', '01', TRUE),
  ('423', 'SEGURIDAD Y SALUD EN EL TRABAJO', '01', TRUE),
  ('706', 'LABORATORIO CLINICO', '02', TRUE),
  ('709', 'QUIMIOTERAPIA', '02', TRUE),
  ('711', 'RADIOTERAPIA', '02', TRUE),
  ('712', 'TOMA DE MUESTRAS DE LABORATORIO CLINICO', '02', TRUE),
  ('714', 'SERVICIO FARMACEUTICO', '02', TRUE),
  ('715', 'MEDICINA NUCLEAR', '02', TRUE),
  ('717', 'LABORATORIO CITOLOGIAS CERVICO-UTERINAS', '02', TRUE),
  ('728', 'TERAPIA OCUPACIONAL', '02', TRUE),
  ('729', 'TERAPIA RESPIRATORIA', '02', TRUE),
  ('731', 'LABORATORIO DE HISTOTECNOLOGIA', '02', TRUE),
  ('733', 'HEMODIALISIS', '02', TRUE),
  ('734', 'DIALISIS PERITONEAL', '02', TRUE),
  ('739', 'FISIOTERAPIA', '02', TRUE),
  ('740', 'FONOAUDIOLOGIA Y/O TERAPIA DEL LENGUAJE', '02', TRUE),
  ('742', 'DIAGNOSTICO VASCULAR', '02', TRUE),
  ('743', 'HEMODINAMIA E INTERVENCIONISMO', '02', TRUE),
  ('744', 'IMAGENES DIAGNOSTICAS- IONIZANTES', '02', TRUE),
  ('745', 'IMAGENES DIAGNOSTICAS - NO IONIZANTES', '02', TRUE),
  ('746', 'GESTION PRE-TRANSFUSIONAL', '02', TRUE),
  ('747', 'PATOLOGIA', '02', TRUE),
  ('748', 'RADIOLOGIA ODONTOLOGICA', '02', TRUE),
  ('749', 'TOMA DE MUESTRAS DE CUELLO UTERINO Y GINECOLOGICAS', '02', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  service_group = EXCLUDED.service_group,
  is_active = EXCLUDED.is_active;
```

- [ ] **Step 2: Register the migration in the runner**

In `apps/backend/src/scripts/run-migration.ts`, add a new block right after the migration 024 block (before the `console.log('\n🌟 MIGRATIONS COMPLETE! 🌟');` line):

```ts
    // Run migration 025
    console.log('🔄 Running migration 025 (REPS Service Codes)...');
    const sql025 = fs.readFileSync(
      path.resolve('migrations', '025_reps_service_codes.sql'),
      'utf8'
    );
    await pool.query(sql025);
    console.log('✅ Migration 025 successful!');
```

- [ ] **Step 3: Run the migration**

Run: `pnpm -F @medisdiana/backend migrate`
Expected: output ends with `✅ Migration 025 successful!` followed by `🌟 MIGRATIONS COMPLETE! 🌟`. If `DATABASE_URL` is unreachable, re-establish connectivity the same way it was done earlier in this project (SSH tunnel to the VM's Postgres) before retrying — do not change `.env`.

- [ ] **Step 4: Verify the seeded data**

Run (adjust connection flags to match `apps/backend/.env`'s `DATABASE_URL`):
```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM reps_service_catalog;" -c "SELECT count(*) FILTER (WHERE is_active) FROM reps_service_catalog;" -c "SELECT code, name, service_group FROM reps_service_catalog WHERE code = '328';"
```
Expected: `count = 157`, active `count = 154`, and the `328` row returns `MEDICINA GENERAL` / `01`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/migrations/025_reps_service_codes.sql apps/backend/src/scripts/run-migration.ts
git commit -m "feat(db): add reps_service_catalog table and service_catalog.reps_service_code column"
```

---

## Task 2: Backend — `GET /services/reps-service-codes` endpoint

**Depends on:** Task 1 (table must exist for the test to pass against the real DB).
**Can run in parallel with:** Task 3 (different files).

**Files:**
- Modify: `apps/backend/src/types/cups.types.ts`
- Modify: `apps/backend/src/repositories/cups.repository.ts`
- Modify: `apps/backend/src/controllers/cups.controller.ts`
- Modify: `apps/backend/src/routes/services.routes.ts`
- Test: `apps/backend/src/repositories/cups.repository.test.ts` (new)

**Interfaces:**
- Produces: `GET /services/reps-service-codes` (auth: `authenticate` + `authorize('ADMIN')`) → `200 { success: true, data: { code: string; name: string; serviceGroup: string }[] }`, only `is_active = true` rows, ordered by `service_group, code`.
- Consumes: table `reps_service_catalog` from Task 1.

- [ ] **Step 1: Add the `RepsServiceCode` type**

In `apps/backend/src/types/cups.types.ts`, append at the end of the file:

```ts

export interface RepsServiceCode {
  code: string;
  name: string;
  serviceGroup: string;
}
```

- [ ] **Step 2: Write the failing repository test**

Create `apps/backend/src/repositories/cups.repository.test.ts`:

```ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { CupsRepository } from './cups.repository.js';
import { pool } from '@config/database.js';

after(async () => {
  await pool.end();
});

test('listRepsServiceCodes() returns only active REPS codes, ordered by group then code', async () => {
  const codes = await CupsRepository.listRepsServiceCodes();

  assert.equal(codes.length, 154, 'seeded migration 025 has 154 active rows (157 total, 3 inactive)');
  assert.ok(codes.every((c) => c.code && c.name && c.serviceGroup));

  const medicinaGeneral = codes.find((c) => c.code === '328');
  assert.deepEqual(medicinaGeneral, { code: '328', name: 'MEDICINA GENERAL', serviceGroup: '01' });

  // The 3 inactive transporte-asistencial codes must not appear
  assert.equal(codes.some((c) => c.code === '1103'), false);

  // Ordered by service_group then code
  for (let i = 1; i < codes.length; i++) {
    const prev = codes[i - 1]!, cur = codes[i]!;
    assert.ok(
      prev.serviceGroup < cur.serviceGroup ||
      (prev.serviceGroup === cur.serviceGroup && prev.code <= cur.code)
    );
  }
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm -F @medisdiana/backend test -- --test-name-pattern="listRepsServiceCodes"`
Expected: FAIL — `CupsRepository.listRepsServiceCodes is not a function`.

- [ ] **Step 4: Implement the repository method**

In `apps/backend/src/repositories/cups.repository.ts`, add the import and method:

```ts
import type {
  CupsLookupResult, ClassificationCategory, ClassificationSubcategory,
  CreateMappingDTO, CupsCandidate, RepsServiceCode,
} from '../types/cups.types.js';
```

Then add this method inside the `CupsRepository` object, after `createMapping`:

```ts
  async listRepsServiceCodes(): Promise<RepsServiceCode[]> {
    const { rows } = await pool.query<{ code: string; name: string; service_group: string }>(
      `SELECT code, name, service_group FROM reps_service_catalog
       WHERE is_active = TRUE ORDER BY service_group, code`
    );
    return rows.map(r => ({ code: r.code, name: r.name, serviceGroup: r.service_group }));
  },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm -F @medisdiana/backend test -- --test-name-pattern="listRepsServiceCodes"`
Expected: PASS.

- [ ] **Step 6: Add the controller handler**

In `apps/backend/src/controllers/cups.controller.ts`, add at the end of the file:

```ts

export async function listRepsServiceCodes(_req: Request, res: Response): Promise<void> {
  const codes = await CupsRepository.listRepsServiceCodes();
  res.status(200).json({ success: true, data: codes });
}
```

- [ ] **Step 7: Wire the route**

In `apps/backend/src/routes/services.routes.ts`, change the `cups.controller.js` import (around line 66-69) to include the new handler:

```ts
import {
  lookupCups, listClassificationCategories, listClassificationSubcategories,
  listCupsCatalog, createCupsMapping, listRepsServiceCodes,
} from '@controllers/cups.controller.js';
```

Then add the route right after the `cups-catalog` route (around line 114):

```ts
router.get('/services/reps-service-codes', authenticate, authorize('ADMIN'), listRepsServiceCodes);
```

- [ ] **Step 8: Verify the whole backend still typechecks**

Run: `pnpm -F @medisdiana/backend build`
Expected: no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/types/cups.types.ts apps/backend/src/repositories/cups.repository.ts apps/backend/src/repositories/cups.repository.test.ts apps/backend/src/controllers/cups.controller.ts apps/backend/src/routes/services.routes.ts
git commit -m "feat(services): add GET /services/reps-service-codes endpoint"
```

---

## Task 3: Backend — persist `reps_service_code` on the service catalog

**Depends on:** Task 1 (FK column + referenced rows must exist for the test to insert successfully).
**Can run in parallel with:** Task 2 (different files).

**Files:**
- Modify: `packages/shared-types/src/models/services.types.ts`
- Modify: `apps/backend/src/repositories/services.repository.ts`
- Modify: `apps/backend/src/controllers/services.controller.ts`
- Test: `apps/backend/src/controllers/services.controller.reps-service-code.test.ts` (new)

**Interfaces:**
- Consumes: `reps_service_catalog` table (Task 1) for the FK; test uses seeded code `'328'` (group `01`, `MEDICINA GENERAL`) as a known-valid value.
- Produces: `service_catalog.reps_service_code` persisted through `ServiceCatalogRepository.create`/`update`; exposed on `ServiceOfferPublic.catalog.repsServiceCode` (`string | null`) — this is the exact field name Task 4 (frontend) reads from `GET /services/offers` responses and writes via `POST`/`PATCH /services/offers`.

- [ ] **Step 1: Add `repsServiceCode` to the shared types**

In `packages/shared-types/src/models/services.types.ts`:

Add to `ServiceCatalogPublic` (after `serviceCode: string | null;`, line 88):
```ts
  repsServiceCode: string | null;
```

Add to `CreateServiceCatalogPayload` (after `serviceCode?: string;`, line 109):
```ts
  repsServiceCode?: string;
```

Add to `ServiceOfferPublic.catalog` (after `serviceCode: string | null;`, line 159):
```ts
    repsServiceCode: string | null;
```

(`UpdateServiceCatalogPayload extends Partial<CreateServiceCatalogPayload>` picks up the new optional field automatically — no change needed there.)

- [ ] **Step 2: Write the failing controller test**

Create `apps/backend/src/controllers/services.controller.reps-service-code.test.ts`, following the same fixture pattern as `services.controller.control-price.test.ts`:

```ts
import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { createOffer, updateOffer } from './services.controller.js';

after(async () => {
  await pool.end();
});

function makeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (payload: unknown) => { res.body = payload; return res; };
  return res;
}

async function createTestLocation(): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO locations (name) VALUES ($1) RETURNING id`,
    [`Sede de prueba reps-code ${Date.now()}`]
  );
  return rows[0].id;
}

async function deleteTestLocation(locationId: string) {
  await pool.query('DELETE FROM service_offers WHERE location_id = $1', [locationId]);
  await pool.query('DELETE FROM locations WHERE id = $1', [locationId]);
}

function mockDocApiAlwaysSucceeds(t: TestContext) {
  let nextId = 3000;
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => {
    const u = String(url);
    if (u.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 't', refresh_token: 'r' } }), { status: 200 });
    }
    if (u.endsWith('/booking/my-services') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { prof_service_id: nextId++, service_id: 1, name: 'x' } }), { status: 201 });
    }
    if (u.includes('/booking/my-services/') && init?.method === 'DELETE') {
      return new Response(JSON.stringify({ success: true, message: 'Servicio eliminado' }), { status: 200 });
    }
    throw new Error(`fetch inesperado: ${u}`);
  });
}

test('createOffer: guarda reps_service_code en el catálogo cuando se envía', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const req: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Consulta medicina general',
      capacity: 1, durationMinutes: 20, scheduledAt: new Date().toISOString(),
      price: 0, currency: 'COP',
      serviceName: 'Consulta medicina general', categoryGroup: '01',
      isActive: true, basePrice: 0, repsServiceCode: '328',
    },
  };
  const res = makeRes();
  await createOffer(req, res);
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [res.body.data.offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]);
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.offer.catalog.repsServiceCode, '328');

  const { rows } = await pool.query(
    'SELECT reps_service_code FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]
  );
  assert.equal(rows[0].reps_service_code, '328');
});

test('createOffer: reps_service_code queda NULL cuando no se envía', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const req: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Otros servicios',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 0, currency: 'COP',
      serviceName: 'Otros servicios', categoryGroup: '06',
      isActive: true, basePrice: 0,
    },
  };
  const res = makeRes();
  await createOffer(req, res);
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [res.body.data.offer.id]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [res.body.data.offer.catalogId]);
  });

  assert.equal(res.body.data.offer.catalog.repsServiceCode, null);
});

test('updateOffer: PATCH con solo {repsServiceCode} lo actualiza', async (t) => {
  const locationId = await createTestLocation();
  t.after(() => deleteTestLocation(locationId));
  mockDocApiAlwaysSucceeds(t);

  const createReq: any = {
    body: {
      locationId, offerType: 'appointment', title: 'Endocrinologia',
      capacity: 1, durationMinutes: 30, scheduledAt: new Date().toISOString(),
      price: 0, currency: 'COP',
      serviceName: 'Endocrinologia', categoryGroup: '01',
      isActive: true, basePrice: 0, repsServiceCode: '310',
    },
  };
  const createRes = makeRes();
  await createOffer(createReq, createRes);
  const offerId = createRes.body.data.offer.id;
  const catalogId = createRes.body.data.offer.catalogId;
  t.after(async () => {
    await pool.query('DELETE FROM service_offers WHERE id = $1', [offerId]);
    await pool.query('DELETE FROM service_catalog WHERE id = $1', [catalogId]);
  });

  const updateReq: any = { params: { id: offerId }, body: { repsServiceCode: '328' } };
  const updateRes = makeRes();
  await updateOffer(updateReq, updateRes);

  assert.equal(updateRes.statusCode, 200);
  const { rows } = await pool.query(
    'SELECT reps_service_code FROM service_catalog WHERE id = $1', [catalogId]
  );
  assert.equal(rows[0].reps_service_code, '328');
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm -F @medisdiana/backend test -- --test-name-pattern="reps_service_code"`
Expected: FAIL — `repsServiceCode` is silently dropped (not in `CATALOG_PAYLOAD_KEYS`, not inserted), so `rows[0].reps_service_code` is `undefined`/column mismatch and `catalog.repsServiceCode` is `undefined` instead of `'328'`/`null`.

- [ ] **Step 4: Wire the field into `CATALOG_PAYLOAD_KEYS`**

In `apps/backend/src/controllers/services.controller.ts`, update the array (around line 198-202):

```ts
const CATALOG_PAYLOAD_KEYS = [
  'serviceName', 'description', 'categoryGroup', 'subcategoryGroup', 'category',
  'subcategory', 'serviceCode', 'repsServiceCode', 'modality', 'isActive', 'basePrice', 'controlPrice', 'imageUrl',
  'preparationInstructions', 'genderRestriction', 'risks', 'contraindications',
];
```

- [ ] **Step 5: Insert the column in `ServiceCatalogRepository.create`**

In `apps/backend/src/repositories/services.repository.ts`, update the `create` method (lines 137-159):

```ts
  async create(data: any): Promise<{ id: string }> {
    // Serialize modality array to JSON string for VARCHAR storage
    const modalityStr = Array.isArray(data.modality)
      ? JSON.stringify(data.modality)
      : (data.modality ? String(data.modality) : null);

    const { rows } = await pool.query(
      `INSERT INTO service_catalog
         (service_name, description, category_group, subcategory_group, category, subcategory,
          service_code, reps_service_code, modality, is_active, base_price, control_price, image_url, preparation_instructions,
          gender_restriction, risks, contraindications)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [
        data.serviceName, data.description ?? null, data.categoryGroup, data.subcategoryGroup ?? null,
        data.category ?? null, data.subcategory ?? null, data.serviceCode ?? null, data.repsServiceCode ?? null,
        modalityStr, data.isActive ?? true, data.basePrice ?? 0, data.controlPrice ?? null,
        data.imageUrl ?? null, data.preparationInstructions ?? null, data.genderRestriction ?? null,
        data.risks ?? null, data.contraindications ?? null
      ]
    );
    return rows[0];
  },
```

- [ ] **Step 6: Add the column to `ServiceCatalogRepository.update`**

In the same file, update the `update` method's `map` (lines 161-168):

```ts
  async update(id: string, data: any): Promise<void> {
    const map: Record<string, string> = {
      serviceName: 'service_name', description: 'description', categoryGroup: 'category_group',
      subcategoryGroup: 'subcategory_group', category: 'category', subcategory: 'subcategory',
      serviceCode: 'service_code', repsServiceCode: 'reps_service_code', modality: 'modality', isActive: 'is_active',
      basePrice: 'base_price', controlPrice: 'control_price', imageUrl: 'image_url', preparationInstructions: 'preparation_instructions',
      genderRestriction: 'gender_restriction', risks: 'risks', contraindications: 'contraindications'
    };
```

(the rest of `update` is unchanged — it already loops over `map` generically.)

- [ ] **Step 7: Select and map the column when reading offers**

In `apps/backend/src/repositories/services.repository.ts`, add the column to `OFFER_SELECT` (after `c.service_code AS c_service_code,` around line 267):

```sql
    c.service_code AS c_service_code, c.reps_service_code AS c_reps_service_code, c.modality AS c_modality,
```

Then in `rowToOffer` (the `catalog:` object, after `serviceCode: (row['c_service_code'] as string) ?? null,` around line 235):

```ts
      serviceCode: (row['c_service_code'] as string) ?? null,
      repsServiceCode: (row['c_reps_service_code'] as string) ?? null,
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm -F @medisdiana/backend test -- --test-name-pattern="reps_service_code"`
Expected: PASS (all 3 tests).

- [ ] **Step 9: Verify the whole backend still typechecks**

Run: `pnpm -F @medisdiana/backend build`
Expected: no TypeScript errors.

- [ ] **Step 10: Confirm no CuidameDoc sync regression**

Run: `pnpm -F @medisdiana/backend test -- --test-name-pattern="docsync|control-price"`
Expected: PASS — existing docSync and control-price tests are unaffected (`repsServiceCode` is not in `DOC_SYNC_RELEVANT_FIELDS`).

- [ ] **Step 11: Commit**

```bash
git add packages/shared-types/src/models/services.types.ts apps/backend/src/repositories/services.repository.ts apps/backend/src/controllers/services.controller.ts apps/backend/src/controllers/services.controller.reps-service-code.test.ts
git commit -m "feat(services): persist reps_service_code on the service catalog"
```

---

## Task 4: Frontend — "Código del servicio" field in the service form

**Depends on:** none to compile/write (the endpoint contract is fixed above); Tasks 2 and 3 must both be deployed/migrated for the manual E2E verification step (Step 8) to actually exercise real data.
**Can run in parallel with:** Tasks 2 and 3.

**Files:**
- Modify: `medisdiana-landing/src/components/admin/servicioSchema.ts`
- Modify: `medisdiana-landing/src/components/admin/FormularioServicio.tsx`
- Modify: `medisdiana-landing/src/components/admin/ServiciosDashboard.tsx`

**Interfaces:**
- Consumes: `GET /services/reps-service-codes` → `{ success: true, data: { code: string; name: string; serviceGroup: string }[] }` (Task 2). Reads/writes `repsServiceCode` on `ServicioFormValues` and on the offer payload/catalog (Task 3's exact field name).
- Produces: `ServicioFormValues.repsServiceCode: string | undefined`, validated required for `categoryGroup !== '06'`.

- [ ] **Step 1: Add `repsServiceCode` to the zod schema**

In `medisdiana-landing/src/components/admin/servicioSchema.ts`, add to `baseSchema` (after `cups: z.string().optional(), // CUPS`, line 38):

```ts
  repsServiceCode: z.string().optional(), // Código de servicio REPS (habilitación)
```

Then add the required-when-not-escape-group check inside `.superRefine()` (after the `cups` check, lines 74-76):

```ts
    if (!data.repsServiceCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El código del servicio es obligatorio para este grupo', path: ['repsServiceCode'] });
    }
```

- [ ] **Step 2: Add state and the fetch-once effect in `FormularioServicio.tsx`**

Add new state right after `const [showMappingModal, setShowMappingModal] = useState(false);` (line 136):

```ts
  const [repsServiceCodes, setRepsServiceCodes] = useState<{ code: string; name: string; serviceGroup: string }[]>([]);
  const [loadingRepsServiceCodes, setLoadingRepsServiceCodes] = useState(false);
```

Add a new effect right after `useEffect(() => { runCupsLookup(); }, [runCupsLookup]);` (line 188), before `const subgrupoOptions = ...` (line 190):

```ts
  // Load REPS service-code catalog once (small, static reference table)
  useEffect(() => {
    setLoadingRepsServiceCodes(true);
    fetch('/api/services/reps-service-codes', { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { if (j.success) setRepsServiceCodes(j.data); })
      .catch(() => {})
      .finally(() => setLoadingRepsServiceCodes(false));
  }, []);
```

- [ ] **Step 3: Filter the options by the selected group**

Right after the `const subgrupoOptions = ...` line (line 190), add:

```ts
  const repsCodeOptions = categoryGroup ? repsServiceCodes.filter(r => r.serviceGroup === categoryGroup) : [];
```

- [ ] **Step 4: Add the field to the form, after "Código CUPS" and before "Modalidad"**

In the JSX, inside the `{!isEscapeGroup && (...)}` fragment (section 3), right after the closing `</div>` of the "Código CUPS" `InputField` block (after line 390, before the fragment's closing `</>` on line 391), add:

```tsx
                <div style={{ gridColumn: '1 / -1' }}>
                  <InputField label="Código del servicio" required icon={Box} error={errors.repsServiceCode}>
                    <select {...register('repsServiceCode')} style={inlineInputStyle} className={FOCUS_RING} disabled={!categoryGroup || loadingRepsServiceCodes}>
                      <option value="">{loadingRepsServiceCodes ? 'Cargando...' : 'Elige el código del servicio...'}</option>
                      {repsCodeOptions.map(r => <option key={r.code} value={r.code}>{r.code} - {r.name}</option>)}
                    </select>
                  </InputField>
                </div>
```

- [ ] **Step 5: Typecheck the frontend**

Run: `pnpm -F medisdiana-landing exec tsc --noEmit`
Expected: no new TypeScript errors.

- [ ] **Step 6: Wire the field into `ServiciosDashboard.tsx` load path**

In `medisdiana-landing/src/components/admin/ServiciosDashboard.tsx`, add to the object built for `initialData` (after `cups: cat.serviceCode || '',`, line 379):

```ts
      repsServiceCode: cat.repsServiceCode || '',
```

- [ ] **Step 7: Wire the field into `ServiciosDashboard.tsx` save path**

In the same file, add to `basePayload` (after `serviceCode: data.cups,`, line 428):

```ts
      repsServiceCode: data.repsServiceCode,
```

- [ ] **Step 8: Manual end-to-end verification**

Prerequisite: Tasks 2 and 3 merged and migration from Task 1 applied.

Run: `pnpm dev` (or the project's usual dev command per `flujo-de-trabajo.md`), open the admin panel → Servicios → Nuevo Servicio.

1. Choose Grupo "01 Consulta externa" → the new "Código del servicio" select becomes enabled and, after the brief "Cargando..." state, lists ~91 options including "328 - MEDICINA GENERAL".
2. Try to submit without choosing a código de servicio → validation error "El código del servicio es obligatorio para este grupo" appears, form does not submit.
3. Choose "328 - MEDICINA GENERAL", complete the rest of the required fields (Subgrupo/Categoría/Subcategoría/CUPS/Modalidad/Sede/etc.), submit → service is created successfully.
4. Edit that same service → the "Código del servicio" select shows "328 - MEDICINA GENERAL" pre-selected.
5. Choose Grupo "06 Otros servicios" → the "Código del servicio" field (along with Subgrupo/Categoría/Subcategoría/CUPS) disappears entirely, and the form can be submitted without it.

- [ ] **Step 9: Commit**

```bash
git add medisdiana-landing/src/components/admin/servicioSchema.ts medisdiana-landing/src/components/admin/FormularioServicio.tsx medisdiana-landing/src/components/admin/ServiciosDashboard.tsx
git commit -m "feat(admin): add REPS service-code field to the service form"
```

---

## Final Integration Check (after all tasks land)

- [ ] Run `pnpm -F @medisdiana/backend test` (full backend suite) — all tests pass, including the new ones from Tasks 2 and 3.
- [ ] Run `pnpm -F @medisdiana/backend build` and `pnpm -F medisdiana-landing exec tsc --noEmit` — no TypeScript errors anywhere in the monorepo.
- [ ] Repeat Task 4 Step 8's manual E2E walkthrough once more against the fully merged code.
- [ ] Update `arquitectura.md` with a short new section documenting `reps_service_catalog` / `service_catalog.reps_service_code`, mirroring the style of the existing "Sincronización de Servicios Medis → CuidameDoc" section (CLAUDE.md regla crítica #1: nothing is "done" until documented).
