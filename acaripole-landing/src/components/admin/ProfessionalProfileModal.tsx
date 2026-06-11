    import React, { useRef, useState } from 'react'
import {
  X, Edit2, Check, Phone, Mail, AtSign, Star,
  Calendar, ShieldCheck, AlertCircle, Trash2, Save, XCircle,
} from 'lucide-react'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6', goldPale: '#38BDF8',
  bg: '#FFFFFF', bgPanel: '#F3F0FB', bgSecondary: '#F3F0FB',
  white: '#FFFFFF', text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

const DISCIPLINES = [
  'Pole Exotic', 'Pole Sport', 'Flexibilidad',
  'Core y Fuerza', 'Flow Principiante', 'Coreografía Sensual',
]

const STATUS_OPTIONS = [
  { value: 'available',  label: 'Disponible',    color: '#22c55e' },
  { value: 'in_session', label: 'En Sesión',     color: '#f97316' },
  { value: 'offline',    label: 'No Disponible', color: '#94a3b8' },
] as const

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=600'

export interface Professional {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  bio?: string
  specialties: string[]
  instagramUrl?: string
  avatarUrl?: string
  status?: 'available' | 'in_session' | 'offline'
  isActive: boolean
  isVerified: boolean
  avgScore?: number
  totalReviews?: number
  createdAt: string
  role?: 'USER' | 'PROFESSIONAL' | 'ADMIN'
}

interface EditForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  bio: string
  specialties: string[]
  instagramUrl: string
  avatarUrl: string
  status: 'available' | 'in_session' | 'offline'
  isVerified: boolean
  isActive: boolean
  password: string
  confirmPassword: string
}

