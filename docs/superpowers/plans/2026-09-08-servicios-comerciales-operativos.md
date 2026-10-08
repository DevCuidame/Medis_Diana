# Servicios Comerciales vs. Operativos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split service creation into two types — "operativo" (the existing full RIPS/CUPS form, internal only) and "comercial" (a new lightweight public-facing form: name, description, image, linked operativo) — without touching CuidameDoc sync in this phase.

**Architecture:** New Postgres table `service_commercial` (many-to-one to the existing `service_catalog`, which now represents "operativo" only). New backend repository/controller/routes for CRUD on it, plus a lightweight "list active operativos" endpoint for the picker. New frontend form component (`FormularioServicioComercial.tsx`) and list tab (`ServiciosComercialesTab.tsx`), wired into the existing `ServiciosDashboard.tsx` behind a type-picker on "Nuevo Servicio" and a Comerciales/Operativos tab switcher.

**Tech Stack:** Express + `pg` (raw SQL, no ORM) on the backend; React + TypeScript on the frontend; `node:test` (via `tsx --test`) for backend tests — no frontend test runner exists in this repo, so frontend tasks end in manual verification instead of automated tests.

**Spec:** [docs/superpowers/specs/2026-09-08-servicios-comerciales-operativos-design.md](../specs/2026-09-08-servicios-comerciales-operativos-design.md)

## Global Constraints

- Comercial captures only: nombre, descripción, imagen, operativo asociado, estado (activo/inactivo). No precio ni duración propios.
- Un operativo puede tener **muchos** comerciales (`operativo_id` en `service_commercial` NO es único).
- **Ningún cambio a la sincronización CuidameDoc en esta fase** — crear/editar un comercial NO debe hacer ninguna llamada de red hacia `doc-api.cuidame.tech`, y crear/editar un operativo sigue exactamente igual que hoy (incluyendo su `ensureDocSync` existente, sin tocar).
- Servicios existentes en `service_catalog` no se tocan ni se migran — quedan como operativos tal cual están.
- Todo el SQL es directo vía el pool `pg` — sin Prisma ni otro ORM (regla del proyecto).
- No existe runner de tests en el frontend (`medisopimed-landing`) — no crear uno como parte de esta feature; verificar manualmente.

## Parallelization

Two independent tracks, dispatchable as two parallel subagent chains, converging at Task 7:

- **Track A — Backend** (Tasks 1 → 2 → 3, strictly sequential — each depends on the file the previous task created)
- **Track B — Frontend** (Tasks 4 → 5 → 6, strictly sequential — each imports the component the previous task created)

Track B does not import anything from Track A's files (the frontend talks to the backend only via `fetch()` against the documented JSON contract below — same pattern the existing `FormularioServicio.tsx`/`ServiciosDashboard.tsx` already use). Task 7 (manual end-to-end verification) requires both tracks complete and a migrated dev database.

---

### Task 1: Migration — `service_commercial` table

**Files:**
- Create: `apps/backend/migrations/028_service_commercial.sql`
- Modify: `apps/backend/src/scripts/run-migration.ts:250-258` (register the new migration, same pattern as 027)

**Interfaces:**
- Produces: table `service_commercial` (columns: `id UUID`, `name VARCHAR(255)`, `description TEXT`, `image_url TEXT`, `operativo_id UUID` FK → `service_catalog.id`, `is_active BOOLEAN`, `doc_prof_service_id INTEGER` nullable/unused this phase, `created_at`/`updated_at TIMESTAMPTZ`), trigger `trg_service_commercial_updated_at` reusing the existing `set_updated_at()` function.

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- Migration 028: Service Commercial (comercial vs. operativo split)
-- ============================================================
-- Ver docs/superpowers/specs/2026-09-08-servicios-comerciales-operativos-design.md
--
-- service_catalog pasa a representar únicamente la ficha clínica/RIPS
-- interna ("operativo"). Esta tabla nueva guarda la ficha pública de venta
-- ("comercial"): nombre, descripción, imagen, y a qué operativo pertenece.
-- Un operativo puede respaldar muchos comerciales (1:N) — operativo_id NO
-- es único.
--
-- doc_prof_service_id queda reservado sin usar en esta fase: la sincronización
-- a CuidameDoc para comerciales es trabajo futuro (documentado en el spec,
-- sección "Fuera de alcance de esta fase").

