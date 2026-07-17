import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Config ────────────────────────────────────────────────────────────────
const DOC_API = 'https://doc-api.cuidame.tech/api'
const DIANA_PROFESSIONAL_ID = 12

// ─── Types ─────────────────────────────────────────────────────────────────
interface Slot {
  start_time: string
  end_time: string
  available: boolean
}

interface ProfService {
  prof_service_id: number
  service_id: number
  name: string
  description?: string
  duration_minutes: number
  category: string
}

type BookingStep = 'service' | 'calendar' | 'slots' | 'form' | 'success'

const ID_TYPES = [
  { value: 'Cédula de Ciudadanía', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'Tarjeta de Identidad', label: 'Tarjeta de Identidad (TI)' },
  { value: 'Cédula de Extranjería', label: 'Cédula de Extranjería (CE)' },
  { value: 'Pasaporte', label: 'Pasaporte (PP)' },
  { value: 'Registro Civil', label: 'Registro Civil (RC)' },
  { value: 'Menor sin Identificación', label: 'Menor sin Identificación' },
]

interface BookingForm {
  // Existing patient
  identification_number: string
  notes: string
  // New patient extra fields
  isNewPatient: boolean
  first_name: string
  last_name: string
  identification_type: string
  email: string
  phone: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDateLong(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const date = new Date(y, mo - 1, d)
  return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ─── Palette ───────────────────────────────────────────────────────────────
const C = {
  primary: '#1D4ED8',
  primaryLight: '#2563EB',
  primaryMuted: '#EFF6FF',
  accent: '#0EA5E9',
  text: '#0F172A',
  textMuted: '#475569',
  textFaint: '#94A3B8',
  border: '#E2E8F0',
  white: '#FFFFFF',
  bg: '#F5F7FA',
  success: '#16A34A',
  successBg: '#F0FDF4',
  danger: '#DC2626',
}
const FONT = '"Hanken Grotesk", Inter, system-ui, sans-serif'

// ─── Component ─────────────────────────────────────────────────────────────
interface DianaBookingCalendarProps {
  onBackToHome?: () => void
}

export default function DianaBookingCalendar({ onBackToHome }: DianaBookingCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [step, setStep] = useState<BookingStep>('service')
  const [services, setServices] = useState<ProfService[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)
  const [selectedServiceName, setSelectedServiceName] = useState<string>('')
  const [form, setForm] = useState<BookingForm>({
    identification_number: '', notes: '',
    isNewPatient: false,
    first_name: '', last_name: '', identification_type: '', email: '', phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookedAppointment, setBookedAppointment] = useState<any>(null)
  // Cache of dates with slots: dateStr → boolean
  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  // Load professional services once
  useEffect(() => {
    fetch(`${DOC_API}/booking/professionals/${DIANA_PROFESSIONAL_ID}/services`)
      .then(r => r.json())
      .then(data => { setServices(Array.isArray(data?.data) ? data.data : []) })
      .catch(() => { setServices([]) })
      .finally(() => setLoadingServices(false))
  }, [])

  // Build calendar grid for current viewMonth/viewYear
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayStr = toLocalDateStr(today)

  // Preload availability for current month visible days
  const preloadMonth = useCallback(async (year: number, month: number) => {
    const daysCount = new Date(year, month + 1, 0).getDate()
    const promises: Promise<void>[] = []

    for (let d = 1; d <= daysCount; d++) {
      const date = new Date(year, month, d)
      // Skip past days and Sundays (Diana doesn't work Sundays — adjust if needed)
      if (date < today || date.getDay() === 0) continue
      const dateStr = toLocalDateStr(date)
      if (availability[dateStr] !== undefined) continue

      promises.push(
        fetch(`${DOC_API}/booking/professionals/${DIANA_PROFESSIONAL_ID}/slots/${dateStr}`)
          .then(r => r.json())
          .then(data => {
            const s: Slot[] = Array.isArray(data?.data) ? data.data : []
            setAvailability(prev => ({ ...prev, [dateStr]: s.some(sl => sl.available) }))
          })
          .catch(() => setAvailability(prev => ({ ...prev, [dateStr]: false })))
      )
    }

    await Promise.all(promises)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    preloadMonth(viewYear, viewMonth)
  }, [viewYear, viewMonth, preloadMonth])

  const loadSlots = async (dateStr: string) => {
    setLoadingSlots(true)
    setSlots([])
    setError(null)
    try {
      const res = await fetch(`${DOC_API}/booking/professionals/${DIANA_PROFESSIONAL_ID}/slots/${dateStr}`)
      const data = await res.json()
      setSlots(Array.isArray(data?.data) ? data.data : [])
    } catch {
      setError('No se pudo cargar la disponibilidad. Intenta de nuevo.')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleDayClick = (day: number) => {
    const date = new Date(viewYear, viewMonth, day)
    if (date < today && toLocalDateStr(date) !== todayStr) return
    const dateStr = toLocalDateStr(date)
    setSelectedDate(dateStr)
    setSelectedSlot(null)
    setStep('slots')
    loadSlots(dateStr)
  }

  const handleSlotSelect = (slot: Slot) => {
    if (!slot.available) return
    setSelectedSlot(slot)
    setStep('form')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedSlot) return
    setSubmitting(true)
    setError(null)
    try {
      let res: Response
      if (form.isNewPatient) {
        if (!form.first_name || !form.last_name || !form.identification_type || !form.identification_number) {
          throw new Error('Por favor completa todos los campos obligatorios.')
        }
        res = await fetch(`${DOC_API}/booking/register-and-book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            identification_type: form.identification_type,
            identification_number: form.identification_number.trim(),
            email: form.email.trim() || undefined,
            phone: form.phone.trim() || undefined,
            professional_id: DIANA_PROFESSIONAL_ID,
            appointment_date: selectedDate,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            notes: form.notes.trim() || undefined,
            clinical_service_id: selectedServiceId ?? undefined,
          }),
        })
      } else {
        res = await fetch(`${DOC_API}/booking/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identification_number: form.identification_number.trim(),
            professional_id: DIANA_PROFESSIONAL_ID,
            appointment_date: selectedDate,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            notes: form.notes.trim() || undefined,
            clinical_service_id: selectedServiceId ?? undefined,
          }),
        })
      }
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? 'No se pudo solicitar la cita.')
      }
      setBookedAppointment(data.data)
      setStep('success')
    } catch (err: any) {
      setError(err.message ?? 'Error al solicitar la cita. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    if (step === 'success') {
      setStep('service')
      setSelectedDate(null)
      setSelectedSlot(null)
      setSelectedServiceId(null)
      setSelectedServiceName('')
      setForm({ identification_number: '', notes: '', isNewPatient: false, first_name: '', last_name: '', identification_type: '', email: '', phone: '' })
      setBookedAppointment(null)
    } else if (step === 'form') {
      setStep('slots')
      setSelectedSlot(null)
      setError(null)
    } else if (step === 'slots') {
      setStep('calendar')
      setSelectedDate(null)
    } else if (step === 'calendar') {
      setStep('service')
    } else {
      onBackToHome?.()
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const isPast = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return d < t
  }

  const nowMinutes = today.getHours() * 60 + today.getMinutes()
  const availableSlots = slots.filter(s => {
    if (!s.available) return false
    // If today, hide slots whose start time has already passed
    if (selectedDate === todayStr) {
      const [h, m] = s.start_time.split(':').map(Number)
      return h * 60 + m > nowMinutes
    }
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT }}>
      {/* Header */}
      <header style={{
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        padding: '1rem 1.5rem',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={step === 'service' ? onBackToHome : goBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
              borderRadius: 8, color: C.textMuted, fontFamily: FONT, fontSize: '0.82rem', fontWeight: 600,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {step === 'service' ? 'Inicio' : 'Atrás'}
          </button>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="3" stroke="white" strokeWidth="2" />
                  <path d="M3 9h18M8 2v4M16 2v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: C.textFaint, fontWeight: 500 }}>Agendar cita con</p>
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: C.text }}>Dra. Diana Cristina Medina Camargo</p>
              </div>
            </div>
          </div>

          <div style={{ width: 80 }} />
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ height: 3, background: C.border }}>
        <motion.div
          style={{ height: '100%', background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`, transformOrigin: 'left' }}
          animate={{ scaleX: step === 'service' ? 0.2 : step === 'calendar' ? 0.4 : step === 'slots' ? 0.6 : step === 'form' ? 0.8 : 1 }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <AnimatePresence mode="wait">

          {/* ── STEP 0: Service selection ── */}
          {step === 'service' && (
            <motion.div key="service"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28 }}
            >
              <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, color: C.text, margin: 0 }}>
                  ¿Qué tipo de consulta necesitas?
                </h1>
                <p style={{ color: C.textMuted, fontSize: '0.9rem', marginTop: 6 }}>
                  Selecciona el servicio con el que deseas agendar tu cita con la Dra. Diana.
                </p>
              </div>

              {loadingServices ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: C.textMuted }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                    <circle cx="12" cy="12" r="10" stroke={C.border} strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke={C.primary} strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <p style={{ marginTop: 12, fontSize: '0.9rem' }}>Cargando servicios…</p>
                </div>
              ) : services.length === 0 ? (
                /* Si no hay servicios configurados, saltar directo al calendario */
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: C.textMuted, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    Agenda tu consulta médica directamente.
                  </p>
                  <button
                    onClick={() => setStep('calendar')}
                    style={{
                      padding: '0.9rem 2rem', borderRadius: 10, border: 'none',
                      background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                      color: C.white, fontFamily: FONT, fontSize: '0.9rem', fontWeight: 700,
                      cursor: 'pointer', boxShadow: '0 6px 20px rgba(29,78,216,0.28)',
                    }}
                  >
                    Seleccionar fecha →
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                  {services.map(svc => (
                    <button
                      key={svc.prof_service_id}
                      type="button"
                      onClick={() => {
                        setSelectedServiceId(svc.prof_service_id)
                        setSelectedServiceName(svc.name)
                        setStep('calendar')
                      }}
                      style={{
                        background: C.white, borderRadius: 16,
                        border: `2px solid ${selectedServiceId === svc.prof_service_id ? C.primary : C.border}`,
                        padding: '1.25rem 1.5rem', textAlign: 'left',
                        cursor: 'pointer', fontFamily: FONT,
                        boxShadow: '0 2px 12px rgba(29,78,216,0.06)',
                        transition: 'all 0.18s',
                        display: 'flex', flexDirection: 'column', gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: `linear-gradient(135deg, ${C.primary}15, ${C.accent}20)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12l2 2 4-4" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="12" r="10" stroke={C.primary} strokeWidth="1.8" />
                          </svg>
                        </span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: C.text }}>{svc.name}</span>
                      </div>