interface Props {
  pro: Professional
  onClose: () => void
  onUpdated: (updated: Professional) => void
  onDeleted: (id: string) => void
  initialMode?: 'view' | 'edit'
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoItem({ icon: Icon, label, value, link }: { icon: React.ElementType, label: string, value: string, link?: string }) {
  return (
    <div style={{ background: C.bgPanel, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <Icon size={13} color={C.gold} strokeWidth={2} />
        <span style={{ fontFamily: FONT_INTER, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>{label}</span>
      </div>
      {link
        ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_INTER, fontSize: 13, color: C.gold, textDecoration: 'none', wordBreak: 'break-all' as const }}>{value}</a>
        : <p style={{ fontFamily: FONT_INTER, fontSize: 13, color: C.textBrown, margin: 0, wordBreak: 'break-all' as const }}>{value}</p>
      }
    </div>
  )
}

function ToggleBtn({ on, onChange, labelOn, labelOff }: { on: boolean, onChange: (v: boolean) => void, labelOn: string, labelOff: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: '100%', padding: '11px 14px',
        background: on ? 'rgba(139,92,246,0.09)' : C.bgPanel,
        border: `1.5px solid ${on ? C.gold : C.border}`,
        borderRadius: 10, cursor: 'pointer',
        fontFamily: FONT_INTER, fontSize: 13, fontWeight: 600,
        color: on ? C.gold : C.textMedium,
        display: 'flex', alignItems: 'center', gap: 7,
        transition: 'all 0.15s ease',
      }}
    >
      {on
        ? <Check size={14} color={C.gold} strokeWidth={2.5} />
        : <XCircle size={14} color={C.textMuted} strokeWidth={2} />
      }
      {on ? labelOn : labelOff}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfessionalProfileModal({ pro, onClose, onUpdated, onDeleted, initialMode = 'view' }: Props) {
  const [mode, setMode]               = useState<'view' | 'edit'>(initialMode)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const specialties = Array.isArray(pro.specialties) ? pro.specialties : []
  const isProfessional = pro.role === 'PROFESSIONAL'

  const [form, setForm] = useState<EditForm>({
    firstName:   pro.firstName,
    lastName:    pro.lastName,
    email:       pro.email,
    phone:       pro.phone ?? '',
    bio:         pro.bio ?? '',
    specialties: [...specialties],
    instagramUrl: pro.instagramUrl ?? '',
    avatarUrl:   pro.avatarUrl ?? '',
    status:      pro.status ?? 'offline',
    isVerified:  pro.isVerified,
    isActive:    pro.isActive,
    password:    '',
    confirmPassword: '',
  })

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const clearErr = (k: string) =>
    setErrors(e => { const n = { ...e }; delete n[k]; return n })

  const handleAvatarFile = (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors(e => ({ ...e, avatarUrl: 'Selecciona una imagen válida' }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      set('avatarUrl', result)
      clearErr('avatarUrl')
    }
    reader.onerror = () => {
      setErrors(e => ({ ...e, avatarUrl: 'No se pudo leer la imagen' }))
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Requerido'
    if (!form.lastName.trim())  e.lastName  = 'Requerido'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (form.password || form.confirmPassword) {
      if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
      if (form.password !== form.confirmPassword) e.confirmPassword = 'No coinciden'
    }
    return e
  }

  const save = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    setError(null)
    try {
      const { password, confirmPassword, ...restForm } = form
      const basePayload = {
        email:        restForm.email.toLowerCase().trim(),
        firstName:    restForm.firstName.trim(),
        lastName:     restForm.lastName.trim(),
        phone:        restForm.phone.trim()        || undefined,
        bio:          restForm.bio.trim()          || undefined,
        instagramUrl: restForm.instagramUrl.trim() || undefined,
        avatarUrl:    restForm.avatarUrl.trim()    || undefined,
        isVerified:   restForm.isVerified,
        isActive:     restForm.isActive,
        password:     password ? password : undefined,
      }

      const res = await fetch(isProfessional ? `/api/professionals/${pro.id}` : `/api/users/${pro.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(isProfessional ? {
          ...basePayload,
          specialties: form.specialties.length ? form.specialties : undefined,
        } : basePayload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar cambios')

      if (isProfessional && form.status !== pro.status) {
        const statusRes = await fetch(`/api/professionals/${pro.id}/status`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ status: form.status }),
        })
        if (!statusRes.ok) {
          const sd = await statusRes.json()
          throw new Error(sd.error ?? 'Error al actualizar estado')
        }
      }

      const updated: Professional = {
        ...pro,
        ...restForm,
        phone:        restForm.phone.trim()        || undefined,
        bio:          restForm.bio.trim()          || undefined,
        instagramUrl: restForm.instagramUrl.trim() || undefined,
        avatarUrl:    restForm.avatarUrl.trim()    || undefined,
      }
      onUpdated(updated)
      setMode('view')
      setForm(f => ({ ...f, password: '', confirmPassword: '' }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteProf = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = isProfessional ? `/api/professionals/${pro.id}` : `/api/users/${pro.id}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error al eliminar')
      }
      onDeleted(pro.id)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const cancelEdit = () => { setMode('view'); setErrors({}); setError(null) }

  const img         = form.avatarUrl || pro.avatarUrl || PLACEHOLDER_IMG
  const name        = `${pro.firstName} ${pro.lastName}`
  const statusInfo  = isProfessional ? (STATUS_OPTIONS.find(s => s.value === pro.status) ?? STATUS_OPTIONS[2]) : null
  const joinedDate  = new Date(pro.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Style helpers ──────────────────────────────────────────────────────────
  const INPUT = (err?: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: '#FAFAF9', border: `1.5px solid ${err ? '#ef4444' : C.border}`,
    borderRadius: 10, padding: '11px 14px',
    fontFamily: FONT_INTER, fontSize: 14, color: C.text, outline: 'none',
    transition: 'border-color 0.2s ease',
  })
  const LABEL: React.CSSProperties = {
    fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown,
    letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }
  const ERR: React.CSSProperties = { fontFamily: FONT_INTER, fontSize: 11, color: '#ef4444', marginTop: 5 }

  return (
    <>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,6,0.55)', backdropFilter: 'blur(5px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      >
        {/* Card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: C.white, borderRadius: 22, width: '100%', maxWidth: 600, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.28)', animation: 'modalIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}
        >

          {/* ══════════════════════════════════════════ VIEW MODE ══ */}
          {mode === 'view' && (
            <>
              {/* Hero */}
              <div style={{ position: 'relative', height: 230, flexShrink: 0, overflow: 'hidden' }}>
                <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,8,6,0.88) 0%, rgba(10,8,6,0.18) 55%, transparent 100%)' }} />

                {/* Status badge */}
                {isProfessional && statusInfo && (
                  <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 9999, padding: '6px 13px' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusInfo.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.white }}>{statusInfo.label}</span>
                  </div>
                )}

                {/* Edit button */}
                <button
                  onClick={() => setMode('edit')}
                  style={{ position: 'absolute', top: 14, right: 54, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.white }}
                >
                  <Edit2 size={12} strokeWidth={2.5} /> Editar
                </button>

                {/* Close */}
                <button
                  onClick={onClose}
                  style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 9, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white }}
                >
                  <X size={15} />
                </button>

                {/* Name */}
                <div style={{ position: 'absolute', bottom: 18, left: 24, right: 24 }}>
                  <h2 style={{ fontFamily: FONT_BODONI, fontSize: 30, fontWeight: 700, color: C.white, margin: '0 0 5px', lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {pro.isVerified && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ShieldCheck size={13} color={C.goldPale} />
                        <span style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.goldPale, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Verificada</span>
                      </div>
                    )}
                    {!pro.isActive && (
                      <span style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: '#fca5a5', letterSpacing: '0.1em', textTransform: 'uppercase' }}>· Inactiva</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>

                {/* Rating */}
                {isProfessional && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={16} color={C.gold} fill={n <= Math.round(pro.avgScore ?? 0) ? C.gold : 'none'} strokeWidth={1.5} />
                      ))}
                      <span style={{ fontFamily: FONT_INTER, fontSize: 14, color: C.textBrown, marginLeft: 6, fontWeight: 600 }}>
                        {(pro.avgScore ?? 0) > 0 ? (pro.avgScore ?? 0).toFixed(1) : '—'}
                      </span>
                      <span style={{ fontFamily: FONT_INTER, fontSize: 12, color: C.textMuted }}>({pro.totalReviews ?? 0} reseñas)</span>
                    </div>
                  </div>
                )}

