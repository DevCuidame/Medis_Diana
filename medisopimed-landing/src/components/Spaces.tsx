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
    image: '/espacios/recepcion-2.jpg',
  },
  {
    id: 'sala-espera',
    title: 'Sala de espera',
    caption: 'Un espacio tranquilo mientras te preparamos para tu consulta.',
    image: '/espacios/sala-espera.jpeg',
  },
  {
    id: 'consultorio',
    title: 'Consultorio',
    caption: 'Equipado para brindarte una atención médica completa y confidencial.',
    image: '/espacios/consultorio-2.jpg',
  },
  {
    id: 'fachada',
    title: 'Fachada',
    caption: 'La puerta que te da la bienvenida a nuestro consultorio.',
    image: '/espacios/fachada.jpg',
  },
  {
    id: 'camilla',
    title: 'Sala de Procedimientos',
    caption: 'Camilla profesional, lista para tu valoración y cuidado.',
    image: '/espacios/camilla.jpg',
  },
  {
    id: 'tazas',
    title: 'Nuestra Imagen',
    caption: 'Cada detalle refleja el cuidado que ponemos en tu atención.',
    image: '/espacios/tazas.jpg',
  },
  {
    id: 'exteriores',
    title: 'Exteriores',
    caption: 'Fácil de encontrar, en el corazón de la ciudad.',
    image: '/espacios/entrada.jpg',
  },
]

function CameraIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
          alt={space.caption}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          className="space-card__placeholder"
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
          className="space-card__caption"
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
      <div style={{ maxWidth: '1220px', margin: '0 auto' }}>
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
          grid-template-columns: 1.1fr 1fr 1fr 1fr;
          grid-template-rows: repeat(2, 1fr);
          gap: 1.25rem;
          height: 560px;
        }
        .space-card--large {
          grid-column: 1;
          grid-row: 1 / span 2;
        }
        @media (max-width: 1080px) {
          .spaces-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto repeat(3, 220px);
            height: auto;
          }
          .space-card--large {
            grid-column: 1 / span 2;
            grid-row: auto;
            height: 300px;
          }
          .spaces-grid .space-card__placeholder {
            min-height: 220px !important;
          }
        }
        @media (max-width: 640px) {
          .spaces-grid {
            grid-template-columns: 1fr;
            grid-template-rows: none;
          }
          .spaces-grid .space-card {
            height: 220px;
          }
          .space-card--large {
            grid-column: 1;
            height: 260px;
          }
        }
      `}</style>
    </section>
  )
}
