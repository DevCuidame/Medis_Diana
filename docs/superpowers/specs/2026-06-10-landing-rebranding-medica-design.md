# Diseño: Rebranding Landing Pública — Consultorio Dra. Diana Cristina Medina Camargo

**Fecha:** 2026-06-10
**Sub-proyecto:** 1 de N — Landing pública (`acaripole-landing/src/components/`)
**Estado:** Aprobado — pendiente plan de implementación

---

## Contexto

El proyecto `medis` parte de una copia de la plataforma AcariPole (estudio de pole dance) y se migra al sistema de gestión del **consultorio de la Dra. Diana Cristina Medina Camargo, Especialista en Medicina Familiar y Comunitaria**. Este spec cubre únicamente los 8 componentes de la landing pública. La autenticación, los portales de paciente, profesional y panel admin son sub-proyectos independientes que vendrán después.

---

## Alcance — Archivos afectados

| Archivo | Cambio principal |
|---|---|
| `src/index.css` | Nuevo sistema de tokens de color (purple→blue); renombrar clases utilitarias |
| `src/components/Navbar.tsx` | Marca, nav links, CTAs |
| `src/components/Hero.tsx` | Paleta overlays/orbs, copy, CTAs, video placeholder |
| `src/components/About.tsx` | Contenido pilares médicos, stats |
| `src/components/Classes.tsx` | 6 servicios médicos, nuevo id de sección, gradientes de tarjetas |
| `src/components/Instructors.tsx` | Layout 2 columnas, perfil único de la doctora |
| `src/components/Testimonials.tsx` | 5 testimonios de pacientes, nuevo id de sección |
| `src/components/FinalCTA.tsx` | Copy, CTAs, paleta de fondo |
| `src/components/Footer.tsx` | Marca, columnas, datos de contacto placeholder |

**Fuera de alcance:** `ArtistLogin.tsx`, componentes de `/admin/*`, `/user/*`, `/professional/*`.

Los nombres de archivo se mantienen igual (evitar cambios de imports en `App.tsx`).

---

## A. Sistema de diseño (`src/index.css`)

### Tokens `@theme`

| Token actual | Nuevo nombre | Nuevo valor |
|---|---|---|
| `--color-gold-primary: #775A00` | `--color-brand-primary` | `#8B5CF6` (morado) |
| `--color-gold-light: #B08D32` | `--color-brand-secondary` | `#3B82F6` (azul) |
| `--color-bg-main: #FBF9F8` | `--color-bg-main` | `#FFFFFF` |
| `--color-bg-secondary: #E9E8E7` | `--color-bg-secondary` | `#F3F0FB` (lavanda suave) |
| `--color-bg-footer: #E4E2E2` | `--color-bg-footer` | `#EEF2FF` |
| `--color-text-primary: #1B1C1C` | `--color-text-primary` | `#1E293B` |
| `--color-text-brown: #4D4637` | `--color-text-secondary` | `#475569` |
| `--color-text-medium: #5E5E5E` | `--color-text-medium` | `#475569` |
| `--color-text-muted: #7F7665` | `--color-text-muted` | `#94A3B8` |
| `--color-border: #D1C5B1` | `--color-border` | `#E2E8F0` |

Añadir: `--color-brand-accent: #38BDF8` (azul claro/cian).

### Clases utilitarias renombradas

| Clase actual | Clase nueva | CSS actualizado |
|---|---|---|
| `.gold-gradient` | `.brand-gradient` | `background: linear-gradient(135deg, #8B5CF6, #3B82F6)` |
| `.gold-text-gradient` | `.brand-text-gradient` | ídem como `background-clip: text` |
| `.gold-border` | `.brand-border` | `border: 1px solid rgba(139,92,246,0.25)` |
| `.luxury-link::after` | `.luxury-link::after` | gradiente `#8B5CF6 → #3B82F6` |
| `.glass` | `.glass` | sombra/borde a `rgba(139,92,246,0.10)` |
| Scrollbar thumb | — | `linear-gradient(180deg, #8B5CF6, #3B82F6)` |

### Tipografías

Se mantienen Cormorant Garamond (títulos display) e Inter (cuerpo). El look "editorial personalizado" es apropiado para un consultorio de médica individual — no frío/hospitalario.

Se puede eliminar de Google Fonts las familias sin uso (`Bodoni Moda`, `Hanken Grotesk`) para reducir carga (opcional, no bloquea).

---

## B. Navbar.tsx

