import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Clock, User, X, Loader2, Repeat, CalendarDays } from 'lucide-react'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  white: '#FFFFFF', bg: '#F5F3F1',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

const TYPE_COLOR: Record<string, string> = { class: '#8B5CF6', open_pole: '#7C3AED', event: '#2563EB', workshop: '#3B82F6' }
const TYPE_LABEL: Record<string, string> = { class: 'Clase', open_pole: 'Práctica Libre', event: 'Evento', workshop: 'Taller' }

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}


function fmtPrice(n: number) {
  return n > 0 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n) : 'Gratuito'
}

function fmtDateShort(d: Date) {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

const DAY_NAMES_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DAY_ORDER = [1,2,3,4,5,6,0]

interface ServiceGroup {
  key: string; title: string; offerType: string; description: string | null
  location: { name: string } | null; professional: { firstName: string; lastName: string } | null
  timeStart: string; timeEnd: string; durationMinutes: number; price: number
  firstDate: Date; lastDate: Date; days: string[]; sessionCount: number; ids: string[]
  disciplineName: string | null
}

function validDate(s: any): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function padTime(h: number, m: number) {
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

/** Map a discipline name to a session category — must match backend getDisciplineCategory() */
function getDisciplineCategory(disciplineName: string | null | undefined): string | null {
  if (!disciplineName) return null
  const n = disciplineName.toLowerCase()
  if (n.includes('pole')) return 'pole'
  if (n.includes('fuerza') || n.includes('flexibilidad') || n.includes('flex')) return 'complementary'
  return 'general'
}

function groupOffers(offers: any[]): ServiceGroup[] {
  const map = new Map<string, ServiceGroup>()
  for (const o of offers) {
    const d  = validDate(o.scheduledAt)
    const tS = d ? padTime(d.getHours(), d.getMinutes()) : '--:--'
    // group key: same title+prof+location+time slot
    const key = [o.title, o.professionalId??'', o.locationId??'', o.roomId??'', tS, o.durationMinutes ?? 0].join('|')
    if (!map.has(key)) {
      let tE = '--:--'
      if (d && o.durationMinutes) {
        const eD = new Date(d.getTime() + o.durationMinutes * 60000)
        tE = padTime(eD.getHours(), eD.getMinutes())
      }
      const fallbackDate = d ?? new Date(0)
      map.set(key, { key, title: o.title ?? '', offerType: o.offerType ?? '', description: o.description ?? null, location: o.location ?? null, professional: o.professional ?? null, timeStart: tS, timeEnd: tE, durationMinutes: o.durationMinutes ?? 0, price: o.price ?? 0, firstDate: fallbackDate, lastDate: fallbackDate, days: [], sessionCount: 0, ids: [], disciplineName: o.discipline?.name ?? null })
    }
    const g = map.get(key)!
    g.ids.push(o.id)
    g.sessionCount++
    if (d) {
      if (d < g.firstDate || g.firstDate.getTime() === 0) g.firstDate = d
      if (d > g.lastDate)  g.lastDate = d
    }
  }
  for (const g of map.values()) {
    const daySet = new Set(
      offers.filter(o => g.ids.includes(o.id))
            .map((o: any) => validDate(o.scheduledAt)?.getDay())
            .filter((d): d is number => d !== undefined)
    )
    g.days = DAY_ORDER.filter(d => daySet.has(d)).map(d => DAY_NAMES_SHORT[d])
  }
  return Array.from(map.values())
    .sort((a, b) => (a.firstDate.getTime() || Infinity) - (b.firstDate.getTime() || Infinity))
}

interface CategoryCredit { total: number; used: number; remaining: number }

interface ActiveMembership {
  coversFreeClasses: boolean
  hasClassCredits: boolean
  classesRemaining: number | null
  discountPercent: number | null
  sessionsUsed: number
  categoryCredits: Record<string, CategoryCredit>
  membership: { name: string; benefits: string[] }
}

interface Props { userId?: string }

export const UserServicios: React.FC<Props> = () => {
  const [offers, setOffers]         = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | null>(null)
  const [inscriptionDiscount, setInscriptionDiscount] = useState<number | null>(null)
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds]   = useState<Set<string>>(new Set())
  const [search, setSearch]     = useState('')
  const [filterType, setFilterType] = useState('all')
  const [enrolling, setEnrolling]   = useState<string | null>(null)
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null)
  const [discountConfirm, setDiscountConfirm] = useState<{ ids: string[]; key: string; price: number; discountPct: number } | null>(null)
  const [payMethod, setPayMethod] = useState<'cash' | 'wompi'>('cash')
  const [limitModal, setLimitModal] = useState<{
    ids: string[]; key: string; title: string; sessionCount: number;
    freeSessions: number; paidSessions: number; pricePerSession: number; discountPct: number | null
  } | null>(null)

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  useEffect(() => {
    Promise.all([
      fetch('/api/services/offers?limit=200', { headers: authH() }).then(r => r.json()),
      fetch('/api/user-memberships/me', { headers: authH() }).then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/services/my-requests', { headers: authH() }).then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/user-memberships/me/inscription', { headers: authH() }).then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([offersData, membershipData, bookingsData, inscData]) => {
      if (offersData.success) setOffers((offersData.data.offers || []).filter((o: any) => o.status === 'published'))
      if (membershipData.success && membershipData.data?.membership) setActiveMembership(membershipData.data.membership)
      if (inscData.success && inscData.data?.inscription) setInscriptionDiscount(inscData.data.inscription.discountPercent ?? null)
      if (bookingsData.success) {
        const requests: any[] = bookingsData.data.requests || []
        setEnrolledIds(new Set(requests.filter((r: any) => r.status === 'approved').map((r: any) => r.offerId)))
        setPendingIds( new Set(requests.filter((r: any) => r.status === 'pending' ).map((r: any) => r.offerId)))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleEnroll = async (
    ids: string[], groupKey: string,
    opts?: { paymentMethod?: 'cash' | 'wompi'; expectedAmount?: number; discountPct?: number }
  ) => {
    setEnrolling(groupKey)
    try {
      const res = await fetch('/api/services/requests/bulk', {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          offerIds: ids,
          paymentMethod:  opts?.paymentMethod  ?? 'cash',
          expectedAmount: opts?.expectedAmount  ?? null,
          discountPct:    opts?.discountPct     ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al inscribirse')
      const created = data.data?.created ?? ids.length
      if (opts?.paymentMethod === 'wompi' && opts?.expectedAmount) {
        showToast('Redirigiendo a Wompi para completar el pago…', true)
        // TODO: redirect to Wompi checkout URL when integration is ready
      } else {
        showToast(`¡${created} sesión${created !== 1 ? 'es enviadas' : ' enviada'}! El estudio confirmará tu pago en efectivo.`, true)
      }
      setPendingIds(prev => new Set([...prev, ids[0]]))
    } catch (e: any) {
      showToast(e.message, false)
    } finally { setEnrolling(null) }
  }

  const effectiveDiscountPercent = activeMembership?.discountPercent ?? inscriptionDiscount

  const groups = groupOffers(offers)

  const filtered = groups.filter(g => {
    const q = search.toLowerCase()
    const profName = g.professional ? `${g.professional.firstName} ${g.professional.lastName}` : ''
    const matchQ = !q || g.title.toLowerCase().includes(q) || profName.toLowerCase().includes(q)
    const matchT = filterType === 'all' || g.offerType === filterType
    return matchQ && matchT
  })

  return (
    <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: FONT_INTER }}>Academia MEDIS</p>
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: 0 }}>Servicios Disponibles</h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '8px 0 0' }}>
              {loading ? 'Cargando…' : `${groups.length} servicio${groups.length !== 1 ? 's' : ''} · ${offers.length} sesiones`}
            </p>
          </div>

          {/* Pole dancer animation */}
          <div style={{ flexShrink: 0, opacity: 0.85 }}>
            <style>{`
              @keyframes poleFloat   { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-6px)} }
              @keyframes poleSpin    { 0%{transform:rotate(0deg)}  100%{transform:rotate(360deg)} }
              @keyframes figureWave  { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }
              @keyframes legKick     { 0%,100%{transform:rotate(0deg)}  40%{transform:rotate(-40deg)} 80%{transform:rotate(20deg)} }
              @keyframes armSwing    { 0%,100%{transform:rotate(-15deg)} 50%{transform:rotate(25deg)} }
              @keyframes hairFlow    { 0%,100%{transform:rotate(-5deg)}  50%{transform:rotate(10deg)} }
              @keyframes glitter     { 0%,100%{opacity:0;transform:scale(0.5)} 50%{opacity:1;transform:scale(1.2)} }
              @keyframes poleGlow    { 0%,100%{filter:drop-shadow(0 0 3px rgba(59,130,246,0.4))} 50%{filter:drop-shadow(0 0 8px rgba(59,130,246,0.8))} }
            `}</style>
            <svg width="90" height="160" viewBox="0 0 90 160" style={{ animation: 'poleFloat 3s ease-in-out infinite', overflow: 'visible' }}>
              {/* Pole */}
              <line x1="45" y1="5" x2="45" y2="155" stroke={C.goldLight} strokeWidth="3.5" strokeLinecap="round"
                style={{ animation: 'poleGlow 2s ease-in-out infinite' }} />
              {/* Pole top cap */}
              <circle cx="45" cy="8" r="5" fill={C.gold} />

              {/* === Figure === */}
              <g style={{ transformOrigin: '45px 80px', animation: 'figureWave 2.5s ease-in-out infinite' }}>
                {/* Hair flowing */}
                <path d="M45 35 Q58 28 60 22 Q55 32 52 38" fill={C.text} opacity="0.8"
                  style={{ transformOrigin: '45px 35px', animation: 'hairFlow 2s ease-in-out infinite' }} />
                <path d="M45 35 Q55 24 62 20" stroke={C.text} strokeWidth="2" fill="none" opacity="0.6"
                  style={{ transformOrigin: '45px 35px', animation: 'hairFlow 2.2s ease-in-out infinite reverse' }} />

                {/* Head */}
                <circle cx="45" cy="42" r="9" fill={C.text} opacity="0.85" />

                {/* Neck */}
                <line x1="45" y1="51" x2="45" y2="57" stroke={C.text} strokeWidth="4" strokeLinecap="round" opacity="0.85" />

                {/* Torso */}
                <path d="M45 57 Q38 65 37 78 Q45 82 53 78 Q52 65 45 57Z" fill={C.text} opacity="0.85" />

                {/* Left arm (holding pole) */}
                <line x1="45" y1="62" x2="45" y2="55" stroke={C.text} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />

                {/* Right arm extended */}
                <g style={{ transformOrigin: '45px 63px', animation: 'armSwing 2s ease-in-out infinite' }}>
                  <line x1="45" y1="63" x2="65" y2="58" stroke={C.text} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                  {/* Right hand */}
                  <circle cx="65" cy="58" r="3" fill={C.text} opacity="0.8" />
                </g>

                {/* Left leg */}
                <g style={{ transformOrigin: '45px 78px', animation: 'legKick 2.5s ease-in-out infinite' }}>
                  <line x1="45" y1="78" x2="36" y2="100" stroke={C.text} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
                  <line x1="36" y1="100" x2="30" y2="118" stroke={C.text} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
                  {/* Pointed toe */}
                  <circle cx="29" cy="120" r="2.5" fill={C.text} opacity="0.8" />
                </g>

                {/* Right leg (kick pose) */}
                <g style={{ transformOrigin: '45px 78px', animation: 'legKick 2.5s ease-in-out infinite reverse' }}>
                  <line x1="45" y1="78" x2="58" y2="95" stroke={C.text} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
                  <line x1="58" y1="95" x2="68" y2="112" stroke={C.text} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
                  <circle cx="69" cy="114" r="2.5" fill={C.text} opacity="0.8" />
                </g>

                {/* Skirt/tutu detail */}
                <path d="M37 78 Q30 90 34 96" stroke={C.goldLight} strokeWidth="2" fill="none" opacity="0.7"
                  style={{ animation: 'legKick 2.5s ease-in-out infinite' }} />
                <path d="M53 78 Q60 88 56 95" stroke={C.goldLight} strokeWidth="2" fill="none" opacity="0.7"
                  style={{ animation: 'legKick 2.5s ease-in-out infinite reverse' }} />
              </g>

              {/* Sparkles */}
              {[{ x: 22, y: 45, d: '0s' }, { x: 72, y: 60, d: '0.7s' }, { x: 18, y: 95, d: '1.3s' }, { x: 75, y: 30, d: '0.4s' }].map((s, i) => (
                <g key={i} style={{ animation: `glitter 2s ease-in-out ${s.d} infinite` }}>
                  <line x1={s.x - 4} y1={s.y} x2={s.x + 4} y2={s.y} stroke={C.goldLight} strokeWidth="1.5" />
                  <line x1={s.x} y1={s.y - 4} x2={s.x} y2={s.y + 4} stroke={C.goldLight} strokeWidth="1.5" />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Membership banner */}
        {activeMembership && (
          <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1.5px solid rgba(34,197,94,0.22)', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>✦</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>{activeMembership.membership.name}</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                {/* Unlimited plan */}
                {activeMembership.coversFreeClasses && activeMembership.classesRemaining === null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: 'rgba(34,197,94,0.12)', padding: '3px 10px', borderRadius: 99 }}>
                    Acceso ilimitado
                  </span>
                )}
                {/* Per-category credits */}
                {Object.entries(activeMembership.categoryCredits ?? {}).map(([cat, credit]) => {
                  const LABEL: Record<string, string> = { pole: 'Pole', complementary: 'Fuerza/Flex', general: 'Clases' }
                  const label = LABEL[cat] ?? cat
                  const ok = credit.remaining > 0
                  return (
                    <span key={cat} style={{ fontSize: 11, fontWeight: 700, color: ok ? '#16A34A' : '#B45309', background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)', padding: '3px 10px', borderRadius: 99 }}>
                      {label}: {credit.remaining}/{credit.total}
                    </span>
                  )
                })}
                {/* Fallback single pool (no categoryCredits) */}
                {Object.keys(activeMembership.categoryCredits ?? {}).length === 0 && activeMembership.classesRemaining !== null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: activeMembership.classesRemaining > 0 ? '#16A34A' : '#B45309', background: activeMembership.classesRemaining > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)', padding: '3px 10px', borderRadius: 99 }}>
                    {activeMembership.classesRemaining > 0
                      ? `${activeMembership.classesRemaining} sesión${activeMembership.classesRemaining !== 1 ? 'es' : ''} restante${activeMembership.classesRemaining !== 1 ? 's' : ''}`
                      : 'Sesiones agotadas'}
                  </span>
                )}
                {activeMembership.discountPercent != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: 'rgba(234,179,8,0.12)', padding: '3px 10px', borderRadius: 99 }}>
                    {activeMembership.discountPercent}% dto. adicionales
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inscription discount banner (members without a regular plan) */}
        {!activeMembership && inscriptionDiscount != null && (
          <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(190,24,93,0.05)', border: '1.5px solid rgba(190,24,93,0.2)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🎉</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#8B5CF6' }}>
              Tu inscripción te da {inscriptionDiscount}% de descuento en servicios
            </span>
          </div>
        )}

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} color={C.textMuted} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar servicio o instructor…"
              style={{ width: '100%', padding: '10px 36px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: FONT_INTER }}
              onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.borderLight}
            />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center' }}><X size={13} /></button>}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {[['all','Todos'],['class','Clases'],['open_pole','Práctica'],['event','Eventos'],['workshop','Talleres']].map(([v,l]) => (
              <button key={v} onClick={() => setFilterType(v)}
                style={{ padding: '9px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filterType === v ? C.gold : C.borderLight}`, background: filterType === v ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : 'transparent', color: filterType === v ? C.white : C.textBrown, cursor: 'pointer', fontFamily: FONT_INTER }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.textMuted }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Cargando servicios…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: C.white, borderRadius: 20, border: `2px dashed ${C.borderLight}` }}>
            <p style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.textMuted, margin: '0 0 8px' }}>Sin resultados</p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Intenta con otro término o tipo de servicio.</p>
          </div>
        ) : (
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          <AnimatePresence>
            {filtered.map((g, i) => {
              const color    = TYPE_COLOR[g.offerType] ?? C.gold
              const parts    = (g.title ?? '').split(' — ')
              const profName = g.professional ? `${g.professional.firstName} ${g.professional.lastName}` : null
              return (
                <motion.div key={g.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ background: C.white, borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${C.borderLight}`, boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                  <div style={{ padding: '18px 20px', flex: 1 }}>
                    {/* Type badge */}
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color, background: `${color}15`, padding: '3px 9px', borderRadius: 6, display: 'inline-block', marginBottom: 10 }}>
                      {TYPE_LABEL[g.offerType] ?? g.offerType}
                    </span>
                    {/* Title */}
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 2px', lineHeight: 1.2 }}>{parts[1] || parts[0]}</h3>
                    {parts[1] && <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 12px' }}>{parts[0]}</p>}
                    {/* Info rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                      <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Repeat size={12} color={C.gold} />
                        <strong>{g.sessionCount}</strong>&nbsp;sesión{g.sessionCount!==1?'es':''}
                        {g.firstDate.getTime() > 0 && <>&nbsp;· {fmtDateShort(g.firstDate)}{g.sessionCount > 1 ? ` → ${fmtDateShort(g.lastDate)}` : ''}</>}
                      </span>
                      {g.days.length > 0 && (
                        <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CalendarDays size={12} color={C.gold} />
                          {g.days.join(' · ')}
                        </span>
                      )}
                      {g.timeStart !== '--:--' && (
                        <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} color={C.gold} /> {g.timeStart} – {g.timeEnd}
                          <span style={{ color: C.textMuted }}>({g.durationMinutes} min)</span>
                        </span>
                      )}
                      {g.location?.name && (
                        <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={12} color={C.gold} /> {g.location.name}
                        </span>
                      )}
                      {profName && (
                        <span style={{ fontSize: 12, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={12} color={C.gold} /> {profName}
                        </span>
                      )}
                    </div>
                    {/* Price / membership / enrollment indicator */}
                    {(() => {
                      const isEnrolled  = enrolledIds.has(g.ids[0])
                      const isPending   = pendingIds.has(g.ids[0])
                      const unlimited   = activeMembership?.coversFreeClasses && activeMembership.classesRemaining === null
                      const offerCat    = getDisciplineCategory(g.disciplineName)
                      const catCredit   = offerCat && activeMembership?.categoryCredits
                        ? (activeMembership.categoryCredits[offerCat] ?? activeMembership.categoryCredits['general'])
                        : null
                      const hasFreeForThis = unlimited || (catCredit?.remaining ?? 0) > 0
                      const hasDiscount = !hasFreeForThis && effectiveDiscountPercent != null
                      const discPct     = effectiveDiscountPercent ?? 0
                      const discPrice   = g.price > 0 ? Math.round(g.price * (1 - discPct / 100)) : 0
                      return (
                        <div style={{ paddingTop: 12, borderTop: `1px solid ${C.borderLight}` }}>
                          {isEnrolled ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', background: 'rgba(34,197,94,0.1)', padding: '4px 12px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              ✓ Ya inscrito en este servicio
                            </span>
                          ) : isPending ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#B45309', background: 'rgba(234,179,8,0.1)', padding: '4px 12px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              ⏳ Inscripción pendiente de aprobación
                            </span>
                          ) : hasFreeForThis ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', background: 'rgba(34,197,94,0.1)', padding: '4px 12px', borderRadius: 99 }}>
                                ✓ Incluido en tu plan
                              </span>
                              {!unlimited && catCredit && catCredit.remaining !== null && (
                                <span style={{ fontSize: 11, color: C.textMuted }}>{catCredit.remaining} restante{catCredit.remaining !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          ) : hasDiscount ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 15, fontWeight: 800, color: '#B45309', fontFamily: FONT_BODONI }}>{fmtPrice(discPrice)}</span>
                              <span style={{ fontSize: 11, color: C.textMuted, textDecoration: 'line-through' }}>{fmtPrice(g.price)}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#B45309', background: 'rgba(234,179,8,0.12)', padding: '2px 7px', borderRadius: 99 }}>-{discPct}%</span>
                            </div>
                          ) : (
                            <>
                              <span style={{ fontSize: 15, fontWeight: 800, color: C.gold, fontFamily: FONT_BODONI }}>{fmtPrice(g.price)}</span>
                              <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>por sesión</span>
                            </>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  <div style={{ padding: '0 20px 18px' }}>
                    {(() => {
                      const isEnrolled     = enrolledIds.has(g.ids[0])
                      const isPending      = pendingIds.has(g.ids[0])
                      const unlimited      = activeMembership?.coversFreeClasses && activeMembership.classesRemaining === null
                      const offerCat       = getDisciplineCategory(g.disciplineName)
                      const catCredit      = offerCat && activeMembership?.categoryCredits
                        ? (activeMembership.categoryCredits[offerCat] ?? activeMembership.categoryCredits['general'])
                        : null
                      const freeRemaining  = catCredit?.remaining ?? 0
                      const hasFreeForThis = unlimited || freeRemaining > 0
                      const hasDiscount    = !hasFreeForThis && effectiveDiscountPercent != null
                      const discPct        = effectiveDiscountPercent ?? 0
                      const discPrice      = g.price > 0 ? Math.round(g.price * (1 - discPct / 100)) : 0

                      if (isEnrolled) {
                        return (
                          <button disabled style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #16A34A', background: 'rgba(34,197,94,0.06)', color: '#16A34A', fontSize: 13, fontWeight: 700, cursor: 'not-allowed', fontFamily: FONT_INTER, opacity: 0.8 }}>
                            ✓ Ya inscrito
                          </button>
                        )
                      }
                      if (isPending) {
                        return (
                          <button disabled style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #B45309', background: 'rgba(234,179,8,0.06)', color: '#B45309', fontSize: 13, fontWeight: 700, cursor: 'not-allowed', fontFamily: FONT_INTER, opacity: 0.8 }}>
                            ⏳ Pendiente de aprobación
                          </button>
                        )
                      }
                      if (hasFreeForThis) {
                        const sessionCount = g.ids.length
                        const parts2       = (g.title ?? '').split(' — ')
                        const groupTitle   = parts2[1] || parts2[0]
                        // Group has more sessions than remaining free credits for this category
                        if (!unlimited && sessionCount > freeRemaining) {
                          const paidSessions = sessionCount - freeRemaining
                          return (
                            <button
                              onClick={() => setLimitModal({
                                ids: g.ids, key: g.key, title: groupTitle, sessionCount,
                                freeSessions: freeRemaining, paidSessions,
                                pricePerSession: g.price, discountPct: effectiveDiscountPercent,
                              })}
                              disabled={enrolling === g.key}
                              style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #B45309', background: 'rgba(234,179,8,0.07)', color: '#B45309', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                              {enrolling === g.key ? 'Enviando…' : `✓ Inscribirse · Ver costo (${freeRemaining} gratis)`}
                            </button>
                          )
                        }
                        return (
                          <button onClick={() => handleEnroll(g.ids, g.key)} disabled={enrolling === g.key}
                            style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #16A34A', background: 'rgba(34,197,94,0.08)', color: '#16A34A', fontSize: 13, fontWeight: 700, cursor: enrolling === g.key ? 'not-allowed' : 'pointer', opacity: enrolling === g.key ? 0.7 : 1, fontFamily: FONT_INTER }}>
                            {enrolling === g.key ? 'Enviando…' : '✓ Inscribirse · Plan'}
                          </button>
                        )
                      }
                      if (hasDiscount) {
                        return (
                          <button
                            onClick={() => setDiscountConfirm({ ids: g.ids, key: g.key, price: g.price, discountPct: discPct })}
                            disabled={enrolling === g.key}
                            style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #B45309', background: 'rgba(234,179,8,0.08)', color: '#B45309', fontSize: 13, fontWeight: 700, cursor: enrolling === g.key ? 'not-allowed' : 'pointer', fontFamily: FONT_INTER }}>
                            {enrolling === g.key ? 'Enviando…' : `Inscribirse · ${fmtPrice(discPrice)} (-${discPct}%)`}
                          </button>
                        )
                      }
                      return (
                        <button onClick={() => handleEnroll(g.ids, g.key)} disabled={enrolling === g.key}
                          style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: enrolling === g.key ? 'not-allowed' : 'pointer', opacity: enrolling === g.key ? 0.7 : 1, fontFamily: FONT_INTER }}>
                          {enrolling === g.key ? 'Enviando…' : 'Solicitar inscripción'}
                        </button>
                      )
                    })()}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Limit warning modal — group exceeds remaining free sessions */}
      <AnimatePresence>
        {limitModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLimitModal(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.5)', backdropFilter: 'blur(6px)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 20, maxWidth: 420, width: '100%', padding: '28px', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', pointerEvents: 'all' }}>
                {/* Header */}
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <span style={{ fontSize: 22 }}>⚠️</span>
                </div>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.15rem', color: C.text, textAlign: 'center', margin: '0 0 6px' }}>
                  Límite de plan alcanzado
                </h3>
                <p style={{ fontSize: 12, color: C.textMedium, textAlign: 'center', margin: '0 0 20px', lineHeight: 1.6 }}>
                  <strong>{limitModal.title}</strong> tiene <strong>{limitModal.sessionCount} sesiones</strong>, pero tu plan solo cubre <strong>{limitModal.freeSessions}</strong>.
                </p>

                {/* Breakdown */}
                <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: `1px solid ${C.borderLight}` }}>
                  {/* Free sessions */}
                  {limitModal.freeSessions > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: `1px dashed ${C.borderLight}` }}>
                      <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
                        ✓ {limitModal.freeSessions} sesión{limitModal.freeSessions !== 1 ? 'es' : ''} gratis (plan)
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>$0</span>
                    </div>
                  )}
                  {/* Paid sessions */}
                  <div style={{ marginBottom: limitModal.discountPct ? 8 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.textMedium }}>
                        {limitModal.paidSessions} sesión{limitModal.paidSessions !== 1 ? 'es' : ''} adicional{limitModal.paidSessions !== 1 ? 'es' : ''}{' '}
                        ({fmtPrice(limitModal.pricePerSession)} c/u)
                      </span>
                      <span style={{ fontSize: 12, color: C.textMuted, textDecoration: limitModal.discountPct ? 'line-through' : 'none' }}>
                        {fmtPrice(limitModal.paidSessions * limitModal.pricePerSession)}
                      </span>
                    </div>
                    {limitModal.discountPct && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: '#B45309', fontWeight: 600 }}>
                          Descuento plan ({limitModal.discountPct}%)
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#B45309', fontFamily: FONT_BODONI }}>
                          {fmtPrice(Math.round(limitModal.paidSessions * limitModal.pricePerSession * (1 - limitModal.discountPct / 100)))}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Total */}
                  <div style={{ height: 1, background: C.borderLight, margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                      {limitModal.freeSessions > 0 ? 'Costo adicional' : 'Total a pagar'}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#B45309', fontFamily: FONT_BODONI }}>
                      {fmtPrice(Math.round(limitModal.paidSessions * limitModal.pricePerSession * (limitModal.discountPct ? (1 - limitModal.discountPct / 100) : 1)))}
                    </span>
                  </div>
                </div>

                {/* Payment method */}
                <p style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Método de pago</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {(['cash', 'wompi'] as const).map(m => (
                    <button key={m} onClick={() => setPayMethod(m)}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${payMethod === m ? '#B45309' : C.borderLight}`, background: payMethod === m ? 'rgba(234,179,8,0.08)' : 'transparent', color: payMethod === m ? '#B45309' : C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                      {m === 'cash' ? '💵 Efectivo' : '💳 Wompi'}
                    </button>
                  ))}
                </div>
                {payMethod === 'cash' && <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>El estudio confirmará tu inscripción y te cobrará el monto en efectivo.</p>}
                {payMethod === 'wompi' && <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>Serás redirigido a Wompi para completar el pago en línea.</p>}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setLimitModal(null)}
                    style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const m = limitModal!
                      const paidTotal = Math.round(m.paidSessions * m.pricePerSession * (m.discountPct ? (1 - m.discountPct / 100) : 1))
                      setLimitModal(null)
                      handleEnroll(m.ids, m.key, { paymentMethod: payMethod, expectedAmount: paidTotal, discountPct: m.discountPct ?? undefined })
                    }}
                    style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #B45309, #D97706)', color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                    {payMethod === 'wompi' ? '💳 Pagar con Wompi' : '✓ Confirmar inscripción'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Discount confirmation modal */}
      <AnimatePresence>
        {discountConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDiscountConfirm(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.5)', backdropFilter: 'blur(6px)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 20, maxWidth: 400, width: '100%', padding: '28px', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', pointerEvents: 'all' }}>
                {/* Icon */}
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(234,179,8,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span style={{ fontSize: 24 }}>%</span>
                </div>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.text, textAlign: 'center', margin: '0 0 10px' }}>
                  Sesión con descuento
                </h3>
                <p style={{ fontSize: 13, color: C.textMedium, textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Has usado todas las sesiones incluidas en tu plan. Esta inscripción tiene un costo adicional con tu descuento aplicado.
                </p>
                {/* Price breakdown */}
                <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>Precio original</span>
                    <span style={{ fontSize: 12, color: C.textMuted, textDecoration: 'line-through' }}>{fmtPrice(discountConfirm.price)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#B45309' }}>Descuento plan ({discountConfirm.discountPct}%)</span>
                    <span style={{ fontSize: 12, color: '#B45309' }}>-{fmtPrice(Math.round(discountConfirm.price * discountConfirm.discountPct / 100))}</span>
                  </div>
                  <div style={{ height: 1, background: C.borderLight, margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Total a pagar</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#B45309', fontFamily: FONT_BODONI }}>
                      {fmtPrice(Math.round(discountConfirm.price * (1 - discountConfirm.discountPct / 100)))}
                    </span>
                  </div>
                </div>
                {/* Payment method */}
                <p style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Método de pago</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {(['cash', 'wompi'] as const).map(m => (
                    <button key={m} onClick={() => setPayMethod(m)}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${payMethod === m ? '#B45309' : C.borderLight}`, background: payMethod === m ? 'rgba(234,179,8,0.08)' : 'transparent', color: payMethod === m ? '#B45309' : C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                      {m === 'cash' ? '💵 Efectivo' : '💳 Wompi'}
                    </button>
                  ))}
                </div>
                {payMethod === 'cash' && <p style={{ fontSize: 11, color: C.textMuted, margin: '-12px 0 16px', lineHeight: 1.5 }}>Paga en el estudio. El admin confirmará tu inscripción.</p>}
                {payMethod === 'wompi' && <p style={{ fontSize: 11, color: C.textMuted, margin: '-12px 0 16px', lineHeight: 1.5 }}>Serás redirigido a Wompi para completar el pago en línea.</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setDiscountConfirm(null)}
                    style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const c = discountConfirm!
                      const amt = Math.round(c.price * (1 - c.discountPct / 100))
                      setDiscountConfirm(null)
                      handleEnroll(c.ids, c.key, { paymentMethod: payMethod, expectedAmount: amt, discountPct: c.discountPct })
                    }}
                    style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #B45309, #D97706)', color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                    {payMethod === 'wompi' ? '💳 Pagar con Wompi' : '✓ Confirmar inscripción'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#16A34A' : '#DC2626', color: C.white, padding: '11px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', fontFamily: FONT_INTER }}>
            {toast.ok ? '✓ ' : '✗ '}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

