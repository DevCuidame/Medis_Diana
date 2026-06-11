import React, { useState, useEffect } from 'react'
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CalendarDays, LayoutGrid, BookOpen, CreditCard, Users, LogOut, ChevronRight, Sparkles } from 'lucide-react'
import { UserCalendario }    from './UserCalendario'
import { UserServicios }     from './UserServicios'
import { UserMisServicios }  from './UserMisServicios'
import { UserMembresias }    from './UserMembresias'
import { UserProfesionales } from './UserProfesionales'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  pink: '#8B5CF6', pinkLight: '#3B82F6',
  bgPanel: '#F3F0FB', white: '#FFFFFF',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

interface Me { id: string; firstName?: string; lastName?: string; email: string; avatarUrl?: string }

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

const NAV = [
  { icon: CalendarDays, label: 'Calendario',     path: '/user/calendario',     desc: 'Tus clases inscritas' },
  { icon: LayoutGrid,   label: 'Servicios',       path: '/user/servicios',      desc: 'Oferta del estudio' },
  { icon: BookOpen,     label: 'Mis Servicios',   path: '/user/mis-servicios',  desc: 'Tus inscripciones' },
  { icon: CreditCard,   label: 'Planes',      path: '/user/membresias',     desc: 'Planes disponibles' },
  { icon: Users,        label: 'Profesionales',   path: '/user/profesionales',  desc: 'El equipo' },
]

export const UserLayout: React.FC = () => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [me, setMe]         = useState<Me | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [hasInscription, setHasInscription] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setMe(d.data.user) })
      .catch(() => {})

    fetch('/api/user-memberships/me/inscription', { headers: authH() })
      .then(r => r.json())
      .then(d => setHasInscription(!!(d.success && d.data?.inscription)))
      .catch(() => setHasInscription(true))
  }, [])

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  const displayName = me?.firstName ? `${me.firstName} ${me.lastName ?? ''}`.trim() : (me?.email ?? '…')
  const initials = me?.firstName ? `${me.firstName[0]}${me.lastName?.[0] ?? ''}`.toUpperCase() : 'U'

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
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Mi Portal</div>
            </div>
          </div>
        </div>

        {/* User card */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {me?.avatarUrl
              ? <img src={me.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: FONT_BODONI, fontSize: 14, fontWeight: 700, color: C.white }}>{initials}</span>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: FONT_BODONI, fontSize: 13, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </p>
            <p style={{ fontSize: 10, fontWeight: 600, color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '2px 0 0' }}>Alumna</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 12px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 8px', display: 'block', marginBottom: 8 }}>Menú</span>
          {NAV.map((item, i) => {
            const isActive = location.pathname.startsWith(item.path)
            const isHov    = hovered === i
            const Icon     = item.icon
            return (
              <button key={item.path}
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, border: 'none', marginBottom: 3, background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHov ? 'rgba(139,92,246,0.07)' : 'transparent', cursor: 'pointer', transition: 'background 0.18s', textAlign: 'left' }}
              >
                <Icon size={16} color={isActive ? C.white : isHov ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? C.white : isHov ? C.gold : C.textBrown, transition: 'color 0.18s', lineHeight: 1.2 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.7)' : C.textMuted, marginTop: 1 }}>{item.desc}</div>
                </div>
                {isActive && <ChevronRight size={12} color={C.white} />}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '10px 12px 22px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium, transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={16} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {hasInscription === false && (
          <button
            onClick={() => navigate('/user/membresias', { state: { expandInscription: true } })}
            style={{
              flexShrink: 0, width: '100%', border: 'none', cursor: 'pointer',
              background: `linear-gradient(90deg, ${C.pink}, ${C.pinkLight})`,
              color: C.white, padding: '9px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 12.5, fontWeight: 700, fontFamily: FONT_INTER, textAlign: 'center',
            }}>
            <Sparkles size={14} />
            <span>Las inscritas en MEDIS desbloquean descuentos exclusivos en servicios</span>
            <span style={{ textDecoration: 'underline', whiteSpace: 'nowrap' }}>Inscríbete →</span>
          </button>
        )}
        <Routes>
          <Route path="calendario"    element={<UserCalendario    userId={me?.id} />} />
          <Route path="servicios"     element={<UserServicios     userId={me?.id} />} />
          <Route path="mis-servicios" element={<UserMisServicios  userId={me?.id} />} />
          <Route path="membresias"    element={<UserMembresias    userId={me?.id} />} />
          <Route path="profesionales" element={<UserProfesionales userId={me?.id} />} />
          <Route path="*"             element={<Navigate to="/user/servicios" replace />} />
        </Routes>
      </div>
    </div>
  )
}