- **Marca**: `Acaripole` → `Dra. Diana Medina` (versión corta para el pill; nombre completo en Footer y sección de perfil).
- **Links de navegación**:
  ```
  Inicio (#inicio) · Sobre la Doctora (#sobre-la-doctora) · Servicios (#servicios) · Testimonios (#testimonios) · Contacto (#contacto)
  ```
- **Botón texto** (via `onLoginClick`): "Acceso Artistas" → `Iniciar Sesión` (acceso pacientes al portal, misma función).
- **CTA pill** (`.brand-gradient`): "Acceso artistas" → `Agendar Cita`, `href="#contacto"`.
- **Hover colors** inline: `#775A00` → `#8B5CF6`; `#4D4637` → `#475569`.
- **Box-shadow** navbar scrolled: `rgba(119,90,0,...)` → `rgba(139,92,246,...)`.
- **Hamburger** y bordes mobile: colores gold → brand.

---

## C. Hero.tsx

- **Video**: estructura `<video autoPlay muted loop playsInline>` se conserva. Fuente cambia a:
  ```
  /videos/hero-clinic.mp4
  ```
  > **Open item:** Necesitas proveer un video real de salud/consultorio. Sin el archivo, la etiqueta `<video>` queda vacía y se ve el overlay oscuro (aceptable como fallback temporal).

- **Overlays oscuros**: se mantienen para legibilidad del texto blanco. Viñeta de acento cambia:
  - Antes: `rgba(176,141,50,0.15)` → Ahora: `rgba(139,92,246,0.15)`.

- **`GoldOrb` → `BrandOrb`**: mismo componente, radial-gradient cambia de dorado a morado/azul:
  ```
  radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(59,130,246,0.15) 60%, transparent 100%)
  ```

- **Partículas/destellos**: `background: '#B08D32'` → `#38BDF8`; `boxShadow` → `rgba(56,189,248,0.7)`.

- **Eyebrow**: "Movimiento · Fuerza · Elegancia" → `Medicina Familiar · Atención Integral · Cercanía`

- **Headline**:
  ```
  CUIDAMOS DE TI
  Y DE TU
  FAMILIA
  *CON CERCANÍA*
  ```

- **Subtexto**: "La Dra. Diana Cristina Medina Camargo te ofrece atención médica familiar personalizada, cercana y profesional, para ti y los tuyos."

- **CTAs**:
  - Primario (`.brand-gradient`): "Acceso artistas" → `Agendar Cita`, `href="#contacto"`
  - Secundario: "Ver Experiencias" → `Conoce Nuestros Servicios`, `href="#servicios"`

- **Indicador scroll inferior**: recolorear línea degradada a `rgba(139,92,246,0.8) → transparent`.

---

## D. About.tsx

- `id="experiencias"` → `id="sobre-nosotros"` (o se puede mantener; el navbar apunta a `#sobre-la-doctora` que queda en Instructors — este `id` es interno, no en el nav).
- **Eyebrow**: "Nuestra Filosofía" → `Nuestro Enfoque`
- **Título**: "Más que *Pole Dance*" → `Medicina con *Calidez Humana*`
- **Subtexto**: descripción de la filosofía de atención del consultorio — cuidado personalizado, escucha activa, medicina preventiva, acompañamiento familiar.

### 4 tarjetas pilares

| Icon | Título actual | Título nuevo | Descripción nueva |
|---|---|---|---|
| ✦ | Arte en Movimiento | **Atención Personalizada** | Cada paciente recibe una valoración individual. No hay protocolos genéricos — hay personas. |
| ◈ | Fuerza Femenina | **Medicina Preventiva** | Detectar a tiempo es cuidar mejor. Orientamos hacia hábitos y chequeos que protegen tu salud a largo plazo. |
| ❋ | Confianza Radical | **Confianza y Cercanía** | Un espacio seguro donde puedes hablar con libertad. La relación médico-paciente se construye con respeto y escucha. |
| ⟡ | Bienestar Holístico | **Bienestar Integral** | La salud abarca cuerpo, mente y familia. Acompañamos a cada paciente en todas las etapas de su vida. |

- Colores de tarjeta: bordes/sombras `rgba(119,90,0,...)` → `rgba(139,92,246,...)`; ícono background `rgba(119,90,0,0.12)` → `rgba(139,92,246,0.12)`; color ícono `#775A00` → `#8B5CF6`.

### Estadísticas

| Valor | Label actual | Label nuevo |
|---|---|---|
| `+10` | Alumnas Empoderadas | Años de Experiencia |
| `6` | Disciplinas Únicas | Servicios Médicos |
| `5★` | Experiencia Premium | Calificación de Pacientes |
| `100%` | Transformaciones | Atención Personalizada |

