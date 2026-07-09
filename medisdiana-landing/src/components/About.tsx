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
    desc: 'Detectar a tiempo es cuidar mejor. Orientamos hacia hábitos y chequeos que protegen tu salud a largo plazo.',
  },
  {
    icon: '❋',
    title: 'Confianza y Cercanía',
    desc: 'Un espacio seguro donde puedes hablar con libertad. La relación médico-paciente se construye con respeto y escucha activa.',
  },
  {
    icon: '⟡',
    title: 'Bienestar Integral',
    desc: 'La salud abarca cuerpo, mente y familia. Acompañamos a cada paciente en todas las etapas de su vida.',
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
      whileHover={{ y: -8, boxShadow: '0 28px 60px rgba(139,92,246,0.18)' }}
      style={{
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(139,92,246,0.12)',
        borderRadius: '1.5rem',
        padding: '2.5rem 2rem',
        cursor: 'default',
        transition: 'box-shadow 0.4s ease',
        boxShadow: '0 8px 32px rgba(139,92,246,0.07)',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.18))',
          border: '1px solid rgba(139,92,246,0.20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          fontSize: '1.4rem',
          color: '#8B5CF6',
        }}
      >
        {icon}
      </div>
      <h3
        className="font-cormorant"
        style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1B1C1C', marginBottom: '0.75rem', lineHeight: 1.2 }}
      >
        {title}
      </h3>
      <p
        style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', lineHeight: 1.8, color: '#5E5E5E', fontWeight: 300 }}
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
      style={{ background: '#FFFFFF', padding: '9rem 1.5rem' }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header — responsive layout: text left, logo right on desktop; stacked on mobile */}
        <div
          ref={ref}
          style={{
            marginBottom: '5rem',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap-reverse', // On mobile, logo will appear below or above depending on layout. Let's use wrap to put logo below text if it doesn't fit, or wrap normally. Actually, standard flex-wrap will put logo below text.
            gap: '3rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Texto */}
          <div style={{ flex: '1 1 500px', maxWidth: '620px' }}>
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
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)' }} />
              Nuestro Enfoque
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant"
              style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 300, lineHeight: 1.05, color: '#1B1C1C', marginBottom: '1.5rem' }}
            >
              Medicina con
              <br />
              <em style={{ fontStyle: 'italic', color: '#8B5CF6' }}>Calidez Humana</em>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', lineHeight: 1.85, color: '#5E5E5E', fontWeight: 300 }}
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
            style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center' }}
          >
            <img
              src="/Logo_Medis.png"
              alt="Logo Dra. Diana Cristina Medina Camargo"
              style={{
                width: '100%',
                maxWidth: '480px',
                height: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 12px 40px rgba(139,92,246,0.15))',
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

        {/* Decorative horizontal rule with gold accent */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: '5rem',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.25), transparent)',
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
                className="font-cormorant brand-text-gradient"
                style={{ fontSize: '3rem', fontWeight: 600, lineHeight: 1, marginBottom: '0.5rem' }}
              >
                {number}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
