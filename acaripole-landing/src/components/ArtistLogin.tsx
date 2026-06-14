import React, { useState } from 'react'
import { motion } from 'framer-motion'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  brand: '#8B5CF6',
  brandSecondary: '#3B82F6',
  brandAccent: '#38BDF8',
  bgMain: '#FFFFFF',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  textPrimary: '#1E293B',
  textMedium: '#475569',
  textBrand: '#6D28D9',
  textMuted: '#94A3B8',
  border: '#DDD6FE',
  footer: '#EEF2FF',
}

// ─── Types ────────────────────────────────────────────────────────
interface ArtistLoginProps {
  onBackToHome?: () => void
  onRegisterClick?: () => void
  onForgotPasswordClick?: () => void
  onLoginSuccess?: (role: string) => void
}

// ─── Component ────────────────────────────────────────────────────
export default function ArtistLogin({
  onBackToHome,
  onRegisterClick,
  onForgotPasswordClick,
  onLoginSuccess,
}: ArtistLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('El servidor backend no está respondiendo. Asegúrate de que esté encendido.')
      }

      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Credenciales inválidas')
      localStorage.setItem('accessToken', data.data.tokens.accessToken)
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken)

      const payloadBase64 = data.data.tokens.accessToken.split('.')[1]
      const payload = JSON.parse(atob(payloadBase64))
      const userRole = payload.role

      if (onLoginSuccess) onLoginSuccess(userRole)
      else alert('¡Bienvenido/a de vuelta!')
    } catch (err: any) {
      alert(err.message || 'Error al iniciar sesión')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: C.bgMain, display: 'flex', flexDirection: 'column', fontFamily: '"Hanken Grotesk", Inter, sans-serif' }}>

      {/* ─── Sticky Header ───────────────────────────────────────── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ width: '100%', background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${C.border}`, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 100 }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: back + logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <motion.button
              onClick={onBackToHome}
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2, ease: EASE }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: C.brand, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Volver
            </motion.button>

            <span style={{ width: 1, height: 24, background: C.border }} />

            <img
              src="/Logo_Medis.jpeg"
              alt="Dra. Diana Cristina Medina Camargo"
              onClick={onBackToHome}
              style={{ height: 90, width: 'auto', objectFit: 'contain', cursor: 'pointer', display: 'block' }}
            />
          </div>

          {/* Right: nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {[
              { label: 'Inicio', hash: '#inicio' },
              { label: 'Sobre la Doctora', hash: '#sobre-la-doctora' },
              { label: 'Servicios', hash: '#servicios' },
              { label: 'Contacto', hash: '#contacto' },
            ].map((item) => (
              <a
                key={item.label}
                href={`/${item.hash}`}
                onClick={(e) => {
                  e.preventDefault();
                  onBackToHome();
                  setTimeout(() => {
                    const el = document.querySelector(item.hash);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                style={{ color: C.textMedium, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', transition: 'color 0.2s ease' }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = C.brand)}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = C.textMedium)}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <motion.button
            onClick={onBackToHome}
            whileHover={{ scale: 1.03, boxShadow: `0 8px 24px rgba(139,92,246,0.35)` }}
            whileTap={{ scale: 0.97 }}
            style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandSecondary})`, color: C.white, border: 'none', padding: '12px 28px', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 6, transition: 'box-shadow 0.25s ease' }}
          >
            Agendar Cita
          </motion.button>
        </div>
      </motion.header>

      {/* ─── Hero Background Section ──────────────────────────────── */}
      <div style={{ flex: 1, background: `linear-gradient(146deg, ${C.brand} 0%, ${C.brandSecondary} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>

        {/* ─── Main Card ─────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 32, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, ease: EASE }}
          style={{ width: '100%', maxWidth: 1024, minHeight: 600, background: C.white, borderRadius: 12, boxShadow: '0px 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', overflow: 'hidden' }}
        >
          {/* ── Left: Form Panel ─────────────────────────────────── */}
          <div style={{ width: 450, flexShrink: 0, padding: '64px', background: C.white, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
              style={{ marginBottom: 32 }}
            >
              <h1 style={{ fontSize: 28, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2, margin: '0 0 8px 0', letterSpacing: '-0.01em' }}>
                Iniciar Sesión
              </h1>
              <p style={{ fontSize: 15, color: C.textMedium, fontWeight: 400, lineHeight: 1.5, margin: 0 }}>
                Ingresa tus credenciales para acceder a tu portal.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Email Field */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.35, ease: EASE }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, color: C.textMedium, fontWeight: 400 }}>✉</span>
                  <span style={{ fontSize: 12, color: C.textMedium, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em' }}>Correo electrónico</span>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="correo@ejemplo.com"
                  style={{ width: '100%', padding: '17px 16px', border: `1.5px solid ${emailFocused ? C.brand : C.border}`, borderRadius: 6, fontSize: 15, fontFamily: '"Hanken Grotesk", Inter, sans-serif', fontWeight: 400, color: C.textPrimary, background: 'transparent', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s ease' }}
                />
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.45, ease: EASE }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, color: C.textMedium, fontWeight: 400 }}>🔒</span>
                  <span style={{ fontSize: 12, color: C.textMedium, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em' }}>Contraseña</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ width: '100%', padding: '17px 56px 17px 16px', border: `1.5px solid ${passFocused ? C.brand : C.border}`, borderRadius: 6, fontSize: 15, fontFamily: '"Hanken Grotesk", Inter, sans-serif', fontWeight: 400, color: C.textPrimary, background: 'transparent', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s ease' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium, fontSize: 12, fontWeight: 400, lineHeight: 1, padding: 0 }}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={onForgotPasswordClick}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brand, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', padding: 0, transition: 'opacity 0.2s ease' }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.7')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </motion.div>

              {/* Sign In Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55, ease: EASE }}
                whileHover={{ scale: 1.02, boxShadow: '0px 14px 20px -4px rgba(139,92,246,0.40)' }}
                whileTap={{ scale: 0.97 }}
                style={{ width: '100%', padding: '20px', background: `linear-gradient(135deg, ${C.brand}, ${C.brandSecondary})`, color: C.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: '"Hanken Grotesk", Inter, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isSubmitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0px 10px 15px -3px rgba(139,92,246,0.25)', transition: 'box-shadow 0.25s ease' }}
              >
                {isSubmitting ? (
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : 'Iniciar Sesión'}
              </motion.button>
            </form>

            {/* Register Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.65, ease: EASE }}
              style={{ marginTop: 48 }}
            >
              <p style={{ fontSize: 15, color: C.textMedium, fontWeight: 400, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                ¿No tienes una cuenta?{' '}
                <button
                  onClick={onRegisterClick}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brand, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', padding: 0, verticalAlign: 'middle' }}
                >
                  Regístrate Aquí
                </button>
              </p>
            </motion.div>
          </div>

          {/* ── Right: Brand Panel ────────────────────────────────── */}
          <div style={{ flex: 1, background: C.bgPanel, padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Ambient glows */}
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(131deg, ${C.brand} 0%, ${C.brandSecondary} 100%)`, opacity: 0.05, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 256, height: 256, right: -128, top: -128, background: 'rgba(139,92,246,0.15)', filter: 'blur(64px)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 256, height: 256, left: -128, bottom: -128, background: 'rgba(59,130,246,0.12)', filter: 'blur(64px)', borderRadius: '50%', pointerEvents: 'none' }} />

            {/* Content */}
            <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 1 }}>

              {/* Logo card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
                style={{ padding: 32, background: C.white, borderRadius: 20, boxShadow: '0px 20px 25px -5px rgba(0,0,0,0.08), 0px 8px 10px -6px rgba(0,0,0,0.06)', marginBottom: 32 }}
              >
                <div style={{ width: 280, height: 280, background: '#FFFFFF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img
                    src="/Logo_Medis.jpeg"
                    alt="Dra. Diana Cristina Medina Camargo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                  />
                </div>
              </motion.div>

              {/* Welcome text */}
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
                style={{ fontSize: 28, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2, margin: '0 0 12px 0', letterSpacing: '-0.01em' }}
              >
                Bienvenido/a
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.58, ease: EASE }}
                style={{ fontSize: 15, fontWeight: 400, color: C.textMedium, lineHeight: 1.6, margin: '0 0 32px 0', padding: '0 16px' }}
              >
                "Tu salud es nuestra prioridad. Accede a tu portal para gestionar tus citas y seguimiento médico."
              </motion.p>

              {/* Brand accent bar */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.65, ease: EASE }}
                style={{ width: 48, height: 4, background: `linear-gradient(135deg, ${C.brand}, ${C.brandSecondary})`, borderRadius: 12, transformOrigin: 'left' }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
        style={{ background: C.footer, borderTop: `1px solid ${C.border}` }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, lineHeight: 1.3, marginBottom: 4 }}>
              Dra. Diana Cristina Medina Camargo
            </div>
            <div style={{ fontSize: 12, color: C.textMedium, fontWeight: 500 }}>
              © 2026 · Especialista en Medicina Familiar y Comunitaria
            </div>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'Política de Privacidad', key: 'privacy' },
              { label: 'Términos de Servicio', key: 'terms' },
              { label: 'Contacto', key: 'contact' },
            ].map((item) => (
              <a
                key={item.key}
                href="#"
                style={{ color: C.textMedium, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', textDecoration: 'none', opacity: 0.8, transition: 'opacity 0.2s ease' }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '1')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '0.8')}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </motion.footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
