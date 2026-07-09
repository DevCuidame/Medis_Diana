import React, { useState } from 'react'
import { Building2, X, ChevronRight, ChevronLeft, Check, Eye, EyeOff,
  Mail, Phone, Lock, AtSign, Shield, Clock, Plus, Trash2, MapPin, } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Design tokens (same as AdminProfessionals) ───────────────────────────────
const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bg: '#FFFFFF', bgPanel: '#F3F0FB', bgSecondary: '#F3F0FB',
  white: '#FFFFFF', text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

const STEPS = [
  { n: 1, label: 'Identidad' },
  { n: 2, label: 'Contacto' },
  { n: 3, label: 'Perfil' },
  { n: 4, label: 'Acceso' },
]

const STEP_TITLES: Record<number, string> = {
  1: 'Datos de Identidad',
  2: 'Contacto & Foto',
  3: 'Perfil Opcional',
  4: 'Acceso al Sistema',
}

const DISCIPLINES = [
  'Medicina General', 'Pediatría', 'Medicina Familiar',
  'Ginecología y Obstetricia', 'Medicina Interna', 'Nutrición y Dietética',
]

const DIAS = [
  { code: 1, label: 'L', name: 'Lunes' },
  { code: 2, label: 'M', name: 'Martes' },
  { code: 3, label: 'X', name: 'Miércoles' },
  { code: 4, label: 'J', name: 'Jueves' },
  { code: 5, label: 'V', name: 'Viernes' },
  { code: 6, label: 'S', name: 'Sábado' },
  { code: 0, label: 'D', name: 'Domingo' },
]

interface ScheduleSlot { dayOfWeek: number; startTime: string; endTime: string }

const ID_TYPES = [
  'Cédula de Ciudadanía',
  'Cédula de Extranjería',
  'Pasaporte',
  'RUC',
]

const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600'

type AccountRole = 'USER' | 'PROFESSIONAL' | 'ADMIN'

interface FormData {
  firstName: string; lastName: string; idType: string; idNumber: string
  middleName: string; secondLastName: string
  email: string; phone: string; personalAddress: string
  specialties: string[]; bio: string; instagramUrl: string
  medicalRegistrationNumber: string; sisproUsername: string; sisproPassword: string
  password: string; confirmPassword: string
}

