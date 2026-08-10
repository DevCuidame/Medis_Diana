# Código de servicio REPS (habilitación) en el formulario de servicios

## Contexto

El formulario "Nuevo Servicio" (`FormularioServicio.tsx`) ya captura una
clasificación en cascada Grupo → Subgrupo → Categoría → Subcategoría → CUPS
(ver `docs/superpowers/specs/2026-07-24-cups-classification-system-design.md`).
Esa clasificación resuelve el **código CUPS** (procedimiento, para
facturación/RIPS).

Existe un concepto **distinto** que hoy no se captura: el **código de
servicio habilitable REPS** (Resolución 3100, registro de prestadores) — un
código corto de 3 dígitos que identifica el servicio de salud para efectos de
habilitación (ej. `310 ENDOCRINOLOGIA`, `105 CUIDADO INTERMEDIO NEONATAL`).
Cada prestador debe declarar, por cada grupo de servicios, cuáles servicios
habilitables presta.

**Fuente de datos**: `TablaReferencia_Servicios__1.xlsx` (157 filas, hoja
"Table"), verificado directamente:

- Columnas usadas: `Codigo` (3 dígitos, único en las 157 filas), `Nombre`,
  `Descripcion` (solo 5 valores), `Habilitado` (`SI`/`NO`, 3 filas en `NO`,
  todas de transporte asistencial/prehospitalario).
- `Descripcion` mapea 1:1 a los grupos `01`-`05` ya existentes en
  `serviciosCatalogo.ts` (`GRUPOS`): `CONSULTA EXTERNA`→`01` (91 filas),
  `APOYO DIAGNOSTICO Y COMPLEMENTACION TERAPEUTICA`→`02` (22),
  `INTERNACION`→`03` (15), `QUIRURGICOS`→`04` (24), `ATENCION INMEDIATA`→`05`
  (5). El grupo `06 Otros servicios` no tiene filas — coincide con que ya es
  el "escape hatch" que hoy salta toda la clasificación.
- Resto de columnas del Excel (`Aplicacion`, `IsStandardGEL`,
  `IsStandardMSPS`, `Extra_I..X`, `ValorRegistro`, `UsuarioResponsable`,
  `Fecha_Actualizacion`, `IsPublicPrivate`) no se usan — vacías o
  irrelevantes para este catálogo, mismo criterio que ya se aplicó al
  descartar `specialty` en el diseño de CUPS.

**Nombrado**: para no chocar con `service_catalog.service_code` (que hoy
guarda el CUPS, pese al nombre genérico), este catálogo y su columna se
llaman explícitamente `reps_service_catalog` / `reps_service_code`.

## Alcance

**Incluido**: tabla `reps_service_catalog` sembrada desde el Excel, columna
nueva en `service_catalog`, endpoint de lectura, nuevo campo en el formulario
(select, filtrado por grupo, oculto en grupo `06`, obligatorio en `01`-`05`).

**Fuera de alcance**: CRUD/administración del catálogo REPS (si el Excel
cambia, se agrega una migración nueva con los deltas — igual criterio que
seguiría el catálogo CUPS); sincronización hacia CuidameDoc (su modelo de
servicios no tiene equivalente, solo `category` genérico — este código es
puramente regulatorio/local a Medis).

## A. Modelo de datos — migración `025_reps_service_codes.sql`

```sql
CREATE TABLE reps_service_catalog (
  code          VARCHAR(4) PRIMARY KEY,  -- 3-4 dígitos (ej. '328', '1101')
  name          VARCHAR(255) NOT NULL,
  service_group VARCHAR(10) NOT NULL,  -- '01'..'05'
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_reps_service_catalog_group ON reps_service_catalog(service_group);

ALTER TABLE service_catalog
  ADD COLUMN reps_service_code VARCHAR(4) REFERENCES reps_service_catalog(code);
```

Seguido de 157 `INSERT INTO reps_service_catalog (code, name, service_group,
is_active) VALUES ...` generados mecánicamente del Excel (mapeo de
`Descripcion` a `service_group` como arriba, `Habilitado` SI/NO →
`is_active` true/false). Al ser datos estáticos y pequeños, se embeben
directamente en la migración — no se necesita un script de importación
aparte (a diferencia de CUPS, con 13,640 filas).

