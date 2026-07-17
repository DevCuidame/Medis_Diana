import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useDocServices, categoryLabel } from '../hooks/useDocServices'

// Paleta presentacional: se rota por índice para los servicios que vienen de la API.
const CARD_STYLES = [
  { accent: '#A78BFA', gradient: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e3a8a 100%)' },
  { accent: '#38BDF8', gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #0c4a6e 100%)' },
  { accent: '#A78BFA', gradient: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)' },
  { accent: '#38BDF8', gradient: 'linear-gradient(160deg, #0c1445 0%, #1e3a8a 50%, #164e63 100%)' },
  { accent: '#A78BFA', gradient: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #0f172a 100%)' },
  { accent: '#38BDF8', gradient: 'linear-gradient(160deg, #0f172a 0%, #0c4a6e 50%, #1e3a8a 100%)' },
]

// Fallback estático: se muestra mientras carga o si la API falla / viene vacía.
const CLASSES = [
  {
    title: 'Consulta Médica General',
    level: 'Todas las edades',
    duration: '30 min',
    description: 'Evaluación integral, diagnóstico y tratamiento de enfermedades comunes. La puerta de entrada a tu bienestar.',
    accent: '#A78BFA',
    tag: 'Más solicitada',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e3a8a 100%)',
  },
  {
    title: 'Promoción y Prevención',
    level: 'Todas las edades',
    duration: '45 min',
    description: 'Chequeos y orientación integral para identificar factores de riesgo y fomentar hábitos saludables a largo plazo.',
    accent: '#38BDF8',
    tag: 'Preventivo',
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #0c4a6e 100%)',
  },
  {
    title: 'Enf. No Transmisibles',
    level: 'Adultos',
    duration: '30 min',
    description: 'Atención y control especializado de Hipertensión (HTA), Diabetes (DM), Riesgo Cardiovascular (RCV) y Síndrome Metabólico.',
    accent: '#A78BFA',
    tag: 'Crónicos',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)',
  },
  {
    title: 'Sobrepeso y Obesidad',
    level: 'Jóvenes y Adultos',
    duration: '40 min',
    description: 'Acompañamiento médico integral para el manejo del peso, con un enfoque clínico seguro, sostenible y sin estigmas, con integración y acompañamiento al grupo familiar.',
    accent: '#38BDF8',
    tag: 'Metabolismo',
    gradient: 'linear-gradient(160deg, #0c1445 0%, #1e3a8a 50%, #164e63 100%)',
  },
  {
    title: 'Salud de la Mujer',
    level: 'Mujeres',
    duration: '30 min',
    description: 'Atención integral para la mujer en todas sus etapas, incluyendo asesoría en planificación, prevención y bienestar femenino.',
    accent: '#A78BFA',
    tag: 'Bienestar',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #0f172a 100%)',
  },
  {
    title: 'Salud Mental',
    level: 'Adolescentes y Adultos',
    duration: '45 min',
    description: 'Espacio de escucha activa y orientación profesional para fortalecer el bienestar emocional, promover el autoconocimiento y favorecer una mejor calidad de vida.',
    accent: '#38BDF8',
    tag: 'Cuidado Integral',
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #0c4a6e 100%)',
  },
  {
    title: 'Certificado Médico Escolar',
    level: 'Niños y Adolescentes',
    duration: '15 min',
    description: 'Valoración rápida y expedición de certificados de aptitud física y escolar para instituciones educativas y actividades deportivas.',
    accent: '#A78BFA',
    tag: 'Trámite Rápido',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)',
  },
  {
    title: 'Terapia Neuropática Especializada',
    level: 'Adultos y Adultos Mayores',
    duration: '45 min',
    description: 'Tratamiento especializado del dolor neuropático mediante técnicas terapéuticas dirigidas a mejorar la función nerviosa y la calidad de vida.',
    accent: '#38BDF8',
    tag: 'Manejo del Dolor',
    gradient: 'linear-gradient(160deg, #0f172a 0%, #0c4a6e 50%, #1e3a8a 100%)',
  },
  {
    title: 'Masajes',
    level: 'Jóvenes y Adultos',
    duration: '30 min',
    description: 'Masajes terapéuticos orientados al alivio de la tensión muscular, la mejora de la circulación y la relajación integral.',
    accent: '#A78BFA',
    tag: 'Bienestar Físico',
    gradient: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e3a8a 100%)',
  },
]

