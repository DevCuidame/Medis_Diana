import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, CalendarDays, DollarSign, CreditCard, Plus, CircleHelp, LogOut, Search, Bell, Settings, Star, UserPlus, MoreVertical, CheckCircle2, AlertCircle, RefreshCw, Briefcase, ChevronDown, ChevronRight, LayoutDashboard, Menu } from 'lucide-react'
import './MainDashboard.css'
import { CreateProfessionalModal } from './CreateProfessionalModal'
import { ProfessionalProfileModal } from './ProfessionalProfileModal'

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  goldPale: '#38BDF8',
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
  { icon: Users, label: 'Usuarios', active: true },
  { icon: CalendarDays, label: 'Calendario', active: false },
  { icon: Briefcase, label: 'Servicios', active: false },
  { icon: DollarSign,   label: 'Finanzas',      active: false },
  { icon: CreditCard,   label: 'Planes',    active: false },
]

interface UserCard {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: 'USER' | 'PROFESSIONAL' | 'ADMIN'
  bio: string | null
  specialties: string[] | null
  instagramUrl: string | null
  avatarUrl: string | null
  isActive: boolean
  isVerified: boolean
  createdAt: string
  status?: 'available' | 'in_session' | 'offline'
  avgScore?: number
  totalReviews?: number
}

interface Stats {
  totalProfessionals: number
  activeProfessionals: number
  weeklyBookings: number
  totalDisciplines: number
  avgSatisfaction: number
}

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=600'

