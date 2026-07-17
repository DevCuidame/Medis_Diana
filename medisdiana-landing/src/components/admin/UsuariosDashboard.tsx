import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Users, Plus,
  Search, Bell, RefreshCw,
  UserCheck, UserMinus, CheckCircle2, AlertCircle, Menu, X,
  SlidersHorizontal, } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { CreateProfessionalModal } from './CreateProfessionalModal'
import { ConfirmationModal } from './ConfirmationModal'
import { ProfessionalProfileModal } from './ProfessionalProfileModal'
import type { User as UserType } from './types'
import { UsuarioCard } from './UsuarioCard'

// ── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  bg: '#FAFAFA',
  bgPanel: '#F3F0FB',
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

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type RoleFilter = 'Todos' | 'Usuario' | 'Administrador' | 'Profesional'
type StatusFilter = 'Todos' | 'Activos' | 'Inactivos'

// ── Skeleton Card ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{
    background: C.white,
    borderRadius: '1.25rem',
    border: `1px solid ${C.borderLight}`,
    padding: '1.75rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  }}>
    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F3F0FB', animation: 'pulse 1.5s ease-in-out infinite' }} />
    <div style={{ width: '60%', height: 16, borderRadius: 8, background: '#F3F0FB', animation: 'pulse 1.5s ease-in-out infinite' }} />
    <div style={{ width: '80%', height: 12, borderRadius: 8, background: '#F3F0FB', animation: 'pulse 1.5s ease-in-out infinite' }} />
    <div style={{ width: '40%', height: 24, borderRadius: 99, background: '#F3F0FB', animation: 'pulse 1.5s ease-in-out infinite' }} />
  </div>
)