> Números son ejemplo — ajustar con datos reales.

---

## E. Classes.tsx → Servicios Médicos (id `#clases` → `#servicios`)

- **Eyebrow**: "Nuestras Disciplinas" → `Nuestros Servicios`
- **Título**: "Clases & *Experiencias*" → `Servicios *Médicos*`
- **CTA header**: "Ver Horarios" → `Agendar Cita` (href `#contacto`)
- **CTA tarjeta**: "Reservar" → `Agendar`

### 6 tarjetas de servicios

| # | Título | Nivel → Audiencia | Duración | Tag | Descripción |
|---|---|---|---|---|---|
| 1 | **Consulta Médica General** | Todas las edades | 30 min | Más solicitada | Evaluación integral, diagnóstico y tratamiento de enfermedades comunes. |
| 2 | **Control de Niño Sano** | Niños y adolescentes | 30 min | Pediatría | Seguimiento del crecimiento y desarrollo, vacunación y orientación a padres. |
| 3 | **Control Prenatal** | Mujeres gestantes | 30 min | Materno | Acompañamiento durante el embarazo para la salud de la madre y el bebé. |
| 4 | **Control de Enf. Crónicas** | Adultos | 30 min | Crónicos | Seguimiento de hipertensión, diabetes y otras condiciones crónicas. |
| 5 | **Medicina Preventiva** | Todas las edades | 45 min | Prevención | Chequeos y exámenes para detectar a tiempo posibles riesgos de salud. |
| 6 | **Certificados y Vacunación** | Todas las edades | 20 min | Trámites | Certificados de aptitud física, laboral y deportiva. Vacunación. |

- **Fondos de tarjeta**: degradados marrones/dorados oscuros → degradados índigo/azul/morado oscuro, p. ej.:
  - Alternando: `linear-gradient(160deg, #1e1b4b, #4c1d95, #1e3a8a)` / `linear-gradient(160deg, #0f172a, #1e3a8a, #0c4a6e)`
- **Acentos**: `#775A00`/`#B08D32` → `#A78BFA`/`#38BDF8` alternando.

---

## F. Instructors.tsx → Perfil de la Doctora (id `#instructoras` → `#sobre-la-doctora`)

- **Layout**: de grid de 3 tarjetas a **perfil de 2 columnas** (foto izquierda · info derecha), apilado en mobile.
- **Eyebrow**: "Nuestras Expertas" → `Tu Médica de Confianza`
- **Título de sección**: "Las Instructoras que *Te Transformarán*" → eliminado (el nombre completo ocupa ese espacio como heading).

### Columna izquierda (avatar/foto)
- Mismo componente de "portrait area" con degradado `#8B5CF6 → #3B82F6`.
- Iniciales `DM` como placeholder.
- > **Open item:** Reemplazar con foto real de la doctora.

### Columna derecha (info)
- **Nombre**: `Dra. Diana Cristina Medina Camargo`
- **Subtítulo** (eyebrow dorado → morado): `Especialista en Medicina Familiar y Comunitaria`
- **Bio** (placeholder): "Médica con sólida formación en medicina familiar y comunitaria, con amplia experiencia en atención primaria, prevención y seguimiento de enfermedades crónicas. Su enfoque centrado en el paciente garantiza una atención cercana, humana y de calidad para toda la familia."
- **Insignias/credenciales** (chips estilo `.brand-border`):
  - `Médica Cirujana`
  - `Esp. en Medicina Familiar y Comunitaria`
  - `+10 años de experiencia`
  - `[Universidad / Institución]` ← placeholder
- Se eliminan tags "Instagram/TikTok".

---

## G. Testimonials.tsx (añadir `id="testimonios"`)

- **Eyebrow**: "Voces Reales" → `Testimonios de Pacientes`
- **Título**: "Historias de *Transformación*" → `Lo que dicen *Nuestros Pacientes*`
- **Fondo de globos decorativos**: gold → morado/azul.
- **Colores**: estrellas, dots, flechas nav, quote mark → `#8B5CF6` / `#3B82F6`.

### 5 testimonios de pacientes (placeholder)