function StatusDot({ status }: { status: string }) {
  if (!status) return null
  if (status === 'offline') return null
  const color = status === 'available' ? '#22c55e' : '#f97316'
  const label = status === 'available' ? 'Disponible Ahora' : 'En Sesión'
  return (
    <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '4px 12px', borderRadius: 9999, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ aspectRatio: '4/3', background: C.bgSecondary, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ padding: '18px 20px' }}>
        <div style={{ height: 20, background: C.bgSecondary, borderRadius: 6, marginBottom: 8, width: '65%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 12, background: C.bgSecondary, borderRadius: 6, marginBottom: 14, width: '45%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {[70, 55, 80].map(w => (
            <div key={w} style={{ height: 20, background: C.bgSecondary, borderRadius: 9999, width: w, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ height: 1, background: C.borderLight, marginBottom: 14 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ height: 14, background: C.bgSecondary, borderRadius: 6, width: 60, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 14, background: C.bgSecondary, borderRadius: 6, width: 60, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const AdminProfessionals: React.FC = () => {
  const navigate = useNavigate()
  const [professionals, setProfessionals] = useState<UserCard[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [hoveredNav, setHoveredNav] = useState<number | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedPro, setSelectedPro] = useState<UserCard | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isServicesExpanded, setIsServicesExpanded] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/users', { headers: authHeaders() }),
        fetch('/api/professionals/stats', { headers: authHeaders() }),
      ])

      if (!usersRes.ok) throw new Error('No se pudo cargar la lista de usuarios.')
      if (!statsRes.ok) throw new Error('No se pudo cargar las estadísticas.')

      const prosData = await usersRes.json()
      const statsData = await statsRes.json()

      setProfessionals(prosData.data.users)
      setStats(statsData.data.stats)
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleUpdated = (updated: any) => {
    setProfessionals(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setSelectedPro(null)
    setToast(`${updated.firstName} ${updated.lastName} fue actualizada.`)
    setTimeout(() => setToast(null), 4000)
  }

  const handleDeleted = (id: string) => {
    setProfessionals(prev => prev.filter(p => p.id !== id))
    setStats(s => s ? { ...s, totalProfessionals: Math.max(0, s.totalProfessionals - 1), activeProfessionals: Math.max(0, s.activeProfessionals - 1) } : s)
    setSelectedPro(null)
    setToast('Profesional eliminada del equipo.')
    setTimeout(() => setToast(null), 4000)
  }

  const handleCreated = (created: UserCard) => {
    setProfessionals(prev => [created, ...prev])
    if (created.role === 'PROFESSIONAL') {
      setStats(s => s ? { ...s, totalProfessionals: s.totalProfessionals + 1, activeProfessionals: s.activeProfessionals + 1 } : s)
    }
    setShowModal(false)
    setToast(`${created.firstName} ${created.lastName} fue incorporada al equipo.`)
    setTimeout(() => setToast(null), 4000)
  }

  const filtered = professionals.filter(p => {
    const q = search.toLowerCase()
    const specialtyList = p.specialties ?? []
    return (
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      specialtyList.some(s => s.toLowerCase().includes(q)) ||
      p.email.toLowerCase().includes(q)
    )
  })

  const metricCards = [
    { value: stats ? String(stats.activeProfessionals) : '—', label: 'Médicos Activos', icon: Users },
    { value: stats ? `${Math.round(stats.avgSatisfaction)}%` : '—', label: 'Satisfacción Pacientes', icon: Star },
    { value: stats ? String(stats.weeklyBookings) : '—', label: 'Reservas esta Semana', icon: Calendar },
    { value: stats ? String(stats.totalDisciplines) : '—', label: 'Disciplinas', icon: CheckCircle2 },
  ]

  return (
    <>
      {showModal && <CreateProfessionalModal onClose={() => setShowModal(false)} onSuccess={handleCreated} />}
      {selectedPro && (
        <ProfessionalProfileModal
          pro={selectedPro as any}
          onClose={() => setSelectedPro(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: C.text, color: C.white, padding: '14px 20px', borderRadius: 12, fontFamily: FONT_INTER, fontSize: 13, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', gap: 10, animation: 'toastIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}>
          <CheckCircle2 size={16} color="#22c55e" />
          {toast}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        @keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
        <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={{ background: C.bgPanel, borderRight: `1px solid ${C.border}` }}>

          {/* Logo */}
          <div style={{ padding: '28px 20px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 46, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: FONT_BODONI, fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: C.white }}>A</span>
              </div>
              <div>
                <div style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 600, color: C.gold, lineHeight: 1.2 }}>MEDIS</div>
                <div style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Panel Admin</div>
              </div>
            </div>
          </div>

          {/* Nav */}
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
                      <span onClick={() => navigate('/admin/services/create')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Creación de Servicios</span>
                    </div>
                  )}
                  </div>
                )
              })}
            </div>
          </nav>

          {/* New Class Button */}
          <div style={{ padding: '12px 10px' }}>
          </div>

          {/* Bottom */}
          <div style={{ padding: '10px 10px 20px', borderTop: `1px solid ${C.borderLight}` }}>
            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', color: C.textMedium }}>
              <CircleHelp size={16} strokeWidth={2} />
              <span style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ayuda</span>
            </a>
            <button
              onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); navigate('/login') }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium }}
            >
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
              <div className="topbar-search" style={{ position: 'relative' }}>
                <Search size={15} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Buscar usuario o especialidad..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: 320, background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 14px 9px 36px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none', transition: 'border-color 0.2s ease' }}
                  onFocus={(e) => (e.target.style.borderColor = C.gold)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={fetchData} title="Actualizar" style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}>
                <RefreshCw size={15} />
              </button>
              <button style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}>
                <Bell size={16} />
              </button>
              <button style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}>
                <Settings size={16} />
              </button>
              <div style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${C.gold}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
            <div style={{ maxWidth: 1140, margin: '0 auto' }}>

              {/* Page Header */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <p style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Portal de Gestión</p>
                  <h1 style={{ fontFamily: FONT_BODONI, fontSize: 42, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Usuarios</h1>
                </div>
                <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', borderRadius: 8, fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 4px 16px rgba(139,92,246,0.30)` }}>
                  <Plus size={14} strokeWidth={3} />
                  Nueva Cuenta
                </button>
              </div>

              {/* Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                {metricCards.map(({ value, label, icon: Icon }) => (
                  <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={C.gold} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontFamily: FONT_BODONI, fontSize: 26, fontWeight: 700, color: C.gold, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontFamily: FONT_INTER, fontSize: 11, color: C.textMedium, marginTop: 3, fontWeight: 500 }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section Title */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 600, color: C.text, margin: 0 }}>Equipo Actual</h3>
                {!loading && !error && (
                  <span style={{ fontFamily: FONT_INTER, fontSize: 11, color: C.textMuted, fontWeight: 500 }}>
                    {filtered.length} {filtered.length === 1 ? 'usuario' : 'usuarios'}
                    {search && ` · filtrando "${search}"`}
                  </span>
                )}
              </div>

              {/* Error State */}
              {error && (
                <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 12, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <AlertCircle size={20} color="#D32F2F" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONT_INTER, fontSize: 13, fontWeight: 600, color: '#D32F2F' }}>{error}</div>
                    <div style={{ fontFamily: FONT_INTER, fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Asegurate de que el backend esté corriendo en localhost:3000</div>
                  </div>
                  <button onClick={fetchData} style={{ padding: '8px 16px', background: '#D32F2F', color: C.white, border: 'none', borderRadius: 7, fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    Reintentar
                  </button>
                </div>
              )}

              {/* Professionals Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, paddingBottom: 32 }}>

                {/* Onboard Card */}
                {!loading && (
                  <div
                    onClick={() => setShowModal(true)}
                    onMouseEnter={() => setHoveredCard('new')}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{
                      background: hoveredCard === 'new' ? 'rgba(139,92,246,0.04)' : C.white,
                      border: `2px dashed ${hoveredCard === 'new' ? C.gold : C.border}`,
                      borderRadius: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '40px 24px',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease, border-color 0.2s ease',
                      minHeight: 300,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: C.bgSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, transition: 'transform 0.2s ease', transform: hoveredCard === 'new' ? 'scale(1.1)' : 'scale(1)' }}>
                      <UserPlus size={24} color={C.gold} strokeWidth={1.5} />
                    </div>
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 600, color: hoveredCard === 'new' ? C.gold : C.textBrown, margin: '0 0 8px', transition: 'color 0.2s ease' }}>
                      Incorporar<br/>Usuario
                    </h3>
                    <p style={{ fontFamily: FONT_INTER, fontSize: 12, color: C.textMuted, lineHeight: 1.6, margin: 0, maxWidth: 180 }}>
                      Añade una nueva cuenta al equipo médico del consultorio.
                    </p>
                  </div>
                )}

                {loading && [0, 1, 2].map(i => <SkeletonCard key={i} />)}

                {!loading && !error && filtered.map((pro) => {
                  const name = `${pro.firstName} ${pro.lastName}`
                  const tags = (pro.specialties ?? []).slice(0, 3)
                  const img = pro.avatarUrl || PLACEHOLDER_IMG
                  const isHovered = hoveredCard === pro.id
                  const totalReviews = pro.totalReviews ?? 0
                  const avgScore = pro.avgScore ?? 0
                  const status = pro.status ?? 'offline'

                  return (
                    <div
                      key={pro.id}
                      onMouseEnter={() => setHoveredCard(pro.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: C.white,
                        border: `1px solid ${isHovered ? C.goldLight : C.border}`,
                        borderRadius: 14,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: isHovered ? '0 12px 36px rgba(139,92,246,0.14)' : '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Image */}
                      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: C.bgSecondary }}>
                        <img
                          src={img}
                          alt={name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isHovered ? 'none' : 'grayscale(60%)', transition: 'filter 0.4s ease, transform 0.4s ease', transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
                        />
                        <StatusDot status={status} />
                      </div>

                      {/* Content */}
                      <div style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <h3 style={{ fontFamily: FONT_BODONI, fontSize: 19, fontWeight: 600, color: C.text, margin: '0 0 3px', lineHeight: 1.2 }}>{name}</h3>
                            <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                              {pro.role} · {pro.isVerified ? 'Verificada' : 'Pendiente'} · {pro.isActive ? 'Activa' : 'Inactiva'}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedPro(pro)}
                            title="Ver opciones"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 2 }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>

                        {/* Tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                          {tags.length > 0
                            ? tags.map(tag => (
                                <span key={tag} style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.textBrown, background: C.bgSecondary, padding: '3px 10px', borderRadius: 9999, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tag}</span>
                              ))
                            : <span style={{ fontFamily: FONT_INTER, fontSize: 10, color: C.textMuted }}>Sin especialidades</span>
                          }
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Star size={12} color={C.gold} fill={avgScore > 0 ? C.gold : 'none'} />
                            <span style={{ fontFamily: FONT_INTER, fontSize: 13, color: C.textBrown }}>
                              {avgScore > 0 ? avgScore.toFixed(1) : '—'}
                              <span style={{ color: C.textMuted, fontSize: 11 }}> ({totalReviews})</span>
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedPro(pro)}
                            style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${C.gold}`, paddingBottom: 1, padding: 0 }}
                          >
                            Ver Perfil
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Empty state when no results from search */}
                {!loading && !error && filtered.length === 0 && professionals.length > 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 24px', color: C.textMuted }}>
                    <Search size={32} color={C.border} style={{ marginBottom: 16 }} />
                    <p style={{ fontFamily: FONT_BODONI, fontSize: 18, color: C.textBrown, margin: '0 0 6px' }}>Sin resultados</p>
                    <p style={{ fontFamily: FONT_INTER, fontSize: 13, margin: 0 }}>No hay usuarios que coincidan con "{search}"</p>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                  © 2026 Medis · Todos los derechos reservados
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {error ? 'Sin conexión' : loading ? 'Cargando…' : 'Estado: Óptimo'}
                  </span>
                  {!error && !loading && <CheckCircle2 size={14} color="#22c55e" />}
                  {error && <AlertCircle size={14} color="#D32F2F" />}
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    </>
  )
}
