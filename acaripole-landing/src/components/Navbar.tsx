import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const links = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Sobre la Doctora', href: '#sobre-la-doctora' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Testimonios', href: '#testimonios' },
  { label: 'Contacto', href: '#contacto' },
]

interface NavbarProps {
  onLoginClick?: () => void
}

export default function Navbar({ onLoginClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'center', padding: '1.25rem 1.5rem' }}
    >
      <nav
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          padding: '0.75rem 2rem',
          borderRadius: '9999px',
          width: '100%',
          maxWidth: '1200px',
          transition: 'box-shadow 0.4s ease',
          boxShadow: scrolled
            ? '0 20px 60px rgba(139,92,246,0.18)'
            : '0 10px 40px rgba(139,92,246,0.10)',
        }}
      >
        {/* Logo */}
        <a href="#inicio" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <img
            src="/Logo_Medis.jpeg"
            alt="Dra. Diana Cristina Medina Camargo"
            style={{ height: '64px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </a>

        {/* Desktop Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }} className="desktop-nav">
          <ul
            style={{
              display: 'flex',
              listStyle: 'none',
              gap: '2.5rem',
              margin: 0,
              padding: 0,
            }}
          >
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="luxury-link font-inter"
                  style={{
                    fontSize: '0.78rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#475569',
                    textDecoration: 'none',
                    fontWeight: 500,
                    transition: 'color 0.3s ease',
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B5CF6')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          
          {/* Artist Login Link */}
          {onLoginClick && (
            <button
              onClick={onLoginClick}
              className="font-inter uppercase tracking-widest text-[0.75rem] font-bold text-brand-primary hover:text-brand-secondary transition-colors"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Iniciar Sesión
            </button>
          )}
        </div>

        {/* CTA Button */}
        <motion.a
          href="/login"
          onClick={(e: React.MouseEvent) => { e.preventDefault(); if (onLoginClick) onLoginClick(); }}
          whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(139,92,246,0.35)' }}
          whileTap={{ scale: 0.97 }}
          className="brand-gradient desktop-cta"
          style={{
            padding: '0.6rem 1.6rem',
            borderRadius: '9999px',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
            transition: 'box-shadow 0.3s ease',
          }}
        >
          Agendar Cita
        </motion.a>

        {/* Mobile Hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={menuOpen ? (i === 1 ? { opacity: 0 } : i === 0 ? { rotate: 45, y: 8 } : { rotate: -45, y: -8 }) : { opacity: 1, rotate: 0, y: 0 }}
                style={{ display: 'block', width: '22px', height: '1.5px', background: '#8B5CF6', transformOrigin: 'center' }}
              />
            ))}
          </div>
        </button>
      </nav>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass mobile-menu"
            style={{
              position: 'absolute',
              top: '100%',
              left: '1.5rem',
              right: '1.5rem',
              marginTop: '0.5rem',
              borderRadius: '1.5rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {links.map((l, i) => (
              <motion.a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#475569',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  borderBottom: '1px solid rgba(139,92,246,0.10)',
                  paddingBottom: '1rem',
                }}
              >
                {l.label}
              </motion.a>
            ))}
            {onLoginClick && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onLoginClick()
                }}
                style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#8B5CF6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'left',
                  borderBottom: '1px solid rgba(139,92,246,0.10)',
                  paddingBottom: '1rem',
                }}
              >
                Iniciar Sesión
              </button>
            )}
            <a
              href="/login"
              onClick={(e) => { e.preventDefault(); setMenuOpen(false); if (onLoginClick) onLoginClick(); }}
              className="brand-gradient"
              style={{
                padding: '0.75rem',
                borderRadius: '9999px',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '0.78rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                textAlign: 'center',
              }}
            >
              Agendar Cita
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .desktop-cta { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </motion.header>
  )
}
