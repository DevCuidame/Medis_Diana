# Gastos del consultorio: submenú Finanzas (Pagos/Gastos) + pantalla nueva

## Contexto

"Finanzas" hoy es una sola pantalla (`FinanzasDashboard.tsx`, ruta
`/admin/finances`) con pestañas internas (Gestión de Planes / Servicios
Adicionales / Cotizaciones CuidameDoc) y KPIs (Ingresos, Egresos, Balance,
Pendientes). El KPI "Egresos del mes" está **hardcodeado en `0`**
(`FinanzasDashboard.tsx:360`) — no existe ningún concepto de gasto en el
backend. Se necesita: (1) una pantalla nueva para registrar gastos del
consultorio, (2) que "Finanzas" en el sidebar se divida en dos submenús
—"Pagos" (lo que hoy existe) y "Gastos" (pantalla nueva)—, y (3) que
"Egresos del mes"/"Balance neto" reflejen los gastos reales.

**Patrón de referencia**: "Infraestructura" ya es exactamente este caso
—un ítem de sidebar expandible con dos sub-rutas (Sedes/Espacios,
`AdminSidebar.tsx`)— y `EspaciosDashboard.tsx`/`InventoryRepository` son
el patrón de CRUD admin más cercano a replicar para Gastos.

## Alcance

**Incluido**: tabla `expenses`, CRUD backend completo (ADMIN), pantalla
`GastosDashboard.tsx` + `FormularioGasto.tsx`, submenú Pagos/Gastos en el
sidebar, conexión real de Egresos/Balance en Pagos.

**Fuera de alcance**: categorías como tabla/catálogo separado (quedan como
texto libre con autocompletado, no una lista cerrada — decisión explícita);
gastos recurrentes/fijos automáticos (cada gasto se registra manualmente,
uno por uno); adjuntar comprobantes (descartado en las preguntas de
diseño); reportes/exportación.

## A. Modelo de datos — migración `026_expenses.sql`

```sql
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

`category` es texto libre (VARCHAR, sin FK a catálogo ni CHECK de enum) —
el frontend ofrece autocompletado con las categorías ya usadas
(`GET /expenses` trae todos los gastos; el listado de categorías
existentes se deriva ahí mismo, sin endpoint nuevo).

## B. Backend

Mismo patrón que `inventory.{types,repository,controller,routes}.ts`
(el CRUD standalone más cercano ya en el repo — sin ORM, `pg` directo):

- `apps/backend/src/types/expense.types.ts`: `ExpenseRecord` (snake_case,
  como llega de la fila SQL), `ExpensePublic` (camelCase),
  `CreateExpenseDto { description, amount, category, expenseDate }`,
  `UpdateExpenseDto = Partial<CreateExpenseDto>`.
- `apps/backend/src/repositories/expense.repository.ts`:
  `listAll(): Promise<ExpensePublic[]>` (ORDER BY expense_date DESC),
  `create(dto): Promise<ExpensePublic>`, `update(id, dto): Promise<ExpensePublic | null>`,
  `delete(id): Promise<boolean>` (hard delete — nada más referencia un
  gasto por FK, a diferencia de `service_catalog`/`rooms`).
- `apps/backend/src/controllers/expense.controller.ts`: `listExpenses`,
  `createExpense` (valida `description`, `amount` numérico ≥ 0,
  `category`, `expenseDate` presentes — 400 si falta algo, mismo estilo
  que `createInventoryItem`), `updateExpense`, `deleteExpense`.
- `apps/backend/src/routes/expense.routes.ts`:
  ```
  GET    /            (ADMIN)
  POST   /            (ADMIN)
  PATCH  /:id         (ADMIN)
  DELETE /:id         (ADMIN)
  ```
  Todas con `authenticate, authorize('ADMIN')` (a diferencia de
  Sedes/Espacios, que quedaron sin guard — datos financieros sí llevan
  protección, sin excepción).
- `apps/backend/src/routes/index.ts`: `router.use('/expenses', expenseRoutes);`.

## C. Frontend — pantalla "Gastos" + submenú

**`AdminSidebar.tsx`**: "Finanzas" pasa de `{ path: '/admin/finances' }` a
`{ match: ['/admin/finances', '/admin/finances/expenses'] }` (sin `path`
propio, igual que "Infraestructura" hoy), con expansión propia
(`isFinanzasExpanded`, mismo mecanismo que `isInfraExpanded`) y
`FINANZAS_SUBITEMS: [['Pagos', '/admin/finances'], ['Gastos', '/admin/finances/expenses']]`.

**Ruta nueva** en `App.tsx`: `/admin/finances/expenses` → `<GastosDashboard />`
(lazy-loaded, `ProtectedRoute allowedRoles={['ADMIN']}`, mismo patrón que
`/admin/services/rooms`).

**`medisdiana-landing/src/components/admin/GastosDashboard.tsx`**: mismo
esqueleto que `EspaciosDashboard.tsx` — `AdminSidebar` + animación de
bienvenida (ilustración propia, tema "gastos/consultorio") + barra de
filtros (buscar por descripción, categoría, mes) + grid de tarjetas +
slide-over crear/editar + modal confirmar borrado con manejo de error
visible (mismo patrón ya corregido hoy en Sedes/Espacios — revisar
`res.ok`/`json.success`, no cerrar el modal en silencio si falla).
Cada tarjeta muestra: descripción, categoría (badge), monto (COP),
fecha, botones editar/eliminar.

**`medisdiana-landing/src/components/admin/FormularioGasto.tsx`**: modal
tipo slide-over (mismo patrón que `FormularioEspacio.tsx`) con:
- Descripción* (texto)
- Monto (COP)* (número, min 0)
- Categoría* (input de texto con `<datalist>` poblado por las categorías
  distintas ya usadas en los gastos cargados — sin restringir a la lista)
- Fecha* (date picker, default hoy)

## D. Conectar Egresos/Balance en "Pagos"

**`FinanzasDashboard.tsx`**:
- Nuevo `fetchExpenses()` → `GET /expenses`, guardado en estado.
- En el `useEffect` que calcula `kpis` (línea ~350-364): se suman los
  gastos cuyo `expenseDate` cae en el mes y año calendario actuales
  (`new Date()` al momento del cálculo) — a diferencia de "Ingresos del
  mes" (que sigue sumando todo lo activo/confirmado sin ventana de fecha,
  sin cambios en este trabajo), "Egresos del mes" sí tiene una fecha real
  por registro y se filtra literalmente por el mes en curso.
- `egresos: totalGastosDelMes` (en vez de `0`), `balance: ingresos - egresos`.

## Testing / verificación

- `pnpm -F medisdiana-landing exec tsc --noEmit` y `pnpm -F @medisdiana/backend build` sin errores nuevos.
- Migración aplicada contra la BD real → verificar tabla `expenses` creada.
- Prueba manual: crear un gasto → aparece en "Gastos"; "Egresos del mes"
  en "Pagos" refleja el monto si la fecha cae en el mes actual; "Balance
  neto" se recalcula.
- Prueba manual: editar y eliminar un gasto → cambios reflejados en
  ambas pantallas.
- Prueba manual: categoría con autocompletado sugiere categorías ya
  usadas pero permite escribir una nueva libremente.
- Prueba manual: sidebar — "Finanzas" se expande/colapsa igual que
  "Infraestructura", "Pagos" y "Gastos" navegan a sus rutas y marcan
  activo correctamente.
