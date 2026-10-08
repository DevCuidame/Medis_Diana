import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function FinalCTA() {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(4rem, 12vw, 9rem) 1.5rem',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #0F172A 0%, #0D9488 65%, #44CFCB 130%)',
      }}
    >
      {/* Atmospheric glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(68,207,203,0.22) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.035) 60px, rgba(255,255,255,0.035) 61px)`,
        pointerEvents: 'none',
      }} />

      {/* Floating glow orbs */}
      {[
        { size: 350, top: '10%', left: '-5%', delay: 0 },
        { size: 250, top: '50%', right: '0%', delay: 2 },
        { size: 180, bottom: '5%', left: '40%', delay: 1 },
      ].map(({ size, top, left, right, bottom, delay }: any, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0.18, 0.4, 0] }}
          transition={{ duration: 12 + delay, repeat: Infinity, delay, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top, left, right, bottom,
            width: size, height: size, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)',
            filter: 'blur(70px)',
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        ref={ref}
        style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}
      >
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#99F6E4', fontWeight: 600, marginBottom: '1.5rem',
          }}
        >
          Agenda tu Consulta
        </motion.p>

        {/* Main headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-manrope"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 5rem)',
            fontWeight: 800,
            lineHeight: 1.02,
            color: '#FFFFFF',
            marginBottom: '2rem',
            letterSpacing: '-0.02em',
          }}
        >
          Tu salud
          <br />
          es lo primero
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '1rem',
            lineHeight: 1.8,
            color: 'rgba(255,255,255,0.78)',
            maxWidth: '550px',
            margin: '0 auto 3rem',
            fontWeight: 400,
          }}
        >
          Da el primer paso hacia una atención médica cercana y de calidad.
          La Dra. OpiMed está lista para acompañarte.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <motion.a
            href="/agendar"
            onClick={(e) => { e.preventDefault(); navigate('/agendar'); }}
            whileHover={{ scale: 1.05, boxShadow: '0 16px 50px rgba(0,0,0,0.25)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '1.1rem 2.8rem',
              borderRadius: '9999px',
              color: '#0D9488',
              background: '#FFFFFF',
              textDecoration: 'none',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 700,
              boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
              transition: 'box-shadow 0.4s ease',
            }}
          >
            Agendar Cita
          </motion.a>

          <motion.a
            href="#servicios"
            whileHover={{
              scale: 1.05,
              backgroundColor: 'rgba(255,255,255,0.14)',
            }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '1.1rem 2.8rem',
              borderRadius: '9999px',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 500,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.35)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.4s ease',
            }}
          >
            Conoce los Servicios
          </motion.a>
        </motion.div>

        {/* Decorative divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={inView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: '5rem',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
            transformOrigin: 'center',
          }}
        />

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.7 }}
          style={{
            marginTop: '3rem',
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(1.5rem, 4vw, 4rem)',
            flexWrap: 'wrap',
          }}
        >
          {[
            { icon: '✦', label: 'Primera consulta de valoración' },
            { icon: '◈', label: 'Atención cercana y profesional' },
            { icon: '❋', label: 'Médica certificada' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: '#99F6E4', fontSize: '0.85rem' }}>{icon}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
