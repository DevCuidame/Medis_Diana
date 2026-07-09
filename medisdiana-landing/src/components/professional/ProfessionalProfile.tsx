import React, { useState, useEffect } from 'react'
import { AtSign, Phone, FileText, Star, Loader2, Mail, Clock } from 'lucide-react'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  white: '#FFFFFF', bg: '#F5F3F1',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

interface Me {
  id: string; firstName: string; lastName: string
  email: string; avatarUrl?: string; bio?: string
  specialties?: string[]; phone?: string; instagramUrl?: string
  professionalType?: 'dependiente' | 'independiente'
}

interface ScheduleSlot { id: string; dayOfWeek: number; startTime: string; endTime: string }

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon→Sun display order

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

interface Props { me: Me | null; onUpdated?: (m: Me) => void }

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <Icon size={15} color={C.gold} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>{label}</p>
        <p style={{ fontSize: 14, color: value ? C.text : C.textMuted, margin: 0, fontStyle: value ? 'normal' : 'italic', lineHeight: 1.6 }}>
          {value ?? 'No registrado'}
        </p>
      </div>
    </div>
  )
}

export const ProfessionalProfile: React.FC<Props> = ({ me }) => {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([])

  useEffect(() => {
    if (!me?.id) return
    fetch(`/api/professionals/${me.id}/schedule`, { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setSchedule(d.data.slots) })
      .catch(() => {})
  }, [me?.id])

  if (!me) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <Loader2 size={24} color={C.gold} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const initials = `${me.firstName?.[0] ?? ''}${me.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 28px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: FONT_INTER }}>Portal Profesional</p>
          <h1 style={{ fontFamily: FONT_BODONI, fontSize: 36, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Mi Perfil</h1>
        </div>

        {/* Profile card */}
        <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', fontFamily: FONT_INTER }}>

          {/* Gold accent */}
          <div style={{ height: 5, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` }} />

          {/* Avatar hero */}
          <div style={{ padding: '28px 32px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, overflow: 'hidden', border: `3px solid ${C.goldLight}`, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {me.avatarUrl
                  ? <img src={me.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: FONT_BODONI, fontSize: 26, fontWeight: 700, color: C.white }}>{initials}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontFamily: FONT_BODONI, fontSize: 26, fontWeight: 700, color: C.text, margin: '0 0 4px', lineHeight: 1.1 }}>
                  {me.firstName} {me.lastName}
                </h2>
                <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 8px' }}>{me.email}</p>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, background: 'rgba(139,92,246,0.1)', padding: '4px 12px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {me.professionalType === 'independiente' ? '🕒 Independiente' : '🏢 Dependiente'}
                </span>
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div style={{ padding: '20px 32px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Star size={14} color={C.gold} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Especialidades</span>
            </div>
            {(me.specialties ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: C.textMuted, fontStyle: 'italic', margin: 0 }}>Sin especialidades registradas</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(me.specialties ?? []).map(s => (
                  <span key={s} style={{ padding: '6px 14px', borderRadius: 99, background: 'rgba(139,92,246,0.08)', color: C.gold, fontSize: 12, fontWeight: 700 }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Schedule — only for independiente */}
          {me.professionalType === 'independiente' && (
            <div style={{ padding: '20px 32px', borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Clock size={14} color={C.gold} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Mi horario disponible
                </span>
              </div>
              {schedule.length === 0 ? (
                <p style={{ fontSize: 13, color: C.textMuted, fontStyle: 'italic', margin: 0 }}>Sin horario registrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {DAY_ORDER
                    .map(dow => ({ dow, slots: schedule.filter(s => s.dayOfWeek === dow).sort((a, b) => a.startTime.localeCompare(b.startTime)) }))
                    .filter(({ slots }) => slots.length > 0)
                    .map(({ dow, slots }) => (
                      <div key={dow} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, background: 'rgba(139,92,246,0.08)', padding: '4px 12px', borderRadius: 8, minWidth: 90, textAlign: 'center', flexShrink: 0 }}>
                          {DAY_NAMES[dow]}
                        </span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {slots.map(s => (
                            <span key={s.id} style={{ fontSize: 13, fontWeight: 600, color: C.text, background: '#F5F3F1', border: `1px solid ${C.borderLight}`, padding: '4px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Clock size={11} color={C.textMuted} />
                              {s.startTime} – {s.endTime}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}

          {/* Info rows */}
          <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoRow icon={FileText} label="Biografía" value={me.bio} />
            <div style={{ height: 1, background: C.borderLight }} />
            <InfoRow icon={Phone} label="Teléfono" value={me.phone} />
            <div style={{ height: 1, background: C.borderLight }} />
            <InfoRow icon={AtSign} label="Instagram" value={me.instagramUrl} />
            <div style={{ height: 1, background: C.borderLight }} />
            <InfoRow icon={Mail} label="Correo electrónico" value={me.email} />
          </div>
        </div>

        {/* Note */}
        <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(139,92,246,0.04)', borderRadius: 12, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.6, fontFamily: FONT_INTER }}>
            Esta información solo puede ser modificada por el administrador del estudio.
          </p>
        </div>
      </div>
    </main>
  )
}