```
1. "La Dra. Medina escucha con atención y explica todo con claridad. Me sentí en muy buenas manos desde la primera consulta."
   — María L. · Paciente, Medicina General ★★★★★

2. "Llevo el control de mi diabetes con la doctora hace más de dos años. Su seguimiento constante ha marcado una diferencia real en mi salud."
   — Carlos R. · Paciente, Enf. Crónicas ★★★★★

3. "Las consultas pediátricas de mis hijos son siempre tranquilas. La doctora sabe cómo hablarles a los niños y orientar a los padres."
   — Juliana P. · Madre de paciente ★★★★★

4. "Mi control prenatal fue un proceso tranquilo y bien acompañado. Siempre respondió mis dudas con paciencia y profesionalismo."
   — Sofía M. · Paciente, Control Prenatal ★★★★★

5. "Excelente atención. Llega puntual, explica el diagnóstico con detalle y el trato es muy amable. Totalmente recomendada."
   — Andrés V. · Paciente, Chequeo Ejecutivo ★★★★★
```

---

## H. FinalCTA.tsx

- **Eyebrow**: "Comienza Tu Viaje" → `Agenda tu Consulta`
- **Título**: "Tu esencia *merece brillar*" → `Tu salud *es lo primero*`
- **Subtexto**: "Da el primer paso hacia una atención médica cercana y de calidad. La Dra. Diana Medina Camargo está lista para acompañarte."
- **CTAs**:
  - Primario (`.brand-gradient`): "Reserva Ahora" → `Agendar Cita` (href `#contacto`)
  - Secundario: "Conoce las Clases" → `Conoce los Servicios` (href `#servicios`)
- **Indicadores de confianza**:
  - "Primera clase de prueba" → `Primera consulta de valoración`
  - "Ambiente seguro y empoderador" → `Atención cercana y profesional`
  - "Instructoras certificadas" → `Médica certificada`
- **Fondo oscuro** `#1B1C1C`: se mantiene (es neutro, no es un color "polo dance"). Resplandores radiales: gold → morado/azul.

---

## I. Footer.tsx

- **Columna marca**:
  - Texto logo: `Dra. Diana Cristina Medina Camargo` (`.brand-text-gradient`)
  - Tagline: "Especialista en Medicina Familiar y Comunitaria. Atención cercana, profesional y de confianza."
  - Sociales: Instagram · **Facebook** (reemplaza TikTok) · WhatsApp — hrefs como placeholders.

- **Columna "Estudio" → "Consultorio"**: Inicio · Sobre la Doctora · Servicios · Agendar Cita · Contacto

- **Columna "Disciplinas" → "Servicios"**:
  Consulta Médica General · Control de Niño Sano · Control Prenatal · Enfermedades Crónicas · Medicina Preventiva · Certificados y Vacunación

- **Columna "Contacto"** (todos placeholder):
  ```
  Dirección:  [Dirección del consultorio]
  WhatsApp:   [+57 XXX XXX XXXX]
  Email:      [correo@consultorio.com]
  Horarios:   [Lun – Vie · Xam – Xpm]
  ```
  CTA: "Acceso artistas" → `Agendar Cita`

- **Barra inferior**:
  - `© {año} Dra. Diana Cristina Medina Camargo · Todos los derechos reservados`
  - Frase final: "Especialista en Medicina Familiar y Comunitaria"

- Todos los hover/border/shadow en gold → brand purple.

---

## J. Open items (antes de implementar)

| # | Item | Responsable |
|---|---|---|
| 1 | Video hero real de salud/consultorio (`/public/videos/hero-clinic.mp4`) | Usuario |
| 2 | Foto real de la doctora para perfil | Usuario |
| 3 | Datos reales de contacto (dirección, WhatsApp, email, horarios, redes) | Usuario |
| 4 | Cifras reales (años de experiencia, etc.) | Usuario |
| 5 | URL real de Instagram / Facebook de la doctora | Usuario |
| 6 | Nombre de universidad/institución para credenciales | Usuario |

Los open items NO bloquean la implementación — todos quedan como placeholder claramente marcado con `[...]`.

---

## K. Plan de pruebas

1. Levantar dev server: `cd acaripole-landing && pnpm dev`
2. Revisar en browser: scroll completo, verificar que cada sección se ve correctamente (colores, copy, animaciones).
3. Probar anchors: `#inicio`, `#servicios`, `#sobre-la-doctora`, `#testimonios`, `#contacto`.
4. Probar menú mobile (< 900px): hamburger, dropdown, links y CTA.
5. Grep de limpieza post-implementación:
   ```bash
   grep -r "Acaripole\|pole\|instructora\|#775A00\|#B08D32\|119,90,0\|176,141,50" src/components/
   ```
   → No debe retornar resultados en los 8 archivos de landing.

---

## Siguiente paso

Invocar **writing-plans** para generar el plan de implementación detallado (tareas ordenadas, archivos a tocar, comandos de verificación).
