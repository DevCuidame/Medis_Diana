# Gastos del consultorio (submenú Finanzas Pagos/Gastos) — Implementation Plan

> **Estado: completado (2026-08-10).** Task 1 ejecutada directamente. Tasks
> 2-6 despachadas como 3 subagentes en paralelo (Task 2 backend; Tasks 3→4→5
> encadenadas en un solo agente; Task 6 independiente) — dos de los tres
> agentes fueron interrumpidos por el límite de sesión de la cuenta
> (reset 7:30pm America/Bogota) a mitad de Task 2 y a mitad de Task 4; el
> trabajo parcial ya hecho se verificó correcto contra el plan y se
> completó directamente (Task 2 Step 7, Task 5 completa) sin relanzar
> agentes. Verificación manual encontró un bug real no cubierto por
> `tsc`: `amount` (NUMERIC de Postgres) llega como string vía `pg` pese al
> tipo `number` declarado — corregido con `Number(...)` en ambos puntos de
> consumo antes de sumar. Documentado en
> [arquitectura.md](../../../arquitectura.md#gastos-del-consultorio--submenú-finanzas-pagosgastos-2026-08-10).
> Commits: `db6f2cb` (migración), `cc27a48` (backend), `aa2638f`
> (schema+form), `09b21fc` (pantalla Gastos), `caee238` (sidebar),
> `1d74ddb` (KPIs).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the "Finanzas" sidebar item into two submenus (Pagos/Gastos, same pattern as Infraestructura's Sedes/Espacios), add a full CRUD screen for clinic expenses, and make "Egresos del mes"/"Balance neto" in Pagos reflect real expense data instead of a hardcoded `0`.

**Architecture:** New `expenses` table + standalone CRUD module on the backend (mirrors `inventory.{types,repository,controller,routes}.ts`, ADMIN-protected). New `GastosDashboard.tsx` + `FormularioGasto.tsx` on the frontend (mirrors `EspaciosDashboard.tsx` + `FormularioEspacio.tsx`, minus the sede relationship and active/inactive toggle, which don't apply to expenses). Sidebar gets a second expandable item using the exact mechanism `AdminSidebar.tsx` already uses for "Infraestructura".

**Tech Stack:** PostgreSQL (raw SQL via `pg`, no ORM), Express + TypeScript backend, React + Vite + react-hook-form + zod frontend.

## Global Constraints

- No ORM — raw SQL via `pool` from `@config/database.js` (CLAUDE.md regla crítica #3).
- Migrations are idempotent and re-run in full on every `pnpm -F @medisdiana/backend migrate` — use `CREATE TABLE IF NOT EXISTS`.
- New migration file: `apps/backend/migrations/026_expenses.sql`, registered in `apps/backend/src/scripts/run-migration.ts` (migrations are manually listed, not auto-discovered).
- `expense_date` is a plain SQL `DATE` — always select it as `TO_CHAR(expense_date, 'YYYY-MM-DD') AS "expenseDate"` (never let `pg`'s default `Date`-object parsing leak through) so the value is a plain `"YYYY-MM-DD"` string end to end: no timezone-shift bugs, and it matches exactly what `<input type="date">` and simple `string.startsWith(...)` month-filtering expect.
- All `/expenses` endpoints require `authenticate, authorize('ADMIN')` — unlike Sedes/Espacios (left unprotected by an earlier, unrelated decision), financial data gets no exception.
- Category is free text (`VARCHAR`, no enum/FK) — the frontend offers a `<datalist>` of already-used categories for convenience, never a closed list.
- Backend path aliases: `@config/*`, `@repositories/*`, `@controllers/*`, `@middleware/*`, `.js`-suffixed ESM imports — same as every other backend file.
- No frontend test runner exists in this repo — frontend tasks are verified via `tsc --noEmit` + manual dev-server testing, not new test infrastructure.

---

## Task 1: Database migration — `expenses` table

**Files:**
- Create: `apps/backend/migrations/026_expenses.sql`
- Modify: `apps/backend/src/scripts/run-migration.ts`

**Interfaces:**
- Produces: table `expenses(id UUID PK, description VARCHAR(255), amount NUMERIC(10,2), category VARCHAR(100), expense_date DATE, created_by UUID, created_at, updated_at)`.

- [ ] **Step 1: Write the migration file**

Create `apps/backend/migrations/026_expenses.sql`:

```sql
-- ============================================================
-- Migration 026: Expenses (Gastos del consultorio)
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description  VARCHAR(255) NOT NULL,
  amount       NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  category     VARCHAR(100) NOT NULL,
  expense_date DATE NOT NULL,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
```

- [ ] **Step 2: Register the migration in the runner**

In `apps/backend/src/scripts/run-migration.ts`, add right after the migration 025 block (before `console.log('\n🌟 MIGRATIONS COMPLETE! 🌟');`):

```ts
    // Run migration 026
    console.log('🔄 Running migration 026 (Expenses)...');
    const sql026 = fs.readFileSync(
      path.resolve('migrations', '026_expenses.sql'),
      'utf8'
    );
    await pool.query(sql026);
    console.log('✅ Migration 026 successful!');
```

- [ ] **Step 3: Run the migration**

Run: `pnpm -F @medisdiana/backend migrate`
Expected: ends with `✅ Migration 026 successful!` then `🌟 MIGRATIONS COMPLETE! 🌟`. If `DATABASE_URL` is unreachable, re-establish the SSH tunnel the same way it was done earlier in this project — don't touch `.env`.

- [ ] **Step 4: Verify**

```bash
psql "$DATABASE_URL" -c "\d expenses"
```
Expected: table exists with the 8 columns above.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/migrations/026_expenses.sql apps/backend/src/scripts/run-migration.ts
git commit -m "feat(db): add expenses table"
```

---

## Task 2: Backend — expenses CRUD API

**Depends on:** Task 1.

**Files:**
- Create: `apps/backend/src/types/expense.types.ts`
- Create: `apps/backend/src/repositories/expense.repository.ts`
- Create: `apps/backend/src/controllers/expense.controller.ts`
- Create: `apps/backend/src/routes/expense.routes.ts`
- Modify: `apps/backend/src/routes/index.ts`

**Interfaces:**
- Produces: `GET /expenses` → `{success:true, data:{expenses: ExpensePublic[]}}` (ordered by `expense_date DESC`). `POST /expenses` (body: `CreateExpenseDto`) → `201 {success:true, data:{expense}}`. `PATCH /expenses/:id` (body: `UpdateExpenseDto`) → `{success:true, data:{expense}}` or 404. `DELETE /expenses/:id` → `{success:true, data:null}` or 404. All ADMIN-only.
- `ExpensePublic = { id: string; description: string; amount: number; category: string; expenseDate: string }` — this exact shape (camelCase, `expenseDate` as plain `"YYYY-MM-DD"` string) is what Task 3/4/6's frontend code consumes.

- [ ] **Step 1: Types**

Create `apps/backend/src/types/expense.types.ts`:

```ts
export interface ExpenseRecord {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ExpensePublic {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
}

export interface CreateExpenseDto {
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  createdBy?: string;
}

export type UpdateExpenseDto = Partial<CreateExpenseDto>;
```

- [ ] **Step 2: Repository**

Create `apps/backend/src/repositories/expense.repository.ts`:

```ts
import { pool } from '@config/database.js';
import type { ExpensePublic, CreateExpenseDto, UpdateExpenseDto } from '../types/expense.types.js';

const SELECT_COLUMNS = `
  id, description, amount, category,
  TO_CHAR(expense_date, 'YYYY-MM-DD') AS "expenseDate"
`;

export const ExpenseRepository = {
  async listAll(): Promise<ExpensePublic[]> {
    const { rows } = await pool.query(
      `SELECT ${SELECT_COLUMNS} FROM expenses ORDER BY expense_date DESC, created_at DESC`
    );
    return rows;
  },

  async create(dto: CreateExpenseDto): Promise<ExpensePublic> {
    const { rows } = await pool.query(
      `INSERT INTO expenses (description, amount, category, expense_date, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLUMNS}`,
      [dto.description, dto.amount, dto.category, dto.expenseDate, dto.createdBy ?? null]
    );
    return rows[0];
  },

  async update(id: string, dto: UpdateExpenseDto): Promise<ExpensePublic | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.description !== undefined) { sets.push(`description = $${i++}`); values.push(dto.description); }
    if (dto.amount !== undefined)      { sets.push(`amount = $${i++}`);      values.push(dto.amount); }
    if (dto.category !== undefined)    { sets.push(`category = $${i++}`);    values.push(dto.category); }
    if (dto.expenseDate !== undefined) { sets.push(`expense_date = $${i++}`); values.push(dto.expenseDate); }
    if (sets.length === 0) return null;

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE expenses SET ${sets.join(', ')} WHERE id = $${i} RETURNING ${SELECT_COLUMNS}`,
      values
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM expenses WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
```

- [ ] **Step 3: Controller**

Create `apps/backend/src/controllers/expense.controller.ts`:

```ts
import type { Request, Response } from 'express';
import { ExpenseRepository } from '@repositories/expense.repository.js';

export async function listExpenses(_req: Request, res: Response): Promise<void> {
  try {
    const expenses = await ExpenseRepository.listAll();
    res.json({ success: true, data: { expenses } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  try {
    const { description, amount, category, expenseDate } = req.body;
    if (!description || amount === undefined || !category || !expenseDate) {
      res.status(400).json({ success: false, error: 'Faltan campos requeridos: description, amount, category, expenseDate' });
      return;
    }
    if (typeof amount !== 'number' || amount < 0) {
      res.status(400).json({ success: false, error: 'amount debe ser un número mayor o igual a 0' });
      return;
    }
    const expense = await ExpenseRepository.create({ description, amount, category, expenseDate, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: { expense } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function updateExpense(req: Request, res: Response): Promise<void> {
  try {
    if (req.body.amount !== undefined && (typeof req.body.amount !== 'number' || req.body.amount < 0)) {
      res.status(400).json({ success: false, error: 'amount debe ser un número mayor o igual a 0' });
      return;
    }
    const expense = await ExpenseRepository.update(req.params.id, req.body);
    if (!expense) { res.status(404).json({ success: false, error: 'Gasto no encontrado' }); return; }
    res.json({ success: true, data: { expense } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteExpense(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await ExpenseRepository.delete(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, error: 'Gasto no encontrado' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
```

- [ ] **Step 4: Routes**

Create `apps/backend/src/routes/expense.routes.ts`:

```ts
import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { listExpenses, createExpense, updateExpense, deleteExpense } from '@controllers/expense.controller.js';

const router: Router = Router();

router.get(   '/',    authenticate, authorize('ADMIN'), listExpenses);
router.post(  '/',    authenticate, authorize('ADMIN'), createExpense);
router.patch( '/:id', authenticate, authorize('ADMIN'), updateExpense);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteExpense);

export default router;
```

- [ ] **Step 5: Register the routes**

In `apps/backend/src/routes/index.ts`, add the import (after `externalQuotesRoutes`):

```ts
import expenseRoutes from './expense.routes.js';
```

And the mount (after `router.use('/external-quotes', externalQuotesRoutes);`):

```ts
router.use('/expenses', expenseRoutes);
```

- [ ] **Step 6: Verify build**

Run: `pnpm -F @medisdiana/backend build`
Expected: no new TypeScript errors (pre-existing unrelated errors in `docAppointments.*`/`docServices.routes.ts`/`run-migration.ts`'s unused import are fine — confirmed pre-dating this work).

- [ ] **Step 7: Manual smoke test against the real API**

With the backend dev server running and a valid ADMIN JWT:
```bash
curl -s -X POST http://localhost:3008/api/expenses -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"description":"Prueba plan","amount":50000,"category":"Prueba","expenseDate":"2026-08-10"}'
curl -s http://localhost:3008/api/expenses -H "Authorization: Bearer $TOKEN"
```
Expected: `POST` returns `201` with `expenseDate: "2026-08-10"` (exact string, not a full timestamp). `GET` lists it. Delete it afterward via `DELETE /api/expenses/:id` to avoid leaving test data.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/types/expense.types.ts apps/backend/src/repositories/expense.repository.ts apps/backend/src/controllers/expense.controller.ts apps/backend/src/routes/expense.routes.ts apps/backend/src/routes/index.ts
git commit -m "feat(expenses): add CRUD API for clinic expenses"
```

---

## Task 3: Frontend — `gastoSchema.ts` + `FormularioGasto.tsx`

**Depends on:** none to write/typecheck (contract fixed above); Task 2 deployed for real manual testing.

**Files:**
- Create: `medisdiana-landing/src/lib/schemas/gastoSchema.ts`
- Create: `medisdiana-landing/src/components/admin/GastoTypes.ts`
- Create: `medisdiana-landing/src/components/admin/FormularioGasto.tsx`

**Interfaces:**
- Produces: `GastoFormValues = { description: string; amount: number; category: string; expenseDate: string }` (Task 4 imports this). `Gasto = GastoFormValues & { id: string }`, `ModalGastoState` (Task 4 imports these).
- `FormularioGasto` props: `{ initialData?: GastoFormValues; onCancel: () => void; onSuccess: (data: GastoFormValues) => void; categoriasSugeridas: string[] }`.

- [ ] **Step 1: Zod schema**

Create `medisdiana-landing/src/lib/schemas/gastoSchema.ts`:

```ts
import { z } from 'zod';

export const gastoSchema = z.object({
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  amount: z.number().min(0, 'El monto no puede ser negativo'),
  category: z.string().min(1, 'La categoría es obligatoria'),
  expenseDate: z.string().min(1, 'La fecha es obligatoria'),
});

export type GastoFormValues = z.infer<typeof gastoSchema>;
```

- [ ] **Step 2: Types**

Create `medisdiana-landing/src/components/admin/GastoTypes.ts`:

```ts
import type { GastoFormValues } from '../../lib/schemas/gastoSchema';

export type Gasto = GastoFormValues & { id: string };

export type ModalGastoState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; gasto: Gasto }
  | { type: 'delete'; gasto: Gasto };
```

- [ ] **Step 3: Form component**

Create `medisdiana-landing/src/components/admin/FormularioGasto.tsx`:

```tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft, Receipt, DollarSign, Tag, Calendar } from 'lucide-react';

import type { GastoFormValues } from '../../lib/schemas/gastoSchema';
import { gastoSchema } from '../../lib/schemas/gastoSchema';

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  bg: '#FFFFFF',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textBrown: '#475569',
  textMuted: '#94A3B8',
  border: '#DDD6FE',
  borderLight: '#DDD6FE',
};

const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif';

interface FormularioGastoProps {
  initialData?: GastoFormValues;
  onCancel: () => void;
  onSuccess: (data: GastoFormValues) => void;
  categoriasSugeridas: string[];
}

export const FormularioGasto: React.FC<FormularioGastoProps> = ({ initialData, onCancel, onSuccess, categoriasSugeridas }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<GastoFormValues>({
    resolver: zodResolver(gastoSchema),
    defaultValues: initialData || {
      description: '',
      amount: 0,
      category: '',
      expenseDate: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (data: GastoFormValues) => {
    onSuccess(data);
  };

  return (
    <div style={{ fontFamily: FONT_INTER }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.borderLight}` }}>
        <div>
          <h2 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>{initialData ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: '4px 0 0 0' }}>Registra un gasto del consultorio</p>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.borderLight}` }}>
            <Receipt size={18} color={C.goldLight} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textBrown, margin: 0 }}>Detalle del gasto</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Descripción</label>
              <input
                {...register('description')}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 14, color: C.text, outline: 'none' }}
                placeholder="Ej. Pago de arriendo agosto"
              />
              {errors.description && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.description.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Monto (COP)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="number"
                  {...register('amount', { valueAsNumber: true })}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                  placeholder="0"
                  min={0}
                />
              </div>
              {errors.amount && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.amount.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Categoría</label>
              <div style={{ position: 'relative' }}>
                <Tag size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  {...register('category')}
                  list="gasto-categorias"
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                  placeholder="Ej. Arriendo"
                />
                <datalist id="gasto-categorias">
                  {categoriasSugeridas.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              {errors.category && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.category.message}</p>}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Fecha</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="date"
                  {...register('expenseDate')}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                />
              </div>
              {errors.expenseDate && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.expenseDate.message}</p>}
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', padding: '12px 32px', borderRadius: 12, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 16px rgba(139,92,246,0.28)`, opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? (
              <span>Guardando...</span>
            ) : (
              <>
                <Save size={18} />
                {initialData ? 'Guardar Cambios' : 'Confirmar y Crear'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
```

- [ ] **Step 4: Typecheck**

Run: `pnpm -F medisdiana-landing exec tsc --noEmit`
Expected: no new errors (existing `GastoTypes.ts`/`FormularioGasto.tsx` are new, self-contained files — nothing else imports them yet at this point in the plan).

- [ ] **Step 5: Commit**

```bash
git add medisdiana-landing/src/lib/schemas/gastoSchema.ts medisdiana-landing/src/components/admin/GastoTypes.ts medisdiana-landing/src/components/admin/FormularioGasto.tsx
git commit -m "feat(admin): add gasto schema and form component"
```

---

## Task 4: Frontend — `GastosDashboard.tsx`

**Depends on:** Task 3 (imports `GastoFormValues`, `Gasto`, `ModalGastoState`, `FormularioGasto`). Task 2 deployed for real manual testing.

**Files:**
- Create: `medisdiana-landing/src/components/admin/GastosDashboard.tsx`

**Interfaces:**
- Consumes: `GET /expenses`, `POST /expenses`, `PATCH /expenses/:id`, `DELETE /expenses/:id` (Task 2's exact contract — `ExpensePublic` shape maps 1:1 onto `Gasto`).
- Produces: default export `GastosDashboard: React.FC` — this is what Task 5 wires into the router and sidebar.

- [ ] **Step 1: Write the component**

Create `medisdiana-landing/src/components/admin/GastosDashboard.tsx`:

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wallet, Plus, Search, X, Trash2, Edit3, Menu, Calendar } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import './MainDashboard.css';
import { FormularioGasto } from './FormularioGasto';
import type { Gasto, ModalGastoState } from './GastoTypes';

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  bg: '#FFFFFF',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textBrown: '#475569',
  textMedium: '#5E5E5E',
  textMuted: '#94A3B8',
  border: '#DDD6FE',
  borderLight: '#DDD6FE',
};

const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const GastosWelcomeCard = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem 2rem', background: C.white, borderRadius: '1.25rem', border: `1px solid ${C.borderLight}`, marginBottom: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT_BODONI, fontSize: '1.6rem', color: C.gold, fontWeight: 700, marginBottom: '0.25rem' }}>
        Gastos del Consultorio 💸
      </div>
      <div style={{ fontSize: '1rem', color: C.textBrown }}>
        Registra y controla los egresos mensuales de la clínica.
      </div>
    </div>
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ flexShrink: 0, width: 90, height: 90, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Wallet size={42} color={C.gold} strokeWidth={1.75} />
    </motion.div>
  </div>
);

export const GastosDashboard: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/expenses', { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setGastos(json.data.expenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  useEffect(() => { loadData(); }, []);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [modalState, setModalState] = useState<ModalGastoState>({ type: 'none' });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const categoriasExistentes = useMemo(
    () => Array.from(new Set(gastos.map(g => g.category))).sort(),
    [gastos]
  );

  const filteredGastos = gastos
    .filter(g => g.description.toLowerCase().includes(search.toLowerCase()))
    .filter(g => filterCategory === 'all' ? true : g.category === filterCategory)
    .filter(g => !filterMonth || g.expenseDate.startsWith(filterMonth));

  const totalFiltrado = filteredGastos.reduce((sum, g) => sum + g.amount, 0);

  const handleDelete = async () => {
    if (modalState.type === 'delete') {
      try {
        const res = await fetch(`/api/expenses/${modalState.gasto.id}`, { method: 'DELETE', headers: authHeaders() });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setDeleteError(json.error || 'No se pudo eliminar el gasto.');
          return;
        }
        loadData();
        setModalState({ type: 'none' });
      } catch (error) {
        console.error('Error deleting expense', error);
        setDeleteError('No se pudo eliminar el gasto. Intenta de nuevo.');
      }
    }
  };

  const handleFormSuccess = async (data: any) => {
    try {
      if (modalState.type === 'create') {
        await fetch('/api/expenses', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      } else if (modalState.type === 'edit') {
        await fetch(`/api/expenses/${modalState.gasto.id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data) });
      }
      loadData();
      setModalState({ type: 'none' });
    } catch (error) {
      console.error('Error saving expense', error);
    }
  };

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <AdminSidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />

      <main className="main-content" style={{ background: C.bg }}>
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Gestión de Gastos</h1>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={16} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar gasto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: '8px 16px 8px 36px', fontSize: 13, color: C.text, width: 240, outline: 'none' }}
            />
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: 1140, margin: '0 auto' }}>
            <GastosWelcomeCard />
          </div>

          <div style={{ maxWidth: 1140, margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, color: C.text, outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Todas las categorías</option>
                {categoriasExistentes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <Calendar size={14} color={C.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px 6px 30px', fontSize: 13, color: C.text, outline: 'none' }}
                />
              </div>
              {filterMonth && (
                <button onClick={() => setFilterMonth('')} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Quitar filtro de mes</button>
              )}
            </div>
            <div style={{ fontSize: 13, color: C.textBrown }}>
              Total filtrado: <strong style={{ color: C.gold }}>{fmt(totalFiltrado)}</strong>
            </div>
          </div>

          <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => { setDeleteError(null); setModalState({ type: 'create' }); }}
              style={{ background: 'transparent', borderRadius: 16, border: `2px dashed ${C.borderLight}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 180, transition: 'all 0.2s ease', gap: 12 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.goldLight; e.currentTarget.style.background = 'rgba(139,92,246,0.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.bgPanel, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.goldLight }}>
                <Plus size={24} strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.gold }}>Nuevo Gasto</span>
            </motion.div>

            {filteredGastos.map(gasto => (
              <motion.div
                key={gasto.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onMouseEnter={() => setHoveredCard(gasto.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.borderLight}`, boxShadow: hoveredCard === gasto.id ? '0 8px 24px rgba(0,0,0,0.04)' : '0 2px 12px rgba(0,0,0,0.02)', transition: 'box-shadow 0.3s ease', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.goldLight, background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: 12 }}>
                      {gasto.category}
                    </span>
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.text, margin: '8px 0 6px 0', lineHeight: 1.2, wordBreak: 'break-word' }}>{gasto.description}</h3>
                    <span style={{ fontSize: 13, color: C.textMuted }}>{fmtDate(gasto.expenseDate)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setModalState({ type: 'edit', gasto })} title="Editar Gasto" style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textBrown }}>
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => { setDeleteError(null); setModalState({ type: 'delete', gasto }); }} title="Eliminar Gasto" style={{ background: '#fef2f2', border: '1px solid #fca5a5', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div style={{ height: 1, background: C.bgPanel, margin: '20px 0 16px 0' }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, fontFamily: FONT_BODONI }}>{fmt(gasto.amount)}</div>
              </motion.div>
            ))}
            {filteredGastos.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: C.textMuted }}>
                <p>No hay gastos que coincidan con los filtros.</p>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {(modalState.type === 'create' || modalState.type === 'edit') && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.2)', backdropFilter: 'blur(2px)', zIndex: 40 }} onClick={() => setModalState({ type: 'none' })} />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: 640, background: C.white, boxShadow: '-8px 0 32px rgba(0,0,0,0.1)', zIndex: 50, overflowY: 'auto' }}>
                <div style={{ padding: 32 }}>
                  <FormularioGasto
                    initialData={modalState.type === 'edit' ? modalState.gasto : undefined}
                    onCancel={() => setModalState({ type: 'none' })}
                    onSuccess={handleFormSuccess}
                    categoriasSugeridas={categoriasExistentes}
                  />
                </div>
              </motion.div>
            </>
          )}

          {modalState.type === 'delete' && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.2)', backdropFilter: 'blur(2px)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setDeleteError(null); setModalState({ type: 'none' }); }}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 24, padding: 32, width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.1)' }}>
                  <div style={{ width: 64, height: 64, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
                    <Trash2 size={24} />
                  </div>
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px 0' }}>Eliminar Gasto</h3>
                  <p style={{ fontSize: 14, color: C.textMedium, margin: '0 0 16px 0' }}>¿Estás seguro de eliminar <strong>{modalState.gasto.description}</strong>? Esta acción no se puede deshacer.</p>
                  {deleteError && (
                    <p style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 12px', margin: '0 0 16px 0', textAlign: 'left' }}>{deleteError}</p>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => { setDeleteError(null); setModalState({ type: 'none' }); }} style={{ flex: 1, padding: '10px 0', background: C.bgPanel, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: C.textMedium, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={handleDelete} style={{ flex: 1, padding: '10px 0', background: '#ef4444', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: C.white, cursor: 'pointer' }}>Sí, Eliminar</button>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F medisdiana-landing exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add medisdiana-landing/src/components/admin/GastosDashboard.tsx
git commit -m "feat(admin): add GastosDashboard CRUD screen"
```

---

## Task 5: Frontend — sidebar submenu + route

**Depends on:** Task 4 (`GastosDashboard` must exist to be imported/routed).

**Files:**
- Modify: `medisdiana-landing/src/components/admin/AdminSidebar.tsx`
- Modify: `medisdiana-landing/src/App.tsx`

**Interfaces:**
- Produces: route `/admin/finances/expenses` rendering `GastosDashboard`; sidebar "Finanzas" expands into "Pagos" (`/admin/finances`) and "Gastos" (`/admin/finances/expenses`), exactly like "Infraestructura" today.

- [ ] **Step 1: Convert "Finanzas" into an expandable item**

In `medisdiana-landing/src/components/admin/AdminSidebar.tsx`, change the `NAV_ITEMS` entry (line 39):

```ts
  { icon: DollarSign,      label: 'Finanzas',        match: ['/admin/finances'] },
```

Add a new subitems constant right after `INFRA_SUBITEMS` (line 43-46):

```ts
const FINANZAS_SUBITEMS: Array<[string, string]> = [
  ['Pagos', '/admin/finances'],
  ['Gastos', '/admin/finances/expenses'],
]
```

- [ ] **Step 2: Add expansion state and generalize the expand/collapse logic**

Replace the single-purpose `isInfraExpanded` state (line 59-61) with two independent states:

```ts
  const [isInfraExpanded, setIsInfraExpanded] = useState(
    () => INFRA_SUBITEMS.some(([, p]) => pathname.startsWith(p)),
  )
  const [isFinanzasExpanded, setIsFinanzasExpanded] = useState(
    () => FINANZAS_SUBITEMS.some(([, p]) => pathname.startsWith(p)),
  )
```

In the `NAV_ITEMS.map` render (around line 129), add the `isFinanzas` flag next to `isInfra`:

```ts
            const isInfra = item.label === 'Infraestructura'
            const isFinanzas = item.label === 'Finanzas'
```

Update the button's `onClick` (line 133) to handle both:

```tsx
                  onClick={() => (isInfra ? setIsInfraExpanded(v => !v) : isFinanzas ? setIsFinanzasExpanded(v => !v) : item.path && go(item.path))}
```

Update the chevron condition (line 152, currently `{isInfra && (...)}`) to `{(isInfra || isFinanzas) && (...)}`, and inside it, the expanded check `isInfraExpanded` to `(isInfra ? isInfraExpanded : isFinanzasExpanded)`:

```tsx
                  {(isInfra || isFinanzas) && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      {(isInfra ? isInfraExpanded : isFinanzasExpanded)
                        ? <ChevronDown size={14} color={isActive ? C.white : C.textMedium} />
                        : <ChevronRight size={14} color={isActive ? C.white : C.textMedium} />}
                    </span>
                  )}
```

Update the submenu `AnimatePresence` block (line 160-176) — currently hardcoded to `isInfra`/`isInfraExpanded`/`INFRA_SUBITEMS`. Replace with a generalized version that picks the right subitems list.

**Important:** use exact-match (`pathname === path`) for the per-subitem highlight, not `pathname.startsWith(path)`. `INFRA_SUBITEMS`'s two paths are siblings so `startsWith` never collided, but `FINANZAS_SUBITEMS`'s "Pagos" path (`/admin/finances`) is a literal string-prefix of "Gastos" (`/admin/finances/expenses`) — with `startsWith`, both would render as active at once while viewing the Gastos screen. Exact match avoids that for both submenus.

```tsx
                <AnimatePresence>
                  {((isInfra && isInfraExpanded) || (isFinanzas && isFinanzasExpanded)) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ paddingLeft: 12, borderLeft: `2px solid ${C.goldLight}`, marginLeft: 24, paddingTop: 8, paddingBottom: 8, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(isInfra ? INFRA_SUBITEMS : FINANZAS_SUBITEMS).map(([lbl, path]) => (
                          <span
                            key={lbl}
                            onClick={() => go(path)}
                            style={{ fontSize: 12, fontWeight: 600, color: pathname === path ? C.gold : C.textBrown, cursor: 'pointer', padding: '5px 4px', transition: 'color 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
                            onMouseLeave={e => (e.currentTarget.style.color = pathname === path ? C.gold : C.textBrown)}
                          >{lbl}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
```

- [ ] **Step 3: Add the route**

In `medisdiana-landing/src/App.tsx`, add the lazy import (after `FinanzasDashboard`, line 29):

```ts
const GastosDashboard       = lazy(() => import('./components/admin/GastosDashboard').then(m => ({ default: m.GastosDashboard })))
```

Add the route (after the `/admin/finances` route block):

```tsx
        <Route
          path="/admin/finances/expenses"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <GastosDashboard />
            </ProtectedRoute>
          }
        />
```

- [ ] **Step 4: Typecheck**

Run: `pnpm -F medisdiana-landing exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

With both dev servers running: open the admin panel, click "Finanzas" in the sidebar → it expands showing "Pagos" and "Gastos" (same chevron/indent behavior as "Infraestructura"). Click "Gastos" → navigates to `/admin/finances/expenses`, renders `GastosDashboard`, "Gastos" is highlighted gold and **"Pagos" is NOT** (this is the exact-match fix from Step 2 — confirm it visually, since `/admin/finances` is a string-prefix of `/admin/finances/expenses`). Click "Pagos" → navigates back to `/admin/finances` (unchanged Finanzas screen), "Pagos" highlighted and "Gastos" is not. Reload directly on `/admin/finances/expenses` → sidebar opens with Finanzas already expanded and only "Gastos" active (tests the `useState(() => ...)` initializer).

- [ ] **Step 6: Commit**

```bash
git add medisdiana-landing/src/components/admin/AdminSidebar.tsx medisdiana-landing/src/App.tsx
git commit -m "feat(admin): add Pagos/Gastos submenu under Finanzas"
```

---

## Task 6: Frontend — connect Egresos/Balance to real expenses

**Depends on:** Task 2 (endpoint contract). Independent of Tasks 3-5's files (different component).

**Files:**
- Modify: `medisdiana-landing/src/components/admin/FinanzasDashboard.tsx`

**Interfaces:**
- Consumes: `GET /expenses` → `{success:true, data:{expenses: {id,description,amount,category,expenseDate}[]}}` (Task 2).

- [ ] **Step 1: Add expenses state and fetch**

In `FinanzasDashboard.tsx`, add a new state near `confirmedQuotesTotal` (line 175):

```ts
  const [monthlyExpensesTotal, setMonthlyExpensesTotal] = useState(0);
```

Add a fetch function near `fetchConfirmedQuotesTotal` (after line 225):

```ts
  const fetchMonthlyExpenses = async () => {
    try {
      const res = await fetch('/api/expenses', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const total = (data.data.expenses as { amount: number; expenseDate: string }[])
          .filter(e => e.expenseDate.startsWith(currentMonth))
          .reduce((sum, e) => sum + e.amount, 0);
        setMonthlyExpensesTotal(total);
      }
    } catch { /* ignore */ }
  };
```

- [ ] **Step 2: Call it on mount**

In the `useEffect` at line 339-348, add the call alongside the others:

```ts
  useEffect(() => {
    fetchActive();
    fetchPending();
    fetchPendingServices();
    fetchConfirmedQuotesTotal();
    fetchMonthlyExpenses();
    fetch('/api/external-quotes?status=pending', { headers: adminHeaders() })
      .then(res => res.json())
      .then(data => { if (data.success) setCotizacionesPendingCount(data.data.quotes.length); })
      .catch(() => { /* ignore */ });
  }, []);
```

- [ ] **Step 3: Use it in the KPI computation**

In the `useEffect` at line 350-364, replace the hardcoded `egresos: 0` and recompute `balance`:

```ts
  useEffect(() => {
    const ingresosPlanes = activeMemberships.reduce((sum, m) => sum + (m.membership.price || 0), 0);
    const pendientesPlanes = pendingPayments.reduce((sum, p) => sum + (p.membership.price || 0), 0);
    const pendientesServicios = pendingServices.reduce((sum, s) => sum + (s.expectedAmount || 0), 0);
    const ingresos = ingresosPlanes + confirmedQuotesTotal;

    setKpis({
      ingresos,
      egresos: monthlyExpensesTotal,
      balance: ingresos - monthlyExpensesTotal,
      pendientes: pendientesPlanes + pendientesServicios,
    });
  }, [activeMemberships, pendingPayments, pendingServices, confirmedQuotesTotal, monthlyExpensesTotal]);
```

- [ ] **Step 4: Typecheck**

Run: `pnpm -F medisdiana-landing exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

With a real expense dated in the current month (create one via the Gastos screen from Task 4/5), reload "Pagos" (`/admin/finances`) → "Egresos del mes" shows the real sum, "Balance neto" = Ingresos − ese valor. Create an expense dated last month → it does NOT count toward "Egresos del mes".

- [ ] **Step 6: Commit**

```bash
git add medisdiana-landing/src/components/admin/FinanzasDashboard.tsx
git commit -m "feat(finanzas): connect Egresos/Balance KPIs to real expense data"
```

---

## Final Integration Check (after all tasks land)

- [ ] `pnpm -F @medisdiana/backend build` and `pnpm -F medisdiana-landing exec tsc --noEmit` — no new TypeScript errors anywhere.
- [ ] Full manual walkthrough: create a expense → appears in Gastos, counts in Pagos' Egresos/Balance if dated this month → edit it (change amount/date) → both screens update → delete it → both screens reflect the removal, and the delete-confirmation modal shows no error since expenses have no dependents to block deletion.
- [ ] Update `arquitectura.md` with a short new section documenting `expenses` / the Pagos-Gastos submenu split, mirroring the style of the existing "Sincronización de Servicios Medis → CuidameDoc" section (CLAUDE.md regla crítica #1).