// ── Big Doctor Stickman Animation ──────────────────────────────────────────
const BigDoctorStickman = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1rem 2rem', background: C.white, borderRadius: '1.25rem', border: `1px solid ${C.borderLight}`, marginBottom: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT_BODONI, fontSize: '1.6rem', color: C.gold, fontWeight: 700, marginBottom: '0.25rem' }}>
        ¡Hola de nuevo! 👋
      </div>
      <div style={{ fontSize: '1rem', color: C.textBrown }}>
        Administra todo tu equipo de trabajo desde este panel.
      </div>
    </div>
    <div style={{ flexShrink: 0 }}>
      {/* Big Waving Doctor SVG Premium */}
      <svg viewBox="0 0 110 190" width="80" height="135" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 8px 16px rgba(139,92,246,0.15))' }}>
        <defs>
          <linearGradient id="coatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f3f0fb" />
          </linearGradient>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fdfcff" />
          </linearGradient>
        </defs>

        {/* Head */}
        <circle cx="55" cy="22" r="16" fill="url(#skinGrad)" stroke="#8B5CF6" strokeWidth="2.5"/>
        {/* Hair */}
        <path d="M 42,20 Q 55,5 68,20" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
        <path d="M 42,20 Q 30,12 36,25" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
        {/* Blush */}
        <circle cx="47" cy="23.5" r="2.5" fill="#f43f5e" opacity="0.3"/>
        <circle cx="63" cy="23.5" r="2.5" fill="#f43f5e" opacity="0.3"/>
        {/* Eyes */}
        <circle cx="49" cy="19" r="2" fill="#8B5CF6"/>
        <circle cx="61" cy="19" r="2" fill="#8B5CF6"/>
        {/* Smile */}
        <path d="M51,26 Q55,30 59,26" stroke="#8B5CF6" strokeWidth="2" fill="none" strokeLinecap="round"/>

        {/* Doctor coat */}
        <path d="M 33 40 L 77 40 L 75 98 C 75 102 35 102 35 98 Z" fill="url(#coatGrad)" stroke="#8B5CF6" strokeWidth="2"/>
        {/* Lapels */}
        <path d="M 55 40 L 45 55 L 55 65" fill="#EEF2FF" stroke="#8B5CF6" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M 55 40 L 65 55 L 55 65" fill="#EEF2FF" stroke="#8B5CF6" strokeWidth="1.5" strokeLinejoin="round"/>
        {/* Cross */}
        <rect x="52" y="72" width="6" height="16" rx="1.5" fill="#8B5CF6"/>
        <rect x="47" y="77" width="16" height="6" rx="1.5" fill="#8B5CF6"/>

        {/* Left arm (static) */}
        <path d="M 35 52 Q 25 65 14 78" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="12" cy="80" r="4" fill="white" stroke="#8B5CF6" strokeWidth="2"/>

        {/* Right arm (WAVING) */}
        <motion.g
          style={{ transformOrigin: '75px 52px' }}
          animate={{ rotate: [-25, 20, -25] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M 75 52 Q 85 40 96 28" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="98" cy="26" r="4" fill="white" stroke="#8B5CF6" strokeWidth="2"/>
        </motion.g>

        {/* Stethoscope */}
        <path d="M 44 52 Q 34 72 46 86 Q 58 100 68 82" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <circle cx="68" cy="80" r="4.5" fill="#3B82F6"/>
        <circle cx="68" cy="80" r="2" fill="#fff"/>

        {/* Legs */}
        <path d="M 46 98 Q 42 120 38 148" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
        <path d="M 64 98 Q 68 120 72 148" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
        {/* Shoes */}
        <path d="M 38 148 C 30 148 26 153 38 153 Z" fill="#8B5CF6"/>
        <path d="M 72 148 C 80 148 84 153 72 153 Z" fill="#8B5CF6"/>
      </svg>
    </div>
  </div>
)

// ── Stat Card ─────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  iconBg: string
  iconColor: string
  accentColor?: string
}
const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, iconBg, iconColor, accentColor }) => {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.white,
        borderRadius: '1.25rem',
        padding: '1.5rem',
        border: `1px solid ${hov ? (accentColor ?? C.borderLight) : C.borderLight}`,
        boxShadow: hov ? `0 12px 40px rgba(0,0,0,0.07)` : '0 4px 16px rgba(0,0,0,0.03)',
        transform: hov ? 'translateY(-3px)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
      }}
    >
      <div style={{
        width: 56, height: 56,
        borderRadius: '1rem',
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={26} color={iconColor} strokeWidth={1.8} />
      </div>
      <div>
        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.3rem' }}>{label}</p>
        <p style={{ fontFamily: FONT_BODONI, fontSize: '2.2rem', fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  )
}

// ── Filter Pill ────────────────────────────────────────────────────────────
interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
}
const FilterPill: React.FC<FilterPillProps> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '7px 16px',
      borderRadius: '9999px',
      fontSize: '0.8rem',
      fontWeight: 600,
      border: active ? 'none' : `1px solid ${C.borderLight}`,
      background: active ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : C.white,
      color: active ? C.white : C.textBrown,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s ease',
      boxShadow: active ? `0 4px 12px rgba(139,92,246,0.25)` : '0 1px 4px rgba(0,0,0,0.04)',
      letterSpacing: '0.03em',
    }}
  >
    {label}
  </button>
)

