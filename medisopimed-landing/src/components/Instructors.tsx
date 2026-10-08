import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const CREDENTIALS = [
  'Médica Cirujana',
  'Atención Integral',
  'Prevención',
  'Bienestar y Salud',
]

const BIO_PARAGRAPHS = [
  'Soy médica comprometida con brindar una atención cercana, humana y personalizada, enfocada en comprender las necesidades de cada paciente y acompañarlo en el cuidado de su salud.',
  'Mi enfoque combina prevención, valoración, orientación y seguimiento, buscando ofrecer una experiencia de atención clara, profesional y centrada en el bienestar de cada persona.',
  'Me caracterizo por escuchar activamente a mis pacientes, explicar cada proceso de manera sencilla y trabajar en conjunto para encontrar las mejores alternativas para su cuidado.',
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
              fontSize: '0.78rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#0D9488',
              fontWeight: 600,
            }}
          >
            Tu Médica de Confianza
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
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '1.5rem',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(15,23,42,0.06)',
          }}
        >
          {/* Left — portrait */}
          <div
            style={{
              minHeight: '420px',
              alignSelf: 'stretch',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img
              src="/doctora/opimed-doctora.jpg"
              alt="Dra. OpiMed"
              style={{
                width: '100%',
                height: '100%',
                minHeight: '420px',
                objectFit: 'cover',
                objectPosition: 'center 20%',
                display: 'block',
              }}
            />
          </div>

          {/* Right — info */}
          <div className="doctor-info" style={{ padding: '3rem 3rem 3rem 2.5rem' }}>
            <h2
              className="font-manrope"
              style={{
                fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '0.5rem',
                lineHeight: 1.15,
              }}
            >
              Dra. OpiMed
            </h2>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.78rem',
                letterSpacing: '0.04em',
                color: '#0D9488',
                marginBottom: '1.5rem',
                fontWeight: 600,
              }}
            >
              Médica especialista en atención integral
            </p>
            <div style={{ marginBottom: '2rem' }}>
              {BIO_PARAGRAPHS.map((para, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.9rem',
                    lineHeight: 1.8,
                    color: '#475569',
                    fontWeight: 400,
                    marginBottom: i < BIO_PARAGRAPHS.length - 1 ? '1rem' : 0,
                  }}
                >
                  {para}
                </p>
              ))}
            </div>

            {/* Credential chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {CREDENTIALS.map((c) => (
                <span
                  key={c}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.72rem',
                    color: '#0D9488',
                    fontWeight: 500,
                    padding: '0.4rem 0.9rem',
                    background: '#E6FFFA',
                    border: '1px solid #99F6E4',
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
