import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

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

function StarRating({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: '#8B5CF6', fontSize: '0.85rem' }}>★</span>
      ))}
    </div>
  )
}

export default function Testimonials() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [active, setActive] = useState(0)

  const prev = () => setActive((a) => (a - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setActive((a) => (a + 1) % TESTIMONIALS.length)

  return (
    <section id="testimonios" style={{ background: '#F3F0FB', padding: '9rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%',
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%',
        width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(50px)',
      }} />

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div ref={ref} style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.35em',
              textTransform: 'uppercase', color: '#8B5CF6', marginBottom: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            }}
          >
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)' }} />
            Testimonios de Pacientes
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#3B82F6,#8B5CF6)' }} />
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-cormorant"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 300, lineHeight: 1.1, color: '#1B1C1C' }}
          >
            Lo que dicen{' '}
            <em style={{ fontStyle: 'italic', color: '#8B5CF6' }}>Nuestros Pacientes</em>
          </motion.h2>
        </div>

        {/* Featured testimonial */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, x: -30, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
            style={{
              background: 'rgba(255,255,255,0.80)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(139,92,246,0.12)',
              borderRadius: '2rem',
              padding: 'clamp(2.5rem, 5vw, 4rem)',
              boxShadow: '0 20px 60px rgba(139,92,246,0.10)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* Opening quote mark */}
            <div
              className="font-cormorant brand-text-gradient"
              style={{ fontSize: '8rem', lineHeight: 0.6, marginBottom: '1.5rem', opacity: 0.35, fontWeight: 300 }}
              aria-hidden
            >
              "
            </div>

            <blockquote
              className="font-cormorant"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.1rem)',
                fontWeight: 400,
                fontStyle: 'italic',
                lineHeight: 1.45,
                color: '#1B1C1C',
                marginBottom: '2.5rem',
                maxWidth: '700px',
                margin: '0 auto 2.5rem',
              }}
            >
              "{TESTIMONIALS[active].quote}"
            </blockquote>

            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <StarRating count={TESTIMONIALS[active].stars} />
            </div>

            <p
              className="font-cormorant"
              style={{ fontSize: '1.15rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
            >
              — {TESTIMONIALS[active].author}
            </p>
            <p
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8B5CF6' }}
            >
              {TESTIMONIALS[active].role}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '2.5rem' }}>
          <motion.button
            onClick={prev}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Anterior"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.80)',
              border: '1px solid rgba(139,92,246,0.18)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#8B5CF6', backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>

          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {TESTIMONIALS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setActive(i)}
                animate={{ width: i === active ? 24 : 8, opacity: i === active ? 1 : 0.35 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                aria-label={`Testimonio ${i + 1}`}
                style={{
                  height: 8, borderRadius: 9999,
                  background: 'linear-gradient(90deg, #8B5CF6, #3B82F6)',
                  border: 'none', cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>

          <motion.button
            onClick={next}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Siguiente"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.80)',
              border: '1px solid rgba(139,92,246,0.18)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#8B5CF6', backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>

        {/* Floating mini testimonial cards below */}
        <div
          style={{
            marginTop: '3rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {TESTIMONIALS.filter((_, i) => i !== active).slice(0, 3).map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 0.7 - i * 0.05, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.5 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, opacity: 1 }}
              onClick={() => setActive(TESTIMONIALS.indexOf(t))}
              style={{
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(139,92,246,0.08)',
                borderRadius: '1rem',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'opacity 0.25s ease',
              }}
            >
              <p
                className="font-cormorant"
                style={{ fontSize: '0.95rem', fontStyle: 'italic', color: '#475569', lineHeight: 1.5, marginBottom: '0.75rem' }}
              >
                "{t.quote.slice(0, 75)}…"
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B5CF6' }}>
                {t.author}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