CREATE TABLE IF NOT EXISTS service_commercial (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  image_url           TEXT,
  operativo_id        UUID         NOT NULL REFERENCES service_catalog(id) ON DELETE RESTRICT,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  doc_prof_service_id INTEGER,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_commercial_operativo ON service_commercial (operativo_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_service_commercial_updated_at') THEN
    CREATE TRIGGER trg_service_commercial_updated_at
      BEFORE UPDATE ON service_commercial
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
```

- [ ] **Step 2: Register it in the migration runner**

In `apps/backend/src/scripts/run-migration.ts`, find this exact block (the last migration, 027):

```typescript
    // Run migration 027
    console.log('🔄 Running migration 027 (Widen Image Columns)...');
    const sql027 = fs.readFileSync(
      path.resolve('migrations', '027_widen_image_columns.sql'),
      'utf8'
    );
    await pool.query(sql027);
    console.log('✅ Migration 027 successful!');

    console.log('\n🌟 MIGRATIONS COMPLETE! 🌟');
```

Replace it with:

```typescript
    // Run migration 027
    console.log('🔄 Running migration 027 (Widen Image Columns)...');
    const sql027 = fs.readFileSync(
      path.resolve('migrations', '027_widen_image_columns.sql'),
      'utf8'
    );
    await pool.query(sql027);
    console.log('✅ Migration 027 successful!');

    // Run migration 028
    console.log('🔄 Running migration 028 (Service Commercial)...');
    const sql028 = fs.readFileSync(
      path.resolve('migrations', '028_service_commercial.sql'),
      'utf8'
    );
    await pool.query(sql028);
    console.log('✅ Migration 028 successful!');

    console.log('\n🌟 MIGRATIONS COMPLETE! 🌟');
```

- [ ] **Step 3: Apply it and verify**

Run (from `apps/backend/`): `npm run migrate`
Expected: log ends with `✅ Migration 028 successful!` then `🌟 MIGRATIONS COMPLETE! 🌟`, no errors.

Verify the table exists:
```bash
psql "$DATABASE_URL" -c "\d service_commercial"
```
Expected: shows the 9 columns listed above, `operativo_id` with a foreign-key constraint to `service_catalog`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/migrations/028_service_commercial.sql apps/backend/src/scripts/run-migration.ts
git commit -m "feat(db): add service_commercial table for comercial/operativo split"
```

---

### Task 2: Shared types + repository

**Files:**
- Modify: `packages/shared-types/src/models/services.types.ts` (append new section)
- Create: `apps/backend/src/repositories/serviceCommercial.repository.ts`
- Modify: `apps/backend/src/repositories/services.repository.ts:143-197` (add `ServiceCatalogRepository.listActive()`)
- Test: `apps/backend/src/repositories/serviceCommercial.repository.test.ts`

**Interfaces:**
- Consumes: `pool` from `@config/database.js` (existing).
- Produces:
  - `ServiceCommercialPublic`, `CreateServiceCommercialPayload`, `UpdateServiceCommercialPayload` types (exported from `@medisopimed/shared-types`).
  - `ServiceCommercialRepository.{findAll, findById, create, update, delete}` — used by Task 3's controller.
  - `ServiceCatalogRepository.listActive(): Promise<{id: string; serviceName: string}[]>` — used by Task 3's `listOperativos` controller.

- [ ] **Step 1: Add the shared types**

Append to `packages/shared-types/src/models/services.types.ts`, right after the `UpdateServiceCatalogPayload` interface (after line 123):

```typescript
// ─── SERVICE COMMERCIAL ──────────────────────────────────────

export interface ServiceCommercialPublic {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  operativoId: string;
  operativoName: string;
  isActive: boolean;
  docProfServiceId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceCommercialPayload {
  name: string;
  description?: string;
  imageUrl?: string;
  operativoId: string;
  isActive?: boolean;
}

export interface UpdateServiceCommercialPayload extends Partial<CreateServiceCommercialPayload> {}
```

- [ ] **Step 2: Write the failing repository test**

Create `apps/backend/src/repositories/serviceCommercial.repository.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ServiceCommercialRepository } from './serviceCommercial.repository.js';

async function createTestOperativo(): Promise<{ id: string; name: string }> {
  const name = `Operativo repo test ${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO service_catalog (service_name, category_group, is_active, base_price)
     VALUES ($1, '01 Consulta externa', TRUE, 50000)
     RETURNING id`,
    [name]
  );
  return { id: rows[0].id, name };
}

test('create() + findById(): guarda y recupera un comercial con el nombre del operativo unido', async (t) => {
  const operativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativo.id]));

  const created = await ServiceCommercialRepository.create({
    name: 'Consulta Bioreguladora Premium',
    description: 'Ficha comercial de prueba',
    operativoId: operativo.id,
  });
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [created.id]));

  assert.equal(created.name, 'Consulta Bioreguladora Premium');
  assert.equal(created.operativoId, operativo.id);
  assert.equal(created.operativoName, operativo.name);
  assert.equal(created.isActive, true);
  assert.equal(created.docProfServiceId, null);

  const found = await ServiceCommercialRepository.findById(created.id);
  assert.deepEqual(found, created);
});

test('findAll(): un operativo puede respaldar varios comerciales (1:N)', async (t) => {
  const operativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativo.id]));

  const c1 = await ServiceCommercialRepository.create({ name: 'Nombre comercial A', operativoId: operativo.id });
  const c2 = await ServiceCommercialRepository.create({ name: 'Nombre comercial B', operativoId: operativo.id });
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = ANY($1)', [[c1.id, c2.id]]));

  const all = await ServiceCommercialRepository.findAll();
  const ids = all.map(c => c.id);
  assert.ok(ids.includes(c1.id));
  assert.ok(ids.includes(c2.id));
});

test('update(): cambia solo los campos enviados', async (t) => {
  const operativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativo.id]));

  const created = await ServiceCommercialRepository.create({ name: 'Original', operativoId: operativo.id });
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [created.id]));

  const updated = await ServiceCommercialRepository.update(created.id, { isActive: false });
  assert.equal(updated!.isActive, false);
  assert.equal(updated!.name, 'Original');
});

test('delete(): elimina el comercial y devuelve true', async (t) => {
  const operativo = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativo.id]));

  const created = await ServiceCommercialRepository.create({ name: 'A borrar', operativoId: operativo.id });

  const ok = await ServiceCommercialRepository.delete(created.id);
  assert.equal(ok, true);

  const found = await ServiceCommercialRepository.findById(created.id);
  assert.equal(found, null);
});

test('create(): rechaza un operativoId que no existe (FK)', async () => {
  await assert.rejects(
    () => ServiceCommercialRepository.create({ name: 'Huérfano', operativoId: '00000000-0000-0000-0000-000000000000' })
  );
});
```

- [ ] **Step 3: Run it to verify it fails**

Run (from `apps/backend/`): `npx tsx --test src/repositories/serviceCommercial.repository.test.ts`
Expected: FAIL — `Cannot find module './serviceCommercial.repository.js'`.

- [ ] **Step 4: Implement the repository**

Create `apps/backend/src/repositories/serviceCommercial.repository.ts`:

```typescript
// ============================================================
// apps/backend/src/repositories/serviceCommercial.repository.ts
// Repositorio: Servicios Comerciales (ficha pública de venta)
// ============================================================

import { pool } from '@config/database.js';
import type {
  ServiceCommercialPublic,
  CreateServiceCommercialPayload,
  UpdateServiceCommercialPayload,
} from '@medisopimed/shared-types';

const SELECT = `
  SELECT
    sc.id, sc.name, sc.description, sc.image_url, sc.operativo_id,
    sc.is_active, sc.doc_prof_service_id, sc.created_at, sc.updated_at,
    op.service_name AS operativo_name
  FROM service_commercial sc
  JOIN service_catalog op ON op.id = sc.operativo_id
`;

function rowToCommercial(row: Record<string, unknown>): ServiceCommercialPublic {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    description: (row['description'] as string) ?? null,
    imageUrl: (row['image_url'] as string) ?? null,
    operativoId: row['operativo_id'] as string,
    operativoName: row['operativo_name'] as string,
    isActive: row['is_active'] as boolean,
    docProfServiceId: (row['doc_prof_service_id'] as number) ?? null,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  };
}

export const ServiceCommercialRepository = {
  async findAll(): Promise<ServiceCommercialPublic[]> {
    const { rows } = await pool.query(`${SELECT} ORDER BY sc.created_at DESC`);
    return rows.map(rowToCommercial);
  },

  async findById(id: string): Promise<ServiceCommercialPublic | null> {
    const { rows } = await pool.query(`${SELECT} WHERE sc.id = $1`, [id]);
    return rows[0] ? rowToCommercial(rows[0]) : null;
  },

  async create(data: CreateServiceCommercialPayload): Promise<ServiceCommercialPublic> {
    const { rows } = await pool.query(
      `INSERT INTO service_commercial (name, description, image_url, operativo_id, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        data.name,
        data.description ?? null,
        data.imageUrl ?? null,
        data.operativoId,
        data.isActive ?? true,
      ]
    );
    return (await this.findById(rows[0].id))!;
  },

  async update(id: string, data: UpdateServiceCommercialPayload): Promise<ServiceCommercialPublic | null> {
    const map: Record<string, string> = {
      name: 'name',
      description: 'description',
      imageUrl: 'image_url',
      operativoId: 'operativo_id',
      isActive: 'is_active',
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, col] of Object.entries(map)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        sets.push(`${col} = $${i++}`);
        values.push((data as Record<string, unknown>)[key]);
      }
    }
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    await pool.query(`UPDATE service_commercial SET ${sets.join(', ')} WHERE id = $${i}`, values);
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM service_commercial WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
```

Also add `listActive()` to the existing `ServiceCatalogRepository` in `apps/backend/src/repositories/services.repository.ts`. Find this exact block (lines 168-197, the `update` method and closing brace):

```typescript
  async update(id: string, data: any): Promise<void> {
    const map: Record<string, string> = {
      serviceName: 'service_name', description: 'description', categoryGroup: 'category_group',
      subcategoryGroup: 'subcategory_group', category: 'category', subcategory: 'subcategory',
      serviceCode: 'service_code', repsServiceCode: 'reps_service_code', modality: 'modality', isActive: 'is_active',
      basePrice: 'base_price', controlPrice: 'control_price', imageUrl: 'image_url', preparationInstructions: 'preparation_instructions',
      genderRestriction: 'gender_restriction', risks: 'risks', contraindications: 'contraindications'
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        sets.push(`${col} = $${i++}`);
        if (key === 'modality') {
          // Always serialize modality as JSON string
          const val = data[key];
          values.push(Array.isArray(val) ? JSON.stringify(val) : (val ? String(val) : null));
        } else {
          values.push(data[key]);
        }
      }
    }
    if (sets.length === 0) return;
    sets.push(`updated_at = NOW()`);
    values.push(id);
    await pool.query(`UPDATE service_catalog SET ${sets.join(', ')} WHERE id = $${i}`, values);
  }
};
```

Replace its closing `}\n};` with an added method plus the closing brace:

```typescript
  async update(id: string, data: any): Promise<void> {
    const map: Record<string, string> = {
      serviceName: 'service_name', description: 'description', categoryGroup: 'category_group',
      subcategoryGroup: 'subcategory_group', category: 'category', subcategory: 'subcategory',
      serviceCode: 'service_code', repsServiceCode: 'reps_service_code', modality: 'modality', isActive: 'is_active',
      basePrice: 'base_price', controlPrice: 'control_price', imageUrl: 'image_url', preparationInstructions: 'preparation_instructions',
      genderRestriction: 'gender_restriction', risks: 'risks', contraindications: 'contraindications'
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        sets.push(`${col} = $${i++}`);
        if (key === 'modality') {
          // Always serialize modality as JSON string
          const val = data[key];
          values.push(Array.isArray(val) ? JSON.stringify(val) : (val ? String(val) : null));
        } else {
          values.push(data[key]);
        }
      }
    }
    if (sets.length === 0) return;
    sets.push(`updated_at = NOW()`);
    values.push(id);
    await pool.query(`UPDATE service_catalog SET ${sets.join(', ')} WHERE id = $${i}`, values);
  },

  /** Lista ligera de operativos activos — usada por el selector del formulario comercial. */
  async listActive(): Promise<{ id: string; serviceName: string }[]> {
    const { rows } = await pool.query(
      `SELECT id, service_name AS "serviceName"
       FROM service_catalog
       WHERE is_active = TRUE
       ORDER BY service_name`
    );
    return rows;
  }
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx tsx --test src/repositories/serviceCommercial.repository.test.ts`
Expected: PASS, 5/5 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/models/services.types.ts apps/backend/src/repositories/serviceCommercial.repository.ts apps/backend/src/repositories/services.repository.ts apps/backend/src/repositories/serviceCommercial.repository.test.ts
git commit -m "feat(backend): add ServiceCommercialRepository and ServiceCatalogRepository.listActive"
```

