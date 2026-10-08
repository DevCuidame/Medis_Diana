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
  onAgendarClick?: () => void
}

export default function Navbar({ onLoginClick, onAgendarClick }: NavbarProps) {
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
      className="navbar-header"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'center', padding: '1rem 1.5rem' }}
    >
      <nav
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          padding: '0.6rem 1.5rem',
          borderRadius: '9999px',
          width: '100%',
          maxWidth: '1200px',
          transition: 'box-shadow 0.4s ease',
          boxShadow: scrolled
            ? '0 20px 60px rgba(13,148,136,0.18)'
            : '0 10px 40px rgba(13,148,136,0.10)',
        }}
      >
        {/* Logo — solo texto. minWidth:0 permite que el flex item se achique
            en vez de forzar overflow del pill nav en pantallas angostas. */}
        <a href="#inicio" style={{ textDecoration: 'none', flexShrink: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <div
            className="navbar-logo-name"
            style={{
              fontSize: '0.9rem', fontWeight: 600, color: '#0F172A',
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              whiteSpace: 'nowrap', letterSpacing: '0.02em',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
            Dra. OpiMed
          </div>
        </a>

        {/* Desktop Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="desktop-nav">
          <ul style={{ display: 'flex', listStyle: 'none', gap: '1.5rem', margin: 0, padding: 0 }}>
            {links.map((l) => (
              <li key={l.label} style={{ whiteSpace: 'nowrap' }}>
                <a
                  href={l.href}
                  className="luxury-link font-inter"
                  style={{
                    fontSize: '0.74rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#475569',
                    textDecoration: 'none',
                    fontWeight: 500,
                    transition: 'color 0.3s ease',
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#0D9488')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          {onLoginClick && (
            <button
              onClick={onLoginClick}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#0D9488',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.7')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
            >
              Iniciar Sesión
            </button>
          )}
        </div>

        {/* CTA Button */}
        <motion.a
          href="/agendar"
          onClick={(e: React.MouseEvent) => { e.preventDefault(); if (onAgendarClick) onAgendarClick(); }}
          whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(13,148,136,0.35)' }}
          whileTap={{ scale: 0.97 }}
          className="brand-gradient desktop-cta"
          style={{
            padding: '0.65rem 1.5rem',
            borderRadius: '9999px',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
            whiteSpace: 'nowrap',
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'none' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={menuOpen ? (i === 1 ? { opacity: 0 } : i === 0 ? { rotate: 45, y: 8 } : { rotate: -45, y: -8 }) : { opacity: 1, rotate: 0, y: 0 }}
                style={{ display: 'block', width: '22px', height: '1.5px', background: '#0D9488', transformOrigin: 'center' }}
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
                  fontSize: '0.95rem',
                  color: '#475569',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  borderBottom: '1px solid rgba(13,148,136,0.10)',
                  paddingBottom: '1rem',
                }}
              >
                {l.label}
              </motion.a>
            ))}
            {onLoginClick && (
              <button
                onClick={() => { setMenuOpen(false); onLoginClick() }}
                style={{
                  fontSize: '0.95rem',
                  color: '#0D9488',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'left',
                  borderBottom: '1px solid rgba(13,148,136,0.10)',
                  paddingBottom: '1rem',
                }}
              >
                Iniciar Sesión
              </button>
            )}
            <a
              href="/agendar"
              onClick={(e) => { e.preventDefault(); setMenuOpen(false); if (onAgendarClick) onAgendarClick(); }}
              className="brand-gradient"
              style={{
                padding: '0.75rem',
                borderRadius: '9999px',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '0.85rem',
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
        @media (max-width: 1024px) {
          .desktop-nav { display: none !important; }
          .desktop-cta { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (max-width: 480px) {
          .navbar-header { padding: 0.75rem 0.9rem !important; }
          .navbar-header nav { padding: 0.5rem 1rem !important; gap: 0.75rem !important; }
          .navbar-logo-name { font-size: 0.72rem !important; }
        }
      `}</style>
    </motion.header>
  )
}
