import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PublicBookingProps {
  onBackToHome?: () => void   // navigate to '/'
  onContinue?: () => void     // called AFTER saving the pending booking to localStorage; should navigate to '/login'
  onLoginClick?: () => void   // navigate straight to '/login' without a pending booking
}

interface ServiceOfferPublic {
  id: string
  title: string
  description: string | null
  status: 'published' | string
  scheduledAt: string
  durationMinutes: number
  capacity: number
  enrolledCount: number
  price: number | null
  currency: string
  location: { id: string; name: string }
  professional: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null
}

interface BookingFormState {
  nombre: string
  apellido: string
  telefono: string
  email: string
}

const EMPTY_FORM: BookingFormState = { nombre: '', apellido: '', telefono: '', email: '' }

interface DiscountValidation {
  valid: boolean
  discount: { id: string; name: string; type: 'percentage' | 'fixed_amount' | 'buy_x_get_y'; value: number | null; buyQty: number | null; payQty: number | null; code: string | null } | null
  pricePerSession: number
  originalTotal: number
  discountedTotal: number
  amountSaved: number
  error?: string
}

function formatOfferDateTime(iso: string): string {
  const date = new Date(iso)
  const dateFmt = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const parts = dateFmt.formatToParts(date)
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? ''
  const day = parts.find(p => p.type === 'day')?.value ?? ''
  const month = parts.find(p => p.type === 'month')?.value ?? ''
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  const dateStr = `${capWeekday} ${day} de ${month}`

  const timeFmt = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
  const timeStr = timeFmt.format(date)

  return `${dateStr} · ${timeStr}`
}

function formatOfferPrice(price: number | null, currency: string): string {
  if (price === null) return 'Consulta en el momento'
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency || 'COP', maximumFractionDigits: 0 }).format(price)
  } catch {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price)
  }
}

const C = {
  purple: '#8B5CF6',
  blue: '#3B82F6',
  lightBlue: '#38BDF8',
  text: '#1B1C1C',
  textMuted: '#475569',
  textFaint: '#94A3B8',
  border: '#DDD6FE',
  panel: '#F3F0FB',
  white: '#FFFFFF',
}
const FONT_INTER = '"Hanken Grotesk", Inter, sans-serif'

