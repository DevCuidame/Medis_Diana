import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const FADE_UP = {
  hidden: { opacity: 0, y: 40 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: i * 0.12, ease: EASE },
  }),
}

/* Floating brand orbs for cinematic atmosphere */
function BrandOrb({ size, top, left, delay, blur }: { size: number; top: string; left: string; delay: number; blur: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 0.55, 0.3, 0.6, 0], scale: [0.6, 1, 1.1, 1, 0.8] }}
      transition={{ duration: 10 + delay, repeat: Infinity, delay, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(59,130,246,0.15) 60%, transparent 100%)',
        filter: `blur(${blur}px)`,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  )
}

export default function Hero() {
  const navigate = useNavigate()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section
      id="inicio"
      ref={ref}
      style={{ position: 'relative', height: '100vh', minHeight: '700px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}
    >
      {/* ── Video Layer ─────────────────────────────── */}
      <motion.div style={{ y: videoY, position: 'absolute', inset: 0, zIndex: 0 }}>
        <iframe
          src="https://player.cloudinary.com/embed/?cloud_name=dasesxehg&public_id=___title_Consultorio_de_M_rrciwf&autoplay=true&loop=true&muted=true&controls=false"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none', transform: 'scale(1.18)', transformOrigin: 'center center' }}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          title="Hero Video"
        />
      </motion.div>

      {/* ── Cinematic Overlay ────────────────────────── */}
      <motion.div
        style={{ opacity: overlayOpacity }}
        className="hero-overlay"
        aria-hidden
      >
        {/* Primary directional gradient */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to right, rgba(27,28,28,0.38) 0%, rgba(27,28,28,0.12) 60%, transparent 100%)',
        }} />
        {/* Bottom fade so text reads cleanly */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to top, rgba(27,28,28,0.55) 0%, transparent 55%)',
        }} />
        {/* Warm top-left vignette — editorial light leak */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'radial-gradient(ellipse 80% 60% at 10% 10%, rgba(139,92,246,0.15) 0%, transparent 65%)',
        }} />
      </motion.div>

      {/* ── Floating Brand Orbs ──────────────────────── */}
      <BrandOrb size={300} top="10%" left="70%" delay={0}   blur={60} />
      <BrandOrb size={180} top="55%" left="80%" delay={3}   blur={45} />
      <BrandOrb size={220} top="20%" left="5%"  delay={1.5} blur={55} />
      <BrandOrb size={120} top="70%" left="30%" delay={2}   blur={35} />

      {/* ── Tiny sparkle particles ───────────────────── */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.9, 0],
            y: [0, -60 - i * 10, -100],
            x: [0, (i % 2 === 0 ? 12 : -12)],
          }}
          transition={{ duration: 5 + i * 0.7, repeat: Infinity, delay: i * 1.1, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: `${15 + i * 6}%`,
            left: `${8 + i * 11}%`,
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#38BDF8',
            boxShadow: '0 0 6px 2px rgba(56,189,248,0.7)',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ── Content ──────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          width: '100%',
          paddingTop: '6rem',
        }}
      >
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Eyebrow */}
          <motion.p
            variants={FADE_UP}
            custom={0}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.72rem',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: '#8B5CF6',
              marginBottom: '1.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ display: 'block', width: 32, height: 1, background: 'linear-gradient(90deg, #8B5CF6, #3B82F6)' }} />
            Medicina Familiar · Atención Integral · Cercanía
          </motion.p>

          {/* Main Headline */}
          <motion.h1
            variants={FADE_UP}
            custom={1}
            className="font-cormorant"
            style={{
              fontSize: 'clamp(2.4rem, 4.5vw, 5rem)',
              lineHeight: 0.88,
              letterSpacing: '-0.04em',
              color: '#FFFFFF',
              fontWeight: 300,
              marginBottom: '2rem',
              maxWidth: '700px',
            }}
          >
            CUIDAMOS<br />
            DE TI Y<br />
            DE TU<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>FAMILIA</em>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={FADE_UP}
            custom={2}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 'clamp(0.92rem, 1.4vw, 1.05rem)',
              lineHeight: 1.75,
              color: 'rgba(251,249,248,0.78)',
              maxWidth: '540px',
              marginBottom: '3rem',
              fontWeight: 300,
            }}
          >
            La Dra. Diana Cristina Medina Camargo te ofrece atención médica familiar
            personalizada, cercana y profesional, para ti y los tuyos.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={FADE_UP}
            custom={3}
            style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
          >
            {/* Primary */}
            <motion.a
              href="/login"
              onClick={(e) => { e.preventDefault(); navigate('/login'); }}
              whileHover={{ scale: 1.05, boxShadow: '0 16px 48px rgba(139,92,246,0.50)' }}
              whileTap={{ scale: 0.97 }}
              className="brand-gradient"
              style={{
                padding: '0.95rem 2.4rem',
                borderRadius: '9999px',
                color: '#fff',
                textDecoration: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
                boxShadow: '0 8px 32px rgba(139,92,246,0.35)',
                transition: 'box-shadow 0.4s ease',
              }}
            >
              Agendar Cita
            </motion.a>

            {/* Secondary */}
            <motion.a
              href="#servicios"
              whileHover={{
                scale: 1.05,
                boxShadow: '0 8px 32px rgba(139,92,246,0.25)',
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '0.95rem 2.4rem',
                borderRadius: '9999px',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 500,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(139,92,246,0.45)',
                backdropFilter: 'blur(8px)',
                transition: 'background-color 0.25s ease, box-shadow 0.25s ease',
              }}
            >
              Conoce Nuestros Servicios
            </motion.a>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Bottom scroll indicator ───────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        style={{
          position: 'absolute',
          bottom: '2.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(251,249,248,0.5)' }}>
          Descubre
        </span>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 1, height: 40, background: 'linear-gradient(180deg, rgba(139,92,246,0.8), transparent)' }}
        />
      </motion.div>
    </section>
  )
}
