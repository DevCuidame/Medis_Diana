import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, CheckCircle2, Clock, Infinity as InfinityIcon,
  Loader2, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, X, ShieldCheck, Lock,
} from 'lucide-react'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  white: '#FFFFFF', bg: '#F5F3F1',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
  pink: '#8B5CF6', pinkLight: '#3B82F6',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function classBadge(benefits: string[], maxClasses?: number | null): { label: string; isUnlimited: boolean } | null {
  if (maxClasses) return { label: `${maxClasses} clases`, isUnlimited: false }
  for (const b of benefits) {
    const lower = b.toLowerCase()
    if (lower.includes('ilimitad')) return { label: 'Ilimitadas', isUnlimited: true }
    const m = lower.match(/(\d+)\s+sesi[oó]n/)
    if (m) {
      const n = parseInt(m[1])
      return { label: `${n} sesión${n !== 1 ? 'es' : ''}`, isUnlimited: false }
    }
  }
  return null
}

interface Plan {
  id: string; name: string; description: string; type: string
  price: number; durationDays: number; maxClasses: number | null
  isActive: boolean; benefits: string[]
}

interface ActiveMembership {
  id: string; membershipId: string; paymentStatus: string
  expiresAt: string | null; startedAt: string
  classesRemaining: number | null
  coversFreeClasses: boolean; hasClassCredits: boolean
  membership: { name: string; price: number; durationDays: number | null; maxClasses?: number | null; benefits: string[] }
}

const CONFIRM_STEPS = ['Resumen', 'Beneficios', 'Pago']

interface Props { userId?: string }

