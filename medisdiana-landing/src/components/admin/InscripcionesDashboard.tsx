import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertCircle, Clock, User, MapPin,
  RefreshCw, Loader2, ClipboardList, } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import './MainDashboard.css'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bgPanel: '#F3F0FB', white: '#FFFFFF',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled'

interface Request {
  id: string
  offerTitle: string
  scheduledAt: string | null
  offerPrice: number
  offerType?: string
  status: Status
  createdAt: string
  locationName?: string
  profFirstName?: string
  profLastName?: string
  sessionCount?: number
  paymentMethod?: 'cash' | 'wompi'
  expectedAmount?: number | null
  discountPct?: number | null
  user: { id: string; firstName: string; lastName: string; email: string }
}

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: 'Pendiente',  color: '#B45309', bg: 'rgba(234,179,8,0.1)',  icon: AlertCircle  },
  approved:  { label: 'Aprobada',   color: '#16A34A', bg: 'rgba(34,197,94,0.1)',  icon: CheckCircle2 },
  rejected:  { label: 'Rechazada',  color: '#DC2626', bg: 'rgba(239,68,68,0.1)',  icon: XCircle      },
  cancelled: { label: 'Cancelada',  color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: XCircle     },
}

export const InscripcionesDashboard: React.FC = () => {
  const [requests, setRequests]         = useState<Request[]>([])
  const [loading, setLoading]           = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all')
  const [search, setSearch]             = useState('')
  const [resolving, setResolving]       = useState<string | null>(null)
  const [rejectModal, setRejectModal]       = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason]     = useState('')
  const [chargeModal, setChargeModal]       = useState<{ id: string; name: string; price: number } | null>(null)
  const [chargeAmount, setChargeAmount]     = useState('')
  const [charging, setCharging]             = useState(false)
  const [toast, setToast]                   = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/services/requests/all', { headers: authH() })
      const data = await res.json()
      if (data.success) setRequests(data.data.requests)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleApprove = async (id: string, userName: string) => {
    setResolving(id)
    try {
      const res  = await fetch(`/api/services/requests/${id}/resolve`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ status: 'approved' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))
      showToast(`Inscripción de ${userName} aprobada`, true)
    } catch (e: any) { showToast(e.message, false) }
    finally { setResolving(null) }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setResolving(rejectModal.id)
    try {
      const res  = await fetch(`/api/services/requests/${rejectModal.id}/resolve`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ status: 'rejected', rejectReason: rejectReason.trim() || undefined }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setRequests(prev => prev.map(r => r.id === rejectModal.id ? { ...r, status: 'rejected' } : r))
      showToast(`Inscripción rechazada`, true)
      setRejectModal(null); setRejectReason('')
    } catch (e: any) { showToast(e.message, false) }
    finally { setResolving(null) }
  }

  const handleCharge = async () => {
    if (!chargeModal) return
    const amount = Number(chargeAmount.replace(/\D/g, ''))
    if (!amount || amount <= 0) return
    setCharging(true)
    try {
      const res  = await fetch(`/api/services/requests/${chargeModal.id}/set-payment`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ expectedAmount: amount, paymentMethod: 'cash' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      // Remove from Inscripciones (it now belongs in Finanzas)
      setRequests(prev => prev.filter(r => r.id !== chargeModal.id))
      showToast(`Inscripción de ${chargeModal.name} movida a Finanzas · Cobrar ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)}`, true)
      setChargeModal(null); setChargeAmount('')
    } catch (e: any) { showToast(e.message, false) }
    finally { setCharging(false) }
  }

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${r.user.firstName} ${r.user.lastName}`.toLowerCase()
      if (!name.includes(q) && !r.user.email.toLowerCase().includes(q) && !r.offerTitle.toLowerCase().includes(q)) return false
    }
    return true
  })

  const counts = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
  }

  return (
    <div className="dashboard-container">
      <AdminSidebar />

      <div className="main-content">
        {/* TOPBAR */}
        <header style={{ height: 72, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30 }}>
          <h2 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 600, color: C.gold, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            MEDIS <span style={{ fontSize: 12, fontFamily: FONT_INTER, color: C.textMuted, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>/ Inscripciones</span>
          </h2>
          <button onClick={load} style={{ width: 38, height: 38, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: FONT_BODONI, fontSize: '2.2rem', color: C.text, margin: '0 0 6px' }}>Inscripciones</h1>
              <p style={{ color: C.textMuted, margin: '0 0 10px' }}>Gestiona las solicitudes de inscripción de los usuarios a los servicios.</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 99, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <CheckCircle2 size={13} color="#16A34A" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#16A34A' }}>
                  Solo inscripciones gratuitas / cubiertas por plan — los pagos de servicios se gestionan en <strong>Finanzas</strong>
                </span>
              </div>
            </motion.div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              {([
                { label: 'Total',      value: counts.all,      color: C.gold,    bg: 'rgba(139,92,246,0.07)' },
                { label: 'Pendientes', value: counts.pending,   color: '#B45309', bg: 'rgba(234,179,8,0.08)' },
                { label: 'Aprobadas',  value: counts.approved,  color: '#16A34A', bg: 'rgba(34,197,94,0.07)' },
                { label: 'Rechazadas', value: counts.rejected,  color: '#DC2626', bg: 'rgba(239,68,68,0.07)' },
              ] as const).map(s => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '1.2rem', display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <User size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por alumna, email o servicio…"
                  style={{ width: '100%', padding: '10px 14px 10px 34px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: FONT_INTER }}
                  onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.borderLight}
                />
              </div>
              {/* Status pills */}
              <div style={{ display: 'flex', gap: 7 }}>
                {([['all','Todas'],['pending','Pendientes'],['approved','Aprobadas'],['rejected','Rechazadas']] as const).map(([v,l]) => (
                  <button key={v} onClick={() => setFilterStatus(v)}
                    style={{ padding: '9px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filterStatus === v ? C.gold : C.borderLight}`, background: filterStatus === v ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : 'transparent', color: filterStatus === v ? C.white : C.textBrown, cursor: 'pointer', fontFamily: FONT_INTER }}>
                    {l}{v !== 'all' && counts[v as keyof typeof counts] > 0 ? ` (${counts[v as keyof typeof counts]})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.textMuted }}>
                <Loader2 size={20} className="spin" /><span style={{ fontSize: 14, fontWeight: 600 }}>Cargando inscripciones…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', background: C.white, borderRadius: 20, border: `2px dashed ${C.borderLight}` }}>
                <ClipboardList size={44} color={C.borderLight} style={{ marginBottom: 16 }} />
                <p style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.textMuted, margin: 0 }}>
                  {requests.length === 0 ? 'Aún no hay inscripciones' : 'Sin resultados para ese filtro'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AnimatePresence>
                  {filtered.map((req, i) => {
                    const sc   = STATUS_CONFIG[req.status]
                    const Icon = sc.icon
                    const name = `${req.user.firstName} ${req.user.lastName}`
                    return (
                      <motion.div key={req.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        style={{ background: C.white, borderRadius: 14, padding: '16px 20px', border: `1.5px solid ${C.borderLight}`, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>

                        {/* Status icon */}
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} color={sc.color} />
                        </div>

                        {/* User info */}
                        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{name}</p>
                          <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{req.user.email}</p>
                        </div>

                        {/* Service info */}
                        <div style={{ flex: '2 1 200px', minWidth: 160 }}>
                          <p style={{ fontFamily: FONT_BODONI, fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 3px' }}>
                            {(req.offerTitle ?? '').split(' — ')[1] || req.offerTitle}
                          </p>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {req.scheduledAt && (
                              <span style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={10} color={C.gold} /> {fmtDate(req.scheduledAt)} {fmtTime(req.scheduledAt)}
                              </span>
                            )}
                            {req.locationName && (
                              <span style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={10} color={C.gold} /> {req.locationName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Payment info */}
                        <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 100 }}>
                          {req.sessionCount && req.sessionCount > 1 && (
                            <p style={{ fontSize: 10, fontWeight: 700, color: C.gold, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {req.sessionCount} sesiones
                            </p>
                          )}
                          {req.expectedAmount != null && req.expectedAmount > 0 ? (
                            <>
                              <p style={{ fontSize: 13, fontWeight: 800, color: '#B45309', fontFamily: FONT_BODONI, margin: '0 0 2px' }}>
                                {fmtPrice(req.expectedAmount)}
                              </p>
                              {req.discountPct && (
                                <p style={{ fontSize: 10, color: '#B45309', margin: '0 0 2px', fontWeight: 600 }}>
                                  -{req.discountPct}% descuento
                                </p>
                              )}
                            </>
                          ) : (
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', margin: '0 0 2px' }}>Cubierto por plan</p>
                          )}
                          <p style={{ fontSize: 10, color: C.textMuted, margin: 0, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                            {req.paymentMethod === 'wompi' ? '💳 Wompi' : '💵 Efectivo'}
                          </p>
                        </div>

                        {/* Date requested */}
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 2px' }}>Solicitada</p>
                          <p style={{ fontSize: 11, fontWeight: 600, color: C.textBrown, margin: '0 0 1px' }}>{fmtDate(req.createdAt)}</p>
                          <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{fmtTime(req.createdAt)}</p>
                        </div>

                        {/* Status badge */}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          <Icon size={11} /> {sc.label}
                        </span>

                        {/* Actions (only for pending) */}
                        {req.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                            <button onClick={() => handleApprove(req.id, name)} disabled={resolving === req.id}
                              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: resolving === req.id ? C.bgPanel : 'linear-gradient(135deg, #16A34A, #22C55E)', color: resolving === req.id ? C.textMuted : C.white, fontSize: 12, fontWeight: 700, cursor: resolving === req.id ? 'not-allowed' : 'pointer', fontFamily: FONT_INTER }}>
                              ✓ Aprobar
                            </button>
                            <button
                              onClick={() => setChargeModal({ id: req.id, name, price: req.offerPrice ?? 0 })}
                              title="Mover a Finanzas y asignar cobro"
                              style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #B45309', background: 'transparent', color: '#B45309', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                              💰 Cobrar
                            </button>
                            <button onClick={() => setRejectModal({ id: req.id, name })} disabled={resolving === req.id}
                              style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid #DC2626`, background: 'transparent', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                              ✗ Rechazar
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                <p style={{ fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 8 }}>{filtered.length} inscripción{filtered.length !== 1 ? 'es' : ''}</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRejectModal(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.45)', backdropFilter: 'blur(6px)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 18, width: '100%', maxWidth: 420, padding: '28px', boxShadow: '0 24px 80px rgba(0,0,0,0.16)', pointerEvents: 'all' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <XCircle size={22} color="#DC2626" />
                </div>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.text, margin: '0 0 6px', textAlign: 'center' }}>Rechazar inscripción</h3>
                <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', margin: '0 0 18px' }}>Solicitud de <strong>{rejectModal.name}</strong></p>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                  Motivo <span style={{ fontWeight: 400, textTransform: 'none', color: C.textMuted }}>(opcional)</span>
                </label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                  placeholder="Ej: No hay cupos disponibles en ese horario…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 13, fontFamily: FONT_INTER, color: C.text, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#DC2626'} onBlur={e => e.target.style.borderColor = C.borderLight}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                    Cancelar
                  </button>
                  <button onClick={handleReject} disabled={resolving !== null}
                    style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#DC2626', color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                    {resolving ? 'Rechazando…' : 'Rechazar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Charge modal */}
      <AnimatePresence>
        {chargeModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setChargeModal(null); setChargeAmount('') }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.45)', backdropFilter: 'blur(6px)', zIndex: 110 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: 'fixed', inset: 0, zIndex: 111, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 18, padding: '28px', maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', pointerEvents: 'all' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(180,83,9,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <span style={{ fontSize: 22 }}>💰</span>
                </div>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.text, textAlign: 'center', margin: '0 0 6px' }}>Asignar cobro</h3>
                <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
                  Esta inscripción de <strong>{chargeModal.name}</strong> se moverá a <strong>Finanzas</strong> para confirmar el pago.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Monto a cobrar (COP)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontWeight: 700 }}>$</span>
                    <input
                      type="text" inputMode="numeric" autoFocus
                      value={chargeAmount}
                      onChange={e => setChargeAmount(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
                      placeholder={chargeModal.price ? chargeModal.price.toLocaleString('es-CO') : 'Ej: 45.000'}
                      style={{ width: '100%', padding: '11px 14px 11px 28px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14, fontWeight: 700, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: FONT_INTER }}
                      onFocus={e => e.target.style.borderColor = '#B45309'}
                      onBlur={e => e.target.style.borderColor = C.borderLight}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setChargeModal(null); setChargeAmount('') }}
                    style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleCharge} disabled={charging || !chargeAmount}
                    style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: charging ? C.bgPanel : 'linear-gradient(135deg, #B45309, #D97706)', color: charging ? C.textMuted : C.white, fontSize: 13, fontWeight: 700, cursor: charging ? 'not-allowed' : 'pointer' }}>
                    {charging ? 'Asignando…' : '💰 Mover a Finanzas'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#16A34A' : '#DC2626', color: C.white, padding: '11px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', fontFamily: FONT_INTER }}>
            {toast.ok ? '✓ ' : '✗ '}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
