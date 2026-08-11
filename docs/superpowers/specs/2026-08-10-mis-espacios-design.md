# Spec: Sección "Mis Espacios" en la landing

> Volver al índice: [CLAUDE.md](../../../CLAUDE.md)

## Contexto

La landing pública (`medisdiana-landing/src/App.tsx`, ruta `/`) renderiza las
secciones `Hero → About → Classes → Instructors → Testimonials → FinalCTA`.
Se pide agregar una nueva sección, **"Mis Espacios"**, que muestre fotos de
las instalaciones del consultorio, ubicada **antes** de `Testimonials`.

Todavía no existen fotos reales del consultorio, así que la sección debe
lanzarse con placeholders fáciles de reemplazar después.

## Alcance

- Sección puramente visual en el frontend público. **No** incluye panel
  admin, tabla en BD, endpoints ni subida de archivos — el usuario decidió
  explícitamente una lista estática en código (igual que `Testimonials.tsx`),
  no un CRUD administrable.
- Sin fotos reales todavía: se usan placeholders con degradado + ícono +
  etiqueta, diseñados para reemplazarse por una URL/ruta real sin tocar el
  layout.

## Componente nuevo

`medisdiana-landing/src/components/Spaces.tsx`

- Nombre en inglés, siguiendo la convención de los componentes hermanos
  (`Hero`, `About`, `Classes`, `Instructors`, `Testimonials`, `FinalCTA`).
- `<section id="espacios">`.
- Export default `function Spaces()`.

### Estructura de datos

```ts
interface SpaceItem {
  id: string
  title: string
  caption: string   // texto corto bajo el título, ej. "Primer contacto con nuestros pacientes"
  image?: string     // ruta/URL real; si no está definida, se muestra el placeholder
}

const SPACES: SpaceItem[] = [
  { id: 'recepcion',    title: 'Recepción',       caption: '...' },
  { id: 'sala-espera',  title: 'Sala de espera',  caption: '...' },
  { id: 'consultorio',  title: 'Consultorio',     caption: '...' },
  { id: 'fachada',      title: 'Fachada',         caption: '...' },
]
```

Cuando `image` esté presente, la tarjeta renderiza `<img src={image} ... />`
con `object-fit: cover`. Cuando no, renderiza el bloque placeholder (ver
abajo). Migrar a fotos reales en el futuro es solo llenar el campo `image`
de cada entrada — no requiere cambios estructurales.

### Layout — grid bento

- CSS grid con la tarjeta `recepcion` ocupando 2×2 (grande) y las otras 3
  tarjetas más pequeñas alrededor, mismo patrón visual que el mockup
  aprobado:

  ```
  ┌──────────────┬───────┐
  │              │ Foto  │
  │  Foto        ├───────┤
  │  grande      │ Foto  │
  │              ├───────┤
  │              │ Foto  │
  └──────────────┴───────┘
  ```

- Responsive: en `max-width: 768px` colapsa a una sola columna (todas las
  tarjetas apiladas, misma altura), usando el patrón ya usado en
  `Instructors.tsx` — un `<style>{\`@media (max-width: 768px) { ... }\`}</style>`
  inline con clases auxiliares (`.spaces-grid`, etc.), en vez de una librería
  de CSS-in-JS nueva.

### Tarjeta placeholder (sin `image`)

- Fondo: degradado radial suave en la paleta morado/azul de la sección
  (consistente con `Instructors`/`Testimonials`: `#8B5CF6` → `#3B82F6`).
- Ícono SVG simple centrado (relacionado con el espacio o genérico tipo
  cámara/edificio).
- Título del espacio.
- Etiqueta pequeña en mayúsculas: "Foto próximamente".

### Header de sección

Mismo patrón que `Testimonials.tsx`:
- Eyebrow uppercase con líneas degradadas a los lados (ej. "Nuestras Instalaciones").
- `<h2 className="font-cormorant">` con acento en cursiva color `#8B5CF6`
  (ej. "Mis <em>Espacios</em>").
- Subtítulo breve, tono formal/médico (regla de oro de `convenciones.md`):
  invita a conocer el consultorio, sin mencionar nada del contexto original
  (pole dance).

### Fondo de sección

`#FFFFFF` (blanco), igual que `Instructors` (sección inmediatamente
anterior). Se prioriza que las tarjetas con degradado/sombra sean el
elemento visual, en vez de competir con un fondo de color. Nota: esto deja
dos secciones blancas seguidas (`Instructors` → `Spaces`) antes de
`Testimonials` (fondo `#F3F0FB`); se acepta como trade-off consciente por
legibilidad de la galería.

### Animación

`framer-motion` con `useInView` (`once: true, margin: '-100px'`), fade +
slide-up escalonado por tarjeta (`delay: i * 0.1`), igual que el resto de
secciones de la landing.

### Nota sobre paleta vs. `convenciones.md`

`convenciones.md` documenta una paleta blanco/azul puro (`#1D4ED8`,
`#2563EB`, `#0EA5E9`) como referencia para componentes nuevos. Sin embargo,
las secciones ya migradas de la landing pública (`Hero`, `About`, `Classes`,
`Instructors`, `Testimonials`, `FinalCTA`) usan consistentemente un acento
morado/azul (`#8B5CF6` / `#3B82F6`). Para no romper la coherencia visual
entre secciones contiguas, `Spaces.tsx` sigue la paleta real de sus vecinas
(`Instructors`, `Testimonials`), no la paleta documentada en
`convenciones.md`. Esta inconsistencia entre documento y código ya existía
antes de esta tarea y no se resuelve aquí.

## Integración en App.tsx

En [App.tsx](../../../medisdiana-landing/src/App.tsx):
- Importar `Spaces` junto a los demás componentes de sección.
- Insertar `<Spaces />` entre `<Instructors />` y `<Testimonials />` dentro
  de `LandingPage()`.

## Testing

- `vitest`: ninguno de los componentes de sección hermanos (`Testimonials`,
  `Instructors`, `About`, `Classes`, `FinalCTA`) tiene test unitario propio —
  no se agrega test para `Spaces.tsx`, consistente con el resto de la
  landing.
- `playwright`: no aplica — la sección no toca el flujo de agendamiento ni
  autenticación.
- Verificación manual: correr el dev server y revisar visualmente la
  sección en desktop y mobile (`max-width: 768px`).

## Fuera de alcance (explícitamente, por decisión del usuario)

- Panel admin para gestionar fotos.
- Tabla en BD propia / endpoints backend.
- Subida real de archivos.
- Fotos reales del consultorio (se agregan después, editando el array
  `SPACES`).