export const UserMembresias: React.FC<Props> = () => {
  const [plans, setPlans]                 = useState<Plan[]>([])
  const [active, setActive]               = useState<ActiveMembership | null>(null)
  const [inscription, setInscription]     = useState<ActiveMembership | null>(null)
  const [catalogMap, setCatalogMap]       = useState<Map<string, { type: string; value: number | null }>>(new Map())
  const [loading, setLoading]             = useState(true)
  const [confirmPlan, setConfirmPlan]     = useState<Plan | null>(null)
  const [step, setStep]                   = useState(0)
  const [direction, setDirection]         = useState(1)
  const [payMethod, setPayMethod]         = useState<'cash' | 'wompi' | null>(null)
  const [purchasing, setPurchasing]       = useState(false)
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null)
  const [inscriptionExpanded, setInscriptionExpanded] = useState(true)

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    Promise.all([
      fetch('/api/memberships/active', { headers: authH() }).then(r => r.json()),
      fetch('/api/user-memberships/me', { headers: authH() }).then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/user-memberships/me/inscription', { headers: authH() }).then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/benefits', { headers: authH() }).then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([plansData, activeData, inscData, benefitsData]) => {
      if (plansData.success) setPlans((plansData.data.memberships || []).filter((p: Plan) => p.isActive))
      if (activeData.success && activeData.data?.membership) setActive(activeData.data.membership)
      if (inscData.success && inscData.data?.inscription) setInscription(inscData.data.inscription)
      if (benefitsData.success && benefitsData.data?.benefits) {
        const map = new Map<string, { type: string; value: number | null }>()
        for (const b of benefitsData.data.benefits) {
          map.set(b.name, { type: b.benefitType, value: b.benefitValue ?? null })
        }
        setCatalogMap(map)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const inscriptionPlans = plans.filter(p => p.type === 'inscription')
  const regularPlans     = plans.filter(p => p.type !== 'inscription')

  const openConfirm = (plan: Plan) => {
    if (plan.type !== 'inscription' && !inscription) {
      showToast('Necesitas una inscripción activa para adquirir planes.', false)
      return
    }
    setConfirmPlan(plan); setStep(0); setDirection(1); setPayMethod(null)
  }

  const goTo = (next: number) => { setDirection(next > step ? 1 : -1); setStep(next) }

  const handlePurchase = async () => {
    if (!confirmPlan || !payMethod) return
    setPurchasing(true)
    try {
      const res  = await fetch('/api/user-memberships', {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ membershipId: confirmPlan.id, paymentMethod: payMethod }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al adquirir')
      showToast(payMethod === 'cash'
        ? '✓ Solicitud enviada. El admin confirmará tu pago en efectivo.'
        : '✓ Redirigiendo a Wompi para completar el pago…', true)
      setConfirmPlan(null)
    } catch (e: any) {
      showToast(e.message, false)
    } finally { setPurchasing(false) }
  }

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  }

  // Lookup plan badge info
  const getPlanMeta = (plan: Plan) => {
    let sessionLabel: string | null = null
    let totalSessions = 0
    let hasFreeClasses = false
    let isUnlimited = false
    let discountPct: number | null = null
    for (const bName of plan.benefits) {
      const entry = catalogMap.get(bName)
      if (!entry) continue
      if (entry.type === 'unlimited_classes') { isUnlimited = true }
      else if (entry.type === 'free_classes' && entry.value != null) {
        totalSessions += entry.value
        hasFreeClasses = true
      }
      else if (entry.type === 'discount_percent' && entry.value != null) { discountPct = entry.value }
    }
    if (hasFreeClasses) {
      sessionLabel = `${totalSessions} sesión${totalSessions !== 1 ? 'es incluidas' : ' incluida'}`
    }
    if (!sessionLabel && !isUnlimited) {
      const fb = classBadge(plan.benefits, plan.maxClasses)
      if (fb) { sessionLabel = fb.label; isUnlimited = fb.isUnlimited }
    }
    return { sessionLabel, isUnlimited, discountPct }
  }

  return (
    <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 28px' }}>

        {/* Banner */}
        <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 28, background: `linear-gradient(135deg, ${C.gold}15, ${C.goldLight}10)`, border: `1px solid ${C.gold}30`, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: FONT_INTER }}>Academia MEDIS</p>
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Planes</h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0, fontStyle: 'italic', fontFamily: FONT_BODONI }}>Accede al arte del pole dance sin límites.</p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <style>{`
              @keyframes aerialSpin   { 0%{transform:rotate(0deg)}   100%{transform:rotate(360deg)} }
              @keyframes bodyInvert   { 0%,100%{transform:rotate(-10deg) translateY(0)} 50%{transform:rotate(10deg) translateY(-4px)} }
              @keyframes legSplit     { 0%,100%{transform:rotate(0deg)}   50%{transform:rotate(-30deg)} }
              @keyframes legSplitR    { 0%,100%{transform:rotate(0deg)}   50%{transform:rotate(30deg)} }
              @keyframes starPulse    { 0%,100%{opacity:0.3;r:2}   50%{opacity:1;r:3.5} }
              @keyframes ringRotate   { 0%{transform:rotate(0deg) scaleY(0.3)}  100%{transform:rotate(360deg) scaleY(0.3)} }
              @keyframes shimmer      { 0%,100%{opacity:0.4}  50%{opacity:1} }
            `}</style>
            <svg width="120" height="160" viewBox="0 0 120 160" style={{ overflow: 'visible' }}>
              <ellipse cx="60" cy="80" rx="30" ry="9" fill="none" stroke={C.goldLight} strokeWidth="2" opacity="0.5"
                style={{ transformOrigin: '60px 80px', animation: 'ringRotate 4s linear infinite' }} />
              <line x1="60" y1="8" x2="60" y2="152" stroke={C.goldLight} strokeWidth="3.5" strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${C.goldLight}88)` }} />
              <circle cx="60" cy="10" r="5" fill={C.gold} style={{ animation: 'shimmer 2s ease-in-out infinite' }} />
              <circle cx="60" cy="150" r="4" fill={C.gold} opacity="0.5" />
              <g style={{ transformOrigin: '60px 75px', animation: 'bodyInvert 3s ease-in-out infinite' }}>
                <circle cx="60" cy="75" r="5" fill={C.text} opacity="0.15" />
                <path d="M56 75 Q52 60 53 48 Q60 44 67 48 Q68 60 64 75Z" fill={C.text} opacity="0.82" />
                <circle cx="60" cy="42" r="8.5" fill={C.text} opacity="0.82" />
                <path d="M60 34 Q52 22 48 15" stroke={C.text} strokeWidth="2.5" fill="none" opacity="0.7"
                  style={{ animation: 'legSplit 2.5s ease-in-out infinite' }} />
                <path d="M60 34 Q68 20 72 14" stroke={C.text} strokeWidth="2" fill="none" opacity="0.5"
                  style={{ animation: 'legSplitR 2.5s ease-in-out infinite' }} />
                <line x1="56" y1="65" x2="60" y2="60" stroke={C.text} strokeWidth="3" strokeLinecap="round" opacity="0.82" />
                <line x1="64" y1="65" x2="60" y2="60" stroke={C.text} strokeWidth="3" strokeLinecap="round" opacity="0.82" />
                <g style={{ transformOrigin: '56px 75px', animation: 'legSplit 2.8s ease-in-out infinite' }}>
                  <line x1="56" y1="75" x2="40" y2="95" stroke={C.text} strokeWidth="4" strokeLinecap="round" opacity="0.82" />
                  <line x1="40" y1="95" x2="28" y2="115" stroke={C.text} strokeWidth="3.5" strokeLinecap="round" opacity="0.82" />
                  <circle cx="27" cy="117" r="2.5" fill={C.text} opacity="0.75" />
                </g>
                <g style={{ transformOrigin: '64px 75px', animation: 'legSplitR 2.8s ease-in-out infinite' }}>
                  <line x1="64" y1="75" x2="80" y2="93" stroke={C.text} strokeWidth="4" strokeLinecap="round" opacity="0.82" />
                  <line x1="80" y1="93" x2="92" y2="112" stroke={C.text} strokeWidth="3.5" strokeLinecap="round" opacity="0.82" />
                  <circle cx="93" cy="114" r="2.5" fill={C.text} opacity="0.75" />
                </g>
              </g>
              {[{cx:25,cy:30,d:'0s'},{cx:95,cy:45,d:'0.8s'},{cx:15,cy:110,d:'1.5s'},{cx:105,cy:120,d:'0.4s'},{cx:40,cy:145,d:'1.1s'},{cx:85,cy:20,d:'1.8s'}].map((s,i)=>(
                <circle key={i} cx={s.cx} cy={s.cy} r="2" fill={C.goldLight} style={{ animation:`starPulse 2s ease-in-out ${s.d} infinite` }} />
              ))}
            </svg>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.textMuted }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Cargando…</span>
          </div>
        ) : (
          <>
            {/* ── INSCRIPCIÓN STATUS ── */}
            {inscription ? (
              /* User has active inscription */
              <div style={{ marginBottom: 28, borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${C.pink}40`, boxShadow: '0 6px 24px rgba(190,24,93,0.08)' }}>
                <div style={{ background: `linear-gradient(135deg, ${C.pink}, ${C.pinkLight})`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={18} color="rgba(255,255,255,0.9)" />
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0 }}>Inscripción activa</p>
                      <p style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 700, color: C.white, margin: '2px 0 0', lineHeight: 1.1 }}>{inscription.membership.name}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.2)', color: C.white }}>✓ Activa</span>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: '6px 0 0' }}>Desde: <strong>{fmtDate(inscription.startedAt)}</strong></p>
                  </div>
                </div>
                {/* Discount from inscription */}
                {(() => {
                  const disc = inscription.membership.benefits
                    .map(b => catalogMap.get(b))
                    .find(e => e?.type === 'discount_percent')
                  if (!disc) return null
                  return (
                    <div style={{ background: `${C.pink}08`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.pink }}>🎉 {disc.value}% de descuento</span>
                      <span style={{ fontSize: 12, color: C.textMuted }}>en servicios adicionales por ser miembro</span>
                    </div>
                  )
                })()}
              </div>
            ) : inscriptionPlans.length > 0 ? (
              /* No inscription — collapsible banner */
              (() => {
                const insc = inscriptionPlans[0]
                const { discountPct } = getPlanMeta(insc)
                return (
                  <div style={{ marginBottom: 28, borderRadius: 18, overflow: 'hidden', border: `2px dashed ${C.pink}50`, background: `${C.pink}05` }}>
                    {/* Collapsed header — always visible */}
                    <button onClick={() => setInscriptionExpanded(e => !e)}
                      style={{ width: '100%', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FONT_INTER }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.pink}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Lock size={20} color={C.pink} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ fontFamily: FONT_BODONI, fontSize: 18, color: C.text, margin: '0 0 2px' }}>Inscríbete en MEDIS</h3>
                          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                            Pago único de <strong>{fmtPrice(insc.price)}</strong> · desbloquea{discountPct != null ? ` ${discountPct}% de descuento y` : ''} acceso a todos los planes
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.pink, whiteSpace: 'nowrap' }}>{inscriptionExpanded ? 'Ver menos' : 'Ver detalles'}</span>
                        {inscriptionExpanded ? <ChevronUp size={16} color={C.pink} /> : <ChevronDown size={16} color={C.pink} />}
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {inscriptionExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                          <div style={{ padding: '0 24px 22px', borderTop: `1px dashed ${C.pink}30`, marginTop: 2, paddingTop: 18 }}>
                            {insc.description && (
                              <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.7, margin: '0 0 16px' }}>{insc.description}</p>
                            )}
                            {insc.benefits.length > 0 && (
                              <div style={{ marginBottom: 18 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: C.pink, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Beneficios incluidos</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {insc.benefits.map(b => (
                                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <CheckCircle2 size={14} color={C.pink} />
                                      <span style={{ fontSize: 13, color: C.textBrown, fontWeight: 600 }}>{b}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <button onClick={() => openConfirm(insc)}
                              style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.pink}, ${C.pinkLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                              Inscribirme ahora — {fmtPrice(insc.price)}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })()
            ) : null}

            {/* ── PLAN ACTIVO ── */}
            {active && (
              <div style={{ marginBottom: 36, borderRadius: 20, overflow: 'hidden', border: `1.5px solid ${C.gold}40`, boxShadow: '0 8px 32px rgba(139,92,246,0.1)' }}>
                <div style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CreditCard size={16} color="rgba(255,255,255,0.85)" />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Tu plan activo</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.2)', color: C.white }}>✓ Activa</span>
                  </div>
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.white, margin: '0 0 10px', lineHeight: 1.1 }}>
                    {active.membership.name}
                  </h3>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Desde: <strong>{fmtDate(active.startedAt)}</strong></span>
                    {active.expiresAt && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Vence: <strong>{fmtDate(active.expiresAt)}</strong></span>}
                    {active.classesRemaining !== null && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Clases restantes: <strong>{active.classesRemaining}</strong></span>}
                  </div>
                </div>
                {active.membership.benefits.length > 0 && (
                  <div style={{ background: 'rgba(139,92,246,0.03)', padding: '18px 24px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Beneficios incluidos</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {active.membership.benefits.map(b => (
                        <span key={b} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, background: C.white, border: `1px solid ${C.borderLight}`, fontSize: 13, color: C.textBrown, fontWeight: 600 }}>
                          <CheckCircle2 size={13} color={C.gold} />{b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PLANES DISPONIBLES ── */}
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, color: C.text, margin: '0 0 18px' }}>Planes disponibles</h2>

            {regularPlans.filter(p => p.id !== active?.membershipId).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: C.white, borderRadius: 20, border: `2px dashed ${C.borderLight}` }}>
                <p style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.textMuted, margin: 0 }}>Sin planes disponibles por ahora.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                {regularPlans.filter(p => p.id !== active?.membershipId).map((plan, i) => {
                  const { sessionLabel, isUnlimited, discountPct } = getPlanMeta(plan)
                  const blocked = !inscription

                  return (
                    <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      style={{ background: C.white, borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${C.borderLight}`, boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      {blocked && (
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'rgba(245,243,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                          <div style={{ background: C.white, borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: `1px solid ${C.pink}30` }}>
                            <Lock size={14} color={C.pink} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.pink }}>Requiere inscripción</span>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, filter: blocked ? 'blur(5px)' : 'none', pointerEvents: blocked ? 'none' : 'auto', userSelect: blocked ? 'none' : 'auto' }}>
                      <div style={{ height: 4, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` }} />
                      <div style={{ padding: '20px 22px', flex: 1 }}>
                        <h3 style={{ fontFamily: FONT_BODONI, fontSize: 19, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>{plan.name}</h3>
                        {plan.description && <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 14px', lineHeight: 1.5 }}>{plan.description}</p>}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                          {plan.durationDays && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, background: 'rgba(94,94,94,0.07)', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Clock size={11} /> {plan.durationDays}d
                            </span>
                          )}
                          {isUnlimited && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.08)', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <InfinityIcon size={11} /> Ilimitadas
                            </span>
                          )}
                          {!isUnlimited && sessionLabel && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: 8 }}>{sessionLabel}</span>
                          )}
                          {discountPct != null && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: 'rgba(234,179,8,0.1)', padding: '4px 10px', borderRadius: 8 }}>-{discountPct}% adicional</span>
                          )}
                        </div>
                        {plan.benefits.length > 0 && (
                          <ul style={{ margin: '0 0 14px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {plan.benefits.slice(0, 3).map(b => (
                              <li key={b} style={{ fontSize: 12, color: C.textBrown, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle2 size={11} color={C.gold} /> {b}
                              </li>
                            ))}
                            {plan.benefits.length > 3 && <li style={{ fontSize: 11, color: C.textMuted }}>+{plan.benefits.length - 3} más…</li>}
                          </ul>
                        )}
                      </div>
                      <div style={{ padding: '0 22px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 800, color: C.gold }}>{fmtPrice(plan.price)}</span>
                        </div>
                        <button onClick={() => openConfirm(plan)} disabled={blocked}
                          style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: blocked ? C.borderLight : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: blocked ? C.textMuted : C.white, fontSize: 13, fontWeight: 700, cursor: blocked ? 'not-allowed' : 'pointer', fontFamily: FONT_INTER }}>
                          {blocked ? 'Inscríbete primero' : 'Adquirir plan'}
                        </button>
                      </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Bottom decoration */}
        <div style={{ marginTop: 48, borderRadius: 20, overflow: 'hidden', background: `linear-gradient(135deg, ${C.text} 0%, #2D2B29 100%)`, padding: '32px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: FONT_BODONI, fontSize: 22, color: C.goldLight, margin: '0 0 8px', fontStyle: 'italic' }}>"La fuerza que no sabías que tenías."</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>Tu salud es nuestra prioridad. — Academia MEDIS</p>
          </div>
        </div>
      </div>

      {/* ── CONFIRM MODAL ── */}
      <AnimatePresence>
        {confirmPlan && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmPlan(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.5)', backdropFilter: 'blur(6px)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 22, width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.16)', pointerEvents: 'all', overflow: 'hidden' }}>

                {/* Step bar */}
                {(() => {
                  const isInscription = confirmPlan.type === 'inscription'
                  const barColor = isInscription ? C.pink : C.gold
                  const barColorLight = isInscription ? C.pinkLight : C.goldLight
                  return (
                    <>
                      <div style={{ background: `linear-gradient(90deg, ${barColor}, ${barColorLight})`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {CONFIRM_STEPS.map((s, idx) => (
                            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: step >= idx ? C.white : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: step >= idx ? barColor : C.white }}>{idx + 1}</span>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: step >= idx ? C.white : 'rgba(255,255,255,0.6)' }}>{s}</span>
                              {idx < 2 && <ChevronRight size={12} color="rgba(255,255,255,0.5)" />}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setConfirmPlan(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.white }}>
                          <X size={14} />
                        </button>
                      </div>

                      {/* Step content */}
                      <div style={{ padding: '24px', minHeight: 200, overflow: 'hidden' }}>
                        <AnimatePresence custom={direction} mode="wait">
                          {step === 0 && (
                            <motion.div key="s0" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
                              {isInscription && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: `${C.pink}10`, marginBottom: 14 }}>
                                  <ShieldCheck size={14} color={C.pink} />
                                  <span style={{ fontSize: 12, color: C.pink, fontWeight: 600 }}>Pago único · sin renovación automática</span>
                                </div>
                              )}
                              <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.4rem', color: C.text, margin: '0 0 6px' }}>{confirmPlan.name}</h3>
                              {confirmPlan.description && <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>{confirmPlan.description}</p>}
                              {(() => {
                                const { sessionLabel, isUnlimited, discountPct } = getPlanMeta(confirmPlan)
                                const boxes = [
                                  confirmPlan.durationDays ? { icon: <Clock size={16} color={barColor} />, value: String(confirmPlan.durationDays), label: 'días de vigencia' } : null,
                                  isUnlimited ? { icon: <InfinityIcon size={16} color="#7C3AED" />, value: '∞', label: 'acceso ilimitado', color: '#7C3AED', bg: 'rgba(124,58,237,0.06)' }
                                    : sessionLabel != null ? { icon: <CreditCard size={16} color="#16A34A" />, value: String(confirmPlan.maxClasses ?? ''), label: sessionLabel, color: '#16A34A', bg: 'rgba(34,197,94,0.06)' } : null,
                                  discountPct != null ? { icon: <span style={{ fontSize: 14, fontWeight: 800, color: '#B45309' }}>%</span>, value: `-${discountPct}%`, label: 'dto. adicional', color: '#B45309', bg: 'rgba(234,179,8,0.06)' } : null,
                                ].filter(Boolean) as { icon: React.ReactNode; value: string; label: string; color?: string; bg?: string }[]

                                return (
                                  <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                    {boxes.map((box, idx) => (
                                      <div key={idx} style={{ flex: 1, minWidth: 80, padding: '12px 8px', background: box.bg ?? `${barColor}08`, borderRadius: 12, textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{box.icon}</div>
                                        <p style={{ fontFamily: FONT_BODONI, fontSize: 20, color: box.color ?? barColor, margin: '0 0 3px', lineHeight: 1 }}>{box.value}</p>
                                        <p style={{ fontSize: 9, color: C.textMuted, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.3 }}>{box.label}</p>
                                      </div>
                                    ))}
                                    <div style={{ flex: 1, minWidth: 80, padding: '12px 8px', background: `${barColor}08`, borderRadius: 12, textAlign: 'center' }}>
                                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><CreditCard size={16} color={barColor} /></div>
                                      <p style={{ fontFamily: FONT_BODONI, fontSize: 16, color: barColor, margin: '0 0 3px', lineHeight: 1 }}>{fmtPrice(confirmPlan.price)}</p>
                                      <p style={{ fontSize: 9, color: C.textMuted, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>COP</p>
                                    </div>
                                  </div>
                                )
                              })()}
                            </motion.div>
                          )}
                          {step === 1 && (
                            <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
                              <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.text, margin: '0 0 14px' }}>Beneficios incluidos</h3>
                              {confirmPlan.benefits.length === 0 ? (
                                <p style={{ fontSize: 13, color: C.textMuted, fontStyle: 'italic' }}>Sin beneficios adicionales.</p>
                              ) : (
                                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {confirmPlan.benefits.map(b => (
                                    <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: `${barColor}06`, borderRadius: 10 }}>
                                      <CheckCircle2 size={14} color={barColor} />
                                      <span style={{ fontSize: 13, color: C.textBrown, fontWeight: 600 }}>{b}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </motion.div>
                          )}
                          {step === 2 && (
                            <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
                              <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.text, margin: '0 0 14px' }}>Método de pago</h3>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                {([['cash','💵','Efectivo','Paga en el estudio'],['wompi','💳','Wompi','Pago en línea']] as const).map(([v,emoji,label,desc]) => (
                                  <button key={v} onClick={() => setPayMethod(v)}
                                    style={{ padding: '14px', borderRadius: 12, border: `2px solid ${payMethod === v ? barColor : C.borderLight}`, background: payMethod === v ? `${barColor}10` : 'transparent', cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s', fontFamily: FONT_INTER }}>
                                    <div style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: payMethod === v ? barColor : C.text }}>{label}</div>
                                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{desc}</div>
                                  </button>
                                ))}
                              </div>
                              {payMethod && (
                                <div style={{ padding: '10px 14px', borderRadius: 10, background: payMethod === 'cash' ? 'rgba(234,179,8,0.08)' : 'rgba(124,58,237,0.08)', fontSize: 12, color: C.textBrown }}>
                                  {payMethod === 'cash'
                                    ? '🔔 El admin recibirá una notificación. Tu plan quedará activo cuando confirme el pago.'
                                    : '🔗 Serás redirigido a Wompi para completar el pago de forma segura.'}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Footer */}
                      <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
                        <button onClick={() => step === 0 ? setConfirmPlan(null) : goTo(step - 1)}
                          style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          <ChevronLeft size={14} /> {step === 0 ? 'Cancelar' : 'Atrás'}
                        </button>
                        {step < 2 ? (
                          <button onClick={() => goTo(step + 1)}
                            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${barColor}, ${barColorLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            Continuar <ChevronRight size={14} />
                          </button>
                        ) : (
                          <button onClick={handlePurchase} disabled={!payMethod || purchasing}
                            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: payMethod ? `linear-gradient(135deg, ${barColor}, ${barColorLight})` : C.borderLight, color: payMethod ? C.white : C.textMuted, fontSize: 13, fontWeight: 700, cursor: payMethod && !purchasing ? 'pointer' : 'not-allowed', fontFamily: FONT_INTER, opacity: purchasing ? 0.7 : 1 }}>
                            {purchasing ? 'Procesando…' : `Confirmar · ${fmtPrice(confirmPlan.price)}`}
                          </button>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#16A34A' : '#DC2626', color: C.white, padding: '11px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', fontFamily: FONT_INTER }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
