import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, CalendarDays, Building2, Briefcase, Package,
  Percent, DollarSign, CreditCard, ChevronDown, ChevronRight,
  CircleHelp, LogOut, Plus,
} from 'lucide-react'

// Única fuente de verdad de la sidebar del panel admin: todas las pantallas
// deben renderizar este componente (nunca copiar el markup) para que estilos
// y tamaños no diverjan entre rutas.
const C = {
  gold: '#0D9488', goldLight: '#44CFCB',
  bgPanel: '#F0FDFA', white: '#FFFFFF',
  text: '#0F172A', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#CCFBF1', borderLight: '#CCFBF1',
}
const FONT_MANROPE = 'Manrope, Inter, sans-serif'
const FONT_INTER   = 'Inter, system-ui, sans-serif'

interface NavItem {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }>
  label: string
  path?: string
  // rutas adicionales que también marcan este ítem como activo
  match?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',       path: '/admin/dashboard' },
  { icon: Users,           label: 'Usuarios',        path: '/admin/users' },
  { icon: CalendarDays,    label: 'Calendario',      path: '/admin/classes' },
  { icon: Building2,       label: 'Infraestructura', match: ['/admin/services/locations', '/admin/services/rooms'] },
  { icon: Briefcase,       label: 'Servicios',       path: '/admin/services/create' },
  { icon: Package,         label: 'Inventario',      path: '/admin/inventory' },
  { icon: Percent,         label: 'Descuentos',      path: '/admin/discounts' },
  { icon: DollarSign,      label: 'Finanzas',        match: ['/admin/finances'] },
  { icon: CreditCard,      label: 'Planes',          path: '/admin/memberships', match: ['/admin/benefits'] },
]

const INFRA_SUBITEMS: Array<[string, string]> = [
  ['Sedes', '/admin/services/locations'],
  ['Espacios', '/admin/services/rooms'],
]

const FINANZAS_SUBITEMS: Array<[string, string]> = [
  ['Pagos', '/admin/finances'],
  ['Gastos', '/admin/finances/expenses'],
]

interface Props {
  isMobileOpen?: boolean
  onCloseMobile?: () => void
  /** Acción del botón "Nuevo Usuario"; por defecto navega a la pantalla de usuarios abriendo el modal */
  onNewUser?: () => void
}

export function AdminSidebar({ isMobileOpen = false, onCloseMobile, onNewUser }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [hoveredNav, setHoveredNav] = useState<number | null>(null)
  const [isInfraExpanded, setIsInfraExpanded] = useState(
    () => INFRA_SUBITEMS.some(([, p]) => pathname.startsWith(p)),
  )
  const [isFinanzasExpanded, setIsFinanzasExpanded] = useState(
    () => FINANZAS_SUBITEMS.some(([, p]) => pathname.startsWith(p)),
  )

  const isItemActive = (item: NavItem) =>
    (item.path != null && pathname === item.path) ||
    (item.match?.some(p => pathname.startsWith(p)) ?? false)

  const go = (path: string) => {
    navigate(path)
    onCloseMobile?.()
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .medis-admin-sidebar {
            position: fixed !important;
            top: 0; bottom: 0; left: 0;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .medis-admin-sidebar.open {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0,0,0,0.15);
          }
        }
      `}</style>

      {/* Overlay móvil */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 40 }}
        />
      )}

      <aside
        className={`medis-admin-sidebar ${isMobileOpen ? 'open' : ''}`}
        style={{
          width: 240, flexShrink: 0,
          background: C.bgPanel,
          borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
          fontFamily: FONT_INTER,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          <img
            src="/logo-opimed.svg"
            alt="OpiMed"
            style={{ height: 28, width: 'auto', display: 'block', marginBottom: 6 }}
          />
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Panel Admin</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '20px 12px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 10px', display: 'block', marginBottom: 10 }}>Menú Principal</span>
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon
            const isHov = hoveredNav === i
            const isActive = isItemActive(item)
            const isInfra = item.label === 'Infraestructura'
            const isFinanzas = item.label === 'Finanzas'
            return (
              <div key={item.label} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => (isInfra ? setIsInfraExpanded(v => !v) : isFinanzas ? setIsFinanzasExpanded(v => !v) : item.path && go(item.path))}
                  onMouseEnter={() => setHoveredNav(i)}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 9999,
                    background: isActive
                      ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`
                      : isHov ? 'rgba(13,148,136,0.07)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: FONT_INTER,
                  }}
                >
                  <Icon size={17} color={isActive ? C.white : isHov ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', color: isActive ? C.white : isHov ? C.gold : C.textBrown, transition: 'color 0.2s' }}>
                    {item.label}
                  </span>
                  {(isInfra || isFinanzas) && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      {(isInfra ? isInfraExpanded : isFinanzasExpanded)
                        ? <ChevronDown size={14} color={isActive ? C.white : C.textMedium} />
                        : <ChevronRight size={14} color={isActive ? C.white : C.textMedium} />}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {((isInfra && isInfraExpanded) || (isFinanzas && isFinanzasExpanded)) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ paddingLeft: 12, borderLeft: `2px solid ${C.goldLight}`, marginLeft: 24, paddingTop: 8, paddingBottom: 8, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(isInfra ? INFRA_SUBITEMS : FINANZAS_SUBITEMS).map(([lbl, path]) => (
                          <span
                            key={lbl}
                            onClick={() => go(path)}
                            style={{ fontSize: 12, fontWeight: 600, color: pathname === path ? C.gold : C.textBrown, cursor: 'pointer', padding: '5px 4px', transition: 'color 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
                            onMouseLeave={e => (e.currentTarget.style.color = pathname === path ? C.gold : C.textBrown)}
                          >{lbl}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>

        {/* Nuevo Usuario */}
        <div style={{ padding: '12px 16px' }}>
          <button
            onClick={() => {
              if (onNewUser) onNewUser()
              else go('/admin/users?new=1')
            }}
            style={{ width: '100%', padding: '12px 0', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', borderRadius: 9999, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(13,148,136,0.3)' }}
          >
            <Plus size={15} strokeWidth={3} />
            Nuevo Usuario
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <a
            href="#"
            onClick={e => e.preventDefault()}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', color: C.textMedium, transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E6FFFA')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <CircleHelp size={17} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>Ayuda</span>
          </a>
          <button
            onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); navigate('/login') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium, transition: 'background 0.2s', fontFamily: FONT_INTER }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E6FFFA')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={17} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
