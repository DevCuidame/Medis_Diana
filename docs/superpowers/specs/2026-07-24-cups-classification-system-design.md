# Sistema de clasificación RIPS → CUPS real para el formulario de servicios

## Contexto

`FormularioServicio.tsx` tiene hoy 4 campos en cascada (Grupo de servicio →
Subgrupo → Categoría → Subcategoría) pensados para llegar a un Código CUPS,
pero:

- `Subgrupo`, `Categoría` y `Subcategoría` son inputs de texto libre, sin
  ninguna fuente de datos real detrás.
- El "Código CUPS" se calcula concatenando las 2 primeras letras de cada
  campo (`FormularioServicio.tsx:121-132`) — no es un código CUPS real, nunca
  existe en ninguna tabla oficial.
- No hay ningún catálogo CUPS cargado en el sistema.

Se adapta el mismo patrón usado en otro software de salud del mismo equipo:
catálogo maestro CUPS + tabla puente de clasificación → CUPS + generación de
esa tabla puente desde el Excel oficial de códigos CUPS (SISPRO/Min. Salud).

**Fuente de datos**: `codigos _cups.xlsx` (13,640 filas, hoja "CUPS 2026"),
verificado directamente:

- Columnas reales (offset de 1 respecto al header, que trae una etiqueta
  técnica `"CUPSRips"` en la primera posición): código=`fila[1]`,
  nombre=`fila[2]`, sección=`fila[3]`, quirúrgico S/N=`fila[5]`.
- `quirúrgico='S'`: 9,269 filas — `quirúrgico='N'`: 4,251 — resto: 120.
- Existe un bloque de consulta bien estructurado (`89-0X-YY`): `0X` = tipo de
  atención (02 primera vez, 03 control/seguimiento, 04 interconsulta,
  07 urgencias, 01 domiciliaria, 05 junta médica, 06 intrahospitalario),
  `YY` = especialidad (01 medicina general, 63 medicina familiar,
  66 medicina interna, 83 pediatría, 50 ginecología y obstetricia,
  06 nutrición y dietética, 08 psicología, y más).
- La columna `Estancia` (H=hospitalización, 1,938 filas) es la única pista de
  "contexto de atención" que existe en los datos, pero es demasiado amplia
  para representar "Internación" o "Atención inmediata" tal cual.

## Alcance de esta iteración

**Incluido**: catálogo CUPS + tabla de clasificación + generación de datos +
endpoints + reescritura del cascading en `FormularioServicio.tsx` + modal
"Crear mapeo al vuelo".

**Fuera de alcance** (fase futura): pantalla admin separada para gestionar
catálogo/mapeos/auditoría (`CupsCatalogDashboard`), tabla de auditoría
(`cups_audit_log`). Por ahora la única forma de agregar mapeos nuevos es el
modal "Crear mapeo" embebido en el formulario.

## A. Modelo de datos — migración `021_cups_classification_system.sql`

```sql
cups_catalog
  cups_code       VARCHAR(10) PRIMARY KEY
  procedure_name  VARCHAR(255) NOT NULL
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

service_classification_cups_map
  id                   BIGSERIAL PRIMARY KEY
  service_group        VARCHAR(10) NOT NULL   -- '01'..'06'
  service_subgroup     VARCHAR(10) NOT NULL
  service_category     VARCHAR(10) NOT NULL
  service_subcategory  VARCHAR(10) NOT NULL   -- en grupos dinámicos = cups_code (1:1)
  cups_code            VARCHAR(10) NOT NULL REFERENCES cups_catalog(cups_code)
  is_active            BOOLEAN NOT NULL DEFAULT TRUE
  UNIQUE (service_group, service_subgroup, service_category, service_subcategory, cups_code)

service_classification_categories
  service_group     VARCHAR(10) NOT NULL
  service_subgroup  VARCHAR(10) NOT NULL
  service_category  VARCHAR(10) NOT NULL
  category_name     VARCHAR(255) NOT NULL
  PRIMARY KEY (service_group, service_subgroup, service_category)
```