export default function PublicBooking({ onBackToHome, onContinue, onLoginClick }: PublicBookingProps) {
  const [offers, setOffers] = useState<ServiceOfferPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<ServiceOfferPublic | null>(null)
  const [form, setForm] = useState<BookingFormState>(EMPTY_FORM)
  const [discountCode, setDiscountCode] = useState('')
  const [discountResult, setDiscountResult] = useState<DiscountValidation | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadOffers() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/services/offers?status=published&limit=100')
        const data = await res.json()
        if (!res.ok || !data?.success) throw new Error(data?.error ?? 'No se pudieron cargar las citas disponibles')
        if (!cancelled) {
          setOffers(Array.isArray(data.data?.offers) ? data.data.offers : [])
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'No se pudieron cargar las citas disponibles')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadOffers()
    return () => { cancelled = true }
  }, [])

  const now = Date.now()
  const availableOffers = offers
    .filter(o => o.enrolledCount < o.capacity)
    .filter(o => new Date(o.scheduledAt).getTime() >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const openBookingForm = (offer: ServiceOfferPublic) => {
    setForm(EMPTY_FORM)
    setDiscountCode('')
    setDiscountResult(null)
    setSelectedOffer(offer)
    checkDiscount(offer, '')
  }

  const closeBookingForm = () => {
    setSelectedOffer(null)
    setForm(EMPTY_FORM)
    setDiscountCode('')
    setDiscountResult(null)
  }

  const checkDiscount = async (offer: ServiceOfferPublic, code: string) => {
    try {
      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() || undefined, offerId: offer.id, sessionCount: 1 }),
      })
      const data = await res.json()
      if (data?.success) setDiscountResult(data.data)
    } catch {
      // Non-fatal: preview failure shouldn't block booking
    }
  }

  const handleDiscountCodeChange = (value: string) => {
    setDiscountCode(value)
    if (!selectedOffer) return
    window.clearTimeout((handleDiscountCodeChange as any)._t)
    ;(handleDiscountCodeChange as any)._t = window.setTimeout(() => checkDiscount(selectedOffer, value), 400)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOffer) return
    localStorage.setItem('MEDIS_pending_booking', JSON.stringify({
      offerId: selectedOffer.id,
      nombre: form.nombre,
      apellido: form.apellido,
      telefono: form.telefono,
      email: form.email,
      discountCode: discountCode.trim() ? discountCode.trim() : undefined,
    }))
    onContinue?.()
  }

  const handleLoginClick = () => {
    if (onLoginClick) onLoginClick()
    else onContinue?.()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: FONT_INTER }}>
      {/* Header */}
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '1.25rem 1.5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            onClick={() => onBackToHome?.()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: FONT_INTER, fontSize: '0.8rem', fontWeight: 600,
              color: C.textMuted, letterSpacing: '0.02em',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver al inicio
          </button>

          <button
            onClick={handleLoginClick}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: FONT_INTER, fontSize: '0.8rem', fontWeight: 600,
              color: C.purple, textDecoration: 'underline',
            }}
          >
            ¿Ya tienes una cuenta? Inicia sesión
          </button>
        </div>
      </header>

      {/* Page title */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem 1.5rem' }}>
        <p style={{
          fontFamily: FONT_INTER, fontSize: '0.72rem', letterSpacing: '0.3em',
          textTransform: 'uppercase', color: C.purple, marginBottom: '0.75rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ display: 'inline-block', width: 28, height: 1, background: `linear-gradient(90deg,${C.purple},${C.blue})` }} />
          Reserva en línea
        </p>
        <h1 className="font-cormorant" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 500, color: C.text, marginBottom: '0.5rem' }}>
          Agenda tu Cita
        </h1>
        <p style={{ fontFamily: FONT_INTER, fontSize: '0.95rem', color: C.textMuted, maxWidth: '600px' }}>
          Elige un horario disponible y déjanos tus datos de contacto. Al confirmar, crearás tu cuenta de paciente para completar la reserva.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem 5rem' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: C.textMuted, fontFamily: FONT_INTER }}>
            Cargando citas disponibles...
          </div>
        )}

        {!loading && error && (
          <div style={{
            textAlign: 'center', padding: '3rem 1.5rem', background: C.white, borderRadius: '1rem',
            border: `1px solid ${C.border}`, color: '#DC2626', fontFamily: FONT_INTER,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && availableOffers.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '4rem 1.5rem', background: C.white, borderRadius: '1rem',
            border: `1px solid ${C.border}`, color: C.textMuted, fontFamily: FONT_INTER, fontSize: '0.95rem',
          }}>
            No hay citas disponibles en este momento, contáctanos directamente.
          </div>
        )}

        {!loading && !error && availableOffers.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}>
            {availableOffers.map((offer) => (
              <div
                key={offer.id}
                style={{
                  background: C.white,
                  borderRadius: '1.25rem',
                  border: `1px solid ${C.border}`,
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.06)',
                }}
              >
                <span style={{
                  alignSelf: 'flex-start',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '9999px',
                  background: 'rgba(56,189,248,0.12)',
                  border: `1px solid ${C.lightBlue}40`,
                  fontFamily: FONT_INTER, fontSize: '0.68rem', fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0284C7',
                }}>
                  {formatOfferDateTime(offer.scheduledAt)}
                </span>

                <h3 className="font-cormorant" style={{ fontSize: '1.5rem', fontWeight: 500, color: C.text, margin: '0.25rem 0' }}>
                  {offer.title}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: FONT_INTER, fontSize: '0.85rem', color: C.textMuted }}>
                  <span>{offer.durationMinutes} min</span>
                  {offer.professional && (
                    <span>Dra. {offer.professional.firstName} {offer.professional.lastName}</span>
                  )}
                  <span>{offer.location.name}</span>
                </div>

                <div style={{
                  marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                }}>
                  <span style={{ fontFamily: FONT_INTER, fontSize: '0.95rem', fontWeight: 700, color: C.text }}>
                    {formatOfferPrice(offer.price, offer.currency)}
                  </span>
                  <button
                    onClick={() => openBookingForm(offer)}
                    style={{
                      padding: '0.65rem 1.4rem',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                      color: C.white,
                      fontFamily: FONT_INTER, fontSize: '0.75rem', fontWeight: 600,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
                      boxShadow: '0 6px 18px rgba(37,99,235,0.25)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Reservar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking form modal */}
      <AnimatePresence>
        {selectedOffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeBookingForm}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
              zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: C.white, borderRadius: '1.25rem', width: '100%', maxWidth: 460,
                maxHeight: '90vh', overflowY: 'auto', padding: '2rem',
                boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <p style={{ fontFamily: FONT_INTER, fontSize: '0.68rem', fontWeight: 700, color: C.purple, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 0.35rem' }}>
                    Confirmar Reserva
                  </p>
                  <h2 className="font-cormorant" style={{ fontSize: '1.5rem', fontWeight: 500, color: C.text, margin: 0 }}>
                    {selectedOffer.title}
                  </h2>
                  <p style={{ fontFamily: FONT_INTER, fontSize: '0.8rem', color: C.textMuted, margin: '0.35rem 0 0' }}>
                    {formatOfferDateTime(selectedOffer.scheduledAt)}
                  </p>
                  {discountResult?.valid && (
                    <p style={{ fontFamily: FONT_INTER, fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
                      <span style={{ textDecoration: 'line-through', color: C.textFaint, marginRight: 8 }}>
                        {formatOfferPrice(discountResult.originalTotal, selectedOffer.currency)}
                      </span>
                      <span style={{ fontWeight: 700, color: '#16A34A' }}>
                        {formatOfferPrice(discountResult.discountedTotal, selectedOffer.currency)}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={closeBookingForm}
                  aria-label="Cerrar"
                  style={{
                    width: 32, height: 32, borderRadius: '9999px', border: 'none', cursor: 'pointer',
                    background: C.panel, color: C.textMuted, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: FONT_INTER, fontSize: '0.72rem', fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Nombre
                  </label>
                  <input
                    type="text" required value={form.nombre}
                    onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem',
                      borderRadius: '0.65rem', border: `1.5px solid ${C.border}`,
                      fontFamily: FONT_INTER, fontSize: '0.9rem', color: C.text, outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: FONT_INTER, fontSize: '0.72rem', fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Apellido
                  </label>
                  <input
                    type="text" required value={form.apellido}
                    onChange={(e) => setForm(f => ({ ...f, apellido: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem',
                      borderRadius: '0.65rem', border: `1.5px solid ${C.border}`,
                      fontFamily: FONT_INTER, fontSize: '0.9rem', color: C.text, outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: FONT_INTER, fontSize: '0.72rem', fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Teléfono
                  </label>
                  <input
                    type="tel" required value={form.telefono}
                    onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem',
                      borderRadius: '0.65rem', border: `1.5px solid ${C.border}`,
                      fontFamily: FONT_INTER, fontSize: '0.9rem', color: C.text, outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: FONT_INTER, fontSize: '0.72rem', fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Correo electrónico
                  </label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem',
                      borderRadius: '0.65rem', border: `1.5px solid ${C.border}`,
                      fontFamily: FONT_INTER, fontSize: '0.9rem', color: C.text, outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: FONT_INTER, fontSize: '0.72rem', fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    ¿Tienes un código de descuento?
                  </label>
                  <input
                    type="text" value={discountCode}
                    onChange={(e) => handleDiscountCodeChange(e.target.value)}
                    placeholder="Código (opcional)"
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem',
                      borderRadius: '0.65rem', border: `1.5px solid ${C.border}`,
                      fontFamily: 'monospace', fontSize: '0.9rem', color: C.text, outline: 'none',
                      textTransform: 'uppercase',
                    }}
                  />
                  {discountResult && discountCode.trim() && (
                    discountResult.valid ? (
                      <p style={{ fontSize: '0.78rem', color: '#16A34A', margin: '0.4rem 0 0' }}>
                        ✓ {discountResult.discount?.name} aplicado — ahorras {formatOfferPrice(discountResult.amountSaved, selectedOffer.currency)}
                      </p>
                    ) : discountResult.error ? (
                      <p style={{ fontSize: '0.78rem', color: '#DC2626', margin: '0.4rem 0 0' }}>
                        {discountResult.error}
                      </p>
                    ) : null
                  )}
                  {discountResult?.valid && !discountCode.trim() && (
                    <p style={{ fontSize: '0.78rem', color: '#16A34A', margin: '0.4rem 0 0' }}>
                      ✓ Promoción "{discountResult.discount?.name}" aplicada automáticamente — ahorras {formatOfferPrice(discountResult.amountSaved, selectedOffer.currency)}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={closeBookingForm}
                    style={{
                      flex: 1, padding: '0.85rem', borderRadius: '9999px',
                      border: `1.5px solid ${C.border}`, background: 'transparent', cursor: 'pointer',
                      fontFamily: FONT_INTER, fontSize: '0.75rem', fontWeight: 700, color: C.textMuted,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1.4, padding: '0.85rem', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                      color: C.white, fontFamily: FONT_INTER, fontSize: '0.75rem', fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
                      boxShadow: '0 8px 24px rgba(37,99,235,0.30)',
                    }}
                  >
                    Confirmar Reserva
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