---

### Task 3: Controller + routes

**Files:**
- Create: `apps/backend/src/controllers/serviceCommercial.controller.ts`
- Modify: `apps/backend/src/routes/services.routes.ts`
- Test: `apps/backend/src/controllers/serviceCommercial.controller.test.ts`

**Interfaces:**
- Consumes: `ServiceCommercialRepository` and `ServiceCatalogRepository.listActive` from Task 2.
- Produces: HTTP contract used by Tasks 4-5 (Track B):
  - `GET /api/services/operativos` → `{ success: true, data: {id, serviceName}[] }`
  - `GET /api/services/commercial` → `{ success: true, data: ServiceCommercialPublic[] }`
  - `POST /api/services/commercial` body `{name, description?, imageUrl?, operativoId, isActive?}` → `201 { success: true, data: ServiceCommercialPublic }`, or `400 { success: false, error }` if name empty / operativoId missing or invalid.
  - `PATCH /api/services/commercial/:id` body `Partial<CreateServiceCommercialPayload>` → `200 { success: true, data: ServiceCommercialPublic }`, or `404` if not found.
  - `DELETE /api/services/commercial/:id` → `200 { success: true }`, or `404` if not found.
  - All five require `Authorization: Bearer <token>` for an ADMIN user.

- [ ] **Step 1: Write the failing controller test**