interface Props {
  onClose: () => void
  onSuccess: (pro: any) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']
  return { score, label: labels[score] ?? '', color: colors[score] ?? C.border }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CreateProfessionalModal({ onClose, onSuccess }: Props) {
  const [step, setStep]                   = useState(1)
  const [errors, setErrors]               = useState<Record<string, string>>({})
  const [role, setRole]                   = useState<AccountRole>('PROFESSIONAL')
  const [professionalType, setProfType]   = useState<'dependiente' | 'independiente'>('dependiente')
  const [schedule, setSchedule]           = useState<ScheduleSlot[]>([])
  const [newSlotDay, setNewSlotDay]       = useState<number>(1)
  const [newSlotStart, setNewSlotStart]   = useState('')
  const [newSlotEnd, setNewSlotEnd]       = useState('')
  const [showPass, setShowPass]           = useState(false)
  const [showConf, setShowConf]           = useState(false)
  const [showSisproPass, setShowSisproPass] = useState(false)
  const [loading, setLoading]             = useState(false)
  const [showAddSpecialty, setShowAddSpecialty] = useState(false)
  const [newSpecialtyText, setNewSpecialtyText] = useState('')
  const [customSpecialties, setCustomSpecialties] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('MEDIS_custom_specialties') || '[]') }
    catch { return [] }
  })
  const [hiddenSpecialties, setHiddenSpecialties] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('MEDIS_hidden_specialties') || '[]') }
    catch { return [] }
  })

  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', idType: ID_TYPES[0], idNumber: '',
    middleName: '', secondLastName: '',
    email: '', phone: '', personalAddress: '',
    specialties: [], bio: '', instagramUrl: '',
    medicalRegistrationNumber: '', sisproUsername: '', sisproPassword: '',
    password: '', confirmPassword: '',
  })

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const clearErr = (k: string) =>
    setErrors(e => { const n = { ...e }; delete n[k]; return n })

  const saveCustomSpecialties = (updated: string[]) => {
    setCustomSpecialties(updated)
    localStorage.setItem('MEDIS_custom_specialties', JSON.stringify(updated))
  }

  const saveHiddenSpecialties = (updated: string[]) => {
    setHiddenSpecialties(updated)
    localStorage.setItem('MEDIS_hidden_specialties', JSON.stringify(updated))
  }

  const handleAddSpecialty = () => {
    const trimmed = newSpecialtyText.trim()
    if (!trimmed) return
    if (!customSpecialties.includes(trimmed) && !DISCIPLINES.includes(trimmed)) {
      saveCustomSpecialties([...customSpecialties, trimmed])
    }
    if (!form.specialties.includes(trimmed)) {
      setForm(f => ({ ...f, specialties: [...f.specialties, trimmed] }))
      clearErr('specialties')
    }
    setShowAddSpecialty(false)
    setNewSpecialtyText('')
  }

  const handleDeleteSpecialty = (specialty: string) => {
    if (DISCIPLINES.includes(specialty)) {
      saveHiddenSpecialties([...hiddenSpecialties, specialty])
    } else {
      saveCustomSpecialties(customSpecialties.filter(s => s !== specialty))
    }
    if (form.specialties.includes(specialty)) {
      setForm(f => ({ ...f, specialties: f.specialties.filter(x => x !== specialty) }))
    }
  }

  const visibleSteps = role === 'PROFESSIONAL' ? STEPS : STEPS.filter(s => s.n !== 3)
  const currentStepIndex = Math.max(0, visibleSteps.findIndex(s => s.n === step))

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (!form.firstName.trim())  e.firstName = 'Requerido'
      if (!form.lastName.trim())   e.lastName  = 'Requerido'
      if (!form.idNumber.trim())   e.idNumber  = 'Requerido'
    }
    if (s === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
      if (!form.phone.trim())  e.phone = 'Requerido'
      if (!form.personalAddress.trim()) e.personalAddress = 'Requerido'
    }
    if (s === 3) {
      if (role === 'PROFESSIONAL' && form.specialties.length === 0) e.specialties = 'Selecciona al menos una'
      if (role === 'PROFESSIONAL' && !form.medicalRegistrationNumber.trim()) e.medicalRegistrationNumber = 'Requerido'
      if (role === 'PROFESSIONAL' && !form.sisproUsername.trim()) e.sisproUsername = 'Requerido'
      if (role === 'PROFESSIONAL' && !form.sisproPassword.trim()) e.sisproPassword = 'Requerido'
    }
    if (s === 4) {
      if (form.password.length < 8)              e.password     = 'Mínimo 8 caracteres'
      if (form.password !== form.confirmPassword) e.confirmPassword = 'No coinciden'
    }
    return e
  }

  const next = () => {
    const e = validate(step)
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    const nextStep = visibleSteps[currentStepIndex + 1]?.n
    if (nextStep) setStep(nextStep)
  }
  const back = () => {
    setErrors({})
    const previousStep = visibleSteps[currentStepIndex - 1]?.n
    if (previousStep) setStep(previousStep)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submit = async () => {
    const e = validate(4)
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/professionals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email:            form.email.toLowerCase().trim(),
          password:         form.password,
          role,
          firstName:        form.firstName.trim(),
          lastName:         form.lastName.trim(),
          idType:           form.idType,
          idNumber:         form.idNumber.trim(),
          middleName:       form.middleName.trim()     || undefined,
          secondLastName:   form.secondLastName.trim() || undefined,
          phone:            form.phone.trim()        || undefined,
          personalAddress:  form.personalAddress.trim(),
          avatarUrl:        DEFAULT_AVATAR_URL,
          bio:              form.bio.trim()          || undefined,
          specialties:      form.specialties.length ? form.specialties : undefined,
          instagramUrl:     form.instagramUrl.trim() || undefined,
          professionalType: role === 'PROFESSIONAL' ? professionalType : undefined,
          medicalRegistrationNumber: role === 'PROFESSIONAL' ? form.medicalRegistrationNumber.trim() : undefined,
          sisproUsername:            role === 'PROFESSIONAL' ? form.sisproUsername.trim()            : undefined,
          sisproPassword:            role === 'PROFESSIONAL' ? form.sisproPassword                    : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear usuario')
      // If independiente with schedule slots, save them
      if (role === 'PROFESSIONAL' && professionalType === 'independiente' && schedule.length > 0) {
        const newId = data.data.professional?.id
        if (newId) {
          const schedToken = localStorage.getItem('accessToken')
          await fetch(`/api/professionals/${newId}/schedule`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...(schedToken ? { Authorization: `Bearer ${schedToken}` } : {}) },
            body: JSON.stringify({ slots: schedule }),
          })
        }
      }
      onSuccess(data.data.professional)
    } catch (err: any) {
      setErrors({ submit: err.message })
    } finally {
      setLoading(false)
    }
  }

  // ── Style helpers ───────────────────────────────────────────────────────────
  const INPUT = (err?: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: '#FAFAF9', border: `1.5px solid ${err ? '#ef4444' : C.border}`,
    borderRadius: 10, padding: '12px 14px',
    fontFamily: FONT_INTER, fontSize: 14, color: C.text, outline: 'none',
    transition: 'border-color 0.2s ease',
  })
  const LABEL: React.CSSProperties = {
    fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown,
    letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }
  const ERR: React.CSSProperties = {
    fontFamily: FONT_INTER, fontSize: 11, color: '#ef4444', marginTop: 5,
  }

  const strength = passwordStrength(form.password)

  return (
    <>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes stepIn  { from { opacity:0; transform:translateX(14px); } to { opacity:1; transform:translateX(0); } }
        .sp-step { animation: stepIn 0.22s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,6,0.55)', backdropFilter: 'blur(5px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      >
        {/* Card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: C.white, borderRadius: 22, width: '100%', maxWidth: 548, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.28)', animation: 'modalIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}
        >

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div style={{ padding: '22px 26px 18px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 4px' }}>Nueva Cuenta</p>
              <h2 style={{ fontFamily: FONT_BODONI, fontSize: 21, fontWeight: 600, color: C.text, margin: 0 }}>
                {STEP_TITLES[step]}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{ width: 33, height: 33, borderRadius: 9, background: C.bgSecondary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium }}
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Step indicator ─────────────────────────────────────────── */}
          <div style={{ padding: '14px 26px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {visibleSteps.map((s, i) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step > s.n ? C.gold : step === s.n ? C.gold : 'transparent',
                    border: `2px solid ${step >= s.n ? C.gold : C.border}`,
                    transition: 'all 0.25s ease',
                  }}>
                    {step > s.n
                      ? <Check size={12} color={C.white} strokeWidth={3} />
                      : <span style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: step === s.n ? C.white : C.textMuted }}>{s.n}</span>
                    }
                  </div>
                  <span style={{ fontFamily: FONT_INTER, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: step >= s.n ? C.gold : C.textMuted, transition: 'color 0.25s ease', whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {i < visibleSteps.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: step > s.n ? C.gold : C.borderLight, margin: '0 6px 16px', transition: 'background 0.3s ease' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Content ────────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '26px 26px 18px' }}>

            {/* PASO 1 — Identidad */}
            {step === 1 && (
              <div className="sp-step" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Primer Nombre */}
                  <div>
                    <label style={LABEL}>Primer Nombre <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text" value={form.firstName} placeholder="María"
                      onChange={e => { set('firstName', e.target.value); clearErr('firstName') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.firstName ? '#ef4444' : C.border)}
                      style={INPUT(errors.firstName)}
                    />
                    {errors.firstName && <p style={ERR}>{errors.firstName}</p>}
                  </div>
                  {/* Segundo Nombre */}
                  <div>
                    <label style={LABEL}>Segundo Nombre</label>
                    <input
                      type="text" value={form.middleName} placeholder="Fernanda"
                      onChange={e => set('middleName', e.target.value)}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = C.border)}
                      style={INPUT()}
                    />
                  </div>
                  {/* Primer Apellido */}
                  <div>
                    <label style={LABEL}>Primer Apellido <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text" value={form.lastName} placeholder="González"
                      onChange={e => { set('lastName', e.target.value); clearErr('lastName') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.lastName ? '#ef4444' : C.border)}
                      style={INPUT(errors.lastName)}
                    />
                    {errors.lastName && <p style={ERR}>{errors.lastName}</p>}
                  </div>
                  {/* Segundo Apellido */}
                  <div>
                    <label style={LABEL}>Segundo Apellido</label>
                    <input
                      type="text" value={form.secondLastName} placeholder="Ramírez"
                      onChange={e => set('secondLastName', e.target.value)}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = C.border)}
                      style={INPUT()}
                    />
                  </div>
                </div>

                <div>
                  <label style={LABEL}>Tipo de cuenta <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    value={role}
                    onChange={e => { setRole(e.target.value as AccountRole); setProfType('dependiente') }}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={{ ...INPUT(), cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}
                  >
                    <option value="PROFESSIONAL">Profesional</option>
                    <option value="USER">Usuario normal</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                {/* Professional type — only for PROFESSIONAL role */}
                {role === 'PROFESSIONAL' && (
                  <div>
                    <label style={LABEL}>Tipo de vinculación</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {(['dependiente', 'independiente'] as const).map(t => (
                        <button
                          key={t} type="button"
                          onClick={() => { setProfType(t); if (t === 'dependiente') setSchedule([]) }}
                          style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `2px solid ${professionalType === t ? C.gold : C.border}`, background: professionalType === t ? 'rgba(139,92,246,0.07)' : 'transparent', color: professionalType === t ? C.gold : C.textBrown, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.18s', fontFamily: FONT_INTER }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
                            {t === 'dependiente' ? '🏢 Dependiente' : '🕒 Independiente'}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 500, color: professionalType === t ? C.gold : C.textMuted, lineHeight: 1.4 }}>
                            {t === 'dependiente'
                              ? 'Disponible cualquier día/hora'
                              : 'Solo en su horario registrado'}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Horario — solo se despliega si es independiente */}
                    <AnimatePresence>
                      {professionalType === 'independiente' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <Clock size={14} color={C.gold} />
                              <label style={{ ...LABEL, margin: 0 }}>Horario disponible</label>
                              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>(el profesional solo puede ser asignado en estos bloques)</span>
                            </div>

                            {/* Add slot form */}
                            <div style={{ background: 'rgba(139,92,246,0.04)', border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: '14px', marginBottom: 12 }}>
                              {/* Day chips */}
                              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                                {DIAS.map(d => (
                                  <button key={d.code} type="button" title={d.name}
                                    onClick={() => setNewSlotDay(d.code)}
                                    style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${newSlotDay === d.code ? C.gold : C.border}`, background: newSlotDay === d.code ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : 'transparent', color: newSlotDay === d.code ? '#fff' : C.textMuted, fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontFamily: FONT_INTER }}>
                                    {d.label}
                                  </button>
                                ))}
                              </div>
                              {/* Time range */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                                <input type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)}
                                  style={{ ...INPUT(), padding: '10px 12px' }}
                                  onFocus={e => (e.target.style.borderColor = C.gold)}
                                  onBlur={e => (e.target.style.borderColor = C.border)}
                                />
                                <input type="time" value={newSlotEnd} onChange={e => setNewSlotEnd(e.target.value)}
                                  style={{ ...INPUT(), padding: '10px 12px' }}
                                  onFocus={e => (e.target.style.borderColor = C.gold)}
                                  onBlur={e => (e.target.style.borderColor = C.border)}
                                />
                                <button type="button"
                                  onClick={() => {
                                    if (!newSlotStart || !newSlotEnd || newSlotEnd <= newSlotStart) return
                                    setSchedule(s => [...s, { dayOfWeek: newSlotDay, startTime: newSlotStart, endTime: newSlotEnd }])
                                    setNewSlotStart(''); setNewSlotEnd('')
                                  }}
                                  style={{ padding: '10px 14px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT_INTER, whiteSpace: 'nowrap' }}>
                                  <Plus size={13} strokeWidth={3} /> Agregar
                                </button>
                              </div>
                            </div>

                            {/* Slot list */}
                            {schedule.length === 0 ? (
                              <p style={{ fontSize: 12, color: C.textMuted, fontStyle: 'italic', margin: 0 }}>Sin horarios registrados. Agrega al menos un bloque.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {schedule
                                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                                  .map((s, i) => {
                                    const day = DIAS.find(d => d.code === s.dayOfWeek)
                                    return (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 9, padding: '8px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{ fontSize: 11, fontWeight: 800, color: C.gold, background: 'rgba(139,92,246,0.08)', padding: '3px 8px', borderRadius: 6 }}>{day?.name}</span>
                                          <Clock size={12} color={C.textMuted} />
                                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.startTime} – {s.endTime}</span>
                                        </div>
                                        <button type="button" onClick={() => setSchedule(sc => sc.filter((_, j) => j !== i))}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    )
                                  })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Tipo ID */}
                <div>
                  <label style={LABEL}>Tipo de Identificación</label>
                  <select
                    value={form.idType}
                    onChange={e => set('idType', e.target.value)}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={{
                      ...INPUT(), cursor: 'pointer', appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
                    }}
                  >
                    {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Número ID */}
                <div>
                  <label style={LABEL}>Número de Identificación <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text" value={form.idNumber} placeholder="1720456789"
                    onChange={e => { set('idNumber', e.target.value.replace(/\D/g, '')); clearErr('idNumber') }}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = errors.idNumber ? '#ef4444' : C.border)}
                    style={INPUT(errors.idNumber)}
                  />
                  {errors.idNumber && <p style={ERR}>{errors.idNumber}</p>}
                </div>
              </div>
            )}

            {/* PASO 2 — Contacto */}
            {step === 2 && (
              <div className="sp-step" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Email */}
                <div>
                  <label style={LABEL}>Correo Electrónico <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="email" value={form.email} placeholder="maria@MEDIS.com"
                      onChange={e => { set('email', e.target.value); clearErr('email') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.email ? '#ef4444' : C.border)}
                      style={{ ...INPUT(errors.email), paddingLeft: 36 }}
                    />
                  </div>
                  {errors.email && <p style={ERR}>{errors.email}</p>}
                </div>

                {/* Teléfono */}
                <div>
                  <label style={LABEL}>Número de Teléfono <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="tel" value={form.phone} placeholder="+593 99 999 9999"
                      onChange={e => { set('phone', e.target.value); clearErr('phone') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.phone ? '#ef4444' : C.border)}
                      style={{ ...INPUT(errors.phone), paddingLeft: 36 }}
                    />
                  </div>
                  {errors.phone && <p style={ERR}>{errors.phone}</p>}
                </div>

                {/* Dirección Personal */}
                <div>
                  <label style={LABEL}>Dirección Personal <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="text" value={form.personalAddress} placeholder="Calle 123 #45-67, Bogotá"
                      onChange={e => { set('personalAddress', e.target.value); clearErr('personalAddress') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.personalAddress ? '#ef4444' : C.border)}
                      style={{ ...INPUT(errors.personalAddress), paddingLeft: 36 }}
                    />
                  </div>
                  {errors.personalAddress && <p style={ERR}>{errors.personalAddress}</p>}
                </div>

                {/* Foto */}
                <div>
                  <label style={LABEL}>Foto de Perfil</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px', background: C.bgPanel, border: `1.5px solid ${C.borderLight}`, borderRadius: 12 }}>
                    <img src={DEFAULT_AVATAR_URL} alt="avatar por defecto" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: `2px solid ${C.goldLight}` }} />
                    <div style={{ fontFamily: FONT_INTER, fontSize: 12, color: C.textBrown, lineHeight: 1.6 }}>
                      La cuenta se crea con una imagen por defecto.
                      <br />
                      La foto personalizada se puede editar después.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3 — Perfil Profesional */}
            {step === 3 && role === 'PROFESSIONAL' && (
              <div className="sp-step" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '12px 14px', border: `1px solid ${C.borderLight}`, background: C.bgPanel, borderRadius: 12, color: C.textBrown, fontFamily: FONT_INTER, fontSize: 12, lineHeight: 1.6 }}>
                  Completa la información profesional y selecciona al menos una especialidad.
                </div>

                {/* Especialidades */}
                <div>
                  <label style={LABEL}>Especialidades <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {[...DISCIPLINES.filter(d => !hiddenSpecialties.includes(d)), ...customSpecialties].map(d => {
                      const on = form.specialties.includes(d)
                      return (
                        <div
                          key={d}
                          onClick={() => {
                            setForm(f => ({ ...f, specialties: on ? f.specialties.filter(x => x !== d) : [...f.specialties, d] }))
                            clearErr('specialties')
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 8px 8px 16px', borderRadius: 9999, border: `1.5px solid ${on ? C.gold : C.border}`, background: on ? 'rgba(139,92,246,0.09)' : 'transparent', fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, color: on ? C.gold : C.textBrown, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s ease' }}
                        >
                          {on && <Check size={11} strokeWidth={3} />}
                          {d}
                          <button type="button"
                            onClick={e => { e.stopPropagation(); handleDeleteSpecialty(d) }}
                            title="Eliminar especialidad"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', border: 'none', background: on ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.06)', color: on ? C.gold : C.textMuted, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                            <X size={10} />
                          </button>
                        </div>
                      )
                    })}
                    {!showAddSpecialty && (
                      <button type="button" onClick={() => setShowAddSpecialty(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 9999, border: `1.5px dashed ${C.gold}`, background: 'rgba(139,92,246,0.04)', color: C.gold, cursor: 'pointer', fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700 }}>
                        <Plus size={13} /> Nueva especialidad
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {showAddSpecialty && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                          <input
                            value={newSpecialtyText}
                            onChange={e => setNewSpecialtyText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                            placeholder="Ej: Aerial Hoop..."
                            autoFocus
                            onFocus={e => (e.target.style.borderColor = C.gold)}
                            onBlur={e => (e.target.style.borderColor = C.border)}
                            style={{ ...INPUT(), flex: 1 }}
                          />
                          <button type="button" onClick={handleAddSpecialty}
                            style={{ padding: '0 16px', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: C.white, border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', fontFamily: FONT_INTER }}>
                            Agregar
                          </button>
                          <button type="button" onClick={() => { setShowAddSpecialty(false); setNewSpecialtyText('') }}
                            style={{ padding: '0 12px', borderRadius: 10, background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <X size={14} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {errors.specialties && <p style={ERR}>{errors.specialties}</p>}
                </div>

                {/* Bio */}
                <div>
                  <label style={LABEL}>Biografía</label>
                  <textarea
                    value={form.bio} rows={4}
                    placeholder="Describe su experiencia, formación y estilo de enseñanza..."
                    onChange={e => set('bio', e.target.value)}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={{ ...INPUT(), resize: 'none', lineHeight: 1.65 }}
                  />
                </div>

                {/* Instagram */}
                <div>
                  <label style={LABEL}>Instagram</label>
                  <div style={{ position: 'relative' }}>
                    <AtSign size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input type="text" value={form.instagramUrl} placeholder="https://instagram.com/usuario"
                      onChange={e => set('instagramUrl', e.target.value)}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = C.border)}
                      style={{ ...INPUT(), paddingLeft: 36 }}
                    />
                  </div>
                </div>

                {/* Registro Médico */}
                <div>
                  <label style={LABEL}>Registro Médico <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text" value={form.medicalRegistrationNumber} placeholder="RM-123456"
                    onChange={e => { set('medicalRegistrationNumber', e.target.value); clearErr('medicalRegistrationNumber') }}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = errors.medicalRegistrationNumber ? '#ef4444' : C.border)}
                    style={INPUT(errors.medicalRegistrationNumber)}
                  />
                  {errors.medicalRegistrationNumber && <p style={ERR}>{errors.medicalRegistrationNumber}</p>}
                </div>

                {/* Usuario SISPRO */}
                <div>
                  <label style={LABEL}>Usuario SISPRO <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text" value={form.sisproUsername} placeholder="usuario.sispro"
                    onChange={e => { set('sisproUsername', e.target.value); clearErr('sisproUsername') }}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = errors.sisproUsername ? '#ef4444' : C.border)}
                    style={INPUT(errors.sisproUsername)}
                  />
                  {errors.sisproUsername && <p style={ERR}>{errors.sisproUsername}</p>}
                </div>

                {/* Contraseña SISPRO */}
                <div>
                  <label style={LABEL}>Contraseña SISPRO <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type={showSisproPass ? 'text' : 'password'} value={form.sisproPassword} placeholder="Contraseña SISPRO"
                      autoComplete="new-password" name="new-professional-sispro-password"
                      onChange={e => { set('sisproPassword', e.target.value); clearErr('sisproPassword') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.sisproPassword ? '#ef4444' : C.border)}
                      style={{ ...INPUT(errors.sisproPassword), paddingLeft: 36, paddingRight: 42 }}
                    />
                    <button onClick={() => setShowSisproPass(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0 }}>
                      {showSisproPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.sisproPassword && <p style={ERR}>{errors.sisproPassword}</p>}
                </div>
              </div>
            )}

            {/* PASO 4 — Acceso */}
            {step === 4 && (
              <div className="sp-step" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Resumen */}
                <div style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <img src={DEFAULT_AVATAR_URL} style={{ width: 50, height: 50, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: `2px solid ${C.goldLight}` }} alt="avatar por defecto" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: FONT_BODONI, fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>
                      {form.firstName} {form.lastName}
                    </p>
                    {role === 'PROFESSIONAL' && (
                      <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 5px' }}>
                        {form.specialties.join(' · ') || 'Sin especialidades'}
                      </p>
                    )}
                    <div style={{ fontFamily: FONT_INTER, fontSize: 11, color: C.textMedium }}>
                      {form.email} · {form.phone}
                    </div>
                  </div>
                </div>

                {/* Contraseña */}
                <div>
                  <label style={LABEL}>Contraseña <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type={showPass ? 'text' : 'password'} value={form.password} placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password" name="new-professional-password"
                      onChange={e => { set('password', e.target.value); clearErr('password') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.password ? '#ef4444' : C.border)}
                      style={{ ...INPUT(errors.password), paddingLeft: 36, paddingRight: 42 }}
                    />
                    <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0 }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {form.password && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 4, background: C.bgSecondary, borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(strength.score / 4) * 100}%`, background: strength.color, borderRadius: 9999, transition: 'all 0.3s ease' }} />
                      </div>
                      <span style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: strength.color, minWidth: 44 }}>{strength.label}</span>
                    </div>
                  )}
                  {errors.password && <p style={ERR}>{errors.password}</p>}
                </div>

                {/* Confirmar */}
                <div>
                  <label style={LABEL}>Confirmar Contraseña <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Shield size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type={showConf ? 'text' : 'password'} value={form.confirmPassword} placeholder="Repite la contraseña"
                      autoComplete="new-password" name="new-professional-password-confirm"
                      onChange={e => { set('confirmPassword', e.target.value); clearErr('confirmPassword') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : C.border)}
                      style={{ ...INPUT(errors.confirmPassword), paddingLeft: 36, paddingRight: 42 }}
                    />
                    <button onClick={() => setShowConf(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0 }}>
                      {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {/* Match indicator */}
                  {form.confirmPassword && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: form.password === form.confirmPassword ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {form.password === form.confirmPassword
                          ? <Check size={9} color={C.white} strokeWidth={3} />
                          : <X size={9} color={C.white} strokeWidth={3} />
                        }
                      </div>
                      <span style={{ fontFamily: FONT_INTER, fontSize: 11, color: form.password === form.confirmPassword ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                        {form.password === form.confirmPassword ? 'Las contraseñas coinciden' : 'No coinciden'}
                      </span>
                    </div>
                  )}
                  {errors.confirmPassword && <p style={ERR}>{errors.confirmPassword}</p>}
                </div>

                {/* API error */}
                {errors.submit && (
                  <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', fontFamily: FONT_INTER, fontSize: 13, color: '#D32F2F', fontWeight: 500 }}>
                    {errors.submit}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div style={{ padding: '14px 26px 22px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 12 }}>
            <button
              onClick={step === 1 ? onClose : back}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', transition: 'border-color 0.2s ease' }}
              onMouseOver={e => (e.currentTarget.style.borderColor = C.gold)}
              onMouseOut={e => (e.currentTarget.style.borderColor = C.border)}
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: FONT_INTER, fontSize: 11, color: C.textMuted }}>
                {step} / 4
              </span>
              {step < 4 ? (
                <button
                  onClick={next}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 22px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 4px 14px rgba(139,92,246,0.30)` }}
                >
                  Continuar
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              ) : (
                <button
                  onClick={submit} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', background: loading ? C.border : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 4px 14px rgba(139,92,246,0.30)`, transition: 'all 0.2s ease', minWidth: 170 }}
                >
                  {loading
                    ? <><span style={{ width: 14, height: 14, border: `2px solid rgba(255,255,255,0.4)`, borderTopColor: C.white, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Creando...</>
                    : <><Check size={14} strokeWidth={2.5} /> Crear Profesional</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
