import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Clock, MapPin, Users, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  white: '#FFFFFF', bg: '#F5F3F1',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_SHORT   = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM']

const TYPE_COLOR: Record<string, string> = {
  appointment: '#2563EB', open_consultation: '#0EA5E9', workshop: '#8B5CF6', event: '#3B82F6',
}
const TYPE_LABEL: Record<string, string> = {
  appointment: 'Cita Individual', open_consultation: 'Consulta Abierta', workshop: 'Sesión Grupal', event: 'Evento',
}

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

function getMondayOf(d: Date): Date {
  const r = new Date(d); r.setHours(0,0,0,0)
  const day = r.getDay(); r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtTime(scheduledAt: string, durationMinutes: number): string {
  const s = new Date(scheduledAt)
  const e = new Date(s.getTime() + durationMinutes * 60000)
  const p = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  return `${p(s)} – ${p(e)}`
}

function fmtPrice(n: number) {
  return n > 0 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n) : 'Gratuito'
}

interface Props { me: { id: string } | null }

export const ProfessionalClasses: React.FC<Props> = ({ me }) => {
  const [offers, setOffers]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState<'week' | 'list'>('week')
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))

  const today = new Date(); today.setHours(0,0,0,0)

  const load = async () => {
    if (!me?.id) return
    setLoading(true)
    try {
      // Fetch all offers and filter client-side by professional
      const res  = await fetch('/api/services/offers', { headers: authH() })
      const json = await res.json()
      if (json.success) {
        const mine = (json.data.offers || []).filter((o: any) => o.professional?.id === me.id || o.professionalId === me.id)
        setOffers(mine)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [me?.id])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd  = weekDays[6]

  const weekTitle = (() => {
    const f = (d: Date) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}`
    return `${f(weekStart)} – ${f(weekEnd)} ${weekEnd.getFullYear()}`
  })()

  const offersForDay = (day: Date) =>
    offers.filter(o => isSameDay(new Date(o.scheduledAt), day))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const upcoming = [...offers]
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .filter(o => new Date(o.scheduledAt) >= today)

  return (
    <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px' }}>Portal Profesional</p>
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Mi Agenda</h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '8px 0 0', fontWeight: 500 }}>
              {loading ? 'Cargando…' : `${offers.length} sesión${offers.length !== 1 ? 'es' : ''} asignada${offers.length !== 1 ? 's' : ''} · ${upcoming.length} próxima${upcoming.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 10, overflow: 'hidden' }}>
              {(['week', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '8px 18px', background: view === v ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: view === v ? C.white : C.textBrown, transition: 'all 0.2s', fontFamily: FONT_INTER }}>
                  {v === 'week' ? 'Semana' : 'Lista'}
                </button>
              ))}
            </div>

            {/* Week nav */}
            {view === 'week' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: '4px 6px' }}>
                <button onClick={() => setWeekStart(d => addDays(d, -7))}
                  style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textBrown }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F0FB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text, minWidth: 150, textAlign: 'center' }}>{weekTitle}</span>
                <button onClick={() => setWeekStart(d => addDays(d, 7))}
                  style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textBrown }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F0FB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => setWeekStart(getMondayOf(new Date()))}
                  style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${C.borderLight}`, background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: FONT_INTER }}>
                  Hoy
                </button>
              </div>
            )}

            <button onClick={load} style={{ width: 36, height: 36, borderRadius: 10, background: C.white, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.textMuted }}>
            <Loader2 size={20} className="spin" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Cargando tus clases…</span>
          </div>
        ) : offers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: C.white, borderRadius: 20, border: `2px dashed ${C.borderLight}` }}>
            <CalendarDays size={44} color={C.borderLight} style={{ marginBottom: 16 }} />
            <p style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.textMuted, margin: '0 0 8px' }}>Sin clases asignadas</p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>El administrador aún no te ha asignado ningún servicio.</p>
          </div>
        ) : view === 'week' ? (
          /* ── WEEK VIEW ── */
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, minWidth: 700 }}>
              {weekDays.map((day, di) => {
                const isToday   = isSameDay(day, today)
                const dayOffers = offersForDay(day)
                return (
                  <div key={di}>
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: isToday ? C.gold : C.textMuted, marginBottom: 3 }}>{DAY_SHORT[di]}</div>
                      <div style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: isToday ? C.gold : C.text, lineHeight: 1 }}>{day.getDate()}</div>
                      <div style={{ height: 2, background: isToday ? C.gold : C.borderLight, marginTop: 6, borderRadius: 1 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dayOffers.length === 0 ? (
                        <div style={{ border: `1px dashed ${C.borderLight}`, borderRadius: 10, padding: '32px 8px', textAlign: 'center' }}>
                          <span style={{ fontSize: 10, color: C.textMuted }}>Libre</span>
                        </div>
                      ) : dayOffers.map(o => {
                        const color = TYPE_COLOR[o.offerType] ?? C.gold
                        const parts = (o.title ?? '').split(' — ')
                        return (
                          <motion.div key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            style={{ background: C.white, borderTop: `1px solid ${C.borderLight}`, borderRight: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '11px 10px' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={9} /> {fmtTime(o.scheduledAt, o.durationMinutes)}
                            </div>
                            <div style={{ fontFamily: FONT_BODONI, fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.2, marginBottom: 6 }}>
                              {parts[1] || parts[0]}
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {o.location?.name && (
                                <span style={{ fontSize: 9, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 2 }}><MapPin size={8} />{o.location.name}</span>
                              )}
                              {o.capacity > 0 && (
                                <span style={{ fontSize: 9, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 2 }}><Users size={8} />{o.enrolledCount ?? 0}/{o.capacity}</span>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {[...offers].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).map((o, i) => {
                const color   = TYPE_COLOR[o.offerType] ?? C.gold
                const parts   = (o.title ?? '').split(' — ')
                const date    = new Date(o.scheduledAt)
                const isPast  = date < today
                return (
                  <motion.div key={o.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    style={{ background: C.white, borderTop: `1px solid ${C.borderLight}`, borderRight: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}`, borderLeft: `5px solid ${color}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, opacity: isPast ? 0.55 : 1, flexWrap: 'wrap' }}>
                    {/* Date */}
                    <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
                      <div style={{ fontFamily: FONT_BODONI, fontSize: 28, fontWeight: 700, color: isPast ? C.textMuted : color, lineHeight: 1 }}>{date.getDate()}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isPast ? C.textMuted : color, textTransform: 'uppercase' }}>{MONTH_NAMES[date.getMonth()].slice(0,3)}</div>
                    </div>

                    <div style={{ width: 1, height: 48, background: C.borderLight, flexShrink: 0 }} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color, background: `${color}15`, padding: '2px 7px', borderRadius: 4, display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {TYPE_LABEL[o.offerType] ?? o.offerType}
                      </div>
                      <p style={{ fontFamily: FONT_BODONI, fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 3px' }}>{parts[1] || parts[0]}</p>
                      {parts[0] !== (parts[1] || parts[0]) && (
                        <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{parts[0]}</p>
                      )}
                    </div>

                    {/* Details */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={12} color={C.gold} /> {fmtTime(o.scheduledAt, o.durationMinutes)}
                        </span>
                        {o.location?.name && (
                          <span style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <MapPin size={12} color={C.gold} /> {o.location.name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        {o.capacity > 0 && (
                          <span style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Users size={12} color={C.gold} /> {o.enrolledCount ?? 0}/{o.capacity} alumnos
                          </span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{fmtPrice(o.price)}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: isPast ? '#F0EDE8' : o.status === 'published' ? 'rgba(34,197,94,0.1)' : 'rgba(139,92,246,0.08)', color: isPast ? C.textMuted : o.status === 'published' ? '#16A34A' : C.gold, flexShrink: 0 }}>
                      {isPast ? 'Realizada' : o.status === 'published' ? 'Activa' : 'Borrador'}
                    </span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  )
}