                      {svc.description && (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: C.textMuted, lineHeight: 1.45, paddingLeft: 50 }}>
                          {svc.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: 50 }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, color: C.primary,
                          background: C.primaryMuted, borderRadius: 6, padding: '2px 8px',
                        }}>
                          {svc.duration_minutes} min
                        </span>
                        <span style={{ fontSize: '0.72rem', color: C.textFaint, fontWeight: 500, textTransform: 'capitalize' }}>
                          {svc.category === 'consultation' ? 'Consulta' : svc.category === 'therapy' ? 'Terapia' : svc.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 1: Calendar ── */}
          {step === 'calendar' && (
            <motion.div key="calendar"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28 }}
            >
              <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, color: C.text, margin: 0 }}>
                  Selecciona una fecha
                </h1>
                <p style={{ color: C.textMuted, fontSize: '0.9rem', marginTop: 6 }}>
                  Elige el día para tu consulta médica. Los días con disponibilidad se muestran resaltados.
                </p>
              </div>

              <div style={{
                background: C.white, borderRadius: 20, border: `1px solid ${C.border}`,
                padding: '1.75rem', boxShadow: '0 4px 24px rgba(29,78,216,0.07)',
              }}>
                {/* Month navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <button
                    onClick={prevMonth}
                    disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
                    style={{
                      width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${C.border}`,
                      background: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.textMuted, opacity: (viewYear === today.getFullYear() && viewMonth === today.getMonth()) ? 0.3 : 1,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, margin: 0 }}>
                    {MONTHS_ES[viewMonth]} {viewYear}
                  </h2>

                  <button
                    onClick={nextMonth}
                    style={{
                      width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${C.border}`,
                      background: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.textMuted,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                  {DAYS_ES.map(d => (
                    <div key={d} style={{
                      textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: C.textFaint,
                      letterSpacing: '0.05em', padding: '4px 0',
                    }}>{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {/* Empty cells */}
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dateStr = toLocalDateStr(new Date(viewYear, viewMonth, day))
                    const past = isPast(day)
                    const isToday = dateStr === todayStr
                    const isSunday = new Date(viewYear, viewMonth, day).getDay() === 0
                    const hasSlots = availability[dateStr] === true
                    const noSlots = availability[dateStr] === false
                    const isSelected = dateStr === selectedDate

                    return (
                      <button
                        key={day}
                        onClick={() => !past && !isSunday && handleDayClick(day)}
                        disabled={past || isSunday}
                        style={{
                          aspectRatio: '1',
                          borderRadius: 10,
                          border: isSelected ? `2px solid ${C.primary}` : isToday ? `2px solid ${C.accent}` : '2px solid transparent',
                          background: isSelected ? C.primary : hasSlots ? C.primaryMuted : C.white,
                          cursor: past || isSunday ? 'default' : 'pointer',
                          opacity: past || isSunday ? 0.25 : 1,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                          fontSize: '0.88rem', fontWeight: isToday || isSelected ? 700 : 500,
                          color: isSelected ? C.white : isToday ? C.primary : past ? C.textFaint : C.text,
                          transition: 'all 0.15s',
                          padding: '4px 2px',
                          minHeight: 44,
                        }}
                      >
                        {day}
                        {hasSlots && !isSelected && (
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: C.primary, display: 'block',
                          }} />
                        )}
                        {noSlots && !past && !isSunday && (
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: C.border, display: 'block',
                          }} />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.primary, display: 'inline-block' }} />
                    Con disponibilidad
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: C.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.border, display: 'inline-block' }} />
                    Sin cupos
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Time slots ── */}
          {step === 'slots' && selectedDate && (
            <motion.div key="slots"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28 }}
            >
              <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: C.text, margin: 0 }}>
                  Elige un horario
                </h1>
                <p style={{ color: C.textMuted, fontSize: '0.9rem', marginTop: 6, textTransform: 'capitalize' }}>
                  {formatDateLong(selectedDate)}
                </p>
              </div>

              {loadingSlots ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: C.textMuted }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                    <circle cx="12" cy="12" r="10" stroke={C.border} strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke={C.primary} strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <p style={{ marginTop: 12, fontSize: '0.9rem' }}>Cargando horarios…</p>
                </div>
              ) : error ? (
                <div style={{ background: '#FEF2F2', border: `1px solid #FCA5A5`, borderRadius: 12, padding: '1.25rem', color: C.danger, fontSize: '0.9rem' }}>
                  {error}
                </div>
              ) : availableSlots.length === 0 ? (
                <div style={{
                  background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
                  padding: '2.5rem', textAlign: 'center', color: C.textMuted, fontSize: '0.9rem',
                }}>
                  No hay horarios disponibles para este día.
                  <br />
                  <button onClick={goBack} style={{ marginTop: 12, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', fontFamily: FONT }}>
                    Elegir otra fecha
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => handleSlotSelect(slot)}
                      disabled={!slot.available}
                      style={{
                        padding: '0.9rem 0.5rem',
                        borderRadius: 12,
                        border: `2px solid ${slot.available ? C.primary : C.border}`,
                        background: slot.available ? C.primaryMuted : '#F8FAFC',
                        cursor: slot.available ? 'pointer' : 'default',
                        opacity: slot.available ? 1 : 0.4,
                        fontFamily: FONT, fontSize: '0.9rem', fontWeight: 700,
                        color: slot.available ? C.primary : C.textFaint,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s',
                      }}
                    >
                      {formatTime(slot.start_time)}
                      {!slot.available && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 500, color: C.textFaint }}>Ocupado</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 3: Patient form ── */}
          {step === 'form' && selectedDate && selectedSlot && (
            <motion.div key="form"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28 }}
            >
              <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: C.text, margin: 0 }}>
                  Confirmar cita
                </h1>
                <p style={{ color: C.textMuted, fontSize: '0.9rem', marginTop: 6 }}>
                  Completa tus datos para solicitar el turno.
                </p>
              </div>

              {/* Booking summary card */}
              <div style={{
                background: C.primaryMuted, borderRadius: 14, border: `1px solid ${C.primary}30`,
                padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
                display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center',
              }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Fecha</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 600, color: C.text, textTransform: 'capitalize' }}>
                    {formatDateLong(selectedDate)}
                  </p>
                </div>
                <div style={{ width: 1, height: 40, background: `${C.primary}30` }} />
                <div style={{ flex: 1, minWidth: 120 }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hora</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 600, color: C.text }}>
                    {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}
                  </p>
                </div>
                <div style={{ width: 1, height: 40, background: `${C.primary}30` }} />
                <div style={{ flex: 2, minWidth: 180 }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Médico</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 600, color: C.text }}>
                    Dra. Diana Cristina Medina Camargo
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: C.textMuted }}>Especialista en Medicina Familiar</p>
                </div>
                {selectedServiceName && (
                  <>
                    <div style={{ width: 1, height: 40, background: `${C.primary}30` }} />
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Servicio</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 600, color: C.text }}>{selectedServiceName}</p>
                    </div>
                  </>
                )}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Toggle nuevo / existente */}
                <div style={{ display: 'flex', borderRadius: 10, border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
                  {[{ val: false, label: 'Ya soy paciente' }, { val: true, label: 'Nuevo Paciente' }].map(opt => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isNewPatient: opt.val }))}
                      style={{
                        flex: 1, padding: '0.7rem', border: 'none', cursor: 'pointer',
                        fontFamily: FONT, fontSize: '0.82rem', fontWeight: 700,
                        background: form.isNewPatient === opt.val ? C.primary : C.white,
                        color: form.isNewPatient === opt.val ? C.white : C.textMuted,
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Nuevo paciente: campos completos */}
                {form.isNewPatient && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Nombre *</label>
                        <input required type="text" placeholder="Ingresa el nombre"
                          value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                          style={inputStyle} onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
                      </div>
                      <div>
                        <label style={labelStyle}>Apellido *</label>
                        <input required type="text" placeholder="Ingresa el apellido"
                          value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                          style={inputStyle} onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Tipo de Documento *</label>
                      <select required value={form.identification_type}
                        onChange={e => setForm(f => ({ ...f, identification_type: e.target.value }))}
                        style={{ ...inputStyle, appearance: 'none' as const }}
                        onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border}
                      >
                        <option value="">Selecciona el tipo</option>
                        {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* Número de documento (siempre visible) */}
                <div>
                  <label style={labelStyle}>Número de Documento *</label>
                  <input required type="text" placeholder="Ej: 1234567890"
                    value={form.identification_number} onChange={e => setForm(f => ({ ...f, identification_number: e.target.value }))}
                    style={inputStyle} onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
                  {!form.isNewPatient && (
                    <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: C.textMuted }}>
                      Ingresa el número de cédula con el que te registraste con la Dra. Diana.
                    </p>
                  )}
                </div>

                {/* Nuevo paciente: email y teléfono */}
                {form.isNewPatient && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={labelStyle}>Correo Electrónico *</label>
                      <input required type="email" placeholder="ejemplo@correo.com"
                        value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        style={inputStyle} onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Teléfono *</label>
                      <input required type="tel" placeholder="3001234567"
                        value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        style={inputStyle} onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                )}

                {/* Motivo (siempre opcional) */}
                <div>
                  <label style={labelStyle}>
                    Motivo de consulta <span style={{ color: C.textFaint, fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <textarea rows={3} placeholder="Describe brevemente el motivo de tu consulta…"
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical' as const, minHeight: 80 }}
                    onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>

                {error && (
                  <div style={{
                    background: '#FEF2F2', border: `1px solid #FCA5A5`, borderRadius: 10,
                    padding: '0.85rem 1rem', color: C.danger, fontSize: '0.88rem',
                  }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={goBack}
                    style={{
                      flex: 1, padding: '0.9rem', borderRadius: 10,
                      border: `1.5px solid ${C.border}`, background: C.white,
                      fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, color: C.textMuted,
                      cursor: 'pointer',
                    }}
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 2, padding: '0.9rem', borderRadius: 10, border: 'none',
                      background: submitting ? C.border : `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                      color: submitting ? C.textMuted : C.white,
                      fontFamily: FONT, fontSize: '0.88rem', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer',
                      boxShadow: submitting ? 'none' : '0 6px 20px rgba(29,78,216,0.28)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {submitting && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )}
                    {submitting ? 'Solicitando…' : 'Solicitar Cita'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 'success' && (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ textAlign: 'center', padding: '2rem 1rem' }}
            >
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.success}, #22C55E)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem', boxShadow: '0 12px 32px rgba(22,163,74,0.30)',
              }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: C.text, margin: '0 0 0.5rem' }}>
                ¡Cita solicitada!
              </h1>
              <p style={{ color: C.textMuted, fontSize: '0.95rem', maxWidth: 420, margin: '0 auto 2rem' }}>
                Tu solicitud fue enviada a la Dra. Diana Cristina Medina Camargo. Queda pendiente de confirmación.
              </p>

              {bookedAppointment && selectedDate && selectedSlot && (
                <div style={{
                  background: C.white, border: `1px solid ${C.border}`, borderRadius: 16,
                  padding: '1.5rem', maxWidth: 420, margin: '0 auto 2rem', textAlign: 'left',
                }}>
                  <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                    <Row label="Fecha" value={formatDateLong(selectedDate)} capitalize />
                    <Row label="Hora" value={`${formatTime(selectedSlot.start_time)} – ${formatTime(selectedSlot.end_time)}`} />
                    {selectedServiceName && <Row label="Servicio" value={selectedServiceName} />}
                    <Row label="Médico" value="Dra. Diana Cristina Medina Camargo" />
                    <Row label="Estado" value="Pendiente de confirmación" badge />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 320, margin: '0 auto' }}>
                <button
                  onClick={goBack}
                  style={{
                    padding: '0.9rem', borderRadius: 10, border: 'none',
                    background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                    color: C.white, fontFamily: FONT, fontSize: '0.88rem', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 6px 20px rgba(29,78,216,0.28)',
                  }}
                >
                  Agendar otra cita
                </button>
                <button
                  onClick={onBackToHome}
                  style={{
                    padding: '0.9rem', borderRadius: 10,
                    border: `1.5px solid ${C.border}`, background: C.white,
                    fontFamily: FONT, fontSize: '0.88rem', fontWeight: 600, color: C.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  Volver al inicio
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569',
  letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem',
  borderRadius: 10, border: '1.5px solid #E2E8F0',
  fontFamily: '"Hanken Grotesk", Inter, system-ui, sans-serif',
  fontSize: '0.9rem', color: '#0F172A', outline: 'none', transition: 'border-color 0.15s',
  background: '#fff',
}

function Row({ label, value, capitalize, badge }: { label: string; value: string; capitalize?: boolean; badge?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, paddingTop: 2 }}>
        {label}
      </span>
      {badge ? (
        <span style={{
          padding: '3px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 700,
          background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE047',
        }}>
          {value}
        </span>
      ) : (
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A', textAlign: 'right', textTransform: capitalize ? 'capitalize' : 'none' }}>
          {value}
        </span>
      )}
    </div>
  )
}
