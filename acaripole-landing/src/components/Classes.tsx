import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

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

function ClassCard({ title, level, duration, description, accent, tag, gradient, delay }: typeof CLASSES[0] & { delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', cursor: 'pointer' }}
    >
      <motion.div
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: gradient,
          minHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Inner glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 20% 20%, rgba(139,92,246,0.18) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Decorative line */}
        <div style={{
          position: 'absolute', top: '1.75rem', right: '1.75rem',
          width: 40, height: 1,
          background: `linear-gradient(90deg, transparent, ${accent})`,
        }} />

        {/* Tag */}
        <div style={{
          position: 'absolute', top: '1.5rem', left: '1.5rem',
          padding: '0.3rem 0.8rem',
          borderRadius: '9999px',
          background: `rgba(${accent === '#A78BFA' ? '167,139,250' : '56,189,248'},0.20)`,
          border: `1px solid ${accent}40`,
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.62rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: accent === '#A78BFA' ? '#C4B5FD' : '#7DD3FC',
          backdropFilter: 'blur(6px)',
        }}>
          {tag}
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.66rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              {level}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.66rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              {duration}
            </span>
          </div>

          <h3
            className="font-cormorant"
            style={{ fontSize: '2rem', fontWeight: 500, color: '#FFFFFF', lineHeight: 1.1, marginBottom: '0.75rem' }}
          >
            {title}
          </h3>

          <p
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', lineHeight: 1.7, color: 'rgba(251,249,248,0.62)', fontWeight: 300, marginBottom: '1.25rem' }}
          >
            {description}
          </p>

          {/* Hover CTA */}
          <motion.div
            whileHover={{ x: 6 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: accent === '#A78BFA' ? '#C4B5FD' : '#7DD3FC',
              fontWeight: 500,
            }}
          >
            Agendar
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Classes() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="servicios" style={{ background: '#F3F0FB', padding: '9rem 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div ref={ref} style={{ marginBottom: '4rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem' }}>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.35em',
                textTransform: 'uppercase', color: '#8B5CF6', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}
            >
              <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)' }} />
              Nuestros Servicios
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant"
              style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 300, lineHeight: 1.05, color: '#1B1C1C' }}
            >
              Servicios <em style={{ fontStyle: 'italic', color: '#8B5CF6' }}>Médicos</em>
            </motion.h2>
          </div>

          <motion.a
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            href="#contacto"
            whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(139,92,246,0.30)' }}
            className="brand-gradient"
            style={{
              padding: '0.85rem 2rem',
              borderRadius: '9999px',
              color: '#fff',
              textDecoration: 'none',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 6px 24px rgba(139,92,246,0.25)',
            }}
          >
            Agendar Cita
          </motion.a>
        </div>

        {/* Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}>
          {CLASSES.map((c, i) => (
            <ClassCard key={c.title} {...c} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  )
}
