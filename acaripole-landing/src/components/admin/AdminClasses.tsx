import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CalendarDays, DollarSign, CreditCard, CircleHelp, LogOut,
  Search, Bell, RefreshCw, ChevronDown, ChevronRight, ChevronLeft,
  ArrowRight, Briefcase, LayoutDashboard, Loader2, Clock, Menu,
} from 'lucide-react'
import './MainDashboard.css'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6', goldPale: '#38BDF8',
  bg: '#FFFFFF', bgPanel: '#F3F0FB', bgSecondary: '#F3F0FB',
  white: '#FFFFFF', text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',     active: false },
  { icon: Users,           label: 'Usuarios',      active: false },
  { icon: CalendarDays,    label: 'Calendario',    active: true  },
  { icon: Briefcase,       label: 'Servicios',     active: false },
  { icon: DollarSign,    label: 'Finanzas',      active: false },
  { icon: CreditCard,    label: 'Planes',    active: false },
]

const OFFER_TYPE_LABEL: Record<string, string> = {
  class: 'Clase', open_pole: 'Práctica Libre', event: 'Evento', workshop: 'Taller',
}
const OFFER_COLORS = ['#8B5CF6', '#4A6FA5', '#7C6B8A', '#2563EB', '#059669', '#3B82F6']
const TYPE_COLORS: Record<string, string> = {
  class: '#8B5CF6', open_pole: '#7C3AED', event: '#2563EB', workshop: '#3B82F6',
}
const DAY_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtTime(scheduledAt: string, durationMinutes: number): string {
  const s = new Date(scheduledAt)
  const e = new Date(s.getTime() + durationMinutes * 60000)
  const p = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  return `${p(s)} – ${p(e)}`
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function instructorColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + (h << 5) - h
  return OFFER_COLORS[Math.abs(h) % OFFER_COLORS.length]
}

