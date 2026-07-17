# Inventario con precio + Cotizaciones externas en Finanzas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Frontend tasks (8 and 9) additionally require:** invoke the `frontend-design` and `emil-design-eng` skills before writing any JSX/styling in those two tasks — this repo's admin UI (`InventarioDashboard.tsx`, `FinanzasDashboard.tsx`) has a distinct visual language (Bodoni Moda headings, Hanken Grotesk body, purple/blue gradient accents, glass cards) that must be matched, not reinvented.

**Goal:** Give Medis a real backend for Inventario (with price) and a new "Cotizaciones externas" record type, both exposed via API, so a separate system (CuidameDoc) can look up prices and register a quote that shows up in Medis's Finanzas screen as a pending income to confirm/reject.

**Architecture:** Two new Postgres tables (`inventory_items`, `external_quotes`) each with a thin repository → controller → routes stack, following the exact pattern already used by `memberships` (see `apps/backend/src/{repositories,controllers,routes}/membership*`). Inventory's GET is public (read-only catalog lookup); `external_quotes`'s write endpoint is protected by a shared API key header (new middleware) since it's called server-to-server, not by a logged-in admin. `InventarioDashboard.tsx` moves off `localStorage` onto the new endpoints; `FinanzasDashboard.tsx` gains a third tab reusing its existing pending/confirm/reject visual pattern.