`service_catalog.reps_service_code` queda nullable a nivel de columna (igual
que `service_code`/CUPS hoy) — la obligatoriedad para grupos `01`-`05` se
valida en el frontend (zod) y en el controller, no vía `NOT NULL`.

## B. Backend — API

Un endpoint nuevo, `authenticate` + `authorize('ADMIN')`, montado en
`services.routes.ts`:

```
GET /services/reps-service-codes
  → 200 [{ code, name, serviceGroup }]   -- solo is_active = true, las 154 filas activas
```

Carga el catálogo completo en una sola llamada (157 filas es insignificante;
mismo criterio que ya usa `GET /cups-catalog`, que trae 13,640 filas enteras
para `CupsMappingModal`). No hay filtro por `serviceGroup` en el backend — el
filtrado por grupo ocurre en el cliente.

Cambios en lo existente:

- `apps/backend/src/controllers/services.controller.ts`: `CATALOG_PAYLOAD_KEYS`
  suma `repsServiceCode`.
- `apps/backend/src/repositories/services.repository.ts`:
  `ServiceCatalogRepository.create` inserta `reps_service_code`.
- Repositorio/controlador para el nuevo endpoint: se agrega junto al resto
  de endpoints de clasificación (`cups.repository.ts`/`cups.controller.ts` o
  un archivo nuevo — detalle a decidir en el plan de implementación).
- Integridad referencial: si se manda un código que no existe en
  `reps_service_catalog`, el INSERT falla por la FK — mismo comportamiento
  que otras columnas con constraint en este repo, sin validación adicional
  a mano.

## C. Frontend

**`FormularioServicio.tsx`**:

- `useEffect` al montar: `GET /services/reps-service-codes` una sola vez →
  estado con las 154 filas activas (patrón "traer todo una vez, filtrar en
  cliente", igual que `CupsMappingModal`).
- Nuevo campo **"Código del servicio"** — `<select>` simple, mismo estilo
  visual que Categoría/Subcategoría, texto de cada opción `"{code} -
  {name}"`. Placeholder muestra `"Cargando..."` mientras se resuelve el
  fetch inicial (mismo patrón que Categoría/Subcategoría hoy), o mensaje de
  error inline si el fetch falla (sin retry automático).
- Ubicación: dentro de la sección 3 "Clasificación (habilitación)", justo
  después de "Código CUPS" y antes de "Modalidad de servicio".
- Opciones = filtro client-side por `serviceGroup === categoryGroup`.
- Si `categoryGroup === '06'`: el campo se oculta por completo (mismo
  `isEscapeGroup` que ya oculta Subgrupo/Categoría/Subcategoría/CUPS).
- Si el usuario cambia de Grupo habiendo elegido ya un código REPS, la
  selección se limpia (mismo reset en cascada que ya aplica a
  Subgrupo/Categoría al cambiar Grupo).

**`servicioSchema.ts`**:

- `repsServiceCode: z.string().optional()` en el tipo base.
- `.superRefine()`: obligatorio (no vacío) cuando `categoryGroup !== '06'` —
  mismo criterio que ya aplica a `cups`.

**`ServiciosDashboard.tsx`**:

- Se agrega `repsServiceCode: data.repsServiceCode` al payload de
  `POST /services/offers`, en el mismo punto donde hoy se mapea `cups →
  serviceCode`.

## Testing / verificación

- `npx tsc --noEmit` (frontend y backend) sin errores nuevos.
- Migración aplicada contra la BD de desarrollo/producción → verificar 157
  filas en `reps_service_catalog` (154 activas, 3 inactivas) y la columna
  nueva en `service_catalog`.
- Prueba manual: crear un servicio de cada uno de los 5 grupos dinámicos →
  el select de "Código del servicio" muestra solo las opciones de ese grupo
  y se guarda correctamente.
- Prueba de grupo `06 Otros servicios` → el campo no aparece, no se exige,
  se guarda sin él.
- Prueba de cambio de grupo después de elegir código REPS → la selección se
  limpia y las opciones se refiltran.
- Prueba de guardar sin elegir código REPS en un grupo `01`-`05` → error de
  validación visible, no se envía el POST.