No se incluye columna `specialty` (en el sistema de referencia ya estaba
marcada como vestigial, sin uso real para la búsqueda).

**Cambio en `service_catalog`** (ya existe desde la migración 018): sin
cambios de columnas. Solo backfill de datos:
`UPDATE service_catalog SET category_group = LEFT(category_group, 2)` para
normalizar filas existentes de `'01 Consulta externa'` → `'01'`.

## B. Import y generación de clasificación

**`apps/backend/src/scripts/import-cups-catalog.ts`** (nueva dependencia
`xlsx` en `apps/backend/package.json`):

- Busca la hoja que matchee `/^CUPS \d{4}$/` (reusable con el Excel del
  próximo año).
- Lee con el offset documentado arriba, filtra filas con código+nombre no
  vacíos, normaliza el nombre a "Sentence case" (viene todo en mayúsculas).
- `INSERT ... ON CONFLICT (cups_code) DO UPDATE SET procedure_name = EXCLUDED.procedure_name`
  en lotes de 500. No toca `is_active`.
- Idempotente: `npx tsx src/scripts/import-cups-catalog.ts "ruta.xlsx"`.

**Generación de `service_classification_cups_map` + `service_classification_categories`**,
un script por grupo en `apps/backend/src/scripts/`, mismo patrón para los 4:

| Script | Grupo | Método | Resultado esperado |
|---|---|---|---|
| `generate-consulta-externa-classification.ts` | 01 | Mecánico: parsea el patrón real `89-0X-YY` de `cups_catalog` (no un árbol inventado) | Todas las especialidades presentes en el Excel bajo ese patrón |
| `generate-diagnostic-classification.ts` | 02 | Mecánico: capítulos (2 primeros dígitos del código) 87,88,90-99 excluyendo 89 | ~12 categorías / ~2.700 códigos — completo |
| `generate-internacion-classification.ts` | 03 | Curado a mano: parte del filtro `Estancia='H'` como candidatos, se revisan muestras y se descartan los que no aplican | ~5 categorías, decenas de códigos (no miles — así lo hizo también el sistema de referencia pese a "generar todo") |
| `generate-surgical-classification.ts` | 04 | Mecánico: capítulos 00-86, nomenclatura estándar heredada de CIE-9-MC (ej. 08=párpado, 76=huesos faciales) | ~85 categorías (fusionando capítulos "ruidosos") / ~9.269 códigos — completo |
| `generate-urgencias-classification.ts` | 05 | Curado a mano: por patrones de nombre ("URGENCIA", "ATENCIÓN INICIAL", "REANIMACIÓN"...) + columna `Estancia` como pista | ~5 categorías, decenas de códigos |

Grupo `06 Otros servicios`: no genera filas — es la salida sin CUPS.

Todos los scripts son idempotentes (upsert), se corren una sola vez en el
entorno de desarrollo/producción tras la migración, y se documentan en
`flujo-de-trabajo.md` para poder re-ejecutarse si el Excel se actualiza.

## C. Backend — API

Nuevo `apps/backend/src/repositories/cups.repository.ts` (pg directo, sin
ORM, mismo estilo que el resto del repo) +
`apps/backend/src/controllers/cups.controller.ts`, montados en
`services.routes.ts`, todos `authenticate` + `authorize('ADMIN')`:

```
GET  /services/cups-lookup?serviceGroup&serviceSubgroup&serviceCategory&serviceSubcategory
     → 404 sin mapeo
     → 200 { match: 'unique', cupsCode, procedureName }
     → 200 { match: 'ambiguous', candidates: [{cupsCode, procedureName}] }
GET  /services/classification-categories?serviceGroup&serviceSubgroup
GET  /services/classification-subcategories?serviceGroup&serviceSubgroup&serviceCategory
GET  /services/cups-catalog
     → catálogo completo { cupsCode, procedureName }[] para el buscador del modal
POST /services/cups-mappings
     → { serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode }
     → crea la fila en service_classification_cups_map
```