**Tech Stack:** Express 4 + `pg` (raw SQL, no ORM), TypeScript with `@alias/*` path imports, `tsx --test` (Node's built-in test runner) for backend tests run against the real dev Postgres via `DATABASE_URL`, React 18 + framer-motion + lucide-react (inline `style=` objects, no CSS framework) for the frontend.

## Global Constraints

- Money is stored as **integer COP** (no decimals), matching `memberships.price` — never use `NUMERIC`/floats for new price columns.
- All new tables get `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` and `created_at`/`updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, matching every existing migration.
- Response envelope is always `{ success: boolean, data: {...} }` on success or `{ success: false, error: string }` on failure — never deviate from this shape.
- New backend files use the `@alias/*.js` import style (note the `.js` extension on relative-looking imports — this is an ESM+TS requirement already used throughout, e.g. `import { pool } from '@config/database.js'`).
- Admin-only routes use `authenticate, authorize('ADMIN')` from `@middleware/auth.middleware.js` — never invent a different auth check.
- Frontend admin components read the JWT via `localStorage.getItem('accessToken')` and call relative `/api/...` paths (same-origin, proxied) — never hardcode a backend origin.

---

### Task 1: Migration — `inventory_items` table

**Files:**
- Create: `apps/backend/migrations/019_create_inventory_items.sql`
- Modify: `apps/backend/src/scripts/run-migration.ts` (register the new migration)

**Interfaces:**
- Produces: table `inventory_items(id, name, category, unit, price, quantity, min_stock, notes, is_active, created_at, updated_at)`, consumed by Task 3's repository.

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- Migration 019: Inventory items (Insumos, medicamentos, equipos)
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(150) NOT NULL,
  category     VARCHAR(50)  NOT NULL,
  unit         VARCHAR(30)  NOT NULL,
  price        INTEGER      NOT NULL DEFAULT 0,
  quantity     INTEGER      NOT NULL DEFAULT 0,
  min_stock    INTEGER      NOT NULL DEFAULT 0,
  notes        TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items (is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items (category);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inventory_items_updated_at') THEN
    CREATE TRIGGER trg_inventory_items_updated_at
      BEFORE UPDATE ON inventory_items
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
```

Save this at `apps/backend/migrations/019_create_inventory_items.sql`.

- [ ] **Step 2: Register migration 019 in the runner**

Open `apps/backend/src/scripts/run-migration.ts`. Immediately before the `console.log('\n🌟 MIGRATIONS COMPLETE! 🌟');` line (currently the last thing before the `catch`), insert:

```ts
    // Run migration 019
    console.log('🔄 Running migration 019 (Inventory Items)...');
    const sql019 = fs.readFileSync(
      path.resolve('migrations', '019_create_inventory_items.sql'),
      'utf8'
    );
    await pool.query(sql019);
    console.log('✅ Migration 019 successful!');

```

- [ ] **Step 3: Run the migration against the dev DB**

Run: `cd apps/backend && pnpm run migrate`
Expected: output ends with `✅ Migration 019 successful!` then `🌟 MIGRATIONS COMPLETE! 🌟`, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/migrations/019_create_inventory_items.sql apps/backend/src/scripts/run-migration.ts
git commit -m "feat(backend): add inventory_items table migration"
```

---

### Task 2: Migration — `external_quotes` table

**Files:**
- Create: `apps/backend/migrations/020_create_external_quotes.sql`
- Modify: `apps/backend/src/scripts/run-migration.ts` (register, right after 019)

**Interfaces:**
- Produces: table `external_quotes(id, source, external_reference, patient_name, patient_email, professional_name, items, total_amount, status, resolved_by, resolved_at, created_at, updated_at)`, consumed by Task 4's repository.

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- Migration 020: External quotes (cotizaciones desde sistemas externos, ej. CuidameDoc)
-- ============================================================

CREATE TABLE IF NOT EXISTS external_quotes (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source              VARCHAR(30)  NOT NULL DEFAULT 'cuidamedoc',
  external_reference  VARCHAR(100),
  patient_name        VARCHAR(150) NOT NULL,
  patient_email       VARCHAR(150),
  professional_name   VARCHAR(150),
  items               JSONB        NOT NULL,
  total_amount        INTEGER      NOT NULL,
  status              VARCHAR(20)  NOT NULL DEFAULT 'pending',
  resolved_by         VARCHAR(150),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_external_quotes_status CHECK (status IN ('pending', 'confirmed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_external_quotes_status ON external_quotes (status);
CREATE INDEX IF NOT EXISTS idx_external_quotes_source ON external_quotes (source);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_external_quotes_updated_at') THEN
    CREATE TRIGGER trg_external_quotes_updated_at
      BEFORE UPDATE ON external_quotes
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
```

Save this at `apps/backend/migrations/020_create_external_quotes.sql`.

- [ ] **Step 2: Register migration 020 in the runner**

In `apps/backend/src/scripts/run-migration.ts`, right after the migration-019 block added in Task 1 (still before `console.log('\n🌟 MIGRATIONS COMPLETE! 🌟');`), insert:

```ts
    // Run migration 020
    console.log('🔄 Running migration 020 (External Quotes)...');
    const sql020 = fs.readFileSync(
      path.resolve('migrations', '020_create_external_quotes.sql'),
      'utf8'
    );
    await pool.query(sql020);
    console.log('✅ Migration 020 successful!');

```

- [ ] **Step 3: Run the migration against the dev DB**

Run: `cd apps/backend && pnpm run migrate`
Expected: output ends with `✅ Migration 020 successful!` then `🌟 MIGRATIONS COMPLETE! 🌟`, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/migrations/020_create_external_quotes.sql apps/backend/src/scripts/run-migration.ts
git commit -m "feat(backend): add external_quotes table migration"
```

---

### Task 3: Inventory types + repository (TDD)

**Files:**
- Create: `apps/backend/src/types/inventory.types.ts`
- Create: `apps/backend/src/repositories/inventory.repository.ts`
- Test: `apps/backend/src/repositories/inventory.repository.test.ts`

**Interfaces:**
- Consumes: `pool` from `@config/database.js` (Task 1's `inventory_items` table must exist).
- Produces: `InventoryRepository` object with `listAll(): Promise<InventoryItemPublic[]>`, `listActive(filters?: { search?: string; category?: string }): Promise<InventoryItemPublic[]>`, `findById(id: string): Promise<InventoryItemPublic | null>`, `create(dto: CreateInventoryItemDto): Promise<InventoryItemPublic>`, `update(id: string, dto: UpdateInventoryItemDto): Promise<InventoryItemPublic | null>`, `delete(id: string): Promise<boolean>` (soft-delete: sets `is_active = false`). Consumed by Task 6's controller.
- `InventoryItemPublic` shape: `{ id, name, category, unit, price, quantity, minStock, notes, isActive }`.

- [ ] **Step 1: Write types**

```ts
// apps/backend/src/types/inventory.types.ts
export interface InventoryItemRecord {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity: number;
  min_stock: number;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItemPublic {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity: number;
  minStock: number;
  notes: string | null;
  isActive: boolean;
}

export interface CreateInventoryItemDto {
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity?: number;
  minStock?: number;
  notes?: string | null;
  isActive?: boolean;
}

export type UpdateInventoryItemDto = Partial<CreateInventoryItemDto>;

export interface InventorySearchFilters {
  search?: string;
  category?: string;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/backend/src/repositories/inventory.repository.test.ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { InventoryRepository } from './inventory.repository.js';
import { pool } from '@config/database.js';

after(async () => {
  await pool.end();
});

test('create() inserts an item and listActive() finds it by search', async () => {
  const created = await InventoryRepository.create({
    name: 'Guantes de nitrilo talla M (test)',
    category: 'Insumos médicos',
    unit: 'cajas',
    price: 25000,
    quantity: 10,
    minStock: 3,
  });

  try {
    assert.equal(created.name, 'Guantes de nitrilo talla M (test)');
    assert.equal(created.price, 25000);
    assert.equal(created.isActive, true);

    const found = await InventoryRepository.listActive({ search: 'nitrilo' });
    assert.ok(found.some((i) => i.id === created.id));
  } finally {
    await InventoryRepository.delete(created.id);
  }
});

test('delete() soft-deletes: item disappears from listActive() but findById() still returns it', async () => {
  const created = await InventoryRepository.create({
    name: 'Ítem temporal para borrar (test)',
    category: 'Equipos',
    unit: 'unidades',
    price: 100000,
  });

  const deleted = await InventoryRepository.delete(created.id);
  assert.equal(deleted, true);

  const active = await InventoryRepository.listActive({ search: 'temporal para borrar' });
  assert.equal(active.some((i) => i.id === created.id), false);

  const stillThere = await InventoryRepository.findById(created.id);
  assert.equal(stillThere?.isActive, false);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/backend && pnpm exec tsx --test src/repositories/inventory.repository.test.ts`
Expected: FAIL — `Cannot find module './inventory.repository.js'` (file doesn't exist yet).

- [ ] **Step 4: Write the repository implementation**

```ts
// apps/backend/src/repositories/inventory.repository.ts
import { pool } from '@config/database.js';
import type {
  InventoryItemRecord,
  InventoryItemPublic,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventorySearchFilters,
} from '../types/inventory.types.js';

function toPublic(r: InventoryItemRecord): InventoryItemPublic {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    unit: r.unit,
    price: r.price,
    quantity: r.quantity,
    minStock: r.min_stock,
    notes: r.notes,
    isActive: r.is_active,
  };
}

export const InventoryRepository = {
  async listAll(): Promise<InventoryItemPublic[]> {
    const { rows } = await pool.query<InventoryItemRecord>(
      `SELECT * FROM inventory_items ORDER BY name ASC`
    );
    return rows.map(toPublic);
  },

  async listActive(filters: InventorySearchFilters = {}): Promise<InventoryItemPublic[]> {
    const conditions: string[] = ['is_active = TRUE'];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.search) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${filters.search}%`);
    }
    if (filters.category) {
      conditions.push(`category = $${idx++}`);
      values.push(filters.category);
    }

    const { rows } = await pool.query<InventoryItemRecord>(
      `SELECT * FROM inventory_items WHERE ${conditions.join(' AND ')} ORDER BY name ASC`,
      values
    );
    return rows.map(toPublic);
  },

  async findById(id: string): Promise<InventoryItemPublic | null> {
    const { rows } = await pool.query<InventoryItemRecord>(
      `SELECT * FROM inventory_items WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async create(dto: CreateInventoryItemDto): Promise<InventoryItemPublic> {
    const { rows } = await pool.query<InventoryItemRecord>(
      `INSERT INTO inventory_items (name, category, unit, price, quantity, min_stock, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.name,
        dto.category,
        dto.unit,
        dto.price,
        dto.quantity ?? 0,
        dto.minStock ?? 0,
        dto.notes ?? null,
        dto.isActive ?? true,
      ]
    );
    return toPublic(rows[0]);
  },

  async update(id: string, dto: UpdateInventoryItemDto): Promise<InventoryItemPublic | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined)      { fields.push(`name = $${idx++}`);      values.push(dto.name); }
    if (dto.category !== undefined)  { fields.push(`category = $${idx++}`);  values.push(dto.category); }
    if (dto.unit !== undefined)      { fields.push(`unit = $${idx++}`);      values.push(dto.unit); }
    if (dto.price !== undefined)     { fields.push(`price = $${idx++}`);     values.push(dto.price); }
    if (dto.quantity !== undefined)  { fields.push(`quantity = $${idx++}`);  values.push(dto.quantity); }
    if (dto.minStock !== undefined)  { fields.push(`min_stock = $${idx++}`); values.push(dto.minStock); }
    if (dto.notes !== undefined)     { fields.push(`notes = $${idx++}`);     values.push(dto.notes); }
    if (dto.isActive !== undefined)  { fields.push(`is_active = $${idx++}`); values.push(dto.isActive); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query<InventoryItemRecord>(
      `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE inventory_items SET is_active = FALSE WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/backend && pnpm exec tsx --test src/repositories/inventory.repository.test.ts`
Expected: PASS — `2 tests passed`, no failures. (Requires `DATABASE_URL` in `apps/backend/.env` pointing at the dev DB with migration 019 applied from Task 1.)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/types/inventory.types.ts apps/backend/src/repositories/inventory.repository.ts apps/backend/src/repositories/inventory.repository.test.ts
git commit -m "feat(backend): add InventoryRepository with tests"
```

---

### Task 4: External quote types + repository (TDD)

**Files:**
- Create: `apps/backend/src/types/external-quote.types.ts`
- Create: `apps/backend/src/repositories/external-quote.repository.ts`
- Test: `apps/backend/src/repositories/external-quote.repository.test.ts`

**Interfaces:**
- Consumes: `pool` from `@config/database.js` (Task 2's `external_quotes` table must exist).
- Produces: `ExternalQuoteRepository` object with `listByStatus(status?: 'pending'|'confirmed'|'rejected'): Promise<ExternalQuotePublic[]>`, `findById(id: string): Promise<ExternalQuotePublic | null>`, `create(dto: CreateExternalQuoteDto): Promise<ExternalQuotePublic>`, `resolve(id: string, status: 'confirmed'|'rejected', resolvedBy: string): Promise<ExternalQuotePublic | null>`. Consumed by Task 7's controller.
- `ExternalQuoteItem` shape (also used by Task 9's frontend when rendering `items`): `{ type: 'inventory' | 'plan'; refId: string; name: string; unitPrice: number; quantity: number; subtotal: number }`.
- `ExternalQuotePublic` shape: `{ id, source, externalReference, patientName, patientEmail, professionalName, items: ExternalQuoteItem[], totalAmount, status, resolvedBy, resolvedAt, createdAt }`.

- [ ] **Step 1: Write types**

```ts
// apps/backend/src/types/external-quote.types.ts
export type ExternalQuoteStatus = 'pending' | 'confirmed' | 'rejected';

export interface ExternalQuoteItem {
  type: 'inventory' | 'plan';
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ExternalQuoteRecord {
  id: string;
  source: string;
  external_reference: string | null;
  patient_name: string;
  patient_email: string | null;
  professional_name: string | null;
  items: ExternalQuoteItem[];
  total_amount: number;
  status: ExternalQuoteStatus;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ExternalQuotePublic {
  id: string;
  source: string;
  externalReference: string | null;
  patientName: string;
  patientEmail: string | null;
  professionalName: string | null;
  items: ExternalQuoteItem[];
  totalAmount: number;
  status: ExternalQuoteStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface CreateExternalQuoteDto {
  source?: string;
  externalReference?: string;
  patientName: string;
  patientEmail?: string;
  professionalName?: string;
  items: ExternalQuoteItem[];
  totalAmount: number;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/backend/src/repositories/external-quote.repository.test.ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { ExternalQuoteRepository } from './external-quote.repository.js';
import { pool } from '@config/database.js';

after(async () => {
  await pool.end();
});

const SAMPLE_ITEMS = [
  { type: 'inventory' as const, refId: 'fake-inv-1', name: 'Acetaminofén 500mg (test)', unitPrice: 5000, quantity: 2, subtotal: 10000 },
  { type: 'plan' as const, refId: 'fake-plan-1', name: 'Consulta Privada (test)', unitPrice: 120000, quantity: 1, subtotal: 120000 },
];

test('create() inserts a pending quote, listByStatus("pending") finds it, resolve() confirms it', async () => {
  const created = await ExternalQuoteRepository.create({
    externalReference: 'HC-TEST-0001',
    patientName: 'Paciente de Prueba',
    patientEmail: 'paciente-test@example.com',
    professionalName: 'Dra. Diana (test)',
    items: SAMPLE_ITEMS,
    totalAmount: 130000,
  });

  assert.equal(created.status, 'pending');
  assert.equal(created.totalAmount, 130000);
  assert.equal(created.items.length, 2);
  assert.equal(created.source, 'cuidamedoc');

  const pending = await ExternalQuoteRepository.listByStatus('pending');
  assert.ok(pending.some((q) => q.id === created.id));

  const resolved = await ExternalQuoteRepository.resolve(created.id, 'confirmed', 'admin-test@medis.com');
  assert.equal(resolved?.status, 'confirmed');
  assert.equal(resolved?.resolvedBy, 'admin-test@medis.com');
  assert.ok(resolved?.resolvedAt);

  const stillPending = await ExternalQuoteRepository.listByStatus('pending');
  assert.equal(stillPending.some((q) => q.id === created.id), false);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/backend && pnpm exec tsx --test src/repositories/external-quote.repository.test.ts`
Expected: FAIL — `Cannot find module './external-quote.repository.js'` (file doesn't exist yet).

- [ ] **Step 4: Write the repository implementation**

```ts
// apps/backend/src/repositories/external-quote.repository.ts
import { pool } from '@config/database.js';
import type {
  ExternalQuoteRecord,
  ExternalQuotePublic,
  CreateExternalQuoteDto,
  ExternalQuoteStatus,
} from '../types/external-quote.types.js';

function toPublic(r: ExternalQuoteRecord): ExternalQuotePublic {
  return {
    id: r.id,
    source: r.source,
    externalReference: r.external_reference,
    patientName: r.patient_name,
    patientEmail: r.patient_email,
    professionalName: r.professional_name,
    items: r.items,
    totalAmount: r.total_amount,
    status: r.status,
    resolvedBy: r.resolved_by,
    resolvedAt: r.resolved_at ? r.resolved_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
  };
}

export const ExternalQuoteRepository = {
  async listByStatus(status?: ExternalQuoteStatus): Promise<ExternalQuotePublic[]> {
    if (status) {
      const { rows } = await pool.query<ExternalQuoteRecord>(
        `SELECT * FROM external_quotes WHERE status = $1 ORDER BY created_at DESC`,
        [status]
      );
      return rows.map(toPublic);
    }
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `SELECT * FROM external_quotes ORDER BY created_at DESC`
    );
    return rows.map(toPublic);
  },

  async findById(id: string): Promise<ExternalQuotePublic | null> {
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `SELECT * FROM external_quotes WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async create(dto: CreateExternalQuoteDto): Promise<ExternalQuotePublic> {
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `INSERT INTO external_quotes
         (source, external_reference, patient_name, patient_email, professional_name, items, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        dto.source ?? 'cuidamedoc',
        dto.externalReference ?? null,
        dto.patientName,
        dto.patientEmail ?? null,
        dto.professionalName ?? null,
        JSON.stringify(dto.items),
        dto.totalAmount,
      ]
    );
    return toPublic(rows[0]);
  },

  async resolve(id: string, status: 'confirmed' | 'rejected', resolvedBy: string): Promise<ExternalQuotePublic | null> {
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `UPDATE external_quotes
       SET status = $1, resolved_by = $2, resolved_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [status, resolvedBy, id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/backend && pnpm exec tsx --test src/repositories/external-quote.repository.test.ts`
Expected: PASS — `1 test passed`, no failures. (Requires migration 020 from Task 2 applied.)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/types/external-quote.types.ts apps/backend/src/repositories/external-quote.repository.ts apps/backend/src/repositories/external-quote.repository.test.ts
git commit -m "feat(backend): add ExternalQuoteRepository with tests"
```

---

### Task 5: Internal API key middleware

**Files:**
- Create: `apps/backend/src/middleware/internal-api-key.middleware.ts`
- Modify: `apps/backend/src/config/env.ts` (add `DIANA_INTERNAL_API_KEY`)
- Modify: `apps/backend/.env.example` (document the new var)

**Interfaces:**
- Produces: `requireInternalApiKey(req, res, next)` Express middleware, and `env.DIANA_INTERNAL_API_KEY: string`. Consumed by Task 7's routes.

- [ ] **Step 1: Add the env var**

In `apps/backend/src/config/env.ts`, add to the `Env` interface (after `DOC_DIANA_PASSWORD: string;`):

```ts
  DIANA_INTERNAL_API_KEY: string;
```

And add to the exported `env` object (after `DOC_DIANA_PASSWORD: process.env.DOC_DIANA_PASSWORD || '',`):

```ts
  DIANA_INTERNAL_API_KEY: process.env.DIANA_INTERNAL_API_KEY || '',
```

- [ ] **Step 2: Document it in `.env.example`**

Find `apps/backend/.env.example` and add at the end:

```
# Clave compartida para endpoints internos llamados server-to-server por otros
# sistemas (ej. CuidameDoc registrando una cotización). No confundir con JWT_SECRET.
DIANA_INTERNAL_API_KEY=
```

- [ ] **Step 3: Write the middleware**

```ts
// apps/backend/src/middleware/internal-api-key.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { env } from '@config/env';

export function requireInternalApiKey(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-internal-api-key'];

  if (!env.DIANA_INTERNAL_API_KEY || provided !== env.DIANA_INTERNAL_API_KEY) {
    res.status(401).json({ success: false, error: 'API key interna inválida o ausente.' });
    return;
  }

  next();
}
```

- [ ] **Step 4: Set a real key locally and verify env loads**

Run: `cd apps/backend && node -e "require('dotenv').config(); console.log(process.env.DIANA_INTERNAL_API_KEY ? 'set' : 'MISSING — add DIANA_INTERNAL_API_KEY to .env')"`
Expected: prints `set` if you already added a value to your local `.env`, otherwise add a random string (e.g. `DIANA_INTERNAL_API_KEY=<paste output of: openssl rand -hex 24>`) to `apps/backend/.env` and re-run.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/middleware/internal-api-key.middleware.ts apps/backend/src/config/env.ts apps/backend/.env.example
git commit -m "feat(backend): add shared API key middleware for internal server-to-server endpoints"
```

---

### Task 6: Inventory controller + routes

**Files:**
- Create: `apps/backend/src/controllers/inventory.controller.ts`
- Create: `apps/backend/src/routes/inventory.routes.ts`
- Modify: `apps/backend/src/routes/index.ts` (mount at `/inventory`)

**Interfaces:**
- Consumes: `InventoryRepository` from Task 3, `authenticate`/`authorize` from `@middleware/auth.middleware.js`.
- Produces: `GET /api/inventory/search` (public), `GET /api/inventory` (admin), `POST /api/inventory` (admin), `PATCH /api/inventory/:id` (admin), `DELETE /api/inventory/:id` (admin). Consumed by Task 8's frontend and, later, by CuidameDoc's Proyecto B proxy.

- [ ] **Step 1: Write the controller**

```ts
// apps/backend/src/controllers/inventory.controller.ts
import type { Request, Response } from 'express';
import { InventoryRepository } from '@repositories/inventory.repository.js';

export async function searchInventory(req: Request, res: Response): Promise<void> {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const items = await InventoryRepository.listActive({ search, category });
    res.json({ success: true, data: { items } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function listInventory(_req: Request, res: Response): Promise<void> {
  try {
    const items = await InventoryRepository.listAll();
    res.json({ success: true, data: { items } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    const { name, category, unit, price } = req.body;
    if (!name || !category || !unit || price === undefined) {
      res.status(400).json({ success: false, error: 'Faltan campos requeridos: name, category, unit, price' });
      return;
    }
    if (typeof price !== 'number' || price < 0) {
      res.status(400).json({ success: false, error: 'price debe ser un número mayor o igual a 0' });
      return;
    }
    const item = await InventoryRepository.create(req.body);
    res.status(201).json({ success: true, data: { item } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    if (req.body.price !== undefined && (typeof req.body.price !== 'number' || req.body.price < 0)) {
      res.status(400).json({ success: false, error: 'price debe ser un número mayor o igual a 0' });
      return;
    }
    const item = await InventoryRepository.update(req.params.id, req.body);
    if (!item) { res.status(404).json({ success: false, error: 'Ítem no encontrado' }); return; }
    res.json({ success: true, data: { item } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await InventoryRepository.delete(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, error: 'Ítem no encontrado o ya inactivo' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
```

- [ ] **Step 2: Write the routes**

```ts
// apps/backend/src/routes/inventory.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import {
  searchInventory,
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '@controllers/inventory.controller.js';

const router: Router = Router();

// Público — búsqueda de catálogo activo (usado por CuidameDoc vía proxy)
router.get('/search', searchInventory);

// Admin — CRUD completo
router.get(   '/',     authenticate, authorize('ADMIN'), listInventory);
router.post(  '/',     authenticate, authorize('ADMIN'), createInventoryItem);
router.patch( '/:id',  authenticate, authorize('ADMIN'), updateInventoryItem);
router.delete('/:id',  authenticate, authorize('ADMIN'), deleteInventoryItem);

export default router;
```

- [ ] **Step 3: Mount the routes**

In `apps/backend/src/routes/index.ts`, add the import (after `import discountsRoutes from './discounts.routes.js';`):

```ts
import inventoryRoutes from './inventory.routes.js';
```

And add the mount (after `router.use('/discounts', discountsRoutes);`):

```ts
router.use('/inventory', inventoryRoutes);
```

- [ ] **Step 4: Manual verification against the running dev server**

Run: `cd apps/backend && pnpm run dev` (leave running)

In another terminal, create an item as admin (replace `<ADMIN_JWT>` with a real admin token obtained via `POST /api/auth/login`):

```bash
curl -s -X POST http://localhost:3008/api/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -d '{"name":"Guantes de nitrilo talla M","category":"Insumos médicos","unit":"cajas","price":25000,"quantity":10,"minStock":3}'
```
Expected: `{"success":true,"data":{"item":{"id":"...","name":"Guantes de nitrilo talla M","category":"Insumos médicos","unit":"cajas","price":25000,"quantity":10,"minStock":3,"notes":null,"isActive":true}}}`

Then verify the public search finds it without auth:
```bash
curl -s "http://localhost:3008/api/inventory/search?search=nitrilo"
```
Expected: `{"success":true,"data":{"items":[{"...","name":"Guantes de nitrilo talla M",...}]}}`

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/controllers/inventory.controller.ts apps/backend/src/routes/inventory.routes.ts apps/backend/src/routes/index.ts
git commit -m "feat(backend): expose inventory CRUD + public search endpoints"
```

---

### Task 7: External quotes controller + routes

**Files:**
- Create: `apps/backend/src/controllers/external-quotes.controller.ts`
- Create: `apps/backend/src/routes/external-quotes.routes.ts`
- Modify: `apps/backend/src/routes/index.ts` (mount at `/external-quotes`)

**Interfaces:**
- Consumes: `ExternalQuoteRepository` from Task 4, `requireInternalApiKey` from Task 5, `authenticate`/`authorize` from `@middleware/auth.middleware.js`.
- Produces: `POST /api/external-quotes` (API key), `GET /api/external-quotes?status=` (admin), `PATCH /api/external-quotes/:id/confirm` (admin), `PATCH /api/external-quotes/:id/reject` (admin). Consumed by Task 9's frontend and, later, by CuidameDoc's Proyecto B.

- [ ] **Step 1: Write the controller**

```ts
// apps/backend/src/controllers/external-quotes.controller.ts
import type { Request, Response } from 'express';
import { ExternalQuoteRepository } from '@repositories/external-quote.repository.js';
import type { ExternalQuoteItem, ExternalQuoteStatus } from '../types/external-quote.types.js';

function isValidItems(items: unknown): items is ExternalQuoteItem[] {
  return Array.isArray(items) && items.every((it) =>
    it && typeof it === 'object' &&
    (it.type === 'inventory' || it.type === 'plan') &&
    typeof it.refId === 'string' &&
    typeof it.name === 'string' &&
    typeof it.unitPrice === 'number' &&
    typeof it.quantity === 'number' &&
    typeof it.subtotal === 'number'
  );
}

export async function createExternalQuote(req: Request, res: Response): Promise<void> {
  try {
    const { patientName, items, totalAmount } = req.body;
    if (!patientName || typeof patientName !== 'string') {
      res.status(400).json({ success: false, error: 'patientName es requerido' });
      return;
    }
    if (!isValidItems(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'items debe ser un arreglo no vacío con la forma { type, refId, name, unitPrice, quantity, subtotal }' });
      return;
    }
    if (typeof totalAmount !== 'number' || totalAmount < 0) {
      res.status(400).json({ success: false, error: 'totalAmount debe ser un número mayor o igual a 0' });
      return;
    }

    const quote = await ExternalQuoteRepository.create(req.body);
    res.status(201).json({ success: true, data: { quote } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function listExternalQuotes(req: Request, res: Response): Promise<void> {
  try {
    const status = typeof req.query.status === 'string' ? (req.query.status as ExternalQuoteStatus) : undefined;
    const quotes = await ExternalQuoteRepository.listByStatus(status);
    res.json({ success: true, data: { quotes } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

async function resolveQuote(req: Request, res: Response, status: 'confirmed' | 'rejected'): Promise<void> {
  try {
    const resolvedBy = req.user?.email ?? 'admin';
    const quote = await ExternalQuoteRepository.resolve(req.params.id, status, resolvedBy);
    if (!quote) {
      res.status(409).json({ success: false, error: 'La cotización no existe o ya fue resuelta' });
      return;
    }
    res.json({ success: true, data: { quote } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function confirmExternalQuote(req: Request, res: Response): Promise<void> {
  await resolveQuote(req, res, 'confirmed');
}

export async function rejectExternalQuote(req: Request, res: Response): Promise<void> {
  await resolveQuote(req, res, 'rejected');
}
```

- [ ] **Step 2: Write the routes**

```ts
// apps/backend/src/routes/external-quotes.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { requireInternalApiKey } from '@middleware/internal-api-key.middleware.js';
import {
  createExternalQuote,
  listExternalQuotes,
  confirmExternalQuote,
  rejectExternalQuote,
} from '@controllers/external-quotes.controller.js';

const router: Router = Router();

// Server-to-server — protegido por API key compartida, no por JWT de usuario
router.post('/', requireInternalApiKey, createExternalQuote);

// Admin
router.get(   '/',            authenticate, authorize('ADMIN'), listExternalQuotes);
router.patch( '/:id/confirm', authenticate, authorize('ADMIN'), confirmExternalQuote);
router.patch( '/:id/reject',  authenticate, authorize('ADMIN'), rejectExternalQuote);

export default router;
```

- [ ] **Step 3: Mount the routes**

In `apps/backend/src/routes/index.ts`, add the import (after `import inventoryRoutes from './inventory.routes.js';` from Task 6):

```ts
import externalQuotesRoutes from './external-quotes.routes.js';
```

And add the mount (after `router.use('/inventory', inventoryRoutes);`):

```ts
router.use('/external-quotes', externalQuotesRoutes);
```

- [ ] **Step 4: Manual verification against the running dev server**

With `pnpm run dev` still running and `DIANA_INTERNAL_API_KEY` set in `apps/backend/.env` (from Task 5):

```bash
curl -s -X POST http://localhost:3008/api/external-quotes \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: <same value as DIANA_INTERNAL_API_KEY in .env>" \
  -d '{
    "externalReference": "HC-1783823379251",
    "patientName": "Juana Pérez",
    "patientEmail": "juana@example.com",
    "professionalName": "Dra. Diana",
    "items": [
      { "type": "inventory", "refId": "fake-id", "name": "Acetaminofén 500mg", "unitPrice": 5000, "quantity": 2, "subtotal": 10000 }
    ],
    "totalAmount": 10000
  }'
```
Expected: `{"success":true,"data":{"quote":{"id":"...","status":"pending","totalAmount":10000,...}}}`

Then confirm a missing/wrong key is rejected:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3008/api/external-quotes \
  -H "Content-Type: application/json" -d '{"patientName":"x","items":[],"totalAmount":0}'
```
Expected: `401`

Then, as admin, list and confirm it:
```bash
curl -s "http://localhost:3008/api/external-quotes?status=pending" -H "Authorization: Bearer <ADMIN_JWT>"
curl -s -X PATCH "http://localhost:3008/api/external-quotes/<id from above>/confirm" -H "Authorization: Bearer <ADMIN_JWT>"
```
Expected: second call returns `{"success":true,"data":{"quote":{"status":"confirmed",...}}}`

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/controllers/external-quotes.controller.ts apps/backend/src/routes/external-quotes.routes.ts apps/backend/src/routes/index.ts
git commit -m "feat(backend): expose external-quotes endpoints (create via API key, admin review)"
```

---

### Task 8: Frontend — `InventarioDashboard.tsx` off localStorage, onto the API, with a Precio field

> Invoke `frontend-design` and `emil-design-eng` skills before touching JSX/styling here — match the existing Bodoni Moda / Hanken Grotesk / purple-blue-gradient visual language already in this file, don't introduce a new one.

**Files:**
- Modify: `medisdiana-landing/src/components/admin/InventarioDashboard.tsx` (currently 424 lines, full localStorage-backed version read in full above)

**Interfaces:**
- Consumes: `GET /api/inventory` (admin, all items), `POST /api/inventory`, `PATCH /api/inventory/:id`, `DELETE /api/inventory/:id` (all from Task 6). Auth header pattern: mirror `adminHeaders()` from `FinanzasDashboard.tsx` (`Authorization: Bearer ${localStorage.getItem('accessToken')}`).

- [ ] **Step 1: Replace the `InventoryItem` interface and remove localStorage plumbing**

Replace lines 22–58 (from `// Sin API de inventario...` through `const EMPTY_FORM...`) with:

```tsx
function adminHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  minStock: number
  unit: string
  price: number
  notes: string
  updatedAt: string
}

type ItemStatus = 'ok' | 'low' | 'out'

function itemStatus(it: InventoryItem): ItemStatus {
  if (it.quantity <= 0) return 'out'
  if (it.quantity <= it.minStock) return 'low'
  return 'ok'
}

const STATUS_META: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  ok:  { label: 'Disponible', color: '#16A34A', bg: 'rgba(34,197,94,0.10)' },
  low: { label: 'Stock bajo', color: '#D97706', bg: 'rgba(245,158,11,0.12)' },
  out: { label: 'Agotado',    color: '#DC2626', bg: 'rgba(239,68,68,0.10)' },
}

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

interface ApiInventoryItem {
  id: string; name: string; category: string; unit: string
  price: number; quantity: number; minStock: number
  notes: string | null; isActive: boolean
}

function fromApi(it: ApiInventoryItem): InventoryItem {
  return { id: it.id, name: it.name, category: it.category, quantity: it.quantity, minStock: it.minStock, unit: it.unit, price: it.price, notes: it.notes ?? '', updatedAt: '' }
}

interface FormState {
  name: string; category: string; quantity: string; minStock: string; unit: string; price: string; notes: string
}
const EMPTY_FORM: FormState = { name: '', category: CATEGORIES[0], quantity: '', minStock: '', unit: UNITS[0], price: '', notes: '' }
```

- [ ] **Step 2: Replace `loadItems`/local `items` state with a fetch-backed loader**

Replace the line `const [items, setItems] = useState<InventoryItem[]>(loadItems)` (was line 62) with:

```tsx
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory', { headers: adminHeaders() })
      const data = await res.json()
      if (data.success) setItems(data.data.items.map(fromApi))
      else setApiError(data.error ?? 'Error al cargar inventario')
    } catch {
      setApiError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { fetchItems() }, [])
```

Delete the old `loadItems` function (was lines 50-53) — it's replaced by `fetchItems` above.

- [ ] **Step 3: Replace `persist()` (localStorage writer) with real API calls in `saveForm`, `adjustQuantity`, and the delete confirm button**

Delete the `persist` function (was lines 71-74).

Replace `saveForm` (was lines 101-121) with:

```tsx
  const [saving, setSaving] = useState(false)

  const saveForm = async () => {
    const name = form.name.trim()
    const quantity = Number(form.quantity)
    const minStock = Number(form.minStock || 0)
    const price = Number(form.price)
    if (!name) { setFormError('El nombre es requerido'); return }
    if (!Number.isFinite(price) || price < 0) { setFormError('Precio inválido'); return }
    if (!Number.isFinite(quantity) || quantity < 0) { setFormError('Cantidad inválida'); return }
    if (!Number.isFinite(minStock) || minStock < 0) { setFormError('Stock mínimo inválido'); return }

    setSaving(true)
    try {
      const body = { name, category: form.category, unit: form.unit, price, quantity, minStock, notes: form.notes.trim() || null }
      const res = editingId
        ? await fetch(`/api/inventory/${editingId}`, { method: 'PATCH', headers: adminHeaders(), body: JSON.stringify(body) })
        : await fetch('/api/inventory', { method: 'POST', headers: adminHeaders(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!data.success) { setFormError(data.error ?? 'Error al guardar'); return }
      setShowForm(false)
      await fetchItems()
    } catch {
      setFormError('No se pudo conectar con el servidor.')
    } finally {
      setSaving(false)
    }
  }
```

Replace `adjustQuantity` (was lines 123-127) with:

```tsx
  const adjustQuantity = async (it: InventoryItem, delta: number) => {
    const nextQuantity = Math.max(0, it.quantity + delta)
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, quantity: nextQuantity } : x))
    try {
      await fetch(`/api/inventory/${it.id}`, { method: 'PATCH', headers: adminHeaders(), body: JSON.stringify({ quantity: nextQuantity }) })
    } catch {
      await fetchItems()
    }
  }
```

Update its two call sites in the table (`onClick={() => adjustQuantity(it.id, -1)}` and `... (it.id, 1)`) to pass the whole item instead of just the id: `onClick={() => adjustQuantity(it, -1)}` and `onClick={() => adjustQuantity(it, 1)}`.

Replace the delete confirm button's `onClick` (was `onClick={() => { persist(items.filter(i => i.id !== deletingId)); setDeletingId(null) }}`) with:

```tsx
                <button onClick={async () => {
                  const id = deletingId
                  setDeletingId(null)
                  try {
                    await fetch(`/api/inventory/${id}`, { method: 'DELETE', headers: adminHeaders() })
                    await fetchItems()
                  } catch { /* ignore */ }
                }}
