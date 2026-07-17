# Inventario con precio + Cotizaciones externas en Finanzas (Proyecto A)

## Contexto

CuidameDoc (otra app, en `C:\Users\julia\Downloads\Opieka\CuidameDoc`) va a permitir que la Dra. Diana arme una cotización dentro del modal "Cerrar historia clínica" (Plan de tratamiento), usando precios reales de medicamentos/insumos/procedimientos y de los Planes de consulta que existen en Medis. Esa cotización debe:

1. Buscar ítems de Inventario y Planes en tiempo real desde CuidameDoc (lectura).
2. Quedar registrada en la pantalla Finanzas de Medis como un ingreso pendiente por confirmar (escritura).

Este documento (Proyecto A) cubre **solo el lado de Medis**: los cambios necesarios para que ambas cosas sean posibles. El lado de CuidameDoc (el modal, el buscador, el envío del correo) es un proyecto separado (Proyecto B) que depende de que esto exista primero.

Hallazgo clave que motiva este proyecto: hoy el módulo de Inventario (`medisdiana-landing/src/components/admin/InventarioDashboard.tsx`) es 100% frontend — persiste en `localStorage` (`MEDIS_inventory`), no tiene backend, y no tiene campo de precio. Está vacío en producción (0 ítems), así que no hay datos que migrar. Tampoco existe ninguna tabla de finanzas genérica: la pantalla Finanzas (`FinanzasDashboard.tsx`) solo agrega datos de `user_memberships` y `booking_requests`, ninguna de las cuales acepta un monto/descripción libres desde un sistema externo.

## Alcance

- Nueva tabla `inventory_items` + CRUD real, reemplazando el localStorage.
- Nueva tabla `external_quotes` + endpoints de lectura/escritura, con flujo pendiente → confirmar/rechazar.
- Pestaña nueva "Cotizaciones CuidameDoc" en `FinanzasDashboard.tsx`.
- Autenticación por API key compartida para el endpoint de escritura que llamará CuidameDoc.

Fuera de alcance (Proyecto B, spec separado): el modal de CuidameDoc, el buscador con autocompletado, el selector de Plan en Seguimiento, la plantilla de correo, y la llamada real desde el backend de CuidameDoc hacia estos endpoints.

## Modelo de datos

### `inventory_items` (migración nueva)

```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,   -- 'Medicamentos' | 'Insumos médicos' | 'Equipos' | 'Papelería' | 'Aseo y desinfección'
  unit VARCHAR(30) NOT NULL,       -- 'unidades' | 'cajas' | 'frascos' | 'paquetes' | 'litros'
  price INTEGER NOT NULL DEFAULT 0,       -- COP, mismo patrón que memberships.price
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

El estado ok/low/out (`quantity` vs `min_stock`) se sigue calculando en el frontend como hoy, no se persiste como columna.

`is_active` permite "descontinuar" un ítem sin borrarlo, porque cotizaciones ya emitidas (`external_quotes.items`, ver abajo) pueden referenciarlo por `ref_id` y no deben romperse si se borra.

### `external_quotes` (migración nueva)

```sql
CREATE TABLE external_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(30) NOT NULL DEFAULT 'cuidamedoc',
  external_reference VARCHAR(100),        -- número de HC de CuidameDoc, ej. "HC-1783823379251"
  patient_name VARCHAR(150) NOT NULL,
  patient_email VARCHAR(150),
  professional_name VARCHAR(150),         -- quién cerró la HC
  items JSONB NOT NULL,                   -- ver forma abajo
  total_amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'rejected'
  resolved_by VARCHAR(150),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Forma de cada elemento en `items` (JSONB, arreglo):
```ts
{
  type: 'inventory' | 'plan';
  ref_id: string;       // id del inventory_item o membership referenciado
  name: string;         // congelado al momento de cotizar
  unit_price: number;   // congelado al momento de cotizar
  quantity: number;
  subtotal: number;     // unit_price * quantity
}
```

El precio se congela en `items` en el momento de crear la cotización: si después cambia el precio del ítem o plan en el catálogo, las cotizaciones ya emitidas no se alteran retroactivamente.

## Endpoints nuevos

### Inventario — `apps/backend/src/routes/inventory.routes.ts` (nuevo)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/inventory?search=&category=&isActive=true` | pública | Búsqueda/listado para autocompletado externo (CuidameDoc). Devuelve `id, name, category, unit, price, quantity, minStock`. |
| GET | `/api/inventory` | admin | Listado completo (incluye inactivos) para el panel de Medis. |
| POST | `/api/inventory` | admin | Crear ítem. |
| PATCH | `/api/inventory/:id` | admin | Editar ítem. |
| DELETE | `/api/inventory/:id` | admin | Soft-delete (`is_active = false`). |

