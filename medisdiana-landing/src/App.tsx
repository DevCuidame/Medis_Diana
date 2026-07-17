import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion'

import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Classes from './components/Classes'
import Instructors from './components/Instructors'
import Testimonials from './components/Testimonials'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'
import ArtistLogin from './components/ArtistLogin'
import DianaBookingCalendar from './components/DianaBookingCalendar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Seo } from './seo/Seo'
import { MedicalClinicJsonLd } from './seo/JsonLd'
import NotFoundPage from './pages/public/NotFoundPage'

// ── Lazy-loaded private panels ────────────────────────────────────────────────
// Split out of the public bundle: a patient landing on "/" no longer downloads
// the admin/user/professional code. Big LCP/TBT win.
const MainDashboard         = lazy(() => import('./components/admin/MainDashboard').then(m => ({ default: m.MainDashboard })))
const UsuariosDashboard     = lazy(() => import('./components/admin/UsuariosDashboard').then(m => ({ default: m.UsuariosDashboard })))
const AdminClasses          = lazy(() => import('./components/admin/AdminClasses').then(m => ({ default: m.AdminClasses })))
const CreateService         = lazy(() => import('./components/admin/CreateService').then(m => ({ default: m.CreateService })))
const SedesDashboard        = lazy(() => import('./components/admin/SedesDashboard').then(m => ({ default: m.SedesDashboard })))
const EspaciosDashboard     = lazy(() => import('./components/admin/EspaciosDashboard').then(m => ({ default: m.EspaciosDashboard })))
const FinanzasDashboard     = lazy(() => import('./components/admin/FinanzasDashboard').then(m => ({ default: m.FinanzasDashboard })))
const MembresiasDashboard   = lazy(() => import('./components/admin/MembresiasDashboard').then(m => ({ default: m.MembresiasDashboard })))
const BeneficiosDashboard   = lazy(() => import('./components/admin/BeneficiosDashboard').then(m => ({ default: m.BeneficiosDashboard })))
const InscripcionesDashboard = lazy(() => import('./components/admin/InscripcionesDashboard').then(m => ({ default: m.InscripcionesDashboard })))
const DescuentosDashboard   = lazy(() => import('./components/admin/DescuentosDashboard').then(m => ({ default: m.DescuentosDashboard })))
const UserLayout            = lazy(() => import('./components/user/UserLayout').then(m => ({ default: m.UserLayout })))
const ProfessionalDashboard = lazy(() => import('./components/professional/ProfessionalDashboard').then(m => ({ default: m.ProfessionalDashboard })))

// ── Scroll to top on every route change ──────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

// ── Gold scroll-progress bar (landing only) ───────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, #8B5CF6, #3B82F6, #38BDF8)',
        transformOrigin: '0%',
        scaleX,
        zIndex: 200,
      }}
    />
  )
}

// ── Route pages ───────────────────────────────────────────────────────────────

function LandingPage() {
  const navigate = useNavigate()
  return (
    <>
      <Seo path="/" />
      <MedicalClinicJsonLd />
      <ScrollProgressBar />
      <Navbar onLoginClick={() => navigate('/login')} onAgendarClick={() => navigate('/agendar')} />
      <main>
        <Hero />
        <About />
        <Classes />
        <Instructors />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from

  const finalizePendingBooking = async () => {
    const pendingRaw = localStorage.getItem('MEDIS_pending_booking')
    if (!pendingRaw) return
    try {
      const pending = JSON.parse(pendingRaw) as { offerId: string; discountCode?: string }
      const accessToken = localStorage.getItem('accessToken')
      const response = await fetch('/api/services/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ offerId: pending.offerId, discountCode: pending.discountCode }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        alert(data.error || 'No pudimos confirmar tu cita automáticamente. Por favor agenda de nuevo desde tu portal.')
      }
    } catch {
      alert('No pudimos confirmar tu cita automáticamente. Por favor agenda de nuevo desde tu portal.')
    } finally {
      localStorage.removeItem('MEDIS_pending_booking')
    }
  }

  return (
    <>
      <Seo path="/login" title="Iniciar sesión" noindex />
      <ArtistLogin
      onBackToHome={() => navigate('/')}
      onForgotPasswordClick={() => alert('Se ha enviado un enlace de recuperación a tu correo electrónico registrado.')}
      onLoginSuccess={async (role) => {
        if (role === 'USER') await finalizePendingBooking()
        if (role === 'USER')         navigate(from ?? '/user/dashboard',         { replace: true })
        else if (role === 'PROFESSIONAL') navigate(from ?? '/professional/classes', { replace: true })
        else                         navigate(from ?? '/admin/dashboard',         { replace: true })
      }}
      />
    </>
  )
}

function BookingPage() {
  const navigate = useNavigate()
  return (
    <>
      <Seo
        path="/agendar"
        title="Agendar cita médica en línea"
        description="Reserva tu consulta de medicina familiar con la Dra. Diana Medina. Disponibilidad en tiempo real."
      />
      <MedicalClinicJsonLd />
      <DianaBookingCalendar
        onBackToHome={() => navigate('/')}
      />
    </>
  )
}

// ── Session expired notification ─────────────────────────────────────────────
function SessionExpiredBanner() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => {
      // Only show if user is logged in (has token)
      if (!localStorage.getItem('accessToken')) return
      setVisible(true)
      // Auto-redirect after 4 seconds
      setTimeout(() => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setVisible(false)
        navigate('/login')
      }, 4000)
    }
    window.addEventListener('session:expired', handler)
    return () => window.removeEventListener('session:expired', handler)
  }, [navigate])

  const handleLogin = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setVisible(false)
    navigate('/login')
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, display: 'flex', alignItems: 'center', gap: 14,
            background: '#1B1C1C', color: '#fff', borderRadius: 14,
            padding: '14px 20px', boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
            maxWidth: 420, width: 'calc(100vw - 32px)',
            fontFamily: '"Hanken Grotesk", Inter, sans-serif',
          }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }}>⏰</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>Sesión expirada</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
              Tu sesión de 2 horas terminó. Redirigiendo al login…
            </p>
          </div>
          <button
            onClick={handleLogin}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', flexShrink: 0,
              background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Iniciar sesión
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <SessionExpiredBanner />
      <ScrollToTop />
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <Routes>
        <Route path="/"      element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/agendar" element={<BookingPage />} />

        {/* /admin → redirect to default admin page */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Legacy admin path */}
        <Route path="/admin/professionals" element={<Navigate to="/admin/users" replace />} />

        {/* Protected admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MainDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UsuariosDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services/create"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <CreateService />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services/locations"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SedesDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services/rooms"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <EspaciosDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/finances"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <FinanzasDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/memberships"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MembresiasDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/benefits"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <BeneficiosDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inscripciones"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <InscripcionesDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/discounts"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DescuentosDashboard />
            </ProtectedRoute>
          }
        />

        {/* User Portal */}
        <Route
          path="/user/*"
          element={
            <ProtectedRoute allowedRoles={['USER']}>
              <UserLayout />
            </ProtectedRoute>
          }
        />

        {/* Professional Portal */}
        <Route
          path="/professional/*"
          element={
            <ProtectedRoute allowedRoles={['PROFESSIONAL']}>
              <ProfessionalDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback: real 404 (noindex) — no more soft-404 to "/" */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </>
  )
}