```

(Keep the rest of that `<button>`'s props/children unchanged — only the `onClick` body changes.)

- [ ] **Step 4: Update `openEdit` to seed the new `price` field**

Replace `openEdit` (was lines 94-99) with:

```tsx
  const openEdit = (it: InventoryItem) => {
    setEditingId(it.id)
    setForm({ name: it.name, category: it.category, quantity: String(it.quantity), minStock: String(it.minStock), unit: it.unit, price: String(it.price), notes: it.notes })
    setFormError('')
    setShowForm(true)
  }
```

- [ ] **Step 5: Add a Precio column to the table and a Precio field to the form**

In the table header array (was line 255), change:
```tsx
{['Ítem', 'Categoría', 'Cantidad', 'Stock mínimo', 'Estado', 'Acciones'].map(h => (
```
to:
```tsx
{['Ítem', 'Categoría', 'Precio', 'Cantidad', 'Stock mínimo', 'Estado', 'Acciones'].map(h => (
```

In the table body, right after the Categoría `<td>` (was lines 269, ending `</td>`), add a new cell:
```tsx
                          <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: C.text }}>{fmtPrice(it.price)}</td>
```

In the create/edit form, right after the "Nombre" field's closing `</div>` (was line 334, before the `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>` grid), add:
```tsx
                <div>
                  <label style={LABEL}>Precio (COP) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" min={0} value={form.price} placeholder="25000"
                    onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setFormError('') }}
                    style={INPUT} />
                </div>
```

- [ ] **Step 6: Show a loading/error state instead of a silently-empty table**

Right before `{filtered.length === 0 ? (` (was line 237), wrap with a loading/error guard:

```tsx
          {apiError && (
            <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 12, padding: '14px 18px', marginBottom: 16, fontSize: 13, color: '#D32F2F', fontWeight: 500 }}>
              {apiError}
            </div>
          )}
          {loading ? (
            <div style={{ background: C.white, border: `1px dashed ${C.border}`, borderRadius: 16, padding: '56px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Cargando inventario…</p>
            </div>
          ) : filtered.length === 0 ? (
```
(This changes the existing `{filtered.length === 0 ? (` ternary's opening into an `if/else-if` chain — keep the existing `) : ( ... table ... )}` closing exactly as-is, just add the new `loading ? (...) :` branch before it.)

- [ ] **Step 7: Also apply the same `price` field to `saveForm`'s edit-mode body and verify build**

(Already covered in Step 3's `saveForm` — the `body` object includes `price` for both create and edit.)

Run: `cd medisdiana-landing && npx tsc --noEmit -p . 2>&1 | grep -i inventario` (or run the full `npx tsc --noEmit` if the project has no per-file filtering) to confirm no new type errors were introduced in this file. Since this repo's deploy scripts run `vite build` directly (not `tsc -b`), a clean `vite build` is the real gate:

Run: `cd medisdiana-landing && npx vite build`
Expected: build succeeds (pre-existing unrelated warnings/errors in other files, if any, are not new — only check that no error references `InventarioDashboard.tsx`).

- [ ] **Step 8: Manual verification in the browser**

Run: `cd apps/backend && pnpm run dev` (if not already running) and `cd medisdiana-landing && npm run dev`, log in as admin, open `/admin/inventario`:
- Create a new item with a price → appears in the table with the price formatted as COP currency.
- Edit it, change the price → table updates.
- Use the +/- buttons → quantity updates and persists after a page refresh (confirms it's hitting the API, not localStorage).
- Delete it → disappears from the list (soft-deleted server-side).

- [ ] **Step 9: Commit**

```bash
git add medisdiana-landing/src/components/admin/InventarioDashboard.tsx
git commit -m "feat(frontend): back Inventario dashboard with real API + add Precio field"
```

---

### Task 9: Frontend — "Cotizaciones CuidameDoc" tab in `FinanzasDashboard.tsx`

> Invoke `frontend-design` and `emil-design-eng` skills before touching JSX/styling here — this tab must visually match the existing "Gestión de Planes" / "Servicios Adicionales" tabs in the same file (glass cards, pending/confirm/reject pill buttons, purple-blue gradients), not introduce a new style.

**Files:**
- Modify: `medisdiana-landing/src/components/admin/FinanzasDashboard.tsx` (875 lines, full contents read above)

**Interfaces:**
- Consumes: `GET /api/external-quotes?status=pending` (admin), `PATCH /api/external-quotes/:id/confirm`, `PATCH /api/external-quotes/:id/reject` (all from Task 7).

- [ ] **Step 1: Add the `ExternalQuote` type and state**

After the `PendingServicePayment` interface (was lines 56-69), add:

```tsx
interface ExternalQuoteItem {
  type: 'inventory' | 'plan';
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface ExternalQuote {
  id: string;
  externalReference: string | null;
  patientName: string;
  patientEmail: string | null;
  professionalName: string | null;
  items: ExternalQuoteItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}
```

Change the `activeTab` union (was line 167) from:
```tsx
const [activeTab, setActiveTab] = useState<'planes' | 'servicios'>('planes');
```
to:
```tsx
const [activeTab, setActiveTab] = useState<'planes' | 'servicios' | 'cotizaciones'>('planes');
```

After `const [pendingServices, setPendingServices] = useState<PendingServicePayment[]>([]);` (was line 172), add:
```tsx
  const [externalQuotes, setExternalQuotes] = useState<ExternalQuote[]>([]);
  const [confirmingQuoteId, setConfirmingQuoteId] = useState<string | null>(null);
  const [rejectingQuoteId, setRejectingQuoteId] = useState<string | null>(null);
```

- [ ] **Step 2: Add fetch + confirm/reject handlers**

After `fetchPendingServices` (was lines 205-211), add:

```tsx
  const fetchExternalQuotes = async () => {
    try {
      const res = await fetch('/api/external-quotes?status=pending', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setExternalQuotes(data.data.quotes);
    } catch { /* ignore */ }
  };
```

After `handleConfirmServicePayment` (was lines 289-305), add:

```tsx
  const handleConfirmQuote = async (id: string, patientName: string) => {
    setConfirmingQuoteId(id);
    try {
      const res = await fetch(`/api/external-quotes/${id}/confirm`, { method: 'PATCH', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al confirmar');
      setExternalQuotes(prev => prev.filter(q => q.id !== id));
      showPaymentToast(`Cotización de ${patientName} confirmada como ingreso.`, true);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setConfirmingQuoteId(null);
    }
  };

  const handleRejectQuote = async (id: string, patientName: string) => {
    setRejectingQuoteId(id);
    try {
      const res = await fetch(`/api/external-quotes/${id}/reject`, { method: 'PATCH', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al rechazar');
      setExternalQuotes(prev => prev.filter(q => q.id !== id));
      showPaymentToast(`Cotización de ${patientName} rechazada.`, false);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setRejectingQuoteId(null);
    }
  };
```

- [ ] **Step 3: Wire the fetch into the mount effect and the KPI calculation**

Change the mount `useEffect` (was lines 325-329) from:
```tsx
  useEffect(() => {
    fetchActive();
    fetchPending();
    fetchPendingServices();
  }, []);
```
to:
```tsx
  useEffect(() => {
    fetchActive();
    fetchPending();
    fetchPendingServices();
    fetchExternalQuotes();
  }, []);
```

Change the KPI `useEffect` (was lines 331-342) from:
```tsx
  useEffect(() => {
    const ingresosPlanes = activeMemberships.reduce((sum, m) => sum + (m.membership.price || 0), 0);
    const pendientesPlanes = pendingPayments.reduce((sum, p) => sum + (p.membership.price || 0), 0);
    const pendientesServicios = pendingServices.reduce((sum, s) => sum + (s.expectedAmount || 0), 0);
    
    setKpis({
      ingresos: ingresosPlanes,
      egresos: 0,
      balance: ingresosPlanes,
      pendientes: pendientesPlanes + pendientesServicios,
    });
  }, [activeMemberships, pendingPayments, pendingServices]);
```
to:
```tsx
  useEffect(() => {
    const ingresosPlanes = activeMemberships.reduce((sum, m) => sum + (m.membership.price || 0), 0);
    const pendientesPlanes = pendingPayments.reduce((sum, p) => sum + (p.membership.price || 0), 0);
    const pendientesServicios = pendingServices.reduce((sum, s) => sum + (s.expectedAmount || 0), 0);
    const pendientesCotizaciones = externalQuotes.reduce((sum, q) => sum + (q.totalAmount || 0), 0);

    setKpis({
      ingresos: ingresosPlanes,
      egresos: 0,
      balance: ingresosPlanes,
      pendientes: pendientesPlanes + pendientesServicios + pendientesCotizaciones,
    });
  }, [activeMemberships, pendingPayments, pendingServices, externalQuotes]);
```

(Confirmed quotes only affect KPIs once confirmed and re-fetched into `activeMemberships`-style "ingresos" — since `external_quotes` doesn't currently have its own "ingresos" bucket, add one: change `ingresos: ingresosPlanes,` to `ingresos: ingresosPlanes,` is a no-op here because confirming a quote removes it from `externalQuotes` state without adding its amount anywhere. To actually reflect confirmed quotes in "Ingresos del mes", track a running total client-side: add `const [confirmedQuotesTotal, setConfirmedQuotesTotal] = useState(0);` next to the other quote state from Step 1, increment it inside `handleConfirmQuote` right after the successful `setExternalQuotes` filter — `setConfirmedQuotesTotal(t => t + (externalQuotes.find(q => q.id === id)?.totalAmount ?? 0));` — and change the KPI effect's `ingresos: ingresosPlanes,` to `ingresos: ingresosPlanes + confirmedQuotesTotal,` and add `confirmedQuotesTotal` to that effect's dependency array.)

- [ ] **Step 4: Add the third tab button**

Change the tab selector array (was lines 547-550) from:
```tsx
              {([
                { key: 'planes',    label: 'Gestión de Planes',       count: activeMemberships.length + pendingPayments.length,  color: C.gold },
                { key: 'servicios', label: 'Servicios Adicionales',   count: pendingServices.length,  color: '#B45309' },
              ] as const).map(tab => {
```
to:
```tsx
              {([
                { key: 'planes',        label: 'Gestión de Planes',       count: activeMemberships.length + pendingPayments.length,  color: C.gold },
                { key: 'servicios',     label: 'Servicios Adicionales',   count: pendingServices.length,  color: '#B45309' },
                { key: 'cotizaciones',  label: 'Cotizaciones CuidameDoc', count: externalQuotes.length,   color: '#7C3AED' },
              ] as const).map(tab => {
```

The gradient-selection logic further down (`background: isActive ? \`linear-gradient(90deg, ${tab.key === 'planes' ? ... : ...})\` ...`) currently only branches on `'planes'` vs. everything-else. Update it to give the new tab its own gradient — change:
```tsx
                      background: isActive
                        ? `linear-gradient(90deg, ${tab.key === 'planes' ? `${C.gold}, ${C.goldLight}` : `${C.goldLight}, #38BDF8`})`
                        : C.white,
```
to:
```tsx
                      background: isActive
                        ? `linear-gradient(90deg, ${tab.key === 'planes' ? `${C.gold}, ${C.goldLight}` : tab.key === 'servicios' ? `${C.goldLight}, #38BDF8` : '#7C3AED, #A78BFA'})`
                        : C.white,
```

- [ ] **Step 5: Add the tab content panel**

Right after the "GESTIÓN DE SERVICIOS ADICIONALES" panel's closing `</motion.div>}` (was line 846, immediately before the closing `</div>` of the `maxWidth: 1200` container), add:

```tsx
            {/* ── COTIZACIONES CUIDAMEDOC ── */}
            {activeTab === 'cotizaciones' && <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="glass-card"
              style={{ padding: '1.5rem 1.75rem', marginBottom: '2rem', border: `1.5px solid rgba(124,58,237,0.2)` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={20} color="#7C3AED" />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1.3rem', color: C.text, margin: 0 }}>Cotizaciones CuidameDoc</h2>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                      Planes de tratamiento cerrados en CuidameDoc con medicamentos/procedimientos/seguimiento cotizados
                    </p>
                  </div>
                </div>
                {externalQuotes.length > 0 && (
                  <span style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>
                    {externalQuotes.length} pendiente{externalQuotes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {externalQuotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(124,58,237,0.03)', borderRadius: 12, border: `1px dashed ${C.borderLight}` }}>
                  <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.textMuted, margin: 0 }}>Sin cotizaciones pendientes</p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>Cuando la Dra. Diana cierre una historia clínica con plan de tratamiento en CuidameDoc, la cotización aparecerá aquí.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <AnimatePresence>
                    {externalQuotes.map(q => (
                      <motion.div
                        key={q.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
                        style={{ background: C.white, borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 10, border: `1px solid rgba(124,58,237,0.2)` }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{q.patientName}</p>
                            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                              {q.patientEmail}
                              {q.externalReference && ` · ${q.externalReference}`}
                              {q.professionalName && ` · ${q.professionalName}`}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 16, fontWeight: 800, color: '#7C3AED', margin: 0 }}>{fmt(q.totalAmount)}</p>
                            <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                              {new Date(q.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>

                        <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {q.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textBrown }}>
                              <span>{item.name} {item.quantity > 1 ? `× ${item.quantity}` : ''}</span>
                              <span style={{ fontWeight: 600 }}>{fmt(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button onClick={() => handleConfirmQuote(q.id, q.patientName)} disabled={confirmingQuoteId === q.id}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16A34A,#22C55E)', color: C.white, fontSize: 11, fontWeight: 700, cursor: confirmingQuoteId === q.id ? 'not-allowed' : 'pointer', opacity: confirmingQuoteId === q.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                            {confirmingQuoteId === q.id ? '…' : '✓ Confirmar pago'}
                          </button>
                          <button onClick={() => handleRejectQuote(q.id, q.patientName)} disabled={rejectingQuoteId === q.id}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#B91C1C,#DC2626)', color: C.white, fontSize: 11, fontWeight: 700, cursor: rejectingQuoteId === q.id ? 'not-allowed' : 'pointer', opacity: rejectingQuoteId === q.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                            {rejectingQuoteId === q.id ? '…' : '✗ Rechazar'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>}

```

- [ ] **Step 6: Verify build**

Run: `cd medisdiana-landing && npx vite build`
Expected: build succeeds; no errors referencing `FinanzasDashboard.tsx`.

- [ ] **Step 7: Manual verification in the browser**

With both `pnpm run dev` (backend) and `npm run dev` (frontend) running, use the curl from Task 7 Step 4 to create a pending quote, then open `/admin/finanzas` as admin:
- The "Cotizaciones CuidameDoc" tab shows a badge with the pending count.
- Clicking the tab shows the quote card with patient name, reference, items breakdown, and total.
- Clicking "✓ Confirmar pago" removes it from the list, shows a success toast, and increases "Ingresos del mes" in the KPI row by the quote's `totalAmount`.
- Repeat and click "✗ Rechazar" instead — confirm it disappears with a rejection toast and does NOT affect "Ingresos del mes".

- [ ] **Step 8: Commit**

```bash
git add medisdiana-landing/src/components/admin/FinanzasDashboard.tsx
git commit -m "feat(frontend): add Cotizaciones CuidameDoc tab to Finanzas dashboard"
```

---

## Self-Review Notes

- **Spec coverage:** `inventory_items` table (Task 1) ✓, `external_quotes` table (Task 2) ✓, Inventory CRUD+search endpoints (Task 6) ✓, external-quotes create/list/confirm/reject endpoints (Task 7) ✓, API key auth (Task 5) ✓, `InventarioDashboard.tsx` off localStorage + Precio field (Task 8) ✓, Finanzas tab (Task 9) ✓, env vars documented (Task 5) ✓. Everything in the spec's "Alcance" section is covered; the spec's explicit "Fuera de alcance" (CuidameDoc-side modal/buscador/email) is correctly not covered here — that's Proyecto B.
- **Type consistency:** `ExternalQuoteItem` (`type/refId/name/unitPrice/quantity/subtotal`) is defined identically in Task 4's backend types and Task 9's frontend interface. `InventoryItemPublic`'s camelCase fields (`minStock`, `isActive`) match what Task 8's `fromApi()` reads. `ExternalQuoteRepository.resolve()`'s status union (`'confirmed' | 'rejected'`) matches the two controller wrapper functions in Task 7.
- **Known follow-up already flagged inline (Task 9, Step 3):** the KPI "Ingresos del mes" tracking for confirmed quotes needed an explicit `confirmedQuotesTotal` local accumulator since `external_quotes`, unlike memberships, has no persisted "active/confirmed" list endpoint to re-fetch after confirming — this is intentional (YAGNI: no need for a second GET endpoint just to re-sum something the client already knows the value of at confirm time).
