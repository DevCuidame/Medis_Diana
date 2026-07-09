import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, MapPin, User, Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

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
const TYPE_COLOR: Record<string, string> = { appointment: '#2563EB', open_consultation: '#0EA5E9', workshop: '#8B5CF6', event: '#3B82F6' }
const TYPE_LABEL: Record<string, string> = { appointment: 'Cita Individual', open_consultation: 'Consulta Abierta', workshop: 'Sesión Grupal', event: 'Evento' }

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

function fmtTime(scheduledAt: string, durationMinutes?: number) {
  const s = new Date(scheduledAt)
  const p = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  if (!durationMinutes) return p(s)
  const e = new Date(s.getTime() + durationMinutes * 60000)
  return `${p(s)} – ${p(e)}`
}

interface Request {
  id: string; status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  offerTitle?: string; scheduledAt?: string; durationMinutes?: number
  offerPrice?: number; offerType?: string; createdAt: string
  locationName?: string; profFirstName?: string; profLastName?: string
  rejectReason?: string; sessionCount?: number
}

const STATUS_CFG = {
  pending:   { label: 'Pendiente',   color: '#B45309', bg: 'rgba(234,179,8,0.1)',   icon: AlertCircle  },
  approved:  { label: 'Confirmada',  color: '#16A34A', bg: 'rgba(34,197,94,0.1)',   icon: CheckCircle2 },
  rejected:  { label: 'Rechazada',   color: '#DC2626', bg: 'rgba(239,68,68,0.1)',   icon: XCircle      },
  cancelled: { label: 'Cancelada',   color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: XCircle      },
}

interface Props { userId?: string }

export const UserMisServicios: React.FC<Props> = () => {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    fetch('/api/services/my-requests', { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setRequests(d.data.requests || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Re-fetch when the user returns to the browser tab so approved status shows immediately
  useEffect(() => {
    const handleFocus = () => {
      fetch('/api/services/my-requests', { headers: authH() })
        .then(r => r.json())
        .then(d => { if (d.success) setRequests(d.data.requests || []) })
        .catch(() => {})
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  const counts = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected' || r.status === 'cancelled').length,
  }

  return (
    <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 28px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: FONT_INTER }}>Mi Portal</p>
          <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: 0 }}>Mis Servicios</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: '8px 0 0' }}>
            {loading ? 'Cargando…' : `${requests.length} solicitud${requests.length !== 1 ? 'es' : ''}`}
          </p>
        </div>

        {/* Status filter */}
        {requests.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
            {([['all','Todas'],['approved','Confirmadas'],['pending','Pendientes'],['rejected','Rechazadas']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                style={{ padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filter === v ? C.gold : C.borderLight}`, background: filter === v ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : 'transparent', color: filter === v ? C.white : C.textBrown, cursor: 'pointer', fontFamily: FONT_INTER }}>
                {l}{counts[v] > 0 && v !== 'all' ? ` · ${counts[v]}` : v === 'all' ? ` · ${counts.all}` : ''}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.textMuted }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Cargando…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: C.white, borderRadius: 20, border: `2px dashed ${C.borderLight}` }}>
            <p style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.textMuted, margin: '0 0 8px' }}>
              {requests.length === 0 ? 'Sin inscripciones aún' : 'Sin resultados'}
            </p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
              {requests.length === 0 ? 'Ve a Servicios para solicitar una inscripción.' : 'Prueba otro filtro.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatePresence>
              {filtered.map((req, i) => {
                const sc        = STATUS_CFG[req.status] ?? STATUS_CFG.pending
                const StatusIcon = sc.icon
                const parts     = (req.offerTitle ?? 'Servicio').split(' — ')
                const serviceName = parts[1] || parts[0]
                const category    = parts[1] ? parts[0] : null
                const date        = req.scheduledAt ? new Date(req.scheduledAt) : null
                const profName    = req.profFirstName ? `${req.profFirstName} ${req.profLastName ?? ''}`.trim() : null
                const color       = TYPE_COLOR[req.offerType ?? ''] ?? C.gold

                return (
                  <motion.div key={req.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ background: C.white, borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${req.status === 'approved' ? 'rgba(34,197,94,0.25)' : C.borderLight}`, boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                    {/* Top accent */}
                    <div style={{ height: 3, background: req.status === 'approved' ? 'linear-gradient(90deg, #16A34A, #22C55E)' : req.status === 'pending' ? `linear-gradient(90deg, #B45309, #D97706)` : 'linear-gradient(90deg, #9CA3AF, #D1D5DB)' }} />

                    <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {/* Date badge */}
                      {date && (
                        <div style={{ textAlign: 'center', minWidth: 50, flexShrink: 0 }}>
                          <div style={{ fontFamily: FONT_BODONI, fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{date.getDate()}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{MONTH_NAMES[date.getMonth()].slice(0,3)}</div>
                          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{date.getFullYear()}</div>
                        </div>
                      )}

                      {date && <div style={{ width: 1, height: 54, background: C.borderLight, flexShrink: 0 }} />}

                      {/* Service info */}
                      <div style={{ flex: 1, minWidth: 160 }}>
                        {req.offerType && (
                          <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}15`, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block', marginBottom: 5 }}>
                            {TYPE_LABEL[req.offerType] ?? req.offerType}
                          </span>
                        )}
                        <p style={{ fontFamily: FONT_BODONI, fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 3px', lineHeight: 1.2 }}>{serviceName}</p>
                        {category && <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 4px' }}>{category}</p>}
                        {req.sessionCount != null && req.sessionCount > 1 && (
                          <p style={{ fontSize: 11, color: C.gold, fontWeight: 700, margin: '0 0 8px' }}>
                            {req.sessionCount} sesiones
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {req.scheduledAt && (
                            <span style={{ fontSize: 11, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={11} color={C.gold} />
                              {fmtTime(req.scheduledAt, req.durationMinutes)}
                            </span>
                          )}
                          {req.locationName && (
                            <span style={{ fontSize: 11, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={11} color={C.gold} /> {req.locationName}
                            </span>
                          )}
                          {profName && (
                            <span style={{ fontSize: 11, color: C.textMedium, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <User size={11} color={C.gold} /> {profName}
                            </span>
                          )}
                        </div>

                        {/* Rejection reason */}
                        {req.status === 'rejected' && req.rejectReason && (
                          <div style={{ marginTop: 8, padding: '7px 10px', background: 'rgba(239,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
                            <p style={{ fontSize: 11, color: '#DC2626', margin: 0, fontWeight: 500 }}>
                              <strong>Motivo:</strong> {req.rejectReason}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Status badge */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: sc.bg, color: sc.color, fontSize: 12, fontWeight: 700, flexShrink: 0, alignSelf: 'flex-start' }}>
                        <StatusIcon size={13} /> {sc.label}
                      </span>
                    </div>
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
