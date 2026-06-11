import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarDays, DollarSign, CreditCard, Briefcase, ChevronDown, ChevronRight, LayoutDashboard, Menu } from 'lucide-react';
import './MainDashboard.css';

const C = { gold: '#8B5CF6', goldLight: '#3B82F6', bg: '#FFFFFF', bgPanel: '#F3F0FB', bgSecondary: '#F3F0FB', white: '#FFFFFF', text: '#1B1C1C', textBrown: '#475569', textMedium: '#5E5E5E', textMuted: '#94A3B8', border: '#DDD6FE', borderLight: '#DDD6FE' };
const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: false },
  { icon: Users, label: 'Usuarios', active: false },
  { icon: CalendarDays, label: 'Calendario', active: false },
  { icon: Briefcase, label: 'Servicios', active: true },
  { icon: DollarSign,   label: 'Finanzas',      active: false },
  { icon: CreditCard,   label: 'Planes',    active: false },
]

export const CreateRoom: React.FC = () => {
  const navigate = useNavigate()
  const [hoveredNav, setHoveredNav] = useState<number | null>(null)
  const [isServicesExpanded, setIsServicesExpanded] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
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
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 2, background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHovered ? 'rgba(139,92,246,0.07)' : 'transparent', borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', transition: 'background 0.18s ease', cursor: 'pointer' }}
                  >
                    <Icon size={16} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: isActive ? C.white : isHovered ? C.gold : C.textBrown, transition: 'color 0.18s ease' }}>{item.label}</span>
                    {item.label === 'Servicios' && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                        {isServicesExpanded ? <ChevronDown size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} /> : <ChevronRight size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} />}
                      </div>
                    )}
                  </button>
                  {item.label === 'Servicios' && isServicesExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 34, marginTop: 4, marginBottom: 8, borderLeft: `2px solid ${C.goldLight}`, paddingLeft: 8 }}>
                      <span onClick={() => navigate('/admin/services/locations')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Creación de Sedes</span>
                      <span onClick={() => navigate('/admin/services/rooms')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.gold, cursor: 'pointer', padding: '6px 4px' }}>Creación de Espacios</span>
                      <span onClick={() => navigate('/admin/services/create')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Creación de Servicios</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>
      </aside>

      <div className="main-content">
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 600, color: C.gold, margin: 0 }}>MEDIS</h2>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: 1140, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Espacios</p>
                <h1 style={{ fontFamily: FONT_BODONI, fontSize: 42, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Creación de Espacios</h1>
              </div>
            </div>
            <div style={{ maxWidth: 800, padding: 32, background: C.white, borderRadius: 16, border: `1px solid ${C.border}` }}>
              <p style={{ color: C.textMedium }}>Formulario de creación de espacios (en construcción).</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
