import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, Loader2 } from 'lucide-react'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  white: '#FFFFFF', bg: '#F5F3F1',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

interface Props { userId?: string }

export const UserProfesionales: React.FC<Props> = () => {
  const [professionals, setProfessionals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get user's approved bookings to find their instructors
    Promise.all([
      fetch('/api/services/my-requests', { headers: authH() }).then(r => r.json()),
      fetch('/api/professionals', { headers: authH() }).then(r => r.json()),
    ]).then(([bookData, profData]) => {
      const allProfs: any[] = profData.success ? profData.data.professionals : []

      if (bookData.success) {
        const approvedBookings: any[] = (bookData.data.requests || []).filter((b: any) => b.status === 'approved')
        const profIds = new Set(approvedBookings.map((b: any) => b.offer?.professional?.id).filter(Boolean))

        if (profIds.size > 0) {
          setProfessionals(allProfs.filter((p: any) => profIds.has(p.id)))
        } else {
          // If no approved bookings yet, show all available professionals
          setProfessionals(allProfs)
        }
      } else {
        setProfessionals(allProfs)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const initials = (p: any) => `${p.firstName?.[0]??''}${p.lastName?.[0]??''}`.toUpperCase()

  return (
    <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 28px' }}>

        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: FONT_INTER }}>Mi Portal</p>
          <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: 0 }}>Profesionales</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: '8px 0 0' }}>El equipo de instructores del estudio</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 0', color: C.textMuted }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: 14, fontWeight: 600 }}>Cargando…</span>
          </div>
        ) : professionals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: C.white, borderRadius: 20, border: `2px dashed ${C.borderLight}` }}>
            <p style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.textMuted, margin: 0 }}>Sin profesionales disponibles</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
            {professionals.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ background: C.white, borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${C.borderLight}`, boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                {/* Photo */}
                <div style={{ height: 160, background: `linear-gradient(135deg, ${C.gold}22, ${C.goldLight}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt={p.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: FONT_BODONI, fontSize: 48, fontWeight: 700, color: C.gold, opacity: 0.4 }}>{initials(p)}</span>
                  }
                  {/* Status dot */}
                  {p.status === 'available' && (
                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E' }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.text, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Disponible</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: '16px 18px' }}>
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
                    {p.firstName} {p.lastName}
                  </h3>
                  {p.avgScore > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                      <Star size={12} fill={C.gold} color={C.gold} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{Number(p.avgScore).toFixed(1)}</span>
                      <span style={{ fontSize: 11, color: C.textMuted }}>({p.totalReviews} reseñas)</span>
                    </div>
                  )}
                  {(p.specialties ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      {(p.specialties ?? []).slice(0, 3).map((s: string) => (
                        <span key={s} style={{ fontSize: 10, fontWeight: 600, color: C.gold, background: 'rgba(139,92,246,0.08)', padding: '3px 8px', borderRadius: 6 }}>{s}</span>
                      ))}
                    </div>
                  )}
                  {p.bio && <p style={{ fontSize: 12, color: C.textMedium, lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.bio}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
