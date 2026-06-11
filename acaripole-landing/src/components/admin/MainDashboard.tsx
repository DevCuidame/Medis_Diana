import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Calendar, CalendarDays, DollarSign, LogOut, CreditCard,
  Bell, Briefcase, ChevronDown, ChevronRight,
  LayoutDashboard, ClipboardList, Activity, CheckCircle2, XCircle, Menu
} from 'lucide-react';
import './MainDashboard.css';

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textBrown: '#475569',
  textMedium: '#5E5E5E',
  textMuted: '#94A3B8',
  borderLight: '#DDD6FE',
};

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Users, label: 'Usuarios', active: false },
  { icon: CalendarDays, label: 'Calendario', active: false },
  { icon: Briefcase, label: 'Servicios', active: false },
  { icon: DollarSign,   label: 'Finanzas',      active: false },
  { icon: CreditCard,   label: 'Planes',    active: false },
];

interface TodayService {
  id: string; title: string; scheduledAt: string; durationMinutes: number
  enrolledCount: number; capacity: number; status: string
  professional?: { firstName: string; lastName: string }
  location?: { name: string }
}

function authH(): HeadersInit {
  const t = localStorage.getItem('accessToken')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export const MainDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredNav, setHoveredNav] = useState<number | null>(null);
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [occupancy, setOccupancy]         = useState(0);
  const [activeUsers, setActiveUsers]     = useState(0);
  const [totalUsers, setTotalUsers]       = useState(0);
  const [todayServices, setTodayServices] = useState<TodayService[]>([]);
  const [loadingToday, setLoadingToday]   = useState(true);

  useEffect(() => {
    const today = new Date()

    // Fetch services
    fetch('/api/services/offers', { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const todaySvcs: TodayService[] = (d.data.offers || []).filter((o: any) =>
            isSameDay(new Date(o.scheduledAt), today) && o.status === 'published'
          ).sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

          setTodayServices(todaySvcs)

          const totalEnrolled  = todaySvcs.reduce((s: number, o: TodayService) => s + (o.enrolledCount ?? 0), 0)
          const totalCapacity  = todaySvcs.reduce((s: number, o: TodayService) => s + (o.capacity ?? 0), 0)
          setOccupancy(totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0)
        }
        setLoadingToday(false)
      })
      .catch(() => setLoadingToday(false))

    // Fetch users
    fetch('/api/users', { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const users = d.data.users || []
          setTotalUsers(users.length)
          setActiveUsers(users.filter((u: any) => u.isActive).length)
        }
      })
      .catch(() => {})
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const CircularProgress = ({ percentage }: { percentage: number }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ position: 'absolute' }}>
          {/* Background circle */}
          <circle cx="45" cy="45" r={radius} fill="none" stroke="#F3F0FB" strokeWidth="8" />
          {/* Progress circle */}
          <circle 
            className="progress-ring__circle"
            cx="45" cy="45" r={radius} 
            fill="none" 
            stroke="url(#brandGradient)" 
            strokeWidth="8" 
            strokeLinecap="round"
            style={{ strokeDasharray: circumference, strokeDashoffset }}
          />
          <defs>
            <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
          <span className="stat-value" style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1 }}>
            {percentage}%
          </span>
        </div>
      </div>
    );
  };


  return (
    <div className="dashboard-container">
      
      {/* ── MOBILE OVERLAY ── */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div style={{ padding: '28px 20px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 46, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: '"Bodoni Moda", Georgia, serif', fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: C.white }}>A</span>
            </div>
            <div>
              <div style={{ fontFamily: '"Bodoni Moda", Georgia, serif', fontSize: 17, fontWeight: 600, color: C.gold, lineHeight: 1.2 }}>MEDIS</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Estudio Admin</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '20px 14px' }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 10px', display: 'block', marginBottom: 10 }}>Menú Principal</span>
            {NAV_ITEMS.map((item, i) => {
              const Icon = item.icon;
              const isHovered = hoveredNav === i;
              const isActive = item.active;
              
              const handleNavClick = () => {
                if (item.label === 'Dashboard') navigate('/admin/dashboard');
                if (item.label === 'Calendario') navigate('/admin/classes');
                if (item.label === 'Usuarios') navigate('/admin/users');
                if (item.label === 'Inscripciones') navigate('/admin/inscripciones')
                if (item.label === 'Finanzas') navigate('/admin/finances');
                if (item.label === 'Planes') navigate('/admin/memberships');
                if (item.label === 'Servicios') {
                  setIsServicesExpanded(!isServicesExpanded);
                } else {
                  setIsMobileMenuOpen(false);
                }
              };
              
              return (
                <div key={item.label} style={{ marginBottom: 4 }}>
                  <button
                    onClick={handleNavClick}
                    onMouseEnter={() => setHoveredNav(i)}
                    onMouseLeave={() => setHoveredNav(null)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHovered ? 'rgba(139,92,246,0.07)' : 'transparent',
                      border: 'none',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {isActive && (
                      <motion.div layoutId="activeNav" style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`, zIndex: 0, borderRadius: 10 }} />
                    )}
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Icon size={18} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0, transition: 'color 0.2s' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', marginLeft: 12, color: isActive ? C.white : isHovered ? C.gold : C.textBrown, transition: 'color 0.2s' }}>
                        {item.label}
                      </span>
                      {item.label === 'Servicios' && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                          {isServicesExpanded ? <ChevronDown size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} /> : <ChevronRight size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} />}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {item.label === 'Servicios' && isServicesExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 38, marginTop: 8, marginBottom: 8, borderLeft: `2px solid ${C.goldLight}`, paddingLeft: 12 }}>
                          <span onClick={() => navigate('/admin/services/locations')} style={{ fontSize: 12, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = C.gold} onMouseLeave={(e) => e.currentTarget.style.color = C.textBrown}>Sedes</span>
                          <span onClick={() => navigate('/admin/services/rooms')} style={{ fontSize: 12, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = C.gold} onMouseLeave={(e) => e.currentTarget.style.color = C.textBrown}>Espacios</span>
                          <span onClick={() => navigate('/admin/services/create')} style={{ fontSize: 12, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = C.gold} onMouseLeave={(e) => e.currentTarget.style.color = C.textBrown}>Servicios</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </nav>


        <div style={{ padding: '16px 20px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <button
            onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); navigate('/login'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium, transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F3F0FB'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={18} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="main-content">
        
        {/* TOPBAR */}
        <header style={{ height: 72, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="menu-toggle" onClick={toggleMobileMenu}>
              <Menu size={20} />
            </button>
            <h2 style={{ fontFamily: '"Bodoni Moda", Georgia, serif', fontSize: 24, fontWeight: 600, color: C.gold, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
              MEDIS <span className="overview-label" style={{ fontSize: 12, fontFamily: '"Hanken Grotesk", sans-serif', color: C.textMuted, fontWeight: 500, letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>/ Overview</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ width: 40, height: 40, borderRadius: 12, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold, transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = C.white} onMouseLeave={(e) => e.currentTarget.style.background = C.bgPanel}>
              <Bell size={18} />
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 12, border: `2px solid ${C.gold}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)' }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem', background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.03), transparent 400px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}
            >
              <div>
                <h1 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '2.5rem', color: '#1B1C1C', marginBottom: '0.5rem', lineHeight: 1.2 }}>Panel Principal</h1>
                <p style={{ color: C.textMuted, fontSize: '1.1rem' }}>Bienvenido/a al panel de administración del consultorio.</p>
              </div>

              {/* Doctor Stickman */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{ flexShrink: 0 }}
              >
                <svg viewBox="0 0 110 190" width="90" height="155" xmlns="http://www.w3.org/2000/svg">
                  {/* Head */}
                  <circle cx="55" cy="22" r="16" fill="white" stroke="#8B5CF6" strokeWidth="2.5"/>
                  {/* Eyes */}
                  <circle cx="49" cy="19" r="2" fill="#8B5CF6"/>
                  <circle cx="61" cy="19" r="2" fill="#8B5CF6"/>
                  {/* Smile */}
                  <path d="M48,26 Q55,33 62,26" stroke="#8B5CF6" strokeWidth="2" fill="none" strokeLinecap="round"/>

                  {/* Doctor coat */}
                  <rect x="33" y="40" width="44" height="58" rx="5" fill="white" stroke="#8B5CF6" strokeWidth="2"/>
                  {/* Lapels */}
                  <path d="M55,40 L45,55 L55,60" fill="#EEF2FF" stroke="#8B5CF6" strokeWidth="1.5"/>
                  <path d="M55,40 L65,55 L55,60" fill="#EEF2FF" stroke="#8B5CF6" strokeWidth="1.5"/>
                  {/* Cross */}
                  <rect x="52" y="68" width="6" height="16" rx="1.5" fill="#8B5CF6"/>
                  <rect x="48" y="72" width="14" height="6" rx="1.5" fill="#8B5CF6"/>

                  {/* Left arm (static) */}
                  <line x1="33" y1="52" x2="14" y2="78" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
                  <circle cx="12" cy="80" r="4" fill="white" stroke="#8B5CF6" strokeWidth="2"/>

                  {/* Right arm (WAVING) */}
                  <motion.g
                    style={{ transformOrigin: '77px 52px' }}
                    animate={{ rotate: [-25, 20, -25] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <line x1="77" y1="52" x2="96" y2="28" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="98" cy="26" r="4" fill="white" stroke="#8B5CF6" strokeWidth="2"/>
                  </motion.g>

                  {/* Stethoscope */}
                  <path d="M44,52 Q34,72 46,84 Q58,96 68,80" stroke="#3B82F6" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                  <circle cx="68" cy="78" r="4" fill="#3B82F6" opacity="0.8"/>

                  {/* Legs */}
                  <line x1="46" y1="98" x2="36" y2="148" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="64" y1="98" x2="74" y2="148" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
                  {/* Shoes */}
                  <ellipse cx="33" cy="151" rx="9" ry="4" fill="#8B5CF6"/>
                  <ellipse cx="77" cy="151" rx="9" ry="4" fill="#8B5CF6"/>
                </svg>
              </motion.div>
            </motion.div>

            {/* Top Grid */}
            <div className="dashboard-grid">
              
              {/* Actividad del Día */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="glass-card"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
                      <Activity size={24} />
                    </div>
                    <h2 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1.5rem', color: C.text, margin: 0 }}>Actividad del Día</h2>
                  </div>
                  
                  {/* Occupancy ring + count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.5rem' }}>
                    <CircularProgress percentage={occupancy} />
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Ocupación Actual</p>
                      <p style={{ fontSize: '1.4rem', fontWeight: 700, color: C.text, margin: 0, fontFamily: '"Bodoni Moda", serif' }}>
                        {loadingToday ? '—' : `${todayServices.reduce((s, o) => s + (o.enrolledCount ?? 0), 0)} / ${todayServices.reduce((s, o) => s + (o.capacity ?? 0), 0)}`}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: C.textMuted, margin: '2px 0 0' }}>
                        {todayServices.length} servicio{todayServices.length !== 1 ? 's' : ''} hoy
                      </p>
                    </div>
                  </div>

                  {/* Today's services list */}
                  {loadingToday ? (
                    <div style={{ background: 'rgba(245,243,243,0.6)', borderRadius: '1rem', padding: '1rem 1.2rem', border: '1px solid #DDD6FE', fontSize: 13, color: C.textMuted }}>Cargando…</div>
                  ) : todayServices.length === 0 ? (
                    <div style={{ background: 'rgba(245,243,243,0.6)', borderRadius: '1rem', padding: '1rem 1.2rem', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Calendar size={18} color={C.textMuted} />
                      <p style={{ fontSize: '0.9rem', color: C.textMuted, margin: 0 }}>Sin servicios activos hoy</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                      {todayServices.map(svc => {
                        const d    = new Date(svc.scheduledAt)
                        const pct  = svc.capacity > 0 ? Math.round((svc.enrolledCount / svc.capacity) * 100) : 0
                        const full = pct >= 100
                        const hh   = String(d.getHours()).padStart(2, '0')
                        const mm   = String(d.getMinutes()).padStart(2, '0')
                        const parts = (svc.title ?? '').split(' — ')
                        return (
                          <div key={svc.id} style={{ background: C.white, borderRadius: 12, padding: '10px 14px', border: `1px solid ${C.borderLight}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <div style={{ minWidth: 0 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{parts[1] || parts[0]}</span>
                                <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{hh}:{mm}</span>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: full ? '#DC2626' : '#16A34A', flexShrink: 0, marginLeft: 8 }}>
                                {svc.enrolledCount}/{svc.capacity}
                              </span>
                            </div>
                            <div style={{ height: 5, borderRadius: 99, background: '#F0EDE8', overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(pct, 100)}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                style={{ height: '100%', borderRadius: 99, background: full ? '#DC2626' : `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Usuarios Stats */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-card"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
                      <Users size={24} />
                    </div>
                    <h2 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1.5rem', color: C.text, margin: 0 }}>Usuarios Registrados</h2>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: '2.5rem' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '1.2rem', background: '#F3F0FB', display: 'flex', alignItems: 'center', justifyItems: 'center', border: '1px solid #DDD6FE' }}>
                      <Users size={32} color={C.textMuted} style={{ margin: 'auto' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Total de Cuentas</p>
                      <motion.p 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="stat-value" style={{ fontSize: '3rem', margin: 0, lineHeight: 1 }}
                      >
                        {totalUsers}
                      </motion.p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.05)', borderRadius: '1rem', padding: '1.2rem', border: '1px solid rgba(34, 197, 94, 0.15)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16A34A' }}>
                        <CheckCircle2 size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activos</span>
                      </div>
                      <span style={{ fontSize: '2rem', fontFamily: '"Bodoni Moda", serif', color: '#15803D', fontWeight: 600 }}>{activeUsers}</span>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '1rem', padding: '1.2rem', border: '1px solid rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626' }}>
                        <XCircle size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inactivos</span>
                      </div>
                      <span style={{ fontSize: '2rem', fontFamily: '"Bodoni Moda", serif', color: '#B91C1C', fontWeight: 600 }}>{totalUsers - activeUsers}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* Bottom Grid */}
            <div className="dashboard-grid">
              
              {/* Gestión de Reservas */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="glass-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
                    <Calendar size={24} />
                  </div>
                  <h2 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1.5rem', color: C.text, margin: 0 }}>Gestión de Reservas</h2>
                </div>
                
                <p style={{ fontSize: '1.1rem', color: C.textMuted, marginBottom: '2rem', lineHeight: 1.6 }}>
                  Administra los horarios, citas y la planificación general del consultorio.
                </p>
                
                <button 
                  onClick={() => navigate('/admin/classes')}
                  className="dark-button"
                  style={{ width: '100%', padding: '1rem', borderRadius: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: 'none', cursor: 'pointer' }}
                >
                  <Calendar size={18} />
                  Ver Calendario General
                </button>
              </motion.div>

              {/* Branding Block */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="glass-card premium-gradient-bg"
                style={{ padding: '2.5rem' }}
              >
                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
                
                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FFF', width: 'fit-content', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                    Consultorio Médico
                  </div>

                  <h3 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '2rem', fontStyle: 'italic', color: '#FFF', margin: '0 0 2rem 0', lineHeight: 1.3, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                    "La salud de tu familia, nuestra mayor prioridad."
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#FFF', fontSize: '1.1rem', fontWeight: 800 }}>DM</span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block' }}>Dra. Diana Medina</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Medicina Familiar y Comunitaria</span>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
};
