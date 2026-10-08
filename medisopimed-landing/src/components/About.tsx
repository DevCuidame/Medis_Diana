import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const PILLARS = [
  {
    icon: '✦',
    title: 'Atención Personalizada',
    desc: 'Cada paciente recibe una valoración individual. No hay protocolos genéricos — hay personas con historias y necesidades únicas.',
  },
  {
    icon: '◈',
    title: 'Medicina Preventiva',
    desc: 'Detectar a tiempo es cuidar mejor. Orientamos hacia hábitos y tamizajes que protegen tu salud a largo plazo.',
  },
  {
    icon: '❋',
    title: 'Confianza y Cercanía',
    desc: 'Un espacio seguro donde puedes hablar con libertad. La relación médico-paciente se construye con respeto y escucha activa.',
  },
  {
    icon: '⟡',
    title: 'Bienestar Integral',
    desc: 'La salud abarca cuerpo, mente, familia y entorno — la esencia de la Medicina Familiar. Acompañamos a cada paciente en todas las etapas de su vida.',
  },
]

function PillarCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, boxShadow: '0 20px 44px rgba(13,148,136,0.12)' }}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '1.25rem',
        padding: '2.5rem 2rem',
        cursor: 'default',
        transition: 'box-shadow 0.4s ease',
        boxShadow: '0 4px 20px rgba(15,23,42,0.04)',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '0.9rem',
          background: 'linear-gradient(135deg, #E6FFFA, #CCFBF1)',
          border: '1px solid #99F6E4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          fontSize: '1.4rem',
          color: '#0D9488',
        }}
      >
        {icon}
      </div>
      <h3
        className="font-manrope"
        style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', lineHeight: 1.25 }}
      >
        {title}
      </h3>
      <p
        style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', lineHeight: 1.75, color: '#475569', fontWeight: 400 }}
      >
        {desc}
      </p>
    </motion.div>
  )
}

export default function About() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      id="sobre-nosotros"
      style={{ background: '#FFFFFF', padding: 'clamp(4rem, 12vw, 9rem) 1.5rem' }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header — responsive layout: text left, logo right on desktop; stacked on mobile */}
        <div
          ref={ref}
          style={{
            marginBottom: '5rem',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap', // En mobile el texto queda primero y el logo cae debajo (orden natural del DOM).
            gap: '3rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Texto */}
          <div style={{ flex: '1 1 500px', maxWidth: '620px', minWidth: 0 }}>
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
                marginBottom: '1rem',
              }}
            >
              Nuestro Enfoque
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-manrope"
              style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.02em', color: '#0F172A', marginBottom: '1.5rem' }}
            >
              Medicina con
              <br />
              Calidez Humana
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', lineHeight: 1.8, color: '#475569', fontWeight: 400 }}
            >
              Nuestro consultorio es un espacio de atención médica centrada en el paciente y su familia.
              Cada consulta es una oportunidad para escuchar, orientar y acompañar — con calidez
              humana y el rigor profesional que tu salud merece.
            </motion.p>
          </div>

          {/* Logo completo */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center', minWidth: 0 }}
          >
            <img
              src="/logo-opimed.svg"
              alt="Logo Dra. OpiMed"
              style={{
                width: '100%',
                maxWidth: '480px',
                height: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 12px 40px rgba(13,148,136,0.14))',
              }}
            />
          </motion.div>
        </div>

        {/* Pillar Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {PILLARS.map((p, i) => (
            <PillarCard key={p.title} {...p} delay={i * 0.1} />
          ))}
        </div>

        {/* Decorative horizontal rule */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: '5rem',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(13,148,136,0.22), transparent)',
            transformOrigin: 'left',
          }}
        />

        {/* Stats row */}
        <div
          style={{
            marginTop: '4rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '2rem',
            textAlign: 'center',
          }}
        >
          {[
            { number: '+10', label: 'Años de Experiencia' },
            { number: '6', label: 'Servicios Médicos' },
            { number: '5★', label: 'Calificación de Pacientes' },
            { number: '100%', label: 'Atención Personalizada' },
          ].map(({ number, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.7 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="font-manrope brand-text-gradient"
                style={{ fontSize: '2.75rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.5rem' }}
              >
                {number}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8' }}>
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