                {/* Specialties */}
                {isProfessional && specialties.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
                    {specialties.map(tag => (
                      <span key={tag} style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.gold, background: 'rgba(139,92,246,0.09)', border: `1px solid rgba(139,92,246,0.22)`, padding: '5px 14px', borderRadius: 9999, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bio */}
                {pro.bio && (
                  <div style={{ background: C.bgPanel, borderRadius: 12, padding: '16px 18px', marginBottom: 18, borderLeft: `3px solid ${C.goldLight}` }}>
                    <p style={{ fontFamily: FONT_INTER, fontSize: 13, color: C.textBrown, lineHeight: 1.75, margin: 0 }}>{pro.bio}</p>
                  </div>
                )}

                {/* Contact grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                  <InfoItem icon={Mail}     label="Correo"        value={pro.email} />
                  <InfoItem icon={Phone}    label="Teléfono"      value={pro.phone ?? 'No registrado'} />
                  <InfoItem icon={AtSign}   label="Instagram"     value={pro.instagramUrl ?? 'No registrado'} link={pro.instagramUrl} />
                  <InfoItem icon={Calendar} label="Miembro desde" value={joinedDate} />
                </div>

                {/* Account badges */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9999, background: pro.isVerified ? 'rgba(139,92,246,0.08)' : C.bgSecondary, border: `1px solid ${pro.isVerified ? 'rgba(139,92,246,0.25)' : C.border}` }}>
                    <ShieldCheck size={13} color={pro.isVerified ? C.gold : C.textMuted} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: pro.isVerified ? C.gold : C.textMuted }}>{pro.isVerified ? 'Certificada' : 'Sin certificar'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9999, background: pro.isActive ? 'rgba(34,197,94,0.08)' : '#FFF0F0', border: `1px solid ${pro.isActive ? 'rgba(34,197,94,0.30)' : '#FFCDD2'}` }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: pro.isActive ? '#22c55e' : '#ef4444' }} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: pro.isActive ? '#16a34a' : '#D32F2F' }}>{pro.isActive ? 'Activa' : 'Inactiva'}</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div style={{ marginTop: 16, background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', fontFamily: FONT_INTER, fontSize: 13, color: '#D32F2F', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} /> {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 24px 22px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 12 }}>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'transparent', border: '1.5px solid #FFCDD2', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: '#D32F2F', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12, color: '#D32F2F', fontWeight: 600 }}>¿Confirmar eliminación?</span>
                    <button onClick={deleteProf} disabled={loading} style={{ padding: '8px 14px', background: '#D32F2F', color: C.white, border: 'none', borderRadius: 7, fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {loading ? '...' : 'Sí, eliminar'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} style={{ padding: '8px 12px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 7, fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, cursor: 'pointer' }}>
                      No
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setMode('edit')}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 4px 14px rgba(139,92,246,0.30)` }}
                >
                  <Edit2 size={14} strokeWidth={2.5} /> Editar Perfil
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════ EDIT MODE ══ */}
          {mode === 'edit' && (
            <>
              {/* Header */}
              <div style={{ padding: '22px 26px 18px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 4px' }}>Editando Perfil</p>
                  <h2 style={{ fontFamily: FONT_BODONI, fontSize: 21, fontWeight: 600, color: C.text, margin: 0 }}>{name}</h2>
                </div>
                <button onClick={cancelEdit} style={{ width: 33, height: 33, borderRadius: 9, background: C.bgSecondary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium }}>
                  <X size={15} />
                </button>
              </div>

              {/* Form */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Names */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={LABEL}>Nombres <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text" value={form.firstName}
                        onChange={e => { set('firstName', e.target.value); clearErr('firstName') }}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = errors.firstName ? '#ef4444' : C.border)}
                        style={INPUT(errors.firstName)}
                      />
                      {errors.firstName && <p style={ERR}>{errors.firstName}</p>}
                    </div>
                    <div>
                      <label style={LABEL}>Apellidos <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text" value={form.lastName}
                        onChange={e => { set('lastName', e.target.value); clearErr('lastName') }}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = errors.lastName ? '#ef4444' : C.border)}
                        style={INPUT(errors.lastName)}
                      />
                      {errors.lastName && <p style={ERR}>{errors.lastName}</p>}
                    </div>
                  </div>

                  {/* Avatar */}
                  <div>
                    <label style={LABEL}>Imagen de perfil</label>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ width: 74, height: 74, borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${C.border}`, background: C.bgPanel, flexShrink: 0 }}>
                        <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220, flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ padding: '9px 14px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                          >
                            Subir imagen
                          </button>
                          <button
                            type="button"
                            onClick={() => { set('avatarUrl', ''); clearErr('avatarUrl') }}
                            style={{ padding: '9px 14px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                          >
                            Quitar foto
                          </button>
                        </div>
                        <p style={{ fontFamily: FONT_INTER, fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
                          PNG, JPG o WEBP. Se guarda directamente en el perfil.
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            handleAvatarFile(e.target.files?.[0])
                            e.currentTarget.value = ''
                          }}
                          style={{ display: 'none' }}
                        />
                      </div>
                    </div>
                    {errors.avatarUrl && <p style={ERR}>{errors.avatarUrl}</p>}
                  </div>

                  {/* Email + Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={LABEL}>Correo <span style={{ color: '#ef4444' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          type="email" value={form.email}
                          onChange={e => { set('email', e.target.value); clearErr('email') }}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = errors.email ? '#ef4444' : C.border)}
                          style={{ ...INPUT(errors.email), paddingLeft: 36 }}
                        />
                      </div>
                      {errors.email && <p style={ERR}>{errors.email}</p>}
                    </div>
                    <div>
                      <label style={LABEL}>Teléfono</label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          type="tel" value={form.phone}
                          onChange={e => set('phone', e.target.value)}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = C.border)}
                          style={{ ...INPUT(), paddingLeft: 36 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label style={LABEL}>Biografía</label>
                    <textarea
                      value={form.bio} rows={3}
                      placeholder="Describe su experiencia y estilo de enseñanza..."
                      onChange={e => set('bio', e.target.value)}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = C.border)}
                      style={{ ...INPUT(), resize: 'none', lineHeight: 1.65 }}
                    />
                  </div>

                  {/* Specialties */}
                  {isProfessional && (
                    <div>
                      <label style={LABEL}>Especialidades</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {DISCIPLINES.map(d => {
                          const on = form.specialties.includes(d)
                          return (
                            <button
                              key={d}
                              onClick={() => setForm(f => ({ ...f, specialties: on ? f.specialties.filter(x => x !== d) : [...f.specialties, d] }))}
                              style={{ padding: '7px 14px', borderRadius: 9999, border: `1.5px solid ${on ? C.gold : C.border}`, background: on ? 'rgba(139,92,246,0.09)' : 'transparent', fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, color: on ? C.gold : C.textBrown, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                              {on && <Check size={11} strokeWidth={3} />}
                              {d}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Instagram */}
                  <div>
                    <label style={LABEL}>Instagram</label>
                    <div style={{ position: 'relative' }}>
                      <AtSign size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type="text" value={form.instagramUrl} placeholder="https://instagram.com/usuario"
                        onChange={e => set('instagramUrl', e.target.value)}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = C.border)}
                        style={{ ...INPUT(), paddingLeft: 36 }}
                      />
                    </div>
                  </div>

                  {/* Status + Toggles */}
                  <div style={{ display: 'grid', gridTemplateColumns: isProfessional ? '1fr 1fr 1fr' : '1fr 1fr', gap: 14 }}>
                    {isProfessional && (
                      <div>
                        <label style={LABEL}>Estado</label>
                        <select
                          value={form.status}
                          onChange={e => set('status', e.target.value as EditForm['status'])}
                          onFocus={e => (e.target.style.borderColor = C.gold)}
                          onBlur={e => (e.target.style.borderColor = C.border)}
                          style={{
                            ...INPUT(), cursor: 'pointer', appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
                          }}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label style={LABEL}>Verificada</label>
                      <ToggleBtn on={form.isVerified} onChange={v => set('isVerified', v)} labelOn="Sí" labelOff="No" />
                    </div>
                    <div>
                      <label style={LABEL}>Activa</label>
                      <ToggleBtn on={form.isActive} onChange={v => set('isActive', v)} labelOn="Sí" labelOff="No" />
                    </div>
                  </div>

                  {/* Password */}
                  {!isProfessional && (
                    <div>
                      <label style={LABEL}>Cambiar contraseña</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <input
                            type="password"
                            value={form.password}
                            placeholder="Nueva contraseña"
                            onChange={e => { set('password', e.target.value); clearErr('password') }}
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = errors.password ? '#ef4444' : C.border)}
                            style={INPUT(errors.password)}
                            autoComplete="new-password"
                          />
                          {errors.password && <p style={ERR}>{errors.password}</p>}
                        </div>
                        <div>
                          <input
                            type="password"
                            value={form.confirmPassword}
                            placeholder="Confirmar contraseña"
                            onChange={e => { set('confirmPassword', e.target.value); clearErr('confirmPassword') }}
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : C.border)}
                            style={INPUT(errors.confirmPassword)}
                            autoComplete="new-password"
                          />
                          {errors.confirmPassword && <p style={ERR}>{errors.confirmPassword}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', fontFamily: FONT_INTER, fontSize: 13, color: '#D32F2F', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={15} /> {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 26px 22px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <button
                  onClick={cancelEdit}
                  style={{ padding: '11px 18px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={save} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', background: loading ? C.border : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 4px 14px rgba(139,92,246,0.30)`, transition: 'all 0.2s ease', minWidth: 170 }}
                >
                  {loading
                    ? <><span style={{ width: 14, height: 14, border: `2px solid rgba(255,255,255,0.4)`, borderTopColor: C.white, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Guardando...</>
                    : <><Save size={14} strokeWidth={2.5} /> Guardar Cambios</>
                  }
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