Sigue el mismo patrón ya usado por `location.controller.ts`/`professional.controller.ts` (repository + controller + routes, montado en `routes/index.ts`).

### Cotizaciones externas — `apps/backend/src/routes/external-quotes.routes.ts` (nuevo)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/external-quotes` | **API key** (header `x-internal-api-key`) | Crea una cotización. Body: `{ externalReference?, patientName, patientEmail?, professionalName?, items[], totalAmount }`. La llama el backend de CuidameDoc. |
| GET | `/api/external-quotes?status=pending` | admin | Listado para la pestaña de Finanzas. |
| PATCH | `/api/external-quotes/:id/confirm` | admin | Marca `status='confirmed'`, guarda `resolved_by`/`resolved_at`. |
| PATCH | `/api/external-quotes/:id/reject` | admin | Marca `status='rejected'`, guarda `resolved_by`/`resolved_at`. |

El middleware de API key es nuevo (no existe hoy en Medis) — compara el header contra `process.env.DIANA_INTERNAL_API_KEY` y responde 401 si no coincide o falta. Se aplica solo a la ruta POST; las rutas GET/PATCH de administración siguen usando el guard de admin ya existente (el mismo que protege `/memberships` en modo escritura).

### Planes

No hay endpoint nuevo — el selector "Plan asociado" del lado de CuidameDoc (Proyecto B) reutiliza el ya existente `GET /api/memberships/active` (público).

## Frontend (Medis / `medisdiana-landing`)

**`InventarioDashboard.tsx`**: deja de leer/escribir `localStorage` (`MEDIS_inventory`) y pasa a consumir los 4 endpoints CRUD de `/api/inventory`. Se agrega un campo **Precio** (COP) al formulario de creación/edición de ítem, que hoy no existe. El resto de la UI (cards de KPIs, filtro por categoría, buscador) se mantiene igual, solo cambia la fuente de datos.

**`FinanzasDashboard.tsx`**: se agrega una tercera pestaña **"Cotizaciones CuidameDoc"**, junto a "Gestión de Planes" y "Servicios Adicionales", con la misma estructura de tabla + botones Confirmar/Rechazar que ya usan esas dos pestañas (mismo patrón visual, alimentado por `GET /api/external-quotes` y los dos `PATCH` de confirmar/rechazar). Al confirmar una cotización, su `total_amount` se suma al cálculo de "Ingresos del mes" que ya hace el `useEffect` de KPIs (líneas 331–342 hoy), agregando esta tercera fuente junto a las dos que ya existen.

## Configuración

- `apps/backend/.env` (Medis): nueva variable `DIANA_INTERNAL_API_KEY=<secreto generado>`.
- `cuidame_doc_backend/.env` (CuidameDoc, Proyecto B): reutiliza `DIANA_API_URL` (ya existe) y agrega `DIANA_INTERNAL_API_KEY` con el mismo valor, para poder llamar el POST protegido.

## Errores y validación

- `POST /api/inventory` y `POST /api/external-quotes`: validar tipos/rangos básicos (montos y cantidades no negativos, `patientName`/`name` no vacíos) en el controller, siguiendo el estilo de validación ya usado en `memberships.controller.ts`.
- `POST /api/external-quotes` con API key inválida o ausente → 401, sin tocar la base de datos.
- `PATCH /:id/confirm` o `/reject` sobre una cotización que ya no está en `pending` → 409 (evita doble-confirmación), mismo criterio que ya aplican `confirmPayment`/`rejectPayment` en membresías.

## Testing

- Backend: tests de integración para los 4 endpoints de inventario y los 4 de cotizaciones (crear, listar con filtros, confirmar, rechazar, casos de error de auth/estado), siguiendo el patrón de tests ya existente para `memberships`/`user-memberships` si lo hay, o pruebas manuales con curl/Postman documentadas si el repo no tiene suite de integración establecida.
- Frontend: verificación manual de `InventarioDashboard.tsx` (crear/editar/eliminar ítem con precio, filtro por categoría) y de la pestaña nueva en `FinanzasDashboard.tsx` (listar pendientes, confirmar, rechazar, ver que el ingreso confirmado suma al KPI).