Create `apps/backend/src/controllers/serviceCommercial.controller.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { listCommercial, createCommercial, updateCommercial, deleteCommercial, listOperativos } from './serviceCommercial.controller.js';

function makeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (payload: unknown) => { res.body = payload; return res; };
  return res;
}

async function createTestOperativo(): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO service_catalog (service_name, category_group, is_active, base_price)
     VALUES ($1, '01 Consulta externa', TRUE, 90000)
     RETURNING id`,
    [`Operativo controller test ${Date.now()}`]
  );
  return rows[0].id;
}

test('createCommercial: crea un comercial vinculado a un operativo existente', async (t) => {
  const operativoId = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  const req: any = { body: { name: 'Botox facial', description: 'Tratamiento estético', operativoId } };
  const res = makeRes();
  await createCommercial(req, res);
  t.after(() => pool.query('DELETE FROM service_commercial WHERE id = $1', [res.body.data.id]));

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.name, 'Botox facial');
  assert.equal(res.body.data.operativoId, operativoId);
  assert.equal(res.body.data.isActive, true);
});

test('createCommercial: rechaza un operativoId inexistente con 400', async () => {
  const req: any = { body: { name: 'Comercial huérfano', operativoId: '00000000-0000-0000-0000-000000000000' } };
  const res = makeRes();
  await createCommercial(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test('createCommercial: rechaza nombre vacío con 400', async (t) => {
  const operativoId = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  const req: any = { body: { name: '  ', operativoId } };
  const res = makeRes();
  await createCommercial(req, res);

  assert.equal(res.statusCode, 400);
});

test('listCommercial → updateCommercial → deleteCommercial: ciclo completo', async (t) => {
  const operativoId = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  const createReq: any = { body: { name: 'Limpieza facial', operativoId } };
  const createRes = makeRes();
  await createCommercial(createReq, createRes);
  const id = createRes.body.data.id;

  const listRes = makeRes();
  await listCommercial({} as any, listRes);
  assert.ok(listRes.body.data.some((c: any) => c.id === id));

  const updateReq: any = { params: { id }, body: { isActive: false } };
  const updateRes = makeRes();
  await updateCommercial(updateReq, updateRes);
  assert.equal(updateRes.body.data.isActive, false);

  const deleteReq: any = { params: { id } };
  const deleteRes = makeRes();
  await deleteCommercial(deleteReq, deleteRes);
  assert.equal(deleteRes.body.success, true);

  const listAfterRes = makeRes();
  await listCommercial({} as any, listAfterRes);
  assert.equal(listAfterRes.body.data.some((c: any) => c.id === id), false);
});

test('listOperativos: devuelve solo operativos activos', async (t) => {
  const operativoId = await createTestOperativo();
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [operativoId]));

  const res = makeRes();
  await listOperativos({} as any, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body.data.some((o: any) => o.id === operativoId));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run (from `apps/backend/`): `npx tsx --test src/controllers/serviceCommercial.controller.test.ts`
Expected: FAIL — `Cannot find module './serviceCommercial.controller.js'`.

- [ ] **Step 3: Implement the controller**

Create `apps/backend/src/controllers/serviceCommercial.controller.ts`:

```typescript
// ============================================================
// apps/backend/src/controllers/serviceCommercial.controller.ts
// Controller: Servicios Comerciales (ficha pública de venta)
// Sin sincronización a CuidameDoc en esta fase — ver spec
// docs/superpowers/specs/2026-09-08-servicios-comerciales-operativos-design.md
// ============================================================

import type { Request, Response } from 'express';
import { ServiceCommercialRepository } from '@repositories/serviceCommercial.repository.js';
import { ServiceCatalogRepository } from '@repositories/services.repository.js';

function isForeignKeyViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23503';
}

/** ADMIN ONLY */
export async function listCommercial(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ServiceCommercialRepository.findAll();
    res.json({ success: true, data });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function createCommercial(req: Request, res: Response): Promise<void> {
  try {
    const { name, operativoId } = req.body as { name?: string; operativoId?: string };
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
      return;
    }
    if (!operativoId) {
      res.status(400).json({ success: false, error: 'El servicio operativo es obligatorio' });
      return;
    }
    const commercial = await ServiceCommercialRepository.create({
      name: name.trim(),
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      operativoId,
      isActive: req.body.isActive,
    });
    res.status(201).json({ success: true, data: commercial });
  } catch (err: unknown) {
    if (isForeignKeyViolation(err)) {
      res.status(400).json({ success: false, error: 'El servicio operativo seleccionado no existe' });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function updateCommercial(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    const updated = await ServiceCommercialRepository.update(id, req.body);
    if (!updated) { res.status(404).json({ success: false, error: 'Servicio comercial no encontrado' }); return; }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    if (isForeignKeyViolation(err)) {
      res.status(400).json({ success: false, error: 'El servicio operativo seleccionado no existe' });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function deleteCommercial(req: Request, res: Response): Promise<void> {
  try {
    const ok = await ServiceCommercialRepository.delete(req.params['id']!);
    if (!ok) { res.status(404).json({ success: false, error: 'Servicio comercial no encontrado' }); return; }
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — lista ligera de operativos activos, para el selector del formulario comercial */
export async function listOperativos(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ServiceCatalogRepository.listActive();
    res.json({ success: true, data });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
```

- [ ] **Step 4: Register the routes**

In `apps/backend/src/routes/services.routes.ts`, add to the route summary comment at the top — find:

```typescript
//  SERVICE OFFERS
//  GET    /services/offers                      → público (con filtros)
//  GET    /services/offers/:id                  → público
//  POST   /services/offers                      → ADMIN
//  PATCH  /services/offers/:id                  → ADMIN
//  DELETE /services/offers/:id                  → ADMIN
//
```

Replace with:

```typescript
//  SERVICE OFFERS
//  GET    /services/offers                      → público (con filtros)
//  GET    /services/offers/:id                  → público
//  POST   /services/offers                      → ADMIN
//  PATCH  /services/offers/:id                  → ADMIN
//  DELETE /services/offers/:id                  → ADMIN
//
//  SERVICE COMMERCIAL
//  GET    /services/operativos                  → ADMIN (lista ligera para el selector)
//  GET    /services/commercial                   → ADMIN
//  POST   /services/commercial                   → ADMIN
//  PATCH  /services/commercial/:id                → ADMIN
//  DELETE /services/commercial/:id                → ADMIN
//
```

Add the import — find:

```typescript
import {
  lookupCups, listClassificationCategories, listClassificationSubcategories,
  listCupsCatalog, createCupsMapping, listRepsServiceCodes,
} from '@controllers/cups.controller.js';
```

Replace with:

```typescript
import {
  lookupCups, listClassificationCategories, listClassificationSubcategories,
  listCupsCatalog, createCupsMapping, listRepsServiceCodes,
} from '@controllers/cups.controller.js';
import {
  listCommercial, createCommercial, updateCommercial, deleteCommercial, listOperativos,
} from '@controllers/serviceCommercial.controller.js';
```

Add the route registrations — find:

```typescript
// ─── SERVICE OFFERS ──────────────────────────────────────────
router.get(   '/services/offers',     listOffers);
router.get(   '/services/offers/:id', getOffer);
router.post(  '/services/offers',     authenticate, authorize('ADMIN'), createOffer);
router.patch( '/services/offers/:id', authenticate, authorize('ADMIN'), updateOffer);
router.delete('/services/offers/:id', authenticate, authorize('ADMIN'), deleteOffer);
```

Replace with:

```typescript
// ─── SERVICE OFFERS ──────────────────────────────────────────
router.get(   '/services/offers',     listOffers);
router.get(   '/services/offers/:id', getOffer);
router.post(  '/services/offers',     authenticate, authorize('ADMIN'), createOffer);
router.patch( '/services/offers/:id', authenticate, authorize('ADMIN'), updateOffer);
router.delete('/services/offers/:id', authenticate, authorize('ADMIN'), deleteOffer);

// ─── SERVICE COMMERCIAL ──────────────────────────────────────
router.get(   '/services/operativos',     authenticate, authorize('ADMIN'), listOperativos);
router.get(   '/services/commercial',     authenticate, authorize('ADMIN'), listCommercial);
router.post(  '/services/commercial',     authenticate, authorize('ADMIN'), createCommercial);
router.patch( '/services/commercial/:id', authenticate, authorize('ADMIN'), updateCommercial);
router.delete('/services/commercial/:id', authenticate, authorize('ADMIN'), deleteCommercial);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx tsx --test src/controllers/serviceCommercial.controller.test.ts`
Expected: PASS, 5/5 tests.

Then run the full backend suite to confirm nothing else broke: `npm test` (from `apps/backend/`).
Expected: all tests pass, including the pre-existing `services.controller.docsync.test.ts` (confirms operativo creation still syncs to CuidameDoc exactly as before — untouched).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/controllers/serviceCommercial.controller.ts apps/backend/src/routes/services.routes.ts apps/backend/src/controllers/serviceCommercial.controller.test.ts
git commit -m "feat(backend): add serviceCommercial CRUD endpoints and operativos lookup"
```

---

### Task 4: Frontend — `FormularioServicioComercial.tsx`

**Files:**
- Create: `medisopimed-landing/src/components/admin/FormularioServicioComercial.tsx`

**Interfaces:**
- Consumes: `GET /api/services/operativos` (Task 3's contract) to populate the selector.
- Produces: `ServicioComercialFormValues` type and `FormularioServicioComercial` component — consumed by Task 5.
  ```typescript
  export interface ServicioComercialFormValues {
    name: string;
    description: string;
    imageUrl: string;
    operativoId: string;
    isActive: boolean;
  }
  interface Props {
    initialData?: Partial<ServicioComercialFormValues>;
    onSuccess: (data: ServicioComercialFormValues) => Promise<void> | void;
    onCancel: () => void;
  }
  ```
  The component does **not** call the create/update API itself — it only validates and hands clean data to `onSuccess` (same delegation pattern as the existing `FormularioServicio.tsx`).

No automated test for this task (no frontend test runner in this repo) — verified manually in Task 7.

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, FileText, Image as ImageIcon, Loader2, Tag, X } from 'lucide-react';

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bg: '#FFFFFF', bgPanel: '#F3F0FB',
  white: '#FFFFFF', text: '#1B1C1C', textBrown: '#475569',
  textMuted: '#94A3B8', border: '#DDD6FE', borderLight: '#DDD6FE',
  red: '#EF4444', success: '#16A34A',
};
const FONT_SERIF = '"Bodoni Moda", Georgia, serif';
const FONT_SANS  = '"Hanken Grotesk", Inter, system-ui, sans-serif';
const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent';

export interface ServicioComercialFormValues {
  name: string;
  description: string;
  imageUrl: string;
  operativoId: string;
  isActive: boolean;
}

interface Props {
  initialData?: Partial<ServicioComercialFormValues>;
  onSuccess: (data: ServicioComercialFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const InputField = ({ label, icon: Icon, error, children, required }: any) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 8 }}>
      {Icon && <Icon size={14} color={C.gold} />} {label} {required && <span style={{ color: C.red }}>*</span>}
    </div>
    {children}
    {error && (
      <span style={{ color: C.red, fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
        <AlertTriangle size={12} /> {error}
      </span>
    )}
  </div>
);

export const FormularioServicioComercial: React.FC<Props> = ({ initialData, onSuccess, onCancel }) => {
  const [name, setName]               = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [operativoId, setOperativoId] = useState(initialData?.operativoId ?? '');
  const [isActive, setIsActive]       = useState(initialData?.isActive ?? true);
  const [operativos, setOperativos]   = useState<{ id: string; serviceName: string }[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [imageError, setImageError]   = useState<string | null>(null);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function authHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    fetch('/api/services/operativos', { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { if (j.success) setOperativos(j.data); })
      .catch(() => {});
  }, []);

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('La imagen no debe superar los 5MB');
      e.currentTarget.value = '';
      return;
    }
    setImageError(null);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'El nombre es obligatorio';
    if (!operativoId) next.operativoId = 'Selecciona el servicio operativo asociado';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSuccess({
        name: name.trim(),
        description: description.trim(),
        imageUrl: imagePreview ?? '',
        operativoId,
        isActive,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inlineInputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.borderLight}`,
    background: C.bgPanel, fontSize: 14, color: C.text, outline: 'none', transition: 'all 0.2s', fontFamily: FONT_SANS,
  };

  return (
    <div style={{ background: C.white, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.08)', padding: '40px', maxWidth: 640, margin: '0 auto', fontFamily: FONT_SANS }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 700, color: C.gold, margin: '0 0 8px' }}>
            {initialData ? 'Editar Servicio Comercial' : 'Nuevo Servicio Comercial'}
          </h2>
          <p style={{ margin: 0, color: C.textBrown, fontSize: 15 }}>
            La ficha que verá el paciente. Se apoya en un servicio operativo para su duración y precio.
          </p>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: C.textMuted }}>
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <InputField label="Nombre del servicio" required icon={Tag} error={errors.name}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Rejuvenecimiento Facial Integral" style={inlineInputStyle} className={FOCUS_RING} />
        </InputField>

        <InputField label="Descripción" icon={FileText}>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe el servicio para el paciente..." style={{ ...inlineInputStyle, minHeight: 80, resize: 'vertical' }} className={FOCUS_RING} />
        </InputField>

        <InputField label="Servicio operativo asociado" required icon={Tag} error={errors.operativoId}>
          <select value={operativoId} onChange={e => setOperativoId(e.target.value)} style={inlineInputStyle} className={FOCUS_RING}>
            <option value="">Selecciona un operativo...</option>
            {operativos.map(o => <option key={o.id} value={o.id}>{o.serviceName}</option>)}
          </select>
        </InputField>

        <InputField label="Imagen del servicio" icon={ImageIcon} error={imageError ?? undefined}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {imagePreview ? (
              <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.borderLight}` }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={removeImage} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: 12, border: `1px dashed ${C.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgPanel }}>
                <ImageIcon size={24} color={C.textMuted} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.gold}`, background: 'transparent', color: C.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Subir Imagen
              </button>
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>JPG, PNG o GIF (Máx. 5MB)</p>
            </div>
          </div>
        </InputField>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: C.bgPanel, borderRadius: 12, border: `1px solid ${C.borderLight}`, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, display: 'block' }}>Estado del servicio</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>{isActive ? 'Visible en el panel de comerciales.' : 'Oculto.'}</span>
          </div>
          <button type="button" onClick={() => setIsActive(v => !v)} style={{ width: 50, height: 26, borderRadius: 13, background: isActive ? C.success : '#CBD5E1', position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, left: isActive ? 26 : 2, width: 22, height: 22, background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 20 }}>
          <button type="button" onClick={onCancel} style={{ padding: '14px 24px', borderRadius: 12, border: `1px solid ${C.borderLight}`, background: C.white, color: C.textBrown, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 15, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 16px rgba(139,92,246,0.2)' }}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {initialData ? 'Actualizar' : 'Guardar Comercial'}
          </button>
        </div>
      </form>
    </div>
  );
};
```

- [ ] **Step 2: Sanity-check it compiles**

Run (from `medisopimed-landing/`): `npx tsc --noEmit`
Expected: no new type errors attributable to `FormularioServicioComercial.tsx` (this repo has pre-existing unrelated `tsc -b` errors — see `flujo-de-trabajo.md` — so don't chase errors outside this file).

- [ ] **Step 3: Commit**

```bash
git add medisopimed-landing/src/components/admin/FormularioServicioComercial.tsx
git commit -m "feat(admin): add FormularioServicioComercial form component"
```

---

### Task 5: Frontend — `ServiciosComercialesTab.tsx`

**Files:**
- Create: `medisopimed-landing/src/components/admin/ServiciosComercialesTab.tsx`

**Interfaces:**
- Consumes: `FormularioServicioComercial` + `ServicioComercialFormValues` (Task 4); `GET/POST/PATCH/DELETE /api/services/commercial` (Task 3's contract).
- Produces: `ServiciosComercialesTab` component, props `{ onToast: (msg: string, ok: boolean) => void }` — consumed by Task 6.

No automated test (no frontend test runner) — verified manually in Task 7.

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { FormularioServicioComercial, type ServicioComercialFormValues } from './FormularioServicioComercial';

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bg: '#FFFFFF', bgPanel: '#F3F0FB', white: '#FFFFFF',
  text: '#1B1C1C', textBrown: '#475569', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
  success: '#16A34A', danger: '#DC2626',
};
const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif';

interface ComercialItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  operativoId: string;
  operativoName: string;
  isActive: boolean;
}

interface Props {
  onToast: (msg: string, ok: boolean) => void;
}

export const ServiciosComercialesTab: React.FC<Props> = ({ onToast }) => {
  const [items, setItems]           = useState<ComercialItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing]       = useState<ComercialItem | null>(null);
  const [busyId, setBusyId]         = useState<string | null>(null);

  function authH(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }

  const load = async () => {
    try {
      const res = await fetch('/api/services/commercial', { headers: authH() });
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: ServicioComercialFormValues) => {
    const body = JSON.stringify({
      name: data.name,
      description: data.description || undefined,
      imageUrl: data.imageUrl || undefined,
      operativoId: data.operativoId,
      isActive: data.isActive,
    });
    try {
      const res = editing
        ? await fetch(`/api/services/commercial/${editing.id}`, { method: 'PATCH', headers: authH(), body })
        : await fetch('/api/services/commercial', { method: 'POST', headers: authH(), body });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast(json.error ?? `Error ${res.status}`, false);
        return;
      }
      onToast(editing ? 'Servicio comercial actualizado ✓' : 'Servicio comercial creado ✓', true);
      setIsFormOpen(false);
      setEditing(null);
      await load();
    } catch (e: unknown) {
      onToast((e as Error).message ?? 'Error de red', false);
    }
  };

  const handleToggle = async (item: ComercialItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/services/commercial/${item.id}`, {
        method: 'PATCH', headers: authH(), body: JSON.stringify({ isActive: !item.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { onToast(json.error ?? 'Error al cambiar el estado', false); return; }
      onToast(item.isActive ? 'Comercial desactivado' : 'Comercial activado', true);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: ComercialItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/services/commercial/${item.id}`, { method: 'DELETE', headers: authH() });
      const json = await res.json();
      if (!res.ok || !json.success) { onToast(json.error ?? 'Error al eliminar', false); return; }
      onToast('Servicio comercial eliminado ✓', true);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (isFormOpen) {
    return (
      <FormularioServicioComercial
        key={editing ? editing.id : 'new'}
        initialData={editing ? {
          name: editing.name,
          description: editing.description ?? '',
          imageUrl: editing.imageUrl ?? '',
          operativoId: editing.operativoId,
          isActive: editing.isActive,
        } : undefined}
        onCancel={() => { setIsFormOpen(false); setEditing(null); }}
        onSuccess={handleSave}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          onClick={() => { setEditing(null); setIsFormOpen(true); }}
          style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, padding: '12px 24px', borderRadius: 12, border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 16px rgba(139,92,246,0.2)', fontFamily: FONT_INTER }}
        >
          <Plus size={18} strokeWidth={3} /> Nuevo Comercial
        </button>
      </div>

      {items.length === 0 ? (
        <p style={{ textAlign: 'center', color: C.textMuted, fontFamily: FONT_INTER, padding: '60px 0' }}>
          Todavía no hay servicios comerciales. Crea uno y asócialo a un operativo existente.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.borderLight}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}
              >
                <div style={{ height: 140, background: C.bgPanel, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={28} color={C.textMuted} />
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <h4 style={{ fontFamily: FONT_BODONI, fontSize: 18, margin: '0 0 4px', color: C.text }}>{item.name}</h4>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 12px', fontFamily: FONT_INTER }}>
                    Operativo: {item.operativoName}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.isActive ? C.success : C.textMuted, textTransform: 'uppercase' }}>
                      {item.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={busyId === item.id} onClick={() => handleToggle(item)} title={item.isActive ? 'Desactivar' : 'Activar'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textBrown }}>
                        {item.isActive ? <ToggleRight size={20} color={C.success} /> : <ToggleLeft size={20} />}
                      </button>
                      <button onClick={() => { setEditing(item); setIsFormOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textBrown }}>
                        <Edit2 size={16} />
                      </button>
                      <button disabled={busyId === item.id} onClick={() => handleDelete(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Sanity-check it compiles**

Run (from `medisopimed-landing/`): `npx tsc --noEmit`
Expected: no new type errors attributable to `ServiciosComercialesTab.tsx`.

- [ ] **Step 3: Commit**

```bash
git add medisopimed-landing/src/components/admin/ServiciosComercialesTab.tsx
git commit -m "feat(admin): add ServiciosComercialesTab list/CRUD component"
```

---

### Task 6: Wire into `ServiciosDashboard.tsx`

**Files:**
- Modify: `medisopimed-landing/src/components/admin/ServiciosDashboard.tsx`

**Interfaces:**
- Consumes: `ServiciosComercialesTab` (Task 5), existing `showToast`, `setEditingGroup`, `setIsFormOpen`.

Adds a type-picker on the "Nuevo Servicio" button (Comercial / Operativo) and an Operativos/Comerciales tab switcher. Choosing "Comercial" switches to the Comerciales tab (where the user then clicks "Nuevo Comercial", built in Task 5); choosing "Operativo" opens the existing 4-step form exactly as today.

No automated test (no frontend test runner) — verified manually in Task 7.

- [ ] **Step 1: Add the import**

Find (line 4-5):

```typescript
import { FormularioServicio } from './FormularioServicio';
import { generateOccurrences, DIA_NOMBRES } from './servicioSchema';
```

Replace with:

```typescript
import { FormularioServicio } from './FormularioServicio';
import { ServiciosComercialesTab } from './ServiciosComercialesTab';
import { generateOccurrences, DIA_NOMBRES } from './servicioSchema';
```

- [ ] **Step 2: Add the new state**

Find:

```typescript
  const [togglingKey, setTogglingKey]     = useState<string | null>(null);
  const [filterType, setFilterType]       = useState<string>('all');
  const filtersRef = useRef<HTMLDivElement>(null);
```

Replace with:

```typescript
  const [togglingKey, setTogglingKey]     = useState<string | null>(null);
  const [filterType, setFilterType]       = useState<string>('all');
  const [activeTab, setActiveTab]         = useState<'operativos' | 'comerciales'>('operativos');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Replace the header block with the type-picker and tab switcher**

Find this exact block:

```typescript
            <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontFamily: FONT_BODONI, fontSize: 42, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Gestión de Servicios</h1>
                  <p style={{ fontFamily: FONT_INTER, color: C.textMedium, marginTop: 8, fontWeight: 500 }}>
                    Administra el catálogo, horarios y disponibilidad de la academia.
                  </p>
                </div>
                <button
                  onClick={() => { setEditingGroup(null); setIsFormOpen(true); }}
                  style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, padding: '12px 24px', borderRadius: 12, border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: `0 4px 16px rgba(139,92,246,0.2)`, fontFamily: FONT_INTER, flexShrink: 0 }}
                >
                  <Plus size={18} strokeWidth={3} /> Nuevo Servicio
                </button>
              </div>

              {/* ── SEARCH + FILTERS ROW ── */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
```

Replace with:

```typescript
            <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontFamily: FONT_BODONI, fontSize: 42, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Gestión de Servicios</h1>
                  <p style={{ fontFamily: FONT_INTER, color: C.textMedium, marginTop: 8, fontWeight: 500 }}>
                    Administra el catálogo, horarios y disponibilidad de la academia.
                  </p>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowTypePicker(v => !v)}
                    style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, padding: '12px 24px', borderRadius: 12, border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: `0 4px 16px rgba(139,92,246,0.2)`, fontFamily: FONT_INTER, flexShrink: 0 }}
                  >
                    <Plus size={18} strokeWidth={3} /> Nuevo Servicio
                  </button>
                  <AnimatePresence>
                    {showTypePicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.16 }}
                        style={{ position: 'absolute', top: 54, right: 0, width: 260, background: C.white, borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.12)', border: `1.5px solid ${C.borderLight}`, zIndex: 50, padding: 10, fontFamily: FONT_INTER }}
                      >
                        <button
                          onClick={() => { setShowTypePicker(false); setActiveTab('comerciales'); }}
                          style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'block' }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, display: 'block' }}>Comercial</span>
                          <span style={{ fontSize: 12, color: C.textMuted }}>Ficha pública, se asocia a un operativo existente.</span>
                        </button>
                        <button
                          onClick={() => { setShowTypePicker(false); setActiveTab('operativos'); setEditingGroup(null); setIsFormOpen(true); }}
                          style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'block' }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, display: 'block' }}>Operativo</span>
                          <span style={{ fontSize: 12, color: C.textMuted }}>Ficha clínica/RIPS completa, uso interno.</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── TABS ── */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                {([
                  { v: 'operativos' as const,  label: 'Operativos' },
                  { v: 'comerciales' as const, label: 'Comerciales' },
                ]).map(t => (
                  <button key={t.v} onClick={() => setActiveTab(t.v)}
                    style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${activeTab === t.v ? C.gold : C.borderLight}`, background: activeTab === t.v ? 'rgba(139,92,246,0.08)' : 'transparent', color: activeTab === t.v ? C.gold : C.textBrown, cursor: 'pointer', fontFamily: FONT_INTER }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'operativos' && (
              <>
              {/* ── SEARCH + FILTERS ROW ── */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
```

- [ ] **Step 4: Close the new wrapper and branch into the Comerciales tab**

Find this exact block (the end of the search/filters row and the start of the groups grid):

```typescript
                  </div>
                )}
              </div>
            </div>

            {/* ── SESIONES PROGRAMADAS ── */}
            {groups.length === 0 ? (
```

Replace with:

```typescript
                  </div>
                )}
              </div>
              </>
              )}
            </div>

            {activeTab === 'comerciales' ? (
              <ServiciosComercialesTab onToast={showToast} />
            ) : (
            <>
            {/* ── SESIONES PROGRAMADAS ── */}
            {groups.length === 0 ? (
```

- [ ] **Step 5: Close the new ternary at the end of the groups section**

Find this exact block (the end of the groups grid, right before the `isFormOpen` else-branch that renders `FormularioServicio`):

```typescript
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
```

Replace with:

```typescript
                  })}
                </AnimatePresence>
              </div>
            )}
            </>
            )}
          </motion.div>
        ) : (
```

- [ ] **Step 6: Sanity-check it compiles**

Run (from `medisopimed-landing/`): `npx tsc --noEmit`
Expected: no new type/JSX errors attributable to `ServiciosDashboard.tsx` (in particular, no "unclosed JSX" / unbalanced-parens errors — if you see one, re-check Steps 3-5 landed in the right order with matching `<>`/`)}` pairs).

- [ ] **Step 7: Commit**

```bash
git add medisopimed-landing/src/components/admin/ServiciosDashboard.tsx
git commit -m "feat(admin): wire type picker and Comerciales/Operativos tabs into ServiciosDashboard"
```

---

### Task 7: End-to-end manual verification

**Files:** none (verification only).

Requires Tasks 1-6 all merged, and a dev database with migrations 001-028 applied (`npm run migrate` from `apps/backend/`, per Task 1 Step 3).

- [ ] **Step 1: Start both dev servers**

```bash
cd apps/backend && npm run dev
```
(in a second terminal)
```bash
cd medisopimed-landing && npm run dev
```

- [ ] **Step 2: Log in as ADMIN and open Gestión de Servicios**

Navigate to the admin panel, log in, go to **Servicios**.
Expected: page loads on the **Operativos** tab, showing the existing service list exactly as before this feature (no regressions).

- [ ] **Step 3: Create an Operativo and confirm it's unaffected**

Click **Nuevo Servicio** → **Operativo**. Fill out the existing 4-step form (any valid RIPS classification) and save.
Expected: same success toast as before ("... creadas ✓" or a CuidameDoc warning if the local doc-sync backend isn't reachable in dev — either way, this confirms the operativo path is untouched). The new service appears in the Operativos tab.

- [ ] **Step 4: Create a Comercial linked to it**

Click **Nuevo Servicio** → **Comercial** (this switches you to the Comerciales tab). Click **Nuevo Comercial**. Confirm the operativo created in Step 3 appears in the "Servicio operativo asociado" dropdown. Fill in name, description, upload an image, save.
Expected: toast "Servicio comercial creado ✓", card appears in the Comerciales grid with the image, name, linked operativo name, and "Activo" badge.

- [ ] **Step 5: Confirm no CuidameDoc call happened for the Comercial**

Open the browser Network tab while repeating Step 4 (or editing the comercial). Confirm there is **no** request to any `doc-api.cuidame.tech` / `/api/services/catalog` URL triggered by the comercial create/update/delete calls — only requests to `/api/services/commercial*` and `/api/services/operativos`.

- [ ] **Step 6: Edit, toggle, and delete the Comercial**

In the Comerciales tab: click edit on the card, change the name, save (confirm it updates in place). Click the toggle icon (confirm badge flips to "Inactivo" and back). Click delete (confirm the card disappears and a fresh page load doesn't bring it back).

- [ ] **Step 7: Confirm the Operativos tab still works standalone**

Switch back to the Operativos tab. Edit the operativo created in Step 3 (change its price). Confirm the existing update flow, filters, and search still behave exactly as before this feature.
