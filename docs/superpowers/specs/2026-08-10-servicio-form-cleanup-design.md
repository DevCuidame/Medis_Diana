# Ajustes al catálogo de servicios: badge REPS, modalidad fija, quitar precio de control

## Contexto

Tras el feature de código REPS ([spec](2026-08-10-reps-service-code-design.md)),
revisión visual del formulario y del listado de tarjetas de
`ServiciosDashboard.tsx` deja tres pendientes, todos acotados al frontend
(sin cambios de backend ni de base de datos):

1. Las tarjetas del catálogo muestran el CUPS (`CUPS 01013189`) pero no el
   código REPS recién agregado.
2. `RIPS_MODALIDAD` (modalidad de servicio) no coincide con la tabla oficial
   REPS "ModalidadAtencion" de `web.sispro.gov.co` — le falta el código `07`
   y tiene dos códigos (`08`, `09`) que no existen en esa tabla — y además
   el formulario permite agregar modalidades de texto libre, que deberían
   ser un catálogo cerrado.
3. El campo "Precio de control (2do en adelante)" genera confusión en el
   formulario y se debe quitar de ahí. La columna `control_price` y su
   soporte en backend (migración `023_service_catalog_control_price.sql`,
   `ServiceCatalogRepository`, `docSyncRelevantFieldsChanged`, tests) se
   quedan intactos — solo se deja de pedir/enviar desde el formulario.

## Alcance

**Incluido**: los tres cambios de arriba, 100% en
`medisopimed-landing/src/components/admin/{servicioSchema.ts,
FormularioServicio.tsx, ServiciosDashboard.tsx}`.

**Fuera de alcance**: cualquier cambio de backend/BD (regla explícita del
punto 3); tooltips o descripciones largas para las modalidades (la imagen
de referencia las trae, pero no se pidieron en el formulario — solo el
código+nombre corto, igual que hoy).

## A. Badge de código REPS en las tarjetas

En `ServiciosDashboard.tsx`:

- `ServiceGroup` (interfaz): agrega `repsServiceCode: string | null;`.
- `groupOffers()`: agrega `repsServiceCode: cat.repsServiceCode ?? null,`
  junto a `cupsCode: cat.serviceCode ?? null,`.
- JSX de la tarjeta: nuevo bloque idéntico en estructura al de CUPS
  (mismo `<div>` con ícono circular + texto), inmediatamente después del
  bloque `{g.cupsCode && (...)}`, condicionado a `g.repsServiceCode`:
  ```tsx
  {g.repsServiceCode && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Tag size={13} color={C.gold} />
      </div>
      <span style={{ fontSize: 13, color: C.textBrown, fontWeight: 600 }}>
        Servicio <span style={{ fontWeight: 700, color: C.gold }}>{g.repsServiceCode}</span>
      </span>
    </div>
  )}
  ```
  Requiere importar `Tag` de `lucide-react` en ese archivo (hoy no está
  importado ahí, solo en `FormularioServicio.tsx`).

## B. Modalidad de servicio: catálogo cerrado de 7 valores

En `servicioSchema.ts`, `RIPS_MODALIDAD` pasa de 8 a 7 valores, reemplazando
la lista completa (mismo estilo `'CÓDIGO ETIQUETA'` mayúsculas sin tilde que
ya usa el archivo):

```ts
export const RIPS_MODALIDAD = [
  '01 INTRAMURAL',
  '02 EXTRAMURAL DOMICILIARIA',
  '03 EXTRAMURAL UNIDAD MOVIL',
  '04 TELEMEDICINA INTERACTIVA',
  '05 TELEMEDICINA NO INTERACTIVA',
  '06 TELESALUD',
  '07 EXTRAMURAL JORNADA DE SALUD',
] as const;
```

(Los 6 primeros ya coincidían con la tabla oficial; se agrega el `07` que
faltaba y se eliminan `08`/`09`, que no existen en `ModalidadAtencion`.)

En `FormularioServicio.tsx`, dentro del bloque "Modalidad de servicio", se
elimina toda capacidad de agregar texto libre:

- Se quita el `<div>` con el `<input placeholder="Agregar otra
  modalidad...">` + botón `+` (`addCustomModality`).
- Se quita el bloque que renderizaba chips para
  `modality.filter(m => !RIPS_MODALIDAD.includes(m))` (modalidades
  "custom" ya guardadas) — con el catálogo cerrado ese caso ya no puede
  ocurrir para servicios nuevos, y no hace falta soportarlo visualmente.
- Se quita el estado `customMod` y la función `addCustomModality`.
- Se quita `Plus` del import de `lucide-react` (queda sin uso).
- Quedan únicamente los 7 toggles fijos (`RIPS_MODALIDAD.map(...)`), sin
  cambios en su lógica de selección/deselección (`toggleModality`).

Nota: si un servicio ya guardado tiene una modalidad fuera de este
catálogo (dato legado), simplemente no se mostrará como chip seleccionable
en el formulario de edición — el valor se conserva en el array `modality`
del formulario (no se borra al cargar) y solo se perderá si el usuario
deselecciona todo y vuelve a guardar. No se hace migración de datos legados
en este cambio.

## C. Quitar "Precio de control" del formulario

En `FormularioServicio.tsx`: se elimina el `InputField` "Precio de control
(2do en adelante)" y el párrafo explicativo que lo acompaña.

En `servicioSchema.ts`: se elimina el campo `controlPrice` de `baseSchema`.

En `ServiciosDashboard.tsx`:
- Se elimina `controlPrice: cat.controlPrice != null ? Number(cat.controlPrice) : undefined,`
  de `mapGroupToFormValues` (ya no se carga al editar).
- Se elimina `controlPrice: data.controlPrice ?? null,` de `basePayload`
  — **se quita la línea, no se reemplaza por `null` explícito**: así el
  payload simplemente no incluye la clave `controlPrice`, y
  `ServiceCatalogRepository.update()` (que solo toca columnas presentes en
  el payload) deja intacto cualquier `control_price` que un servicio ya
  tuviera guardado. `create()` sí inserta `NULL` por defecto para
  servicios nuevos (comportamiento ya existente en el repositorio,
  `data.controlPrice ?? null`), que es el resultado correcto para un
  servicio que nunca pasó por este campo.

## Testing / verificación

- `pnpm -F medisopimed-landing exec tsc --noEmit` sin errores nuevos (debe
  confirmar en particular que no queda ningún uso colgante de `Plus`,
  `customMod`, `addCustomModality` ni `controlPrice`).
- Prueba manual: crear un servicio nuevo → la tarjeta resultante muestra
  ambos badges (CUPS y Servicio) cuando aplica; el selector de Modalidad
  solo ofrece los 7 valores fijos, sin forma de agregar otro; no aparece
  el campo "Precio de control" en ningún punto del formulario.
- Prueba manual: editar un servicio existente que ya tenía `controlPrice`
  guardado → al guardar sin tocar nada más, el valor en BD no cambia
  (verificar con `SELECT control_price FROM service_catalog WHERE id = ...`).