Sin CRUD completo de catálogo/mapeos ni auditoría (pospuesto, ver Alcance).

## D. Frontend

**Nuevo `medisdiana-landing/src/components/admin/serviciosCatalogo.ts`**:
- `GRUPOS`: los 6 grupos, `{ code, name }`.
- `CATALOGO`: árbol estático (`Record<string, CatalogoNivel[]>`), solo para
  el grupo `01` (subgrupos con `children` = especialidades reales del Excel).
  Para los grupos dinámicos (02/03/04/05) el árbol solo tiene el nivel de
  subgrupo (sin `children` — categoría/subcategoría vienen del backend).
- `GRUPOS_DINAMICOS = ['02', '03', '04', '05']`.

**`servicioSchema.ts`**: `RIPS_GRUPO_SERVICIO` pasa a ser los 6 códigos
cortos (`'01'`..`'06'`); `categoryGroup` valida contra esa lista. `cups`
sigue `z.string().optional()` a nivel de tipo, pero `.superRefine()` lo
exige (6 alfanuméricos) salvo `serviceGroup === '06'`.

**`FormularioServicio.tsx`** — flujo:

1. Elige **Grupo**. Si es `06` → se ocultan Subgrupo/Categoría/Subcategoría/CUPS
   por completo, sin validar CUPS, resto del formulario sigue igual.
2. Si no es `06`: elige **Subgrupo** (siempre de `CATALOGO`, lista corta en
   todos los grupos).
3. Elige **Categoría**: si `GRUPOS_DINAMICOS.includes(serviceGroup)`, un
   `useEffect` dispara `GET /classification-categories` (estado
   "Cargando…"); si no (grupo 01), sale de `CATALOGO[grupo].find(subgrupo).children`.
4. Elige **Subcategoría**: mismo patrón (`GET /classification-subcategories`
   o `CATALOGO`).
5. Con los 4 campos completos, `runCupsLookup()` llama `GET /cups-lookup`:
   - único resultado → autocompleta CUPS (readonly) y el nombre del servicio
     (solo si el usuario no lo había tocado a mano).
   - varios resultados → aparece un select para elegir el procedimiento exacto.
   - 0 resultados (404) → mensaje informativo + botón "Crear mapeo".
6. Botón "Crear mapeo" abre **`CupsMappingModal.tsx`** (nuevo): carga
   `GET /cups-catalog` una vez (~13,640 filas en memoria del navegador),
   filtra client-side por código o nombre mientras se escribe. Al elegir uno,
   `POST /cups-mappings` con la clasificación ya fijada en el formulario
   padre, cierra el modal y vuelve a correr `runCupsLookup()` automáticamente.
7. Mientras la clasificación esté incompleta no se muestra error rojo de
   zod en CUPS — solo texto gris informativo. El error rojo
   (`errors.cups`) solo se deja mostrar cuando la clasificación está completa.

Al enviar, el payload manda la clasificación (grupo/subgrupo/categoría/
subcategoría) + `cups` en mayúsculas, igual que hoy.

## Testing / verificación

- `npx tsc --noEmit` (frontend y backend) sin errores nuevos.
- Migración aplicada contra la BD de desarrollo.
- `import-cups-catalog.ts` corrido contra el Excel real → verificar
  13,640 filas en `cups_catalog` (o el conteo vigente del archivo).
- Los 4 scripts de generación corridos → verificar conteos de categorías y
  códigos por grupo contra la tabla de la sección B.
- Prueba E2E manual: crear un servicio de "Consulta externa" para cada
  especialidad activa (medicina general, familiar, interna, pediatría,
  ginecología y obstetricia, nutrición, psicología) → CUPS único
  autocompletado correctamente.
- Prueba de clasificación sin mapeo existente → aparece "Crear mapeo",
  se crea, el lookup posterior ya resuelve único.
- Prueba de grupo `06 Otros servicios` → no pide CUPS, se guarda sin él.
