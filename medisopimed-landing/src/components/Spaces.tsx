import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface SpaceItem {
  id: string
  title: string
  caption: string
  image: string
  imgPosition?: string
}

const SPACES: SpaceItem[] = [
  {
    id: 'recepcion',
    title: 'Recepción',
    caption: 'El primer contacto con nuestro equipo, pensado para tu comodidad.',
    image: '/espacios/recepcion-stock.jpg',
  },
  {
    id: 'sala-espera',
    title: 'Sala de espera',
    caption: 'Un espacio tranquilo mientras te preparamos para tu consulta.',
    image: '/espacios/espera-stock.jpg',
  },
  {
    id: 'consultorio',
    title: 'Consultorio',
    caption: 'Equipado para brindarte una atención médica completa y confidencial.',
    image: '/espacios/consultorio-stock.jpg',
    imgPosition: 'center 25%',
  },
  {
    id: 'procedimientos',
    title: 'Sala de Procedimientos',
    caption: 'Equipo profesional, listo para tu valoración y cuidado.',
    image: '/espacios/procedimientos-stock.jpg',
  },
]

function SpaceCard({ space, index, inView }: { space: SpaceItem; index: number; inView: boolean }) {
  return (
    <motion.div
      className="space-card"
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.15 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        boxShadow: '0 8px 28px rgba(15,23,42,0.06)',
      }}
    >
      <img
        src={space.image}
        alt={space.caption}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: space.imgPosition ?? 'center', display: 'block' }}
      />

      <div
        className="space-card__caption"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '1rem 1.25rem',
          background: 'linear-gradient(0deg, rgba(15,23,42,0.60), transparent)',
          color: '#fff',
        }}
      >
        <p className="font-manrope" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          {space.title}
        </p>
      </div>
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
              fontSize: '0.78rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#0D9488',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            Nuestras Instalaciones
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-manrope"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#0F172A', marginBottom: '1.25rem' }}
          >
            Mis Espacios
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
            <SpaceCard key={space.id} space={space} index={i} inView={inView} />
          ))}
        </div>
      </div>

      <style>{`
        .spaces-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }
        .spaces-grid .space-card {
          aspect-ratio: 3 / 4;
        }
        @media (max-width: 1080px) {
          .spaces-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .spaces-grid { grid-template-columns: 1fr; }
          .spaces-grid .space-card { aspect-ratio: 4 / 3; }
        }
      `}</style>
    </section>
  )
}
