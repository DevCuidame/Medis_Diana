# Landing Rebranding Médico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar la landing pública de AcariPole (pole dance) al consultorio de la Dra. Diana Cristina Medina Camargo — Especialista en Medicina Familiar y Comunitaria — aplicando la nueva paleta morado→azul sobre blanco y reemplazando todo el contenido con temática médica.

**Architecture:** Se actualizan en orden: (1) `index.css` establece el nuevo sistema de tokens y clases utilitarias como fundamento visual; (2) `App.tsx` corrige los dos gradientes dorados que afectan toda la app; (3) los 8 componentes de landing se migran uno a uno — contenido primero, luego colores inline.

**Tech Stack:** React 19 + TypeScript, Vite 8, Tailwind CSS v4 (`@theme` tokens), Framer Motion, inline styles + className utilities.

**Spec:** `docs/superpowers/specs/2026-06-10-landing-rebranding-medica-design.md`

**Dev server:** `cd acaripole-landing && pnpm dev` → abre `http://localhost:5173`

---

## File Map

| Archivo | Tipo de cambio |
|---|---|
| `acaripole-landing/src/index.css` | Reescritura completa — nuevo `@theme` + clases utilitarias |
| `acaripole-landing/src/App.tsx` | 2 cambios inline — barra progreso + banner sesión expirada |
| `acaripole-landing/src/components/Navbar.tsx` | Copy + links + colores + classNames |
| `acaripole-landing/src/components/Hero.tsx` | Copy + video source + colores inline |
| `acaripole-landing/src/components/About.tsx` | Array PILLARS + stats + copy + colores inline |
| `acaripole-landing/src/components/Classes.tsx` | Array CLASSES→SERVICES + id sección + gradientes tarjetas |
| `acaripole-landing/src/components/Instructors.tsx` | Reescritura completa — layout 2 columnas, perfil doctora |
| `acaripole-landing/src/components/Testimonials.tsx` | Array TESTIMONIALS + id sección + colores |
| `acaripole-landing/src/components/FinalCTA.tsx` | Copy + colores inline |
| `acaripole-landing/src/components/Footer.tsx` | Contenido + colores inline |

---

## Task 1: Sistema de diseño — `index.css`

**Files:**
- Modify: `acaripole-landing/src/index.css` (reescritura completa)

- [ ] **Step 1: Reemplazar `index.css` con el nuevo sistema de tokens**

Sobreescribe el archivo completo con:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600&family=Inter:wght@300;400;500;600&display=swap');
@import "tailwindcss";
@source ".";

@theme {
  --color-brand-primary: #8B5CF6;
  --color-brand-secondary: #3B82F6;
  --color-brand-accent: #38BDF8;
  --color-bg-main: #FFFFFF;
  --color-bg-secondary: #F3F0FB;
  --color-bg-footer: #EEF2FF;
  --color-text-primary: #1E293B;
  --color-text-secondary: #475569;
  --color-text-medium: #475569;
  --color-text-muted: #94A3B8;
  --color-border: #E2E8F0;
  --font-cormorant: 'Cormorant Garamond', Georgia, serif;
  --font-inter: 'Inter', system-ui, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-inter);
  background-color: #FFFFFF;
  color: #1E293B;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

/* SCROLLBAR */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #FFFFFF; }
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8B5CF6, #3B82F6);
  border-radius: 3px;
}

/* TYPOGRAPHY */
.font-cormorant { font-family: var(--font-cormorant); }
.font-inter     { font-family: var(--font-inter); }

/* GLASS */
.glass {
  background: rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(139, 92, 246, 0.10);
  box-shadow: 0 10px 40px rgba(139, 92, 246, 0.10);
}