function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const pad   = first.getDay() === 0 ? 6 : first.getDay() - 1
  const cells: (Date | null)[] = Array(pad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function offersForDay(offers: any[], day: Date) {
  return offers.filter(o => isSameDay(new Date(o.scheduledAt), day))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
}

// ── Animation ─────────────────────────────────────────────────────────────────
const CalendarStickmanAnimation = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem 2rem', background: C.white, borderRadius: '1.25rem', border: `1px solid ${C.borderLight}`, marginBottom: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT_BODONI, fontSize: '1.6rem', color: C.gold, fontWeight: 700, marginBottom: '0.25rem' }}>
        Programación 📅
      </div>
      <div style={{ fontSize: '1rem', color: C.textBrown }}>
        Organiza las citas y horarios del consultorio.
      </div>
    </div>
    <div style={{ flexShrink: 0 }}>
      <svg width="150" height="120" viewBox="0 0 150 120" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 6px 12px rgba(139,92,246,0.12))' }}>
        <defs>
          <linearGradient id="skin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f3f0fb" />
          </linearGradient>
          <linearGradient id="coat" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0.15)" />
          </linearGradient>
        </defs>

        {/* Calendario Fondo */}
        <rect x="65" y="30" width="60" height="70" rx="8" fill="rgba(139,92,246,0.05)" stroke={C.gold} strokeWidth="3" />
        <path d="M 65 55 L 125 55" stroke={C.gold} strokeWidth="3" />
        <path d="M 80 20 L 80 40" stroke={C.gold} strokeWidth="4" strokeLinecap="round" />
        <path d="M 110 20 L 110 40" stroke={C.gold} strokeWidth="4" strokeLinecap="round" />
        
        {/* Celdas del calendario */}
        <rect x="75" y="65" width="10" height="10" rx="2" fill="rgba(139,92,246,0.1)" />
        <rect x="90" y="65" width="10" height="10" rx="2" fill="rgba(139,92,246,0.1)" />
        <rect x="105" y="65" width="10" height="10" rx="2" fill="rgba(139,92,246,0.1)" />
        <rect x="75" y="80" width="10" height="10" rx="2" fill="rgba(139,92,246,0.1)" />
        <rect x="105" y="80" width="10" height="10" rx="2" fill="rgba(139,92,246,0.1)" />
        
        {/* Celda objetivo (donde señala) */}
        <rect x="90" y="80" width="10" height="10" rx="2" fill="rgba(139,92,246,0.2)" />
        
        {/* Checkmark animado */}
        <g>
          <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" keyTimes="0; 0.4; 0.5; 0.8; 0.9; 1" dur="4s" repeatCount="indefinite" />
          <path d="M 88 85 L 93 90 L 100 78" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Stickman */}
        <g transform="translate(30, 60)">
          
          {/* Cuerpo central para unir extremidades */}
          <line x1="0" y1="-12" x2="0" y2="10" stroke={C.goldLight} strokeWidth="3" strokeLinecap="round" />
          
          {/* Bata médica premium */}
          <path d="M -3 -10 L -10 12 C -10 14 10 14 10 12 L 3 -10 Z" fill="url(#coat)" stroke={C.goldLight} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M -3 -10 L 0 0 L 3 -10" fill="none" stroke={C.goldLight} strokeWidth="1" />
          <line x1="-6" y1="5" x2="-4" y2="5" stroke={C.goldLight} strokeWidth="1.5" strokeLinecap="round" />

          {/* Piernas */}
          <path d="M 0 10 Q -2 20 -4 30" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="-2" cy="30" rx="3.5" ry="1.5" fill={C.goldLight} />
          <path d="M 0 10 Q 2 20 4 30" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="6" cy="30" rx="3.5" ry="1.5" fill={C.goldLight} />

          {/* Cabeza Premium */}
          <circle cx="0" cy="-20" r="8.5" fill="url(#skin)" stroke={C.goldLight} strokeWidth="2" />
          {/* Cabello: cerquillo y coleta */}
          <path d="M -7 -25 Q 0 -32 8 -24" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M -7 -25 Q -12 -28 -14 -22" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Carita mirando a la derecha */}
          <circle cx="1" cy="-21" r="1.2" fill={C.goldLight} />
          <circle cx="5.5" cy="-21" r="1.2" fill={C.goldLight} />
          <circle cx="-0.5" cy="-19" r="1.5" fill="#f43f5e" opacity="0.4" />
          <circle cx="7" cy="-19" r="1.5" fill="#f43f5e" opacity="0.4" />
          <path d="M 1 -17 Q 3.5 -14.5 6 -17" fill="none" stroke={C.goldLight} strokeWidth="1.2" strokeLinecap="round" />

          {/* Estetoscopio */}
          <path d="M -3 -10 C -5 6 7 6 5 -10" fill="none" stroke="#1B1C1C" strokeWidth="1.2" />
          <circle cx="5" cy="-10" r="1.8" fill="#1B1C1C" />
          <circle cx="5" cy="-10" r="0.8" fill="#fff" />

          {/* Brazo Izquierdo (descansa con maletín) */}
          <g>
            <path d="M 0 -5 Q -6 0 -8 7" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
            <rect x="-13" y="7" width="10" height="7" rx="1.5" fill={C.white} stroke="#1B1C1C" strokeWidth="1.5" />
            <line x1="-10" y1="7" x2="-6" y2="7" stroke="#1B1C1C" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="-8" cy="10.5" r="1" fill="#1B1C1C" />
          </g>

          {/* Brazo Derecho (señala animado) */}
          <g>
            <animateTransform attributeName="transform" type="rotate" values="65 0 -5; 65 0 -5; 15 0 -5; 15 0 -5; 65 0 -5" keyTimes="0; 0.2; 0.4; 0.8; 1" dur="4s" repeatCount="indefinite" />
            <path d="M 0 -5 Q 12 -5 25 -5" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="25" cy="-5" r="1.5" fill={C.goldLight} />
          </g>
        </g>
      </svg>
    </div>
  </div>
)