// ── Main Component ─────────────────────────────────────────────────────────
export const UsuariosDashboard: React.FC = () => {
  const navigate = useNavigate()

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // El botón "Nuevo Usuario" de la sidebar en otras pantallas llega con ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowModal(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const [selectedPro, setSelectedPro] = useState<any | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view')
  const [pendingDelete, setPendingDelete] = useState<null | { id: string; url: string }>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const handleCardDelete = async (userRaw: any) => {
    setPendingDelete({ id: userRaw.id, url: `/api/users/${userRaw.id}` });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      const res = await fetch(pendingDelete.url, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) {
        let msg = 'Error al eliminar el usuario.';
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch { /* ignore parse error */ }
        showToast(msg, 'error');
        return;
      }
      handleDeleted(pendingDelete.id);
    } catch {
      showToast('Error de red al eliminar el usuario.', 'error');
    } finally {
      setPendingDelete(null);
      setShowDeleteModal(false);
    }
  };

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('Todos')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const usersRes = await fetch('/api/users', { headers: authHeaders() })
      if (usersRes.status === 401) {
        navigate('/login')
        return
      }
      if (!usersRes.ok) throw new Error(`Error ${usersRes.status}: No se pudo cargar la lista de usuarios.`)
      const prosData = await usersRes.json()
      setUsers(prosData.data.users)
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleUpdated = (updated: any) => {
    setUsers(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setSelectedPro(null)
    showToast(`${updated.firstName} ${updated.lastName} fue actualizado/a.`)
  }
  const handleDeleted = (id: string) => {
    setUsers(prev => prev.filter(p => p.id !== id))
    setSelectedPro(null)
    showToast('Usuario eliminado del equipo.')
  }
  const handleCreated = (created: any) => {
    setUsers(prev => [created, ...prev])
    setShowModal(false)
    showToast(`${created.firstName} ${created.lastName} fue incorporado/a al equipo.`)
  }

  const handleToggleStatus = async (userRaw: any, newStatus: boolean) => {
    const url = `/api/users/${userRaw.id}`
    
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userRaw.id ? { ...u, isActive: newStatus } : u))
    
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ isActive: newStatus })
      })
      if (!res.ok) throw new Error()
      showToast(newStatus ? 'Usuario activado.' : 'Usuario desactivado.')
    } catch (err) {
      showToast('Error al cambiar el estado.', 'error')
      fetchData() // Rollback
    }
  }

  const mappedUsers = useMemo(() => users.map(u => ({
    id: u.id,
    nombre: `${u.firstName} ${u.lastName}`,
    documento: u.email,
    rol: u.role === 'ADMIN' ? 'Administrador' : u.role === 'USER' ? 'Usuario' : 'Profesional',
    estado: u.isActive ? 'Activa' : 'Inactiva',
    imagen: u.avatarUrl || undefined,
    especialidades: u.specialties || [],
    raw: u,
  } as UserType)), [users])

  const filteredUsers = useMemo(() => mappedUsers.filter(user => {
    const matchSearch = user.nombre.toLowerCase().includes(search.toLowerCase()) ||
      user.documento.toLowerCase().includes(search.toLowerCase()) ||
      user.especialidades?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
    const matchRole = roleFilter === 'Todos' || user.rol === roleFilter
    const matchStatus = statusFilter === 'Todos' ||
      (statusFilter === 'Activos' && user.estado === 'Activa') ||
      (statusFilter === 'Inactivos' && user.estado === 'Inactiva')
    return matchSearch && matchRole && matchStatus
  }), [mappedUsers, search, roleFilter, statusFilter])

  const stats = useMemo(() => ({
    total: mappedUsers.length,
    activos: mappedUsers.filter(u => u.estado === 'Activa').length,
    inactivos: mappedUsers.filter(u => u.estado === 'Inactiva').length,
  }), [mappedUsers])

  const hasActiveFilters = search || roleFilter !== 'Todos' || statusFilter !== 'Todos'

  return (
    <>
      {/* Global styles */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes toastIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastOut { to{opacity:0;transform:translateY(16px)} }
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.2);border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(139,92,246,0.35)}
      `}</style>

      {/* Modals */}
      {showDeleteModal && (
        <ConfirmationModal
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      {showModal && <CreateProfessionalModal onClose={() => setShowModal(false)} onSuccess={handleCreated} />}
      {selectedPro && (
        <ProfessionalProfileModal
          pro={selectedPro}
          initialMode={modalMode}
          onClose={() => setSelectedPro(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 999,
              background: toast.type === 'error' ? '#1B1C1C' : '#1B1C1C',
              color: C.white,
              padding: '14px 22px', borderRadius: 14,
              fontFamily: FONT_INTER, fontSize: 13, fontWeight: 500,
              boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
              display: 'flex', alignItems: 'center', gap: 12,
              maxWidth: 360,
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 10, background: toast.type === 'error' ? 'rgba(244,63,94,0.15)' : 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={16} color="#22c55e" />
            </div>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, overflow: 'hidden', fontFamily: FONT_INTER }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <style>{`
          @media (min-width: 769px) { .menu-toggle-btn { display: none !important; } }
        `}</style>
        <AdminSidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onNewUser={() => setShowModal(true)}
        />

        {/* ── MAIN AREA ────────────────────────────────────────────────── */}
        <div className="main-with-sidebar" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* TOPBAR */}
          <header style={{
            height: 72, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${C.borderLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px', flexShrink: 0,
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button className="menu-toggle-btn" onClick={() => setIsMobileMenuOpen(v => !v)}
                style={{ width: 40, height: 40, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Gestión de Usuarios</h2>
                <p style={{ fontSize: 12, color: C.textMuted, margin: 0, marginTop: 3, fontWeight: 500 }}>Administra roles, accesos y perfiles</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={fetchData} title="Actualizar"
                style={{ width: 40, height: 40, borderRadius: 12, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold, transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = C.white)}
                onMouseLeave={e => (e.currentTarget.style.background = C.bgPanel)}
              >
                <RefreshCw size={16} />
              </button>
              <button style={{ width: 40, height: 40, borderRadius: 12, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold, transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = C.white)}
                onMouseLeave={e => (e.currentTarget.style.background = C.bgPanel)}
              >
                <Bell size={17} />
              </button>
              <div style={{ width: 40, height: 40, borderRadius: 12, border: `2.5px solid ${C.gold}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 10px rgba(139,92,246,0.2)' }}>
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </header>

          {/* SCROLL CONTENT */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.75rem', background: 'radial-gradient(circle at top right, rgba(139,92,246,0.03), transparent 500px)' }}>
            <div style={{ maxWidth: '100%', margin: '0 auto' }}>

              {/* ── Big Banner ── */}
              <BigDoctorStickman />

              {/* ── Stats row ── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}
              >
                <StatCard icon={Users} label="Total de Usuarios" value={stats.total} iconBg="rgba(139,92,246,0.1)" iconColor={C.gold} accentColor="rgba(139,92,246,0.2)" />
                <StatCard icon={UserCheck} label="Usuarios Activos" value={stats.activos} iconBg="rgba(34,197,94,0.1)" iconColor="#16A34A" accentColor="rgba(34,197,94,0.2)" />
                <StatCard icon={UserMinus} label="Usuarios Inactivos" value={stats.inactivos} iconBg="rgba(244,63,94,0.08)" iconColor="#E11D48" accentColor="rgba(244,63,94,0.15)" />
              </motion.div>

              {/* ── Error banner ── */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 14, padding: '16px 20px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 14 }}
                  >
                    <AlertCircle size={20} color="#D32F2F" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#D32F2F', margin: 0 }}>{error}</p>
                      <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                        {error?.includes('401') || error?.includes('Unauthorized')
                          ? 'Sesión expirada — vuelve a iniciar sesión.'
                          : 'Verifica tu conexión o intenta de nuevo.'}
                      </p>
                    </div>
                    <button onClick={fetchData} style={{ padding: '8px 16px', background: '#D32F2F', color: C.white, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      Reintentar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Search & Filters ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ background: C.white, borderRadius: '1.25rem', border: `1px solid ${C.borderLight}`, padding: '1.25rem 1.5rem', marginBottom: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  {/* Search */}
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={16} color="#A09990" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, email o especialidad…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 11, paddingBottom: 11,
                        background: '#FAFAFA', border: `1px solid ${C.borderLight}`, borderRadius: 12,
                        fontSize: 14, color: C.text, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                        fontFamily: FONT_INTER, boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = C.goldLight; e.target.style.boxShadow = `0 0 0 3px rgba(59,130,246,0.12)` }}
                      onBlur={e => { e.target.style.borderColor = C.borderLight; e.target.style.boxShadow = 'none' }}
                    />
                  </div>

                  {/* Filter toggle */}
                  <button
                    onClick={() => setShowFilterPanel(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 18px', borderRadius: 12, border: `1px solid ${showFilterPanel ? C.goldLight : C.borderLight}`,
                      background: showFilterPanel ? 'rgba(59,130,246,0.08)' : C.bgPanel,
                      color: showFilterPanel ? C.gold : C.textBrown,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }}
                  >
                    <SlidersHorizontal size={15} />
                    Filtros
                    {hasActiveFilters && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, display: 'inline-block' }} />
                    )}
                  </button>

                  {/* CTA */}
                  <button
                    onClick={() => setShowModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', boxShadow: `0 4px 14px rgba(139,92,246,0.28)`, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                  >
                    <Plus size={15} strokeWidth={3} />
                    Nuevo Usuario
                  </button>
                </div>

                {/* Filter panel */}
                <AnimatePresence>
                  {showFilterPanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: '1.1rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Estado</span>
                          {(['Todos', 'Activos', 'Inactivos'] as StatusFilter[]).map(s => (
                            <FilterPill key={s} label={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
                          ))}
                        </div>
                        <div style={{ width: 1, height: 28, background: C.borderLight, flexShrink: 0 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Rol</span>
                          {(['Todos', 'Usuario', 'Administrador', 'Profesional'] as RoleFilter[]).map(r => (
                            <FilterPill key={r} label={r} active={roleFilter === r} onClick={() => setRoleFilter(r)} />
                          ))}
                        </div>
                        {hasActiveFilters && (
                          <button
                            onClick={() => { setSearch(''); setRoleFilter('Todos'); setStatusFilter('Todos') }}
                            style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#E11D48', background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.15)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* ── Results info ── */}
              {!loading && !error && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>
                    Mostrando <strong style={{ color: C.textBrown }}>{filteredUsers.length}</strong> de {stats.total} usuarios
                    {hasActiveFilters && <span style={{ color: C.goldLight }}> · filtros activos</span>}
                  </p>
                </div>
              )}

              {/* ── User Grid ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}
              >
                {/* Add user card */}
                {!loading && (
                  <button
                    onClick={() => setShowModal(true)}
                    style={{
                      minHeight: 260,
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.02), rgba(59,130,246,0.03))',
                      borderRadius: '1.25rem',
                      border: `2px dashed ${C.borderLight}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      color: C.textMuted,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = C.goldLight
                      e.currentTarget.style.background = 'rgba(139,92,246,0.04)'
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 12px 36px rgba(139,92,246,0.1)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = C.borderLight
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.02), rgba(59,130,246,0.03))'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={24} color={C.textMuted} />
                    </div>
                    <span style={{ fontFamily: FONT_BODONI, fontSize: '1.1rem', color: C.textBrown }}>Incorporar</span>
                    <span style={{ fontFamily: FONT_BODONI, fontSize: '1.1rem', color: C.textBrown, marginTop: -8 }}>Usuario</span>
                  </button>
                )}

                {/* Skeleton loading */}
                {loading && [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}

                {/* User cards */}
                {!loading && !error && filteredUsers.map(user => (
                  <UsuarioCard
                    key={user.id}
                    user={user}
                    onView={() => {
                      setModalMode('view')
                      setSelectedPro(user.raw)
                    }}
                    onEdit={() => {
                      setModalMode('edit')
                      setSelectedPro(user.raw)
                    }}
                    onToggleStatus={(newStatus) => handleToggleStatus(user.raw, newStatus)}
                    onDelete={() => handleCardDelete(user.raw)}
                  />
                ))}
              </motion.div>

              {/* Empty state */}
              {!loading && !error && filteredUsers.length === 0 && users.length > 0 && (
                <div style={{ padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textMuted, gap: '1rem' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                    <Search size={32} color={C.textMuted} />
                  </div>
                  <p style={{ fontFamily: FONT_BODONI, fontSize: '1.4rem', color: C.textBrown }}>Sin resultados</p>
                  <p style={{ fontSize: '0.95rem', color: C.textMuted }}>No hay usuarios que coincidan con tus filtros.</p>
                  <button
                    onClick={() => { setSearch(''); setRoleFilter('Todos'); setStatusFilter('Todos') }}
                    style={{ marginTop: '0.5rem', padding: '10px 24px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px rgba(139,92,246,0.28)` }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}

              {/* Footer */}
              <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 20, paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                  © 2026 Medis · Todos los derechos reservados
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: error ? '#F43F5E' : loading ? '#F59E0B' : '#22C55E', boxShadow: `0 0 0 3px ${error ? 'rgba(244,63,94,0.15)' : loading ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)'}` }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {error ? 'Sin conexión' : loading ? 'Cargando…' : 'Estado Óptimo'}
                  </span>
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    </>
  )
}
