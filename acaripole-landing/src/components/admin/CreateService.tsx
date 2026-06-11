import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarDays, DollarSign, CreditCard, LogOut, Bell, Briefcase, ChevronDown, ChevronRight, LayoutDashboard, Menu } from 'lucide-react';
import { ServiciosDashboard } from './ServiciosDashboard';
import './MainDashboard.css';

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  bg: '#FFFFFF',
  bgPanel: '#F3F0FB',
  bgSecondary: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textBrown: '#475569',
  textMedium: '#5E5E5E',
  textMuted: '#94A3B8',
  border: '#DDD6FE',
  borderLight: '#DDD6FE',
}

const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: false },
  { icon: Users, label: 'Usuarios', active: false },
  { icon: CalendarDays, label: 'Calendario', active: false },
  { icon: Briefcase, label: 'Servicios', active: true },
  { icon: DollarSign,   label: 'Finanzas',      active: false },
  { icon: CreditCard,   label: 'Planes',    active: false },
]



export const CreateService: React.FC = () => {
  const navigate = useNavigate()
  const [hoveredNav, setHoveredNav] = useState<number | null>(null)
  const [isServicesExpanded, setIsServicesExpanded] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={{ background: C.bgPanel, borderRight: `1px solid ${C.border}` }}>
        <div style={{ padding: '28px 20px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 46, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: FONT_BODONI, fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: C.white }}>A</span>
            </div>
            <div>
              <div style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 600, color: C.gold, lineHeight: 1.2 }}>MEDIS</div>
              <div style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Estudio Admin</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 10px' }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontFamily: FONT_INTER, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 10px', display: 'block', marginBottom: 6 }}>Menú Principal</span>
            {NAV_ITEMS.map((item, i) => {
              const Icon = item.icon
              const isHovered = hoveredNav === i
              const isActive = item.active
              const handleNavClick = () => {
                if (item.label === 'Dashboard') navigate('/admin/dashboard')
                if (item.label === 'Calendario') navigate('/admin/classes')
                if (item.label === 'Usuarios') navigate('/admin/users')
                if (item.label === 'Inscripciones') navigate('/admin/inscripciones')
                if (item.label === 'Finanzas') navigate('/admin/finances')
                if (item.label === 'Planes') navigate('/admin/memberships')
                if (item.label === 'Servicios') setIsServicesExpanded(!isServicesExpanded)
              }
              return (
                <div key={item.label}>
                  <button
                    onClick={handleNavClick}
                    onMouseEnter={() => setHoveredNav(i)}
                    onMouseLeave={() => setHoveredNav(null)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                      background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHovered ? 'rgba(139,92,246,0.07)' : 'transparent',
                      borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
                      borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                      transition: 'background 0.18s ease',
                      cursor: (item.label === 'Dashboard' || item.label === 'Calendario' || item.label === 'Usuarios' || item.label === 'Servicios') ? 'pointer' : 'default',
                    }}
                  >
                    <Icon size={16} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: isActive ? C.white : isHovered ? C.gold : C.textBrown, transition: 'color 0.18s ease' }}>
                      {item.label}
                    </span>
                    {item.label === 'Servicios' && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                        {isServicesExpanded ? <ChevronDown size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} /> : <ChevronRight size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} />}
                      </div>
                    )}
                  </button>
                  {item.label === 'Servicios' && isServicesExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 34, marginTop: 4, marginBottom: 8, borderLeft: `2px solid ${C.goldLight}`, paddingLeft: 8 }}>
                      <span onClick={() => navigate('/admin/services/locations')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Creación de Sedes</span>
                      <span onClick={() => navigate('/admin/services/rooms')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Creación de Espacios</span>
                      <span onClick={() => navigate('/admin/services/create')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.gold, cursor: 'pointer', padding: '6px 4px' }}>Creación de Servicios</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        <div style={{ padding: '12px 10px' }}>
        </div>

        <div style={{ padding: '10px 10px 20px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); navigate('/login') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium }}>
            <LogOut size={16} strokeWidth={2} />
            <span style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────── */}
      <div className="main-content">

        {/* TOPBAR */}
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 600, color: C.gold, margin: 0 }}>MEDIS</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}><Bell size={16} /></button>
            <div style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${C.gold}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
          <ServiciosDashboard />
        </main>
      </div>
    </div>
  );
};