// ── Component ─────────────────────────────────────────────────────────────────
export const AdminClasses: React.FC = () => {
  const navigate = useNavigate()
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const [calView, setCalView]               = useState<'week' | 'month'>('week')
  const [weekStart, setWeekStart]           = useState(() => getMondayOf(new Date()))
  const [monthDate, setMonthDate]           = useState(() => new Date())
  const [offers, setOffers]                 = useState<any[]>([])
  const [loading, setLoading]               = useState(true)
  const [hoveredNav, setHoveredNav]         = useState<number | null>(null)
  const [search, setSearch]                 = useState('')
  const [isServicesExpanded, setIsServicesExpanded] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const loadOffers = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/services/offers')
      const json = await res.json()
      if (json.success) setOffers(json.data.offers || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { loadOffers() }, [])

  const handleNavClick = (label: string) => {
    if (label === 'Dashboard')     { navigate('/admin/dashboard');   setIsMobileMenuOpen(false) }
    if (label === 'Calendario')    { navigate('/admin/classes');      setIsMobileMenuOpen(false) }
    if (label === 'Usuarios')      { navigate('/admin/users');        setIsMobileMenuOpen(false) }
    if (label === 'Finanzas')      { navigate('/admin/finances');     setIsMobileMenuOpen(false) }
    if (label === 'Planes')        { navigate('/admin/memberships');  setIsMobileMenuOpen(false) }
    if (label === 'Servicios')     setIsServicesExpanded(v => !v)
  }

  // Week days (7 days from weekStart)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd  = weekDays[6]

  // Month grid
  const monthGrid = getMonthGrid(monthDate.getFullYear(), monthDate.getMonth())

  // Filtered offers by search
  const filteredOffers = search
    ? offers.filter(o => o.title?.toLowerCase().includes(search.toLowerCase()) ||
        `${o.professional?.firstName ?? ''} ${o.professional?.lastName ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    : offers

  // Compute instructor load from real offers
  const instructorMap = new Map<string, { name: string; sessions: number; color: string }>()
  offers.forEach(o => {
    if (!o.professional) return
    const id = o.professional.id
    if (!instructorMap.has(id)) {
      instructorMap.set(id, {
        name: `${o.professional.firstName} ${o.professional.lastName}`.toUpperCase(),
        sessions: 0,
        color: instructorColor(id),
      })
    }
    instructorMap.get(id)!.sessions++
  })
  const totalSessions = Math.max(offers.length, 1)
  const instructorLoad = Array.from(instructorMap.values())
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 4)
    .map(i => ({ ...i, pct: Math.round((i.sessions / totalSessions) * 100) }))

  // ── Week title ──────────────────────────────────────────────────────────────
  const weekTitle = (() => {
    const fmtD = (d: Date) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}`
    return `${fmtD(weekStart)} – ${fmtD(weekEnd)} ${weekEnd.getFullYear()}`
  })()

  const monthTitle = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <style>{`
        .cls-search::placeholder { color: ${C.textMuted}; }
        .cls-card { transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; cursor: pointer; }
        .cls-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(139,92,246,0.08); border-color: ${C.goldLight} !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* Mobile overlay */}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={{ background: C.bgPanel, borderRight: `1px solid ${C.border}` }}>
        <div style={{ padding: '28px 20px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 46, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: FONT_BODONI, fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: C.white }}>A</span>
            </div>
            <div>
              <div style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 600, color: C.gold, lineHeight: 1.2 }}>MEDIS</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Panel Admin</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 10px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 10px', display: 'block', marginBottom: 10 }}>Menú Principal</span>
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon
            const isHovered = hoveredNav === i
            const isActive  = item.active
            return (
              <div key={item.label} style={{ marginBottom: 4 }}>
                <button onClick={() => handleNavClick(item.label)} onMouseEnter={() => setHoveredNav(i)} onMouseLeave={() => setHoveredNav(null)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHovered ? 'rgba(139,92,246,0.07)' : 'transparent', cursor: 'pointer', transition: 'background 0.18s' }}
                >
                  <Icon size={16} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: isActive ? C.white : isHovered ? C.gold : C.textBrown, transition: 'color 0.18s' }}>{item.label}</span>
                  {item.label === 'Servicios' && <div style={{ marginLeft: 'auto' }}>{isServicesExpanded ? <ChevronDown size={14} color={isActive ? C.white : C.textMedium} /> : <ChevronRight size={14} color={isActive ? C.white : C.textMedium} />}</div>}
                </button>
                {item.label === 'Servicios' && isServicesExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 34, marginTop: 4, marginBottom: 8, borderLeft: `2px solid ${C.goldLight}`, paddingLeft: 8 }}>
                    {[['Sedes','/admin/services/locations'],['Espacios','/admin/services/rooms'],['Servicios','/admin/services/create']].map(([l,p]) => (
                      <span key={l} onClick={() => navigate(p)} style={{ fontSize: 11, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.gold} onMouseLeave={e => e.currentTarget.style.color = C.textBrown}>{l}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div style={{ padding: '12px 10px' }}>
        </div>

        <div style={{ padding: '10px 10px 20px', borderTop: `1px solid ${C.borderLight}` }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', color: C.textMedium }}>
            <CircleHelp size={16} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ayuda</span>
          </a>
          <button onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); navigate('/login') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium }}>
            <LogOut size={16} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-content">

        {/* TOPBAR */}
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}>
              <Menu size={20} />
            </button>
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 600, color: C.gold, margin: 0, whiteSpace: 'nowrap' }}>MEDIS</h2>
            <div className="topbar-search" style={{ position: 'relative' }}>
              <Search size={15} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="cls-search" type="text" placeholder="Buscar servicio o médico..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: 260, background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 14px 9px 36px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: FONT_INTER }}
                onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button title="Actualizar" onClick={loadOffers} style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
            <button style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}>
              <Bell size={16} />
            </button>
            <div style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${C.gold}`, overflow: 'hidden', cursor: 'pointer' }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', background: C.bg }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            {/* Mobile search */}
            <div className="mobile-search-bar" style={{ marginBottom: 16, display: 'none' }}>
              <style>{`.mobile-search-bar { display: none !important; } @media (max-width: 768px) { .mobile-search-bar { display: block !important; } }`}</style>
              <div style={{ position: 'relative' }}>
                <Search size={15} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input className="cls-search" type="text" placeholder="Buscar servicio o médico..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px 10px 36px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: FONT_INTER }}
                  onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
            </div>

            {/* Animation Banner */}
            <CalendarStickmanAnimation />

            {/* Page header + controls */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Portal de Gestión</p>
                <h1 className="page-title-lg" style={{ fontFamily: FONT_BODONI, fontSize: 38, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Calendario de Servicios</h1>
                <p style={{ fontSize: 13, color: C.textMuted, margin: '8px 0 0', fontWeight: 500 }}>
                  {loading ? 'Cargando…' : `${offers.length} sesión${offers.length !== 1 ? 'es' : ''} programada${offers.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Semana / Mes */}
                <div style={{ display: 'flex', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  {(['semana','mes'] as const).map(v => (
                    <button key={v} onClick={() => setCalView(v === 'semana' ? 'week' : 'month')}
                      style={{ padding: '8px 18px', background: (calView === 'week' && v === 'semana') || (calView === 'month' && v === 'mes') ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: (calView === 'week' && v === 'semana') || (calView === 'month' && v === 'mes') ? C.white : C.textBrown, transition: 'all 0.2s', fontFamily: FONT_INTER }}>
                      {v}
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: '4px 6px' }}>
                  <button
                    onClick={() => calView === 'week'
                      ? setWeekStart(d => addDays(d, -7))
                      : setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textBrown, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgPanel}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text, minWidth: 160, textAlign: 'center' }}>
                    {calView === 'week' ? weekTitle : monthTitle}
                  </span>
                  <button
                    onClick={() => calView === 'week'
                      ? setWeekStart(d => addDays(d, 7))
                      : setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textBrown, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgPanel}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => { setWeekStart(getMondayOf(new Date())); setMonthDate(new Date()) }}
                    style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${C.borderLight}`, background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: FONT_INTER, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Hoy
                  </button>
                </div>
              </div>
            </div>

            {/* ── LOADING ── */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '60px 0', color: C.textMuted }}>
                <Loader2 size={20} className="spin" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Cargando servicios…</span>
              </div>
            )}

            {/* ── WEEK VIEW ── */}
            {!loading && calView === 'week' && (
              <div style={{ overflowX: 'auto', marginBottom: 32, paddingBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, minWidth: 840 }}>
                  {weekDays.map((day, di) => {
                    const isToday   = isSameDay(day, today)
                    const dayOffers = offersForDay(filteredOffers, day)
                    return (
                      <div key={di}>
                        {/* Day header */}
                        <div style={{ textAlign: 'center', marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: isToday ? C.gold : C.textMuted, marginBottom: 4 }}>
                            {DAY_SHORT[di]}
                          </div>
                          <div style={{ fontFamily: FONT_BODONI, fontSize: 26, fontWeight: 700, color: isToday ? C.gold : C.text, lineHeight: 1 }}>
                            {day.getDate()}
                          </div>
                          <div style={{ height: 2, background: isToday ? C.gold : C.borderLight, marginTop: 8, borderRadius: 1 }} />
                        </div>

                        {/* Offer cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {dayOffers.map(offer => {
                            const profId  = offer.professional?.id ?? offer.id
                            const color   = TYPE_COLORS[offer.offerType] ?? instructorColor(profId)
                            const profName = offer.professional ? `${offer.professional.firstName} ${offer.professional.lastName}` : null
                            const profInit = offer.professional ? initials(offer.professional.firstName, offer.professional.lastName) : '?'
                            const timeStr  = fmtTime(offer.scheduledAt, offer.durationMinutes)
                            const isFull   = offer.enrolledCount >= offer.capacity && offer.capacity > 0
                            const isActive = offer.status === 'published'
                            // Extract subtitle
                            const parts = (offer.title ?? '').split(' — ')
                            const displayName = parts[1] || parts[0]

                            return (
                              <div key={offer.id} className="cls-card"
                                style={{ background: C.white, borderTop: `1px solid ${isToday ? C.goldLight : C.borderLight}`, borderRight: `1px solid ${isToday ? C.goldLight : C.borderLight}`, borderBottom: `1px solid ${isToday ? C.goldLight : C.borderLight}`, borderLeft: `4px solid ${color}`, borderRadius: 12, padding: '12px 10px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', opacity: isActive ? 1 : 0.55 }}>
                                {/* Time */}
                                <div style={{ fontSize: 10, fontWeight: 700, color: color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={10} /> {timeStr}
                                </div>
                                {/* Title */}
                                <div style={{ fontFamily: FONT_BODONI, fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.2, marginBottom: 4 }}>
                                  {displayName}
                                </div>
                                {/* Type badge */}
                                <div style={{ fontSize: 9, fontWeight: 700, color, background: `${color}15`, padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  {OFFER_TYPE_LABEL[offer.offerType] ?? offer.offerType}
                                </div>
                                {/* Instructor */}
                                {profName && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: instructorColor(profId), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <span style={{ fontSize: 7, fontWeight: 800, color: C.white }}>{profInit}</span>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: C.textBrown, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profName}</span>
                                  </div>
                                )}
                                {/* Capacity + Price */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 9.5, fontWeight: 700, color: isFull ? '#ef4444' : C.gold, background: isFull ? 'rgba(239,68,68,0.08)' : 'rgba(139,92,246,0.06)', padding: '3px 7px', borderRadius: 5 }}>
                                    {offer.enrolledCount ?? 0}/{offer.capacity} {isFull ? '• Lleno' : ''}
                                  </span>
                                  {offer.price > 0 && (
                                    <span style={{ fontSize: 9.5, fontWeight: 700, color: C.textMuted, background: C.bgPanel, padding: '3px 7px', borderRadius: 5 }}>
                                      {fmtPrice(offer.price)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}

                          {dayOffers.length === 0 && (
                            <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: '40px 10px', textAlign: 'center' }}>
                              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, lineHeight: 1.5 }}>
                                Sin servicios<br />programados
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── MONTH VIEW ── */}
            {!loading && calView === 'month' && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, minWidth: 700 }}>
                  {/* Headers */}
                  {DAY_SHORT.map(h => (
                    <div key={h} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.textMuted, paddingBottom: 10, borderBottom: `1px solid ${C.borderLight}` }}>{h}</div>
                  ))}
                  {/* Days */}
                  {monthGrid.map((day, i) => {
                    if (!day) return <div key={i} style={{ minHeight: 80, background: C.bgPanel, border: `1px solid ${C.borderLight}`, borderRadius: 8, opacity: 0.3 }} />
                    const isToday   = isSameDay(day, today)
                    const dayOffers = offersForDay(filteredOffers, day)
                    return (
                      <div key={i} style={{ minHeight: 80, background: C.white, borderTop: `1px solid ${isToday ? C.gold : C.borderLight}`, borderRight: `1px solid ${isToday ? C.gold : C.borderLight}`, borderBottom: `1px solid ${isToday ? C.gold : C.borderLight}`, borderLeft: isToday ? `3px solid ${C.gold}` : `1px solid ${C.borderLight}`, borderRadius: 8, padding: '6px 6px 4px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => { if (!isToday) e.currentTarget.style.borderColor = C.goldLight }}
                        onMouseLeave={e => { if (!isToday) e.currentTarget.style.borderColor = C.borderLight }}>
                        {/* Day number */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? C.gold : 'transparent', color: isToday ? C.white : C.text }}>
                            {day.getDate()}
                          </span>
                        </div>
                        {/* Offer pills */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {dayOffers.slice(0, 3).map(offer => {
                            const color = TYPE_COLORS[offer.offerType] ?? C.gold
                            const parts = (offer.title ?? '').split(' — ')
                            const label = parts[1] || parts[0]
                            return (
                              <div key={offer.id} title={`${offer.title} · ${fmtTime(offer.scheduledAt, offer.durationMinutes)}`}
                                style={{ fontSize: 8.5, fontWeight: 600, background: `${color}12`, borderLeft: `2.5px solid ${color}`, color: C.textBrown, padding: '2px 4px', borderRadius: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {label}
                              </div>
                            )
                          })}
                          {dayOffers.length > 3 && (
                            <div style={{ fontSize: 8, fontWeight: 700, color: C.textMuted, paddingLeft: 4 }}>+{dayOffers.length - 3} más</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── ANALYTICS ── */}
            {!loading && (
              <div className="analytics-grid">

                {/* Instructor Load */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 600, color: C.text, margin: '0 0 20px' }}>Carga de Médicos</h3>
                  {instructorLoad.length === 0 ? (
                    <p style={{ fontSize: 13, color: C.textMuted, fontStyle: 'italic' }}>Sin datos aún.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {instructorLoad.map(inst => (
                        <div key={inst.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: C.textBrown }}>{inst.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>{inst.sessions} sesiones</span>
                          </div>
                          <div style={{ height: 6, background: C.bgPanel, borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${inst.pct}%`, background: `linear-gradient(90deg, ${inst.color}, ${C.goldLight})`, borderRadius: 99 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming this week */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 600, color: C.text, margin: '0 0 16px' }}>Esta Semana</h3>
                  {(() => {
                    const thisWeek = weekDays.flatMap(d => offersForDay(offers, d))
                      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                      .slice(0, 5)
                    if (thisWeek.length === 0) return <p style={{ fontSize: 13, color: C.textMuted, fontStyle: 'italic' }}>Sin sesiones esta semana.</p>
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {thisWeek.map((o, i) => {
                          const d = new Date(o.scheduledAt)
                          const parts = (o.title ?? '').split(' — ')
                          return (
                            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < thisWeek.length - 1 ? `1px solid ${C.borderLight}` : 'none', gap: 8 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parts[1] || parts[0]}</div>
                                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                                  {DAY_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]} {d.getDate()} · {String(d.getHours()).padStart(2,'0')}:{String(d.getMinutes()).padStart(2,'0')}
                                </div>
                              </div>
                              <span style={{ fontSize: 9, fontWeight: 700, color: o.status === 'published' ? '#16a34a' : C.textMuted, background: o.status === 'published' ? 'rgba(34,197,94,0.08)' : C.bgPanel, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {o.status === 'published' ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          )
                        })}
                        <button onClick={() => navigate('/admin/services/create')} style={{ marginTop: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.06em', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_INTER }}>
                          VER TODOS LOS SERVICIOS <ArrowRight size={12} />
                        </button>
                      </div>
                    )
                  })()}
                </div>

                {/* Summary card */}
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 260 }}>
                  <img src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80&w=600" alt="MEDIS" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2))' }} />
                  <div style={{ position: 'absolute', inset: 0, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: C.goldLight, marginBottom: 6, textTransform: 'uppercase' }}>Resumen</div>
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.white, margin: '0 0 10px', lineHeight: 1.2 }}>
                      {offers.length} sesión{offers.length !== 1 ? 'es' : ''} en total
                    </h3>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                      {Object.entries(
                        offers.reduce((acc, o) => { acc[o.offerType] = (acc[o.offerType] || 0) + 1; return acc }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <div key={type} style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                          {count as number} {OFFER_TYPE_LABEL[type] ?? type}{(count as number) !== 1 ? 's' : ''}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => navigate('/admin/services/create')} style={{ alignSelf: 'flex-start', padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.white, cursor: 'pointer', backdropFilter: 'blur(4px)', fontFamily: FONT_INTER }}>
                      Agregar Servicio
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                © 2026 Medis · Todos los derechos reservados
              </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
