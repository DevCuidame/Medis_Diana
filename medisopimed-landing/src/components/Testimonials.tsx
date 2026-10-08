import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

const TESTIMONIALS = [
  {
    quote: 'La doctora es una persona profundamente dedicada, acertada en cada una de sus valoraciones y con un compromiso admirable por el bienestar de sus pacientes. Doy fe y testimonio de la gran labor que ha realizado en mi vida y en la de mi familia. Siempre nos ha brindado acompañamiento, confianza, tranquilidad y seguridad en cada proceso, haciendo que cada situación sea mucho más llevadera. Gracias, Dra. OpiMed, por su entrega, su vocación, su profesionalismo y, sobre todo, por ser un ser humano tan valioso.',
    author: 'Angiee Bonilla',
    role: 'Paciente',
    stars: 5,
  },
  {
    quote: 'Hablar de la Dra. OpiMed es hablar de profesionalismo, dedicación y, sobre todo, de calidad humana. Es una persona que inspira confianza desde el primer momento, que escucha, comprende y acompaña cada proceso con una empatía y una sensibilidad que realmente hacen la diferencia. He tenido la oportunidad de contar con su acompañamiento y puedo decir con total sinceridad que ha sido una experiencia muy positiva. Su manera de ejercer la medicina, su compromiso y el interés genuino por sus pacientes reflejan la gran persona que es. Es un privilegio encontrar profesionales que, además de ser excelentes en lo que hacen, sean seres humanos tan especiales.',
    author: 'Angel niño',
    role: 'Paciente',
    stars: 5,
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: '#F9564F', fontSize: '0.85rem' }}>★</span>
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
    <section id="testimonios" style={{ background: '#F0FDFA', padding: 'clamp(4rem, 12vw, 9rem) 1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%',
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%',
        width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(68,207,203,0.08) 0%, transparent 70%)',
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
              fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#0D9488', fontWeight: 600, marginBottom: '1rem',
            }}
          >
            Testimonios de Pacientes
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-manrope"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#0F172A' }}
          >
            Lo que dicen nuestros pacientes
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
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '1.75rem',
              padding: 'clamp(2.5rem, 5vw, 4rem)',
              boxShadow: '0 16px 50px rgba(15,23,42,0.08)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* Opening quote mark */}
            <div
              className="font-manrope brand-text-gradient"
              style={{ fontSize: 'clamp(3.5rem, 10vw, 6.5rem)', lineHeight: 0.6, marginBottom: '1.5rem', opacity: 0.4, fontWeight: 800 }}
              aria-hidden
            >
              "
            </div>

            <blockquote
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 'clamp(1.15rem, 2.2vw, 1.4rem)',
                fontWeight: 500,
                lineHeight: 1.6,
                color: '#0F172A',
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
              className="font-manrope"
              style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}
            >
              {TESTIMONIALS[active].author}
            </p>
            <p
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0D9488', fontWeight: 500 }}
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
              background: '#FFFFFF',
              border: '1px solid #CCFBF1',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0D9488',
              boxShadow: '0 4px 14px rgba(15,23,42,0.06)',
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
                  background: 'linear-gradient(90deg, #0D9488, #44CFCB)',
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
              background: '#FFFFFF',
              border: '1px solid #CCFBF1',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0D9488',
              boxShadow: '0 4px 14px rgba(15,23,42,0.06)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>

        {/* Mini testimonial cards below */}
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
              animate={inView ? { opacity: 0.85 - i * 0.05, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.5 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, opacity: 1 }}
              onClick={() => setActive(TESTIMONIALS.indexOf(t))}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '1rem',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'opacity 0.25s ease',
              }}
            >
              <p
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#475569', lineHeight: 1.55, marginBottom: '0.75rem' }}
              >
                "{t.quote.slice(0, 75)}…"
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', letterSpacing: '0.06em', color: '#0D9488', fontWeight: 600 }}>
                {t.author}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
