import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const SOCIAL = [
  {
    name: 'Instagram',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
]

export default function Footer() {
  const year = new Date().getFullYear()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <footer
      id="contacto"
      style={{ background: '#EEF2FF', borderTop: '1px solid rgba(139,92,246,0.10)' }}
    >
      {/* Main footer content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 1.5rem 3rem' }}>
        <div
          ref={ref}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '3rem',
            marginBottom: '4rem',
          }}
        >
          {/* Brand column */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.75, delay: 0, ease: EASE }}
          >
            <span
              className="font-cormorant brand-text-gradient"
              style={{ fontSize: '1.3rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', display: 'block', marginBottom: '1.25rem' }}
            >
              Dra. Diana Cristina Medina Camargo
            </span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.8, color: '#475569', fontWeight: 300, marginBottom: '1.5rem', maxWidth: '260px' }}>
              Especialista en Medicina Familiar y Comunitaria. Atención cercana, profesional y de confianza.
            </p>
            {/* Social icons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {SOCIAL.map((s, i) => (
                <motion.a
                  key={s.name}
                  href={s.href}
                  aria-label={s.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: EASE }}
                  whileHover={{ y: -3, color: '#8B5CF6' }}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.70)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94A3B8',
                    textDecoration: 'none',
                    backdropFilter: 'blur(8px)',
                    transition: 'color 0.25s ease',
                  }}
                >
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Consultorio info */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.75, delay: 0.1, ease: EASE }}
          >
            <h4
              className="font-cormorant"
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B1C1C', marginBottom: '1.25rem', letterSpacing: '0.05em' }}
            >
              Consultorio
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['Inicio', 'Sobre la Doctora', 'Servicios', 'Agendar Cita', 'Contacto'].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.2 + i * 0.06, ease: EASE }}
                >
                  <a
                    href="#"
                    className="luxury-link"
                    style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '0.84rem',
                      color: '#475569', textDecoration: 'none', fontWeight: 300,
                      transition: 'color 0.25s ease',
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B5CF6')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.75, delay: 0.2, ease: EASE }}
          >
            <h4
              className="font-cormorant"
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B1C1C', marginBottom: '1.25rem', letterSpacing: '0.05em' }}
            >
              Servicios
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['Consulta Médica General', 'Control de Niño Sano', 'Control Prenatal', 'Enfermedades Crónicas', 'Medicina Preventiva', 'Certificados y Vacunación'].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.25 + i * 0.06, ease: EASE }}
                >
                  <a
                    href="#servicios"
                    className="luxury-link"
                    style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '0.84rem',
                      color: '#475569', textDecoration: 'none', fontWeight: 300,
                      transition: 'color 0.25s ease',
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B5CF6')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.75, delay: 0.3, ease: EASE }}
          >
            <h4
              className="font-cormorant"
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B1C1C', marginBottom: '1.25rem', letterSpacing: '0.05em' }}
            >
              Contacto
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Dirección', value: '[Dirección del consultorio]' },
                { label: 'WhatsApp', value: '[+57 XXX XXX XXXX]' },
                { label: 'Email', value: '[correo@consultorio.com]' },
                { label: 'Horarios', value: '[Lun – Vie · X am – X pm]' },
              ].map(({ label, value }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.35 + i * 0.08, ease: EASE }}
                >
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B5CF6', marginBottom: '0.2rem' }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: '#475569', fontWeight: 300 }}>
                    {value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* CTA in footer */}
            <motion.a
              href="#contacto"
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.65, ease: EASE }}
              whileHover={{ scale: 1.04, boxShadow: '0 8px 28px rgba(139,92,246,0.30)' }}
              whileTap={{ scale: 0.97 }}
              className="brand-gradient"
              style={{
                display: 'inline-flex', marginTop: '1.75rem',
                padding: '0.75rem 1.75rem',
                borderRadius: '9999px',
                color: '#fff',
                textDecoration: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.72rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
                boxShadow: '0 5px 20px rgba(139,92,246,0.25)',
                transition: 'box-shadow 0.25s ease',
              }}
            >
              Agendar Cita
            </motion.a>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid rgba(139,92,246,0.10)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#94A3B8', letterSpacing: '0.05em', fontWeight: 300 }}>
            © {year} Dra. Diana Cristina Medina Camargo · Todos los derechos reservados
          </p>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {['Privacidad', 'Términos', 'Cookies'].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '0.72rem',
                  color: '#94A3B8', textDecoration: 'none', letterSpacing: '0.05em',
                  transition: 'color 0.25s ease',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#8B5CF6')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#94A3B8')}
              >
                {item}
              </a>
            ))}
          </div>
          <p
            className="font-cormorant"
            style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#8B5CF6', letterSpacing: '0.05em' }}
          >
            Especialista en Medicina Familiar y Comunitaria
          </p>
        </motion.div>
      </div>
    </footer>
  )
}
