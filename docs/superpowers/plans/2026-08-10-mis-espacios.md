# "Mis Espacios" Landing Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Mis Espacios" gallery section to the public landing page, showing placeholder photos of the consultorio's facilities, positioned between the "Sobre la Doctora" (`Instructors`) and "Testimonios" (`Testimonials`) sections.

**Architecture:** One new self-contained React component (`Spaces.tsx`) that renders a static array of 4 space entries in a CSS-grid bento layout (1 large tile + 3 stacked small tiles, collapsing to a single column on mobile). No backend, no state, no admin CRUD — the data source is a hardcoded array in the component, matching the pattern already used by `Testimonials.tsx`. Each entry has an optional `image` field so real photos can be dropped in later by editing the array. It is wired into `App.tsx`'s `LandingPage()` between the existing `<Instructors />` and `<Testimonials />` elements.

**Tech Stack:** React 19 + TypeScript, Vite, framer-motion (already a dependency), inline style objects (project convention — no CSS modules/Tailwind classes used in landing section components), plain `<style>` tag for the one responsive breakpoint (same pattern as `Instructors.tsx`).

## Global Constraints

- No pole dance / dance-studio references anywhere in visible text (regla de oro, `convenciones.md`).
- Visible copy must be formal and health-oriented in Spanish.
- No Prisma / no ORM — not applicable to this plan (no backend changes).
- No admin CRUD, no DB table, no upload endpoint, no real photos yet — explicitly out of scope per the approved spec (`docs/superpowers/specs/2026-08-10-mis-espacios-design.md`).
- Visual palette must match sibling landing sections `Instructors.tsx`/`Testimonials.tsx` (`#8B5CF6` purple + `#3B82F6` blue accents, `font-cormorant` headings), not the plain-blue palette documented in `convenciones.md` — this deviation is intentional and already recorded in the spec.
- Section background `#FFFFFF`.

---

## Task 1: Create the `Spaces` component

**Files:**
- Create: `medisopimed-landing/src/components/Spaces.tsx`

**Interfaces:**
- Consumes: `framer-motion` (`motion`, `useInView`), `react` (`useRef`) — both already project dependencies.
- Produces: `export default function Spaces()` — a React component with no props, rendering `<section id="espacios">...</section>`. This is the exact export Task 2 imports as `import Spaces from './components/Spaces'`.

This task has no automated test — no sibling landing section (`Testimonials.tsx`, `Instructors.tsx`, `About.tsx`, `Classes.tsx`, `FinalCTA.tsx`) has a unit test file, so `Spaces.tsx` follows the same convention. Verification is a TypeScript build check (Step 2) plus the manual visual check in Task 2 once it's wired into the page.

- [ ] **Step 1: Write `Spaces.tsx`**

```tsx
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface SpaceItem {
  id: string
  title: string
  caption: string
  image?: string
}

const SPACES: SpaceItem[] = [
  {
    id: 'recepcion',
    title: 'Recepción',
    caption: 'El primer contacto con nuestro equipo, pensado para tu comodidad.',
  },
  {
    id: 'sala-espera',
    title: 'Sala de espera',
    caption: 'Un espacio tranquilo mientras te preparamos para tu consulta.',
  },
  {
    id: 'consultorio',
    title: 'Consultorio',
    caption: 'Equipado para brindarte una atención médica completa y confidencial.',
  },
  {
    id: 'fachada',
    title: 'Fachada',
    caption: 'Fácil de encontrar, en el corazón de la ciudad.',
  },
]

function CameraIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function SpaceCard({
  space,
  large,
  index,
  inView,
}: {
  space: SpaceItem
  large: boolean
  index: number
  inView: boolean
}) {
  return (
    <motion.div
      className={`space-card${large ? ' space-card--large' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.15 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative',
        borderRadius: '1.5rem',
        overflow: 'hidden',
        border: '1px solid rgba(139,92,246,0.12)',
        boxShadow: '0 12px 40px rgba(139,92,246,0.08)',
      }}
    >
      {space.image ? (
        <img
          src={space.image}
          alt={space.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            minHeight: large ? 340 : 160,
            background:
              'radial-gradient(circle at 30% 20%, rgba(139,92,246,0.16), rgba(59,130,246,0.10) 60%, rgba(243,240,251,0.9))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#8B5CF6' }}>
            <CameraIcon />
          </div>
          <p
            className="font-cormorant"
            style={{ fontSize: large ? '1.5rem' : '1.15rem', fontWeight: 600, color: '#1B1C1C', margin: 0 }}
          >
            {space.title}
          </p>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.62rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#8B5CF6',
              margin: 0,
            }}
          >
            Foto próximamente
          </p>
        </div>
      )}

      {space.image && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '1rem 1.25rem',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.55), transparent)',
            color: '#fff',
          }}
        >
          <p className="font-cormorant" style={{ fontSize: large ? '1.4rem' : '1.05rem', fontWeight: 600, margin: 0 }}>
            {space.title}
          </p>
        </div>
      )}
    </motion.div>
  )
}

