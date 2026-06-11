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