function ClassCard({ title, level, duration, description, accent, tag, gradient, delay }: { title: string, level?: string, duration: string, description?: string, accent: string, tag?: string, gradient: string, delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const navigate = useNavigate()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', cursor: 'pointer' }}
    >
      <motion.div
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: gradient,
          minHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Inner glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 20% 20%, rgba(139,92,246,0.18) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Decorative line */}
        <div style={{
          position: 'absolute', top: '1.75rem', right: '1.75rem',
          width: 40, height: 1,
          background: `linear-gradient(90deg, transparent, ${accent})`,
        }} />

        {/* Tag */}
        {tag && (
          <div style={{
            position: 'absolute', top: '1.5rem', left: '1.5rem',
            padding: '0.3rem 0.8rem',
            borderRadius: '9999px',
            background: `rgba(${accent === '#A78BFA' ? '167,139,250' : '56,189,248'},0.20)`,
            border: `1px solid ${accent}40`,
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.62rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: accent === '#A78BFA' ? '#C4B5FD' : '#7DD3FC',
            backdropFilter: 'blur(6px)',
          }}>
            {tag}
          </div>
        )}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            {level && (
              <>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.66rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                  {level}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              </>
            )}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.66rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              {duration}
            </span>
          </div>

          <h3
            className="font-cormorant"
            style={{ fontSize: '2rem', fontWeight: 500, color: '#FFFFFF', lineHeight: 1.1, marginBottom: '0.75rem' }}
          >
            {title}
          </h3>

          {description && (
            <p
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', lineHeight: 1.7, color: 'rgba(251,249,248,0.62)', fontWeight: 300, marginBottom: '1.25rem' }}
            >
              {description}
            </p>
          )}

          {/* Hover CTA */}
          <motion.div
            onClick={() => navigate('/agendar')}
            whileHover={{ x: 5, color: '#fff' }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: accent === '#A78BFA' ? '#C4B5FD' : '#7DD3FC',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Agendar
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Classes() {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const { services } = useDocServices()

  // Servicios del catálogo CuidameDoc (creados desde admin o desde la app de la
  // doctora); si la API falla o viene vacía se muestra el fallback estático.
  const cards = services.length > 0
    ? services.map((s, i) => ({
        key: `svc-${s.prof_service_id}`,
        title: s.name.trim(),
        level: undefined as string | undefined,
        duration: `${s.duration_minutes} min`,
        description: s.description?.trim() || undefined,
        tag: categoryLabel(s.category),
        ...CARD_STYLES[i % CARD_STYLES.length],
      }))
    : CLASSES.map(c => ({ key: c.title, ...c, level: c.level as string | undefined, description: c.description as string | undefined }))

  return (
    <section id="servicios" style={{ background: '#F3F0FB', padding: '9rem 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div ref={ref} style={{ marginBottom: '4rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem' }}>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.35em',
                textTransform: 'uppercase', color: '#8B5CF6', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}
            >
              <span style={{ display: 'inline-block', width: 28, height: 1, background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)' }} />
              Nuestros Servicios
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant"
              style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 300, lineHeight: 1.05, color: '#1B1C1C' }}
            >
              Servicios <em style={{ fontStyle: 'italic', color: '#8B5CF6' }}>Médicos</em>
            </motion.h2>
          </div>

          <motion.a
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            href="/agendar"
            onClick={(e) => { e.preventDefault(); navigate('/agendar'); }}
            whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(139,92,246,0.30)' }}
            className="brand-gradient"
            style={{
              padding: '0.85rem 2rem',
              borderRadius: '9999px',
              color: '#fff',
              textDecoration: 'none',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 6px 24px rgba(139,92,246,0.25)',
            }}
          >
            Agendar Cita
          </motion.a>
        </div>

        {/* Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}>
          {cards.map(({ key, ...c }, i) => (
            <ClassCard key={key} {...c} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  )
}
