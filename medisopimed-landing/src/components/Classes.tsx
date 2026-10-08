import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

// Catálogo propio de OpiMed — independiente del catálogo real de CuidameDoc.
const CLASSES = [
  {
    title: 'Consulta General',
    level: 'Todas las edades',
    duration: '30 min',
    description: 'Valoración médica integral para identificar, orientar y dar seguimiento a tu estado de salud.',
    accent: '#14B8A6',
    tag: 'Consulta',
    gradient: 'linear-gradient(160deg, #0F172A 0%, #134E4A 50%, #042F2E 100%)',
  },
  {
    title: 'Control de Enfermedades Crónicas',
    level: 'Adultos',
    duration: '30 min',
    description: 'Seguimiento y manejo de hipertensión, diabetes y otras condiciones crónicas para mantener tu salud bajo control.',
    accent: '#2DD4BF',
    tag: 'Seguimiento',
    gradient: 'linear-gradient(160deg, #0B2B29 0%, #134E4A 50%, #0D9488 100%)',
  },
  {
    title: 'Chequeo Preventivo Anual',
    level: 'Jóvenes y Adultos',
    duration: '45 min',
    description: 'Evaluación completa y tamizajes para detectar a tiempo factores de riesgo y cuidar tu salud a largo plazo.',
    accent: '#14B8A6',
    tag: 'Preventivo',
    gradient: 'linear-gradient(160deg, #0F172A 0%, #115E59 50%, #042F2E 100%)',
  },
  {
    title: 'Vacunación e Inmunización',
    level: 'Todas las edades',
    duration: '20 min',
    description: 'Aplicación y orientación sobre el esquema de vacunación según edad y necesidades de cada paciente.',
    accent: '#2DD4BF',
    tag: 'Prevención',
    gradient: 'linear-gradient(160deg, #0B2B29 0%, #134E4A 50%, #0F172A 100%)',
  },
  {
    title: 'Valoración Pediátrica',
    level: 'Niños',
    duration: '30 min',
    description: 'Control de crecimiento y desarrollo, con orientación a madres y padres sobre el cuidado de sus hijos.',
    accent: '#14B8A6',
    tag: 'Pediatría',
    gradient: 'linear-gradient(160deg, #0F172A 0%, #134E4A 50%, #042F2E 100%)',
  },
  {
    title: 'Control Prenatal',
    level: 'Mujeres gestantes',
    duration: '30 min',
    description: 'Acompañamiento médico durante el embarazo, con seguimiento periódico de la salud materna y fetal.',
    accent: '#2DD4BF',
    tag: 'Materno',
    gradient: 'linear-gradient(160deg, #0B2B29 0%, #134E4A 50%, #0F172A 100%)',
  },
  {
    title: 'Certificados Médicos',
    level: 'Todas las edades',
    duration: '15 min',
    description: 'Expedición de certificados médicos laborales, deportivos y escolares con valoración rápida.',
    accent: '#14B8A6',
    tag: 'Trámite Rápido',
    gradient: 'linear-gradient(160deg, #0F172A 0%, #042F2E 50%, #134E4A 100%)',
  },
  {
    title: 'Consulta Virtual',
    level: 'Todas las edades',
    duration: '20 min',
    description: 'Atención médica a distancia para orientación, seguimiento y resolución de dudas sin salir de casa.',
    accent: '#2DD4BF',
    tag: 'Telemedicina',
    gradient: 'linear-gradient(160deg, #0B2B29 0%, #134E4A 50%, #0D9488 100%)',
  },
]

function ClassCard({ title, level, duration, description, accent, tag, gradient, delay }: { title: string, level?: string, duration: string, description?: string, accent: string, tag?: string, gradient: string, delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const navigate = useNavigate()
  const isBlue = accent === '#2DD4BF'

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
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Inner glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 20% 20%, rgba(68,207,203,0.18) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Decorative line */}
        <div style={{
          position: 'absolute', top: '1.75rem', right: '1.75rem',
          width: 40, height: 1,
          background: `linear-gradient(90deg, transparent, ${accent})`,
        }} />

        {/* Content — anclado arriba para que título/duración empiecen siempre
            en la misma posición entre tarjetas; el CTA se ancla abajo con el spacer. */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Tag: en el flujo normal (no absolute) para que nunca se solape con la duración */}
          {tag && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '0.3rem 0.8rem',
              marginBottom: '1.5rem',
              borderRadius: '9999px',
              background: isBlue ? 'rgba(96,165,250,0.20)' : 'rgba(56,189,248,0.20)',
              border: `1px solid ${accent}40`,
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: isBlue ? '#5EEAD4' : '#5EEAD4',
              backdropFilter: 'blur(6px)',
            }}>
              {tag}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            {level && (
              <>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.66rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                  {level}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              </>
            )}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.66rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              {duration}
            </span>
          </div>

          <h3
            className="font-manrope"
            style={{ fontSize: '1.6rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2, marginBottom: '0.75rem' }}
          >
            {title}
          </h3>

          {description && (
            <p
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.65)', fontWeight: 400, marginBottom: '1.25rem' }}
            >
              {description}
            </p>
          )}

          {/* Spacer: empuja el CTA al fondo de la tarjeta, sin importar cuánto texto haya arriba */}
          <div style={{ flex: 1 }} />

          {/* Hover CTA */}
          <motion.div
            onClick={() => navigate('/agendar')}
            whileHover={{ x: 5, color: '#fff' }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isBlue ? '#5EEAD4' : '#5EEAD4',
              fontWeight: 500,
              cursor: 'pointer',
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
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  // Catálogo propio de OpiMed, independiente del catálogo real en CuidameDoc.
  const cards = CLASSES.map(c => ({ key: c.title, ...c }))

  return (
    <section id="servicios" style={{ background: '#F0FDFA', padding: 'clamp(4rem, 12vw, 9rem) 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div ref={ref} style={{ marginBottom: '4rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem' }}>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#0D9488', fontWeight: 600, marginBottom: '1rem',
              }}
            >
              Nuestros Servicios
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-manrope"
              style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.02em', color: '#0F172A' }}
            >
              Servicios Médicos
            </motion.h2>
          </div>

          <motion.a
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            href="/agendar"
            onClick={(e) => { e.preventDefault(); navigate('/agendar'); }}
            whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(13,148,136,0.30)' }}
            whileTap={{ scale: 0.97 }}
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
              boxShadow: '0 6px 24px rgba(13,148,136,0.22)',
              transition: 'box-shadow 0.3s ease',
            }}
          >
            Agendar Cita
          </motion.a>
        </div>

        {/* Cards Grid — min(320px, 100%) evita overflow en pantallas angostas (320-360px) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
          gap: '1.25rem',
        }}>
          {cards.map(({ key, ...c }, i) => (
            <ClassCard key={key} {...c} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  )
}
