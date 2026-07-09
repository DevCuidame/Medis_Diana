import React, { useState, useEffect } from 'react'
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CalendarDays, User, LogOut, ChevronRight } from 'lucide-react'
import { ProfessionalClasses } from './ProfessionalClasses'
import { ProfessionalProfile } from './ProfessionalProfile'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bgPanel: '#F3F0FB', white: '#FFFFFF',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

interface Me {
  id: string; firstName: string; lastName: string
  email: string; role: string; avatarUrl?: string
  bio?: string; specialties?: string[]; phone?: string
  instagramUrl?: string
  professionalType?: 'dependiente' | 'independiente'
}

const NAV = [
  { icon: CalendarDays, label: 'Mis Clases',  path: '/professional/classes' },
  { icon: User,         label: 'Mi Perfil',   path: '/professional/profile' },
]

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

export const ProfessionalDashboard: React.FC = () => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [me, setMe]     = useState<Me | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    // Step 1: get id from JWT via /me
    fetch('/api/auth/me', { headers: authH() })
      .then(r => r.json())
      .then(async d => {
        if (!d.success) return
        const userId = d.data.user.id
        // Step 2: fetch full professional profile
        const profRes  = await fetch(`/api/professionals/${userId}`, { headers: authH() })
        const profData = await profRes.json()
        if (profData.success) {
          const p = profData.data.professional
          setMe({
            id:               p.id,
            firstName:        p.firstName,
            lastName:         p.lastName,
            email:            p.email,
            role:             'PROFESSIONAL',
            avatarUrl:        p.avatarUrl,
            bio:              p.bio,
            specialties:      p.specialties,
            phone:            p.phone,
            instagramUrl:     p.instagramUrl,
            professionalType: p.professionalType ?? 'dependiente',
          })
        } else {
          // fallback to basic info
          setMe(d.data.user)
        }
      })
      .catch(() => {})
  }, [])

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  const initials = me ? `${me.firstName?.[0] ?? ''}${me.lastName?.[0] ?? ''}`.toUpperCase() : '?'

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F3F1', fontFamily: FONT_INTER, overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 240, flexShrink: 0, background: C.bgPanel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Logo */}
        <div style={{ padding: '28px 20px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 46, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: FONT_BODONI, fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: C.white }}>A</span>
            </div>
            <div>
              <div style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 600, color: C.gold, lineHeight: 1.2 }}>MEDIS</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Portal Profesional</div>
            </div>
          </div>
        </div>

        {/* Profile card */}
        {me && (
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {me.avatarUrl
                ? <img src={me.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: FONT_BODONI, fontSize: 14, fontWeight: 700, color: C.white }}>{initials}</span>
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: FONT_BODONI, fontSize: 14, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {me.firstName} {me.lastName}
              </p>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '2px 0 0' }}>Profesional</p>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 8px', display: 'block', marginBottom: 10 }}>Menú</span>
          {NAV.map((item, i) => {
            const isActive = location.pathname.startsWith(item.path)
            const isHov    = hovered === i
            const Icon     = item.icon
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, border: 'none', marginBottom: 4, background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHov ? 'rgba(139,92,246,0.07)' : 'transparent', cursor: 'pointer', transition: 'background 0.18s' }}
              >
                <Icon size={17} color={isActive ? C.white : isHov ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: isActive ? C.white : isHov ? C.gold : C.textBrown, transition: 'color 0.18s' }}>
                  {item.label}
                </span>
                {isActive && <ChevronRight size={13} color={C.white} style={{ marginLeft: 'auto' }} />}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 12px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <button
            onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium, transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={17} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Routes>
          <Route path="classes" element={<ProfessionalClasses me={me} />} />
          <Route path="profile" element={<ProfessionalProfile me={me} />} />
          <Route path="*"       element={<Navigate to="/professional/classes" replace />} />
        </Routes>
      </div>
    </div>
  )
}