.glass-dark {
  background: rgba(27, 28, 28, 0.40);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* BRAND GRADIENT (ex gold-gradient) */
.brand-gradient {
  background: linear-gradient(135deg, #8B5CF6, #3B82F6);
}

.brand-text-gradient {
  background: linear-gradient(135deg, #8B5CF6, #3B82F6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* HERO VIDEO */
.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 0;
}

/* SECTION BASE */
.section-padding { padding: 7rem 1.5rem; }
@media (min-width: 768px) {
  .section-padding { padding: 9rem 3rem; }
}

/* ANIMATED UNDERLINE */
.luxury-link { position: relative; display: inline-block; }
.luxury-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: linear-gradient(90deg, #8B5CF6, #3B82F6);
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.luxury-link:hover::after { width: 100%; }

/* BRAND BORDER (ex gold-border) */
.brand-border { border: 1px solid rgba(139, 92, 246, 0.25); }

/* ANIMATIONS */
@keyframes floatY {
  0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; }
  50%       { transform: translateY(-22px) scale(1.05); opacity: 1; }
}
@keyframes floatX {
  0%, 100% { transform: translateX(0px); opacity: 0.4; }
  50%       { transform: translateX(18px); opacity: 0.8; }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%       { opacity: 0.6; transform: scale(1.1); }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.float-y    { animation: floatY 7s ease-in-out infinite; }
.float-x    { animation: floatX 9s ease-in-out infinite; }
.pulse-glow { animation: pulse-glow 5s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .float-y, .float-x, .pulse-glow { animation: none; }
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 2: Verificar en dev server**

```bash
cd acaripole-landing && pnpm dev
```

Abrir `http://localhost:5173`. La barra de scroll (si visible) debe verse morada/azul. El fondo del body es blanco. No hay errores de consola por clases CSS faltantes todavía (las clases `gold-gradient`/`gold-text-gradient` seguirán en el HTML de los componentes hasta que se actualicen en las tareas siguientes — es normal que los botones queden sin estilo de gradiente por ahora).

---

## Task 2: `App.tsx` — barra de progreso y banner de sesión

**Files:**
- Modify: `acaripole-landing/src/App.tsx`

- [ ] **Step 1: Actualizar `ScrollProgressBar`**

Busca la línea:
```tsx
background: 'linear-gradient(90deg, #775A00, #B08D32, #D4A843)',
```
Reemplázala con:
```tsx
background: 'linear-gradient(90deg, #8B5CF6, #3B82F6, #38BDF8)',
```

- [ ] **Step 2: Actualizar botón en `SessionExpiredBanner`**

Busca:
```tsx
background: 'linear-gradient(135deg, #775A00, #B08D32)',
```
Reemplázala con:
```tsx
background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
```

- [ ] **Step 3: Verificar**

Con el dev server activo, recarga `http://localhost:5173`. La barra de progreso al hacer scroll debe ser morada→azul→cyan.

---

## Task 3: `Navbar.tsx`

**Files:**
- Modify: `acaripole-landing/src/components/Navbar.tsx`

- [ ] **Step 1: Actualizar array `links`**

Reemplaza:
```tsx
const links = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Clases', href: '#clases' },
  { label: 'Experiencias', href: '#experiencias' },
  { label: 'Instructoras', href: '#instructoras' },
  { label: 'Contacto', href: '#contacto' },
]
```
Con:
```tsx
const links = [
  { label: 'Inicio',           href: '#inicio' },
  { label: 'Sobre la Doctora', href: '#sobre-la-doctora' },
  { label: 'Servicios',        href: '#servicios' },
  { label: 'Testimonios',      href: '#testimonios' },
  { label: 'Contacto',         href: '#contacto' },
]
```

- [ ] **Step 2: Actualizar texto de marca (logo)**

Reemplaza:
```tsx
            Acaripole
```
Con:
```tsx
            Dra. Diana Medina
```

- [ ] **Step 3: Actualizar className del logo (gold→brand)**

Reemplaza:
```tsx
className="font-cormorant gold-text-gradient"
```
Con:
```tsx
className="font-cormorant brand-text-gradient"
```

- [ ] **Step 4: Actualizar box-shadow del nav scrolled**

Reemplaza:
```tsx
          boxShadow: scrolled
            ? '0 20px 60px rgba(119,90,0,0.18)'
            : '0 10px 40px rgba(119,90,0,0.10)',
```
Con:
```tsx
          boxShadow: scrolled
            ? '0 20px 60px rgba(139,92,246,0.18)'
            : '0 10px 40px rgba(139,92,246,0.10)',
```

- [ ] **Step 5: Actualizar color hover de los links de navegación**

Reemplaza (ambas ocurrencias — hay una en desktop y otra en mobile):
```tsx
onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#775A00')}
onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#4D4637')}
```
Con:
```tsx
onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B5CF6')}
onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
```
Y el color base de los links:
```tsx
                    color: '#4D4637',
```
→ (en el `<a>` de desktop links):
```tsx
                    color: '#475569',
```

- [ ] **Step 6: Actualizar botón "Acceso Artistas" (desktop y mobile)**

Reemplaza la clase Tailwind del botón `onLoginClick` desktop:
```tsx
className="font-inter uppercase tracking-widest text-[0.75rem] font-bold text-gold-primary hover:text-gold-light transition-colors"
```
Con:
```tsx
className="font-inter uppercase tracking-widest text-[0.75rem] font-bold text-brand-primary hover:text-brand-secondary transition-colors"
```

Reemplaza el texto del botón desktop (dos lugares: botón texto + CTA pill):
```tsx
              Acceso Artistas
```
→ botón texto:
```tsx
              Iniciar Sesión
```

- [ ] **Step 7: Actualizar CTA pill desktop**

Reemplaza la clase y texto del pill (`desktop-cta`):
```tsx
          className="gold-gradient desktop-cta"
```
→
```tsx
          className="brand-gradient desktop-cta"
```

Texto del pill:
```tsx
          Acceso artistas
```
→
```tsx
          Agendar Cita
```

- [ ] **Step 8: Actualizar hamburger y mobile menu**

Línea del color del hamburger:
```tsx
            style={{ display: 'block', width: '22px', height: '1.5px', background: '#775A00', transformOrigin: 'center' }}
```
→
```tsx
            style={{ display: 'block', width: '22px', height: '1.5px', background: '#8B5CF6', transformOrigin: 'center' }}
```

Todos los `rgba(119,90,0,0.10)` dentro del mobile dropdown (bordes de separación y border del menú mismo) → `rgba(139,92,246,0.10)`.

Color del botón "Acceso Artistas" en mobile:
```tsx
                  color: '#775A00',
```
→
```tsx
                  color: '#8B5CF6',
```
Texto de ese botón: `Acceso Artistas` → `Iniciar Sesión`

CTA pill dentro del mobile menu:
```tsx
              className="gold-gradient"
```
→
```tsx
              className="brand-gradient"
```
Texto: `Acceso artistas` → `Agendar Cita`

- [ ] **Step 9: Verificar**

Recargar `http://localhost:5173`. El navbar debe mostrar "Dra. Diana Medina" en gradiente morado/azul, los links actualizados, CTA pill "Agendar Cita" en degradado morado→azul, y "Iniciar Sesión" en morado. Probar mobile (< 900px) con DevTools.

---

## Task 4: `Hero.tsx`

**Files:**
- Modify: `acaripole-landing/src/components/Hero.tsx`

- [ ] **Step 1: Cambiar fuente del video**

Reemplaza:
```tsx
          <source
            src="https://res.cloudinary.com/dasesxehg/video/upload/___higgsfield_generation_par_ar6rns.mp4"
            type="video/mp4"
          />
```
Con:
```tsx
          <source
            src="/videos/hero-clinic.mp4"
            type="video/mp4"
          />
```
> Nota: el archivo `/public/videos/hero-clinic.mp4` debe ser provisto por el usuario. Sin él el video no se reproduce, el overlay oscuro se ve igual y la sección funciona correctamente.

- [ ] **Step 2: Renombrar componente y recolorear `GoldOrb` → `BrandOrb`**

Renombra el componente (nombre de función y todas sus referencias):
```tsx
function GoldOrb(
```
→
```tsx
function BrandOrb(
```

Reemplaza el radial-gradient del orb:
```tsx
        background: 'radial-gradient(circle, rgba(176,141,50,0.55) 0%, rgba(119,90,0,0.15) 60%, transparent 100%)',
```
→
```tsx
        background: 'radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(59,130,246,0.15) 60%, transparent 100%)',
```

Actualiza las 4 llamadas de `<GoldOrb` → `<BrandOrb` en el JSX del Hero.

- [ ] **Step 3: Recolorear vigneta de overlay**

Reemplaza:
```tsx
          background: 'radial-gradient(ellipse 80% 60% at 10% 10%, rgba(176,141,50,0.15) 0%, transparent 65%)',
```
→
```tsx
          background: 'radial-gradient(ellipse 80% 60% at 10% 10%, rgba(139,92,246,0.15) 0%, transparent 65%)',
```

- [ ] **Step 4: Recolorear partículas/destellos**

Dentro del `.map` de 8 partículas, reemplaza:
```tsx
            background: '#B08D32',
            boxShadow: '0 0 6px 2px rgba(176,141,50,0.7)',
```
→
```tsx
            background: '#38BDF8',
            boxShadow: '0 0 6px 2px rgba(56,189,248,0.7)',
```

- [ ] **Step 5: Actualizar eyebrow**

Reemplaza:
```tsx
            Movimiento · Fuerza · Elegancia
```
→
```tsx
            Medicina Familiar · Atención Integral · Cercanía
```

Color del eyebrow y línea decorativa:
```tsx
              color: '#B08D32',
```
→
```tsx
              color: '#8B5CF6',
```
```tsx
              background: 'linear-gradient(90deg, #775A00, #B08D32)'
```
→
```tsx
              background: 'linear-gradient(90deg, #8B5CF6, #3B82F6)'
```

- [ ] **Step 6: Actualizar headline**

Reemplaza:
```tsx
            DESCUBRE<br />
            TU PODER<br />
            A TRAVÉS<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>DEL MOVIMIENTO</em>
```
→
```tsx
            CUIDAMOS<br />
            DE TI Y<br />
            DE TU<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>FAMILIA</em>
```

- [ ] **Step 7: Actualizar subtexto**

Reemplaza:
```tsx
            En Acaripole transformamos fuerza, sensualidad y confianza en una experiencia artística
            diseñada para conectar contigo misma.
```
→
```tsx
            La Dra. Diana Cristina Medina Camargo te ofrece atención médica familiar
            personalizada, cercana y profesional, para ti y los tuyos.
```

- [ ] **Step 8: Actualizar CTAs**

CTA primario — texto y colores:
```tsx
              Acceso artistas
```
→
```tsx
              Agendar Cita
```
```tsx
              className="gold-gradient"
```
→
```tsx
              className="brand-gradient"
```
Shadow del primario:
```tsx
                boxShadow: '0 8px 32px rgba(119,90,0,0.35)',
```
→
```tsx
                boxShadow: '0 8px 32px rgba(139,92,246,0.35)',
```
Hover shadow primario:
```tsx
              whileHover={{ scale: 1.05, boxShadow: '0 16px 48px rgba(119,90,0,0.50)' }}
```
→
```tsx
              whileHover={{ scale: 1.05, boxShadow: '0 16px 48px rgba(139,92,246,0.50)' }}
```

CTA secundario — href y texto:
```tsx
              href="#contacto"
```
→ (solo el secundario — el primario queda en `#contacto` también):
```tsx
              href="#servicios"
```
```tsx
              Ver Experiencias
```
→
```tsx
              Conoce Nuestros Servicios
```
Border del secundario:
```tsx
                border: '1px solid rgba(176,141,50,0.45)',
```
→
```tsx
                border: '1px solid rgba(139,92,246,0.45)',
```

- [ ] **Step 9: Actualizar indicador de scroll**

```tsx
          background: 'linear-gradient(180deg, rgba(176,141,50,0.8), transparent)'
```
→
```tsx
          background: 'linear-gradient(180deg, rgba(139,92,246,0.8), transparent)'
```

- [ ] **Step 10: Verificar**

Scroll al hero en `http://localhost:5173`. Los orbs deben ser morado/azul, el texto médico correcto, CTAs con gradiente morado→azul.

---

## Task 5: `About.tsx`

**Files:**
- Modify: `acaripole-landing/src/components/About.tsx`

- [ ] **Step 1: Reemplazar array `PILLARS`**

```tsx
const PILLARS = [
  {
    icon: '✦',
    title: 'Atención Personalizada',
    desc: 'Cada paciente recibe una valoración individual. No hay protocolos genéricos — hay personas con historias y necesidades únicas.',
  },
  {
    icon: '◈',
    title: 'Medicina Preventiva',
    desc: 'Detectar a tiempo es cuidar mejor. Orientamos hacia hábitos y chequeos que protegen tu salud a largo plazo.',
  },
  {
    icon: '❋',
    title: 'Confianza y Cercanía',
    desc: 'Un espacio seguro donde puedes hablar con libertad. La relación médico-paciente se construye con respeto y escucha activa.',
  },
  {
    icon: '⟡',
    title: 'Bienestar Integral',
    desc: 'La salud abarca cuerpo, mente y familia. Acompañamos a cada paciente en todas las etapas de su vida.',
  },
]
```

- [ ] **Step 2: Actualizar eyebrow, título y subtexto**

Eyebrow: `Nuestra Filosofía` → `Nuestro Enfoque`

Título (dos líneas):
```tsx
            Más que
            <br />
            <em style={{ fontStyle: 'italic', color: '#775A00' }}>Pole Dance</em>
```
→
```tsx
            Medicina con
            <br />
            <em style={{ fontStyle: 'italic', color: '#8B5CF6' }}>Calidez Humana</em>
```

Subtexto:
```tsx
            Acaripole es un espacio donde el movimiento se convierte en ritual. Cada sesión es un
            encuentro contigo misma — un espacio de exploración, confianza y poder que va más allá
            de la técnica. Aquí, el arte del pole dance se fusiona con la expresión femenina más pura.
```
→
```tsx
            Nuestro consultorio es un espacio de atención médica centrada en el paciente y su familia.
            Cada consulta es una oportunidad para escuchar, orientar y acompañar — con calidez
            humana y el rigor profesional que tu salud merece.
```

- [ ] **Step 3: Recolorear tarjetas `PillarCard`**

En el componente `PillarCard`, reemplaza todos los colores dorados:

```tsx
      whileHover={{ y: -8, boxShadow: '0 28px 60px rgba(119,90,0,0.18)' }}
```
→
```tsx
      whileHover={{ y: -8, boxShadow: '0 28px 60px rgba(139,92,246,0.18)' }}
```

```tsx
        border: '1px solid rgba(119,90,0,0.12)',
        ...
        boxShadow: '0 8px 32px rgba(119,90,0,0.07)',
```
→
```tsx
        border: '1px solid rgba(139,92,246,0.12)',
        ...
        boxShadow: '0 8px 32px rgba(139,92,246,0.07)',
```

Ícono background y color:
```tsx
          background: 'linear-gradient(135deg, rgba(119,90,0,0.12), rgba(176,141,50,0.18))',
          border: '1px solid rgba(119,90,0,0.20)',
          ...
          color: '#775A00',
```
→
```tsx
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.18))',
          border: '1px solid rgba(139,92,246,0.20)',
          ...
          color: '#8B5CF6',
```

- [ ] **Step 4: Actualizar eyebrow de la sección (línea y color)**

```tsx
              color: '#B08D32',
```
(el eyebrow "Nuestra Filosofía") →
```tsx
              color: '#8B5CF6',
```
```tsx
              background: 'linear-gradient(90deg,#775A00,#B08D32)'
```
→
```tsx
              background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)'
```

- [ ] **Step 5: Actualizar línea decorativa horizontal**

```tsx
            background: 'linear-gradient(90deg, transparent, rgba(119,90,0,0.25), transparent)',
```
→
```tsx
            background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.25), transparent)',
```

- [ ] **Step 6: Actualizar fila de estadísticas**

Reemplaza el array de stats inline:
```tsx
            { number: '+500', label: 'Alumnas Empoderadas' },
            { number: '6', label: 'Disciplinas Únicas' },
            { number: '5★', label: 'Experiencia Premium' },
            { number: '∞', label: 'Transformaciones' },
```
→
```tsx
            { number: '+10', label: 'Años de Experiencia' },
            { number: '6', label: 'Servicios Médicos' },
            { number: '5★', label: 'Calificación de Pacientes' },
            { number: '100%', label: 'Atención Personalizada' },
```

Clase de los números:
```tsx
                className="font-cormorant gold-text-gradient"
```
→
```tsx
                className="font-cormorant brand-text-gradient"
```

Color del label de stat:
```tsx
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7F7665' }}>
```
→
```tsx
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
```

- [ ] **Step 7: Actualizar fondo de sección**

```tsx
    <section
      id="experiencias"
      style={{ background: '#FBF9F8', padding: '9rem 1.5rem' }}
    >
```
→
```tsx
    <section
      id="sobre-nosotros"
      style={{ background: '#FFFFFF', padding: '9rem 1.5rem' }}
    >
```

- [ ] **Step 8: Verificar**

Scroll a la sección "About" en la landing. Las tarjetas deben mostrar íconos morados, textos médicos, estadísticas actualizadas.

---

## Task 6: `Classes.tsx` → Servicios Médicos

**Files:**
- Modify: `acaripole-landing/src/components/Classes.tsx`

- [ ] **Step 1: Reemplazar array `CLASSES`**

```tsx
const CLASSES = [
  {
    title: 'Consulta Médica General',
    level: 'Todas las edades',
    duration: '30 min',
    description: 'Evaluación integral de tu salud, diagnóstico y tratamiento de enfermedades comunes. Primera puerta a una atención médica de calidad.',
    accent: '#A78BFA',
    tag: 'Más solicitada',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e3a8a 100%)',
  },
  {
    title: 'Control de Niño Sano',
    level: 'Niños y adolescentes',
    duration: '30 min',
    description: 'Seguimiento del crecimiento y desarrollo, aplicación del esquema de vacunación y orientación integral a padres y cuidadores.',
    accent: '#38BDF8',
    tag: 'Pediatría',
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #0c4a6e 100%)',
  },
  {
    title: 'Control Prenatal',
    level: 'Mujeres gestantes',
    duration: '30 min',
    description: 'Acompañamiento médico durante el embarazo para garantizar la salud de la madre y el bebé en cada etapa de la gestación.',
    accent: '#A78BFA',
    tag: 'Materno',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)',
  },
  {
    title: 'Control de Enf. Crónicas',
    level: 'Adultos',
    duration: '30 min',
    description: 'Seguimiento y manejo de hipertensión, diabetes y otras condiciones crónicas, con planes de tratamiento personalizados.',
    accent: '#38BDF8',
    tag: 'Crónicos',
    gradient: 'linear-gradient(160deg, #0c1445 0%, #1e3a8a 50%, #164e63 100%)',
  },
  {
    title: 'Medicina Preventiva',
    level: 'Todas las edades',
    duration: '45 min',
    description: 'Chequeos ejecutivos y valoraciones preventivas para detectar a tiempo posibles riesgos de salud antes de que se conviertan en problemas.',
    accent: '#A78BFA',
    tag: 'Prevención',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #0f172a 100%)',
  },
  {
    title: 'Certificados y Vacunación',
    level: 'Todas las edades',
    duration: '20 min',
    description: 'Emisión de certificados médicos de aptitud física, laboral y deportiva. Aplicación de vacunas del esquema nacional y viajero.',
    accent: '#38BDF8',
    tag: 'Trámites',
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #0c4a6e 100%)',
  },
]
```

- [ ] **Step 2: Actualizar id de sección, eyebrow, título y CTA**

Reemplaza el `id` de la sección:
```tsx
    <section id="clases" style={{ background: '#E9E8E7', padding: '9rem 1.5rem' }}>
```
→
```tsx
    <section id="servicios" style={{ background: '#F3F0FB', padding: '9rem 1.5rem' }}>
```

Eyebrow: `Nuestras Disciplinas` → `Nuestros Servicios`

Título:
```tsx
              Clases & <em style={{ fontStyle: 'italic', color: '#775A00' }}>Experiencias</em>
```
→
```tsx
              Servicios <em style={{ fontStyle: 'italic', color: '#8B5CF6' }}>Médicos</em>
```

CTA del header:
```tsx
            href="#contacto"
            whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(119,90,0,0.30)' }}
            className="gold-gradient"
```
→
```tsx
            href="#contacto"
            whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(139,92,246,0.30)' }}
            className="brand-gradient"
```
Texto: `Ver Horarios` → `Agendar Cita`

Color eyebrow y línea:
```tsx
                color: '#B08D32',
```
→ `color: '#8B5CF6',`
```tsx
                background: 'linear-gradient(90deg,#775A00,#B08D32)'
```
→ `background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)'`

- [ ] **Step 3: Actualizar componente `ClassCard` — tag y CTA**

El tag usa `accent` para sus colores. Reemplaza la lógica ternaria del tag:
```tsx
          background: `rgba(${accent === '#775A00' ? '119,90,0' : '176,141,50'},0.20)`,
          border: `1px solid ${accent}40`,
          ...
          color: accent === '#775A00' ? '#D4A843' : '#E8C96A',
```
→
```tsx
          background: `rgba(${accent === '#A78BFA' ? '167,139,250' : '56,189,248'},0.20)`,
          border: `1px solid ${accent}40`,
          ...
          color: accent === '#A78BFA' ? '#C4B5FD' : '#7DD3FC',
```

CTA "Reservar" → "Agendar":
```tsx
            Reservar
```
→
```tsx
            Agendar
```

Color del CTA inline:
```tsx
              color: accent === '#775A00' ? '#D4A843' : '#E8C96A',
```
→
```tsx
              color: accent === '#A78BFA' ? '#C4B5FD' : '#7DD3FC',
```

Glow interior de la tarjeta:
```tsx
          background: `radial-gradient(ellipse 70% 50% at 20% 20%, rgba(176,141,50,0.18) 0%, transparent 70%)`,
```
→
```tsx
          background: `radial-gradient(ellipse 70% 50% at 20% 20%, rgba(139,92,246,0.18) 0%, transparent 70%)`,
```

- [ ] **Step 4: Verificar**

Scroll a la sección en la landing. Las 6 tarjetas deben mostrar servicios médicos con fondos azul/morado oscuro y acentos morado/cian. CTA "Agendar Cita" funcional (scroll a #contacto).

---

## Task 7: `Instructors.tsx` — Perfil de la Doctora (reescritura completa)

**Files:**
- Modify: `acaripole-landing/src/components/Instructors.tsx` (reescritura completa del archivo)

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const CREDENTIALS = [
  'Médica Cirujana',
  'Esp. en Medicina Familiar y Comunitaria',
  '+10 años de experiencia',
  '[Universidad / Institución]',
]

export default function Instructors() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="sobre-la-doctora" style={{ background: '#FFFFFF', padding: '9rem 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div ref={ref} style={{ marginBottom: '4rem', textAlign: 'center' }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.72rem',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: '#8B5CF6',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)' }} />
            Tu Médica de Confianza
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#3B82F6,#8B5CF6)' }} />
          </motion.p>
        </div>

        {/* 2-column profile */}
        <motion.div
          className="doctor-profile-grid"
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(260px, 360px) 1fr',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.80)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(139,92,246,0.12)',
            borderRadius: '1.5rem',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(139,92,246,0.07)',
          }}
        >
          {/* Left — portrait */}
          <div
            style={{
              background: 'linear-gradient(160deg, #8B5CF6 0%, #6366F1 40%, #3B82F6 100%)',
              minHeight: '420px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 70% 60% at 30% 20%, rgba(255,255,255,0.10) 0%, transparent 65%)',
            }} />
            {/* Initials — replace with <img src="..."> when real photo is available */}
            <div style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.30)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
            }}>
              <span
                className="font-cormorant"
                style={{ fontSize: '2.6rem', fontWeight: 500, color: 'rgba(255,255,255,0.90)', letterSpacing: '0.05em' }}
              >
                DM
              </span>
            </div>
          </div>

          {/* Right — info */}
          <div className="doctor-info" style={{ padding: '3rem 3rem 3rem 2.5rem' }}>
            <h2
              className="font-cormorant"
              style={{
                fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
                fontWeight: 600,
                color: '#1E293B',
                marginBottom: '0.5rem',
                lineHeight: 1.1,
              }}
            >
              Dra. Diana Cristina Medina Camargo
            </h2>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.72rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#8B5CF6',
                marginBottom: '1.5rem',
                fontWeight: 500,
              }}
            >
              Especialista en Medicina Familiar y Comunitaria
            </p>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.88rem',
                lineHeight: 1.85,
                color: '#475569',
                fontWeight: 300,
                marginBottom: '2rem',
              }}
            >
              Médica con sólida formación en medicina familiar y comunitaria, con amplia
              experiencia en atención primaria, prevención y seguimiento de enfermedades
              crónicas. Su enfoque centrado en el paciente garantiza una atención cercana,
              humana y de calidad para toda la familia.
            </p>

            {/* Credential chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {CREDENTIALS.map((c) => (
                <span
                  key={c}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.68rem',
                    letterSpacing: '0.08em',
                    color: '#475569',
                    padding: '0.35rem 0.9rem',
                    border: '1px solid rgba(139,92,246,0.25)',
                    borderRadius: '9999px',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <style>{`
          @media (max-width: 768px) {
            .doctor-profile-grid { grid-template-columns: 1fr !important; }
            .doctor-info { padding: 2rem !important; }
          }
        `}</style>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar**

Scroll a la sección "Sobre la Doctora". Debe mostrarse el perfil de 2 columnas: avatar "DM" en fondo morado/azul a la izquierda, nombre, especialidad, bio y chips de credenciales a la derecha. En mobile (< 768px con DevTools) debe apilarse verticalmente.

---

## Task 8: `Testimonials.tsx`

**Files:**
- Modify: `acaripole-landing/src/components/Testimonials.tsx`

- [ ] **Step 1: Reemplazar array `TESTIMONIALS`**

```tsx
const TESTIMONIALS = [
  {
    quote: 'La Dra. Medina escucha con atención y explica todo con claridad. Me sentí en muy buenas manos desde la primera consulta. La recomiendo ampliamente.',
    author: 'María L.',
    role: 'Paciente · Consulta Médica General',
    stars: 5,
  },
  {
    quote: 'Llevo el control de mi diabetes con la doctora hace más de dos años. Su seguimiento constante y sus consejos han marcado una diferencia real en mi calidad de vida.',
    author: 'Carlos R.',
    role: 'Paciente · Control de Enfermedades Crónicas',
    stars: 5,
  },
  {
    quote: 'Las consultas pediátricas de mis hijos siempre son tranquilas. La doctora sabe cómo hablarles a los niños y cómo orientar a los padres. Excelente profesional.',
    author: 'Juliana P.',
    role: 'Madre de paciente · Control de Niño Sano',
    stars: 5,
  },
  {
    quote: 'Mi control prenatal fue un proceso tranquilo y bien acompañado. Siempre respondió mis dudas con paciencia, profesionalismo y mucha calidez humana.',
    author: 'Sofía M.',
    role: 'Paciente · Control Prenatal',
    stars: 5,
  },
  {
    quote: 'Excelente atención. Llega puntual, explica el diagnóstico con detalle y el trato es muy amable. Sin duda la mejor decisión para el cuidado de mi salud familiar.',
    author: 'Andrés V.',
    role: 'Paciente · Medicina Preventiva',
    stars: 5,
  },
]
```

- [ ] **Step 2: Añadir `id="testimonios"` a la sección**

Reemplaza:
```tsx
    <section style={{ background: '#E9E8E7', padding: '9rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
```
→
```tsx
    <section id="testimonios" style={{ background: '#F3F0FB', padding: '9rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
```

- [ ] **Step 3: Actualizar eyebrow y título**

Eyebrow: `Voces Reales` → `Testimonios de Pacientes`

Título:
```tsx
            Historias de{' '}
            <em style={{ fontStyle: 'italic', color: '#775A00' }}>Transformación</em>
```
→
```tsx
            Lo que dicen{' '}
            <em style={{ fontStyle: 'italic', color: '#8B5CF6' }}>Nuestros Pacientes</em>
```

- [ ] **Step 4: Recolorear elementos del carrusel**

Estrellas (componente `StarRating`):
```tsx
      <span key={i} style={{ color: '#B08D32', fontSize: '0.85rem' }}>★</span>
```
→
```tsx
      <span key={i} style={{ color: '#8B5CF6', fontSize: '0.85rem' }}>★</span>
```

Quote mark decorativo:
```tsx
              className="font-cormorant gold-text-gradient"
```
→
```tsx
              className="font-cormorant brand-text-gradient"
```

Role del testimonio:
```tsx
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B08D32' }}
```
→
```tsx
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8B5CF6' }}
```

Dot indicators activos:
```tsx
                  background: 'linear-gradient(90deg, #775A00, #B08D32)',
```
→
```tsx
                  background: 'linear-gradient(90deg, #8B5CF6, #3B82F6)',
```

Botones de navegación (flechas) color:
```tsx
              color: '#775A00', backdropFilter: 'blur(8px)',
```
→
```tsx
              color: '#8B5CF6', backdropFilter: 'blur(8px)',
```

Bordes de los botones de nav:
```tsx
              border: '1px solid rgba(119,90,0,0.18)',
```
→
```tsx
              border: '1px solid rgba(139,92,246,0.18)',
```

Role en mini-tarjetas:
```tsx
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B08D32' }}
```
→
```tsx
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B5CF6' }}
```

Bordes de mini-tarjetas:
```tsx
                border: '1px solid rgba(119,90,0,0.08)',
```
→
```tsx
                border: '1px solid rgba(139,92,246,0.08)',
```

Bordes del testimonio principal:
```tsx
              border: '1px solid rgba(119,90,0,0.12)',
              ...
              boxShadow: '0 20px 60px rgba(119,90,0,0.10)',
```
→
```tsx
              border: '1px solid rgba(139,92,246,0.12)',
              ...
              boxShadow: '0 20px 60px rgba(139,92,246,0.10)',
```

Globos de fondo decorativos:
```tsx
            background: 'radial-gradient(circle, rgba(176,141,50,0.10) 0%, transparent 70%)',
```
→
```tsx
            background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
```
```tsx
            background: 'radial-gradient(circle, rgba(119,90,0,0.10) 0%, transparent 70%)',
```
→
```tsx
            background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)',
```

Eyebrow color y líneas:
```tsx
              color: '#B08D32',
              ...
              background: 'linear-gradient(90deg,#775A00,#B08D32)'
              ...
              background: 'linear-gradient(90deg,#B08D32,#775A00)'
```
→
```tsx
              color: '#8B5CF6',
              ...
              background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)'
              ...
              background: 'linear-gradient(90deg,#3B82F6,#8B5CF6)'
```

- [ ] **Step 5: Verificar**

Scroll a "Testimonios". Deben verse los 5 testimonios de pacientes, estrellas moradas, dots de navegación morado→azul, carrusel funcional.

---

## Task 9: `FinalCTA.tsx`

**Files:**
- Modify: `acaripole-landing/src/components/FinalCTA.tsx`

- [ ] **Step 1: Actualizar eyebrow, título y subtexto**

Eyebrow: `Comienza Tu Viaje` → `Agenda tu Consulta`

Título:
```tsx
          Tu esencia
          <br />
          <em style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, #775A00, #B08D32)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            merece brillar
          </em>
```
→
```tsx
          Tu salud
          <br />
          <em style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            es lo primero
          </em>
```

Subtexto:
```tsx
          Da el primer paso hacia la versión más poderosa, elegante y libre de ti misma.
          Tu transformación comienza con una sola clase.
```
→
```tsx
          Da el primer paso hacia una atención médica cercana y de calidad.
          La Dra. Diana Medina Camargo está lista para acompañarte.
```

- [ ] **Step 2: Actualizar CTAs**

CTA primario:
```tsx
            className="gold-gradient"
```
→
```tsx
            className="brand-gradient"
```
```tsx
              boxShadow: '0 10px 40px rgba(119,90,0,0.40)',
```
→
```tsx
              boxShadow: '0 10px 40px rgba(139,92,246,0.40)',
```
Hover shadow:
```tsx
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(119,90,0,0.55)' }}
```
→
```tsx
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(139,92,246,0.55)' }}
```
Texto primario: `Reserva Ahora` → `Agendar Cita`

CTA secundario:
```tsx
              border: '1px solid rgba(176,141,50,0.40)',
```
→
```tsx
              border: '1px solid rgba(139,92,246,0.40)',
```
Hover secundario:
```tsx
            whileHover={{
              scale: 1.05,
              backgroundColor: 'rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(176,141,50,0.20)',
            }}
```
→
```tsx
            whileHover={{
              scale: 1.05,
              backgroundColor: 'rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(139,92,246,0.20)',
            }}
```
Href secundario: `#clases` → `#servicios`
Texto secundario: `Conoce las Clases` → `Conoce los Servicios`

- [ ] **Step 3: Actualizar indicadores de confianza**

```tsx
            { icon: '✦', label: 'Primera clase de prueba' },
            { icon: '◈', label: 'Ambiente seguro y empoderador' },
            { icon: '❋', label: 'Instructoras certificadas' },
```
→
```tsx
            { icon: '✦', label: 'Primera consulta de valoración' },
            { icon: '◈', label: 'Atención cercana y profesional' },
            { icon: '❋', label: 'Médica certificada' },
```

Color de íconos de trust:
```tsx
              <span style={{ color: '#B08D32', fontSize: '0.85rem' }}>{icon}</span>
```
→
```tsx
              <span style={{ color: '#8B5CF6', fontSize: '0.85rem' }}>{icon}</span>
```

- [ ] **Step 4: Recolorear fondos y orbs**

Radial background principal:
```tsx
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(119,90,0,0.28) 0%, transparent 70%)',
```
→
```tsx
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(139,92,246,0.28) 0%, transparent 70%)',
```

Radial izquierdo:
```tsx
        background: 'radial-gradient(ellipse 80% 90% at 0% 50%, rgba(176,141,50,0.12) 0%, transparent 65%)',
```
→
```tsx
        background: 'radial-gradient(ellipse 80% 90% at 0% 50%, rgba(59,130,246,0.12) 0%, transparent 65%)',
```

Patrón de líneas:
```tsx
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(176,141,50,0.03) 60px, rgba(176,141,50,0.03) 61px)`,
```
→
```tsx
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(139,92,246,0.03) 60px, rgba(139,92,246,0.03) 61px)`,
```

Orbs flotantes (radial-gradient dentro del `.map`):
```tsx
            background: 'radial-gradient(circle, rgba(176,141,50,0.30) 0%, transparent 70%)',
```
→
```tsx
            background: 'radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 70%)',
```

Línea divisora:
```tsx
            background: 'linear-gradient(90deg, transparent, rgba(176,141,50,0.40), transparent)',
```
→
```tsx
            background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.40), transparent)',
```

Eyebrow color y líneas:
```tsx
              color: '#B08D32',
              ...
              background: 'linear-gradient(90deg,#775A00,#B08D32)'
              ...
              background: 'linear-gradient(90deg,#B08D32,#775A00)'
```
→ `color: '#8B5CF6'` / `linear-gradient(90deg,#8B5CF6,#3B82F6)` (ambos lados)

- [ ] **Step 5: Verificar**

Scroll al FinalCTA. Fondo oscuro con resplandores morado/azul, título "Tu salud *es lo primero*", botones "Agendar Cita" y "Conoce los Servicios", indicadores de trust actualizados.

---

## Task 10: `Footer.tsx`

**Files:**
- Modify: `acaripole-landing/src/components/Footer.tsx`

- [ ] **Step 1: Actualizar nombre de marca y tagline**

Reemplaza texto del logo:
```tsx
              Acaripole
```
→
```tsx
              Dra. Diana Cristina Medina Camargo
```
(ajustar `fontSize` de `2rem` a `1.3rem` para que quepa en la columna)

Clase del logo:
```tsx
              className="font-cormorant gold-text-gradient"
```
→
```tsx
              className="font-cormorant brand-text-gradient"
```

Tagline del footer:
```tsx
              Movimiento. Fuerza. Elegancia. Un espacio creado para revelar tu poder más auténtico.
```
→
```tsx
              Especialista en Medicina Familiar y Comunitaria. Atención cercana, profesional y de confianza.
```

- [ ] **Step 2: Actualizar íconos sociales — reemplazar TikTok por Facebook**

Reemplaza el objeto TikTok en el array `SOCIAL`:
```tsx
  {
    name: 'TikTok',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z"/>
      </svg>
    ),
  },
```
→
```tsx
  {
    name: 'Facebook',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
```

Actualiza la URL de Instagram de `href: 'https://www.instagram.com/acaripole/?hl=es-la'` a `href: '#'` (placeholder — el usuario debe poner su URL real).

- [ ] **Step 3: Actualizar columna "Estudio" → "Consultorio"**

Título:
```tsx
              Estudio
```
→
```tsx
              Consultorio
```

Items de la lista:
```tsx
              {['Inicio', 'Nuestras Clases', 'Instructoras', 'Planes & Precios', 'Blog Editorial'].map(
```
→
```tsx
              {['Inicio', 'Sobre la Doctora', 'Servicios', 'Agendar Cita', 'Contacto'].map(
```

- [ ] **Step 4: Actualizar columna "Disciplinas" → "Servicios"**

Título: `Disciplinas` → `Servicios`

Lista:
```tsx
              {['Pole Exotic', 'Pole Sport', 'Flexibilidad', 'Core y Fuerza', 'Flow Principiante', 'Coreografía Sensual'].map(
```
→
```tsx
              {['Consulta Médica General', 'Control de Niño Sano', 'Control Prenatal', 'Enfermedades Crónicas', 'Medicina Preventiva', 'Certificados y Vacunación'].map(
```

Los hrefs de esos links: `href="#clases"` → `href="#servicios"`

- [ ] **Step 5: Actualizar columna "Contacto"**

Reemplaza el array de datos de contacto:
```tsx
                { label: 'Instagram', value: '@acaripole' },
                { label: 'WhatsApp', value: '+57 322 380 80 20 ' },
                { label: 'Email', value: 'acaripoleagenda@gmail.com' },
                { label: 'Horarios', value: 'Lun – Vier · 8am – 11am y 3pm-8pm sab 8am-8pm' },
```
→
```tsx
                { label: 'Dirección', value: '[Dirección del consultorio]' },
                { label: 'WhatsApp', value: '[+57 XXX XXX XXXX]' },
                { label: 'Email', value: '[correo@consultorio.com]' },
                { label: 'Horarios', value: '[Lun – Vie · X am – X pm]' },
```

CTA del footer (`className` y texto):
```tsx
              className="gold-gradient"
```
→
```tsx
              className="brand-gradient"
```
Texto: `Acceso artistas` → `Agendar Cita`

- [ ] **Step 6: Actualizar barra inferior**

Copyright:
```tsx
            © {year} Acaripole · Todos los derechos reservados
```
→
```tsx
            © {year} Dra. Diana Cristina Medina Camargo · Todos los derechos reservados
```

Frase final:
```tsx
            Movimiento · Fuerza · Elegancia
```
→
```tsx
            Especialista en Medicina Familiar y Comunitaria
```

Color de la frase final:
```tsx
            style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#B08D32', letterSpacing: '0.05em' }}
```
→
```tsx
            style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#8B5CF6', letterSpacing: '0.05em' }}
```

- [ ] **Step 7: Recolorear todos los colores inline del footer**

Aplica estos reemplazos en todo el archivo `Footer.tsx`:

| Buscar | Reemplazar |
|---|---|
| `rgba(119,90,0,0.15)` | `rgba(139,92,246,0.15)` |
| `rgba(119,90,0,0.10)` | `rgba(139,92,246,0.10)` |
| `rgba(119,90,0,0.12)` | `rgba(139,92,246,0.12)` |
| `rgba(119,90,0,0.25)` | `rgba(139,92,246,0.25)` |
| `color: '#7F7665'` | `color: '#94A3B8'` |
| `color: '#5E5E5E'` | `color: '#475569'` |
| `color: '#775A00'` | `color: '#8B5CF6'` |
| `background: '#E4E2E2'` | `background: '#EEF2FF'` (footer `<footer>` style) |
| `borderTop: '1px solid rgba(119,90,0,0.10)'` | `borderTop: '1px solid rgba(139,92,246,0.10)'` |
| hover `color: '#775A00'` en onMouseEnter | `color: '#8B5CF6'` |

- [ ] **Step 8: Verificar**

Scroll al footer. Debe mostrar: nombre completo de la doctora en degradado morado/azul, tagline de especialidad, columnas "Consultorio" / "Servicios" / "Contacto" con datos placeholder, iconos Instagram + Facebook + WhatsApp, copyright y frase final morada.

---

## Task 11: Verificación final y limpieza

**Files:** Todos los componentes (lectura/grep)

- [ ] **Step 1: Grep de referencias residuales**

Ejecuta desde `acaripole-landing/`:

```bash
grep -rn "Acaripole\|acaripole\|pole dance\|pole\|instructora\|instructoras\|disciplinas" src/components/Navbar.tsx src/components/Hero.tsx src/components/About.tsx src/components/Classes.tsx src/components/Instructors.tsx src/components/Testimonials.tsx src/components/FinalCTA.tsx src/components/Footer.tsx
```

No debe haber resultados. Si los hay, corregir en el archivo correspondiente.

- [ ] **Step 2: Grep de colores dorados residuales**

```bash
grep -rn "#775A00\|#B08D32\|#D4A843\|119,90,0\|176,141,50" src/components/Navbar.tsx src/components/Hero.tsx src/components/About.tsx src/components/Classes.tsx src/components/Instructors.tsx src/components/Testimonials.tsx src/components/FinalCTA.tsx src/components/Footer.tsx src/App.tsx
```

No debe haber resultados. Si los hay, reemplazar por el equivalente morado/azul de las tablas anteriores.

- [ ] **Step 3: Grep de clases CSS viejas**

```bash
grep -rn "gold-gradient\|gold-text-gradient\|gold-border\|text-gold-primary\|text-gold-light" src/
```

No debe haber resultados.

- [ ] **Step 4: Verificación visual completa**

Con dev server activo (`pnpm dev`), revisar:

1. Navbar fijo: "Dra. Diana Medina" visible, links médicos, CTA "Agendar Cita" morado→azul.
2. Hero: título "CUIDAMOS DE TI Y DE TU FAMILIA", orbs morado/azul, CTAs "Agendar Cita" y "Conoce Nuestros Servicios".
3. About: 4 pilares médicos, stats médicos, colores morado/azul.
4. Servicios (`#servicios`): 6 tarjetas de servicios médicos con fondos índigo oscuro.
5. Sobre la Doctora (`#sobre-la-doctora`): perfil 2 columnas, avatar "DM", nombre completo, credenciales.
6. Testimonios (`#testimonios`): 5 testimonios de pacientes, carrusel funcional, estrellas moradas.
7. FinalCTA: "Tu salud es lo primero", botones actualizados.
8. Footer (`#contacto`): nombre completo doctora, datos placeholder, servicios médicos, fondo EEF2FF.

- [ ] **Step 5: Verificar navegación mobile**

Abrir DevTools → dispositivo mobile (< 900px). Probar hamburger, dropdown, todos los links, CTA "Agendar Cita". Verificar que el perfil de la doctora se apila en 1 columna (< 768px).

- [ ] **Step 6: Verificar `build` sin errores de TypeScript**

```bash
cd acaripole-landing && pnpm build
```

Salida esperada: `✓ built in X.XXs` sin errores.