export default function Spaces() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="espacios" style={{ background: '#FFFFFF', padding: 'clamp(4rem, 12vw, 9rem) 1.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div ref={ref} style={{ textAlign: 'center', marginBottom: '4rem' }}>
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
            Nuestras Instalaciones
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#3B82F6,#8B5CF6)' }} />
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-cormorant"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 300, lineHeight: 1.1, color: '#1B1C1C', marginBottom: '1.25rem' }}
          >
            Mis <em style={{ fontStyle: 'italic', color: '#8B5CF6' }}>Espacios</em>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', color: '#475569', maxWidth: '560px', margin: '0 auto' }}
          >
            Un entorno limpio, cómodo y pensado para tu bienestar en cada visita.
          </motion.p>
        </div>

        <div className="spaces-grid">
          {SPACES.map((space, i) => (
            <SpaceCard key={space.id} space={space} large={i === 0} index={i} inView={inView} />
          ))}
        </div>
      </div>

      <style>{`
        .spaces-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          grid-template-rows: repeat(3, 1fr);
          gap: 1.25rem;
          height: 560px;
        }
        .space-card--large {
          grid-column: 1;
          grid-row: 1 / span 3;
        }
        @media (max-width: 768px) {
          .spaces-grid {
            grid-template-columns: 1fr;
            grid-template-rows: none;
            height: auto;
          }
          .space-card--large {
            grid-column: auto;
            grid-row: auto;
          }
          .spaces-grid .space-card {
            min-height: 220px;
          }
        }
      `}</style>
    </section>
  )
}
```

- [ ] **Step 2: Type-check the new file**

Run: `cd medisopimed-landing && npx tsc -b --noEmit`
Expected: no errors reported for `src/components/Spaces.tsx`. (The command may report pre-existing errors elsewhere in the repo if any exist — only confirm nothing new comes from `Spaces.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add medisopimed-landing/src/components/Spaces.tsx
git commit -m "feat(landing): add Spaces component for Mis Espacios gallery"
```

---

## Task 2: Wire `Spaces` into the landing page

**Files:**
- Modify: `medisopimed-landing/src/App.tsx:10` (imports block)
- Modify: `medisopimed-landing/src/App.tsx:76-83` (`LandingPage()` JSX)

**Interfaces:**
- Consumes: `Spaces` default export from `./components/Spaces` (produced by Task 1).
- Produces: nothing consumed by later tasks — this is the last task in the plan.

- [ ] **Step 1: Add the import**

In `medisopimed-landing/src/App.tsx`, add this line immediately after the existing `Testimonials` import (currently line 10):

```tsx
import Testimonials from './components/Testimonials'
import Spaces from './components/Spaces'
```

- [ ] **Step 2: Insert `<Spaces />` in `LandingPage()`**

In the same file, inside `function LandingPage()`, change:

```tsx
      <main>
        <Hero />
        <About />
        <Classes />
        <Instructors />
        <Testimonials />
        <FinalCTA />
      </main>
```

to:

```tsx
      <main>
        <Hero />
        <About />
        <Classes />
        <Instructors />
        <Spaces />
        <Testimonials />
        <FinalCTA />
      </main>
```

- [ ] **Step 3: Build to confirm no type/compile errors**

Run: `cd medisopimed-landing && npm run build`
Expected: build completes successfully (exit code 0), no TypeScript errors referencing `App.tsx` or `Spaces.tsx`.

- [ ] **Step 4: Manual visual verification**

Run: `cd medisopimed-landing && npm run dev`

Open the printed local URL in a browser and check:
- The "Mis Espacios" section appears between "Sobre la Doctora" and "Testimonios de Pacientes".
- Desktop viewport (>768px wide): 1 large tile on the left spanning the full height, 3 stacked tiles on the right — matches the approved bento mockup.
- Each tile shows the camera icon, the space title (Recepción / Sala de espera / Consultorio / Fachada), and "Foto próximamente".
- Resize the browser below 768px width (or use device toolbar): the grid collapses to a single stacked column, all 4 tiles full width.
- Section background is white and content is centered, matching the visual rhythm of neighboring sections.

Stop the dev server after verifying (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add medisopimed-landing/src/App.tsx
git commit -m "feat(landing): insert Mis Espacios section into the page"
```

---

## Post-Plan Documentation

Per `CLAUDE.md` rule #1, once both tasks are done and verified, add a short entry to `arquitectura.md` documenting the new `Spaces` component (file path, `id="espacios"`, position in `LandingPage()`, and the fact that photos are placeholders pending real images) so the mapa de pantallas/rutas stays current.
