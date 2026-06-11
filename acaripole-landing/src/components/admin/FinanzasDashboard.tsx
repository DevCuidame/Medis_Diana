import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CalendarDays, DollarSign, LogOut,
  Briefcase, ChevronDown, ChevronRight, LayoutDashboard,
  TrendingUp, TrendingDown, CreditCard, Clock, Menu,
  Bell, ArrowUpRight, ArrowDownRight, CheckCircle2,
  Banknote, Wallet, Trash2,
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
  { icon: LayoutDashboard, label: 'Dashboard', active: false },
  { icon: Users, label: 'Usuarios', active: false },
  { icon: CalendarDays, label: 'Calendario', active: false },
  { icon: Briefcase, label: 'Servicios', active: false },
  { icon: DollarSign,  label: 'Finanzas',   active: true  },
  { icon: CreditCard,  label: 'Planes', active: false },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function adminHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface PendingMembership {
  id: string;
  userName?: string;
  userEmail?: string;
  paymentMethod: 'cash' | 'wompi' | 'free';
  startedAt: string;
  membership: { name: string; type: string; price: number };
}

interface ActiveMembership {
  id: string;
  startedAt: string;
  expiresAt: string | null;
  classesRemaining: number | null;
  paymentMethod: 'cash' | 'wompi' | 'free';
  isExpired: boolean;
  sessionsUsed: number;
  userName?: string;
  userEmail?: string;
  membership: { id: string; name: string; type: string; price: number; durationDays: number | null };
}

interface PendingServicePayment {
  id: string;
  offerTitle: string;
  scheduledAt: string | null;
  offerPrice: number | null;
  status: string;
  createdAt: string;
  paymentMethod: 'cash' | 'wompi';
  expectedAmount: number;
  discountPct: number | null;
  sessionCount: number;
  locationName?: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
}


export const FinanzasDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredNav, setHoveredNav] = useState<number | null>(null);
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'planes' | 'servicios'>('planes');

  const [kpis, setKpis] = useState({ ingresos: 0, egresos: 0, balance: 0, pendientes: 0 });
  const [activeMemberships, setActiveMemberships] = useState<ActiveMembership[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingMembership[]>([]);
  const [pendingServices, setPendingServices] = useState<PendingServicePayment[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingActiveId, setDeletingActiveId] = useState<string | null>(null);
  const [confirmingServiceId, setConfirmingServiceId] = useState<string | null>(null);
  const [rejectingServiceId, setRejectingServiceId] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [paymentToast, setPaymentToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const showPaymentToast = (msg: string, ok: boolean) => {
    setPaymentToast({ msg, ok });
    setTimeout(() => setPaymentToast(null), 3500);
  };

  const fetchActive = async () => {
    try {
      const res = await fetch('/api/user-memberships/active-all', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setActiveMemberships(data.data.memberships);
    } catch { /* ignore */ }
  };

  const fetchPending = async () => {
    try {
      const res = await fetch('/api/user-memberships/pending', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setPendingPayments(data.data.memberships);
    } catch { /* ignore */ }
  };

  const fetchPendingServices = async () => {
    try {
      const res = await fetch('/api/services/requests/pending-payment', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setPendingServices(data.data.requests);
    } catch { /* ignore */ }
  };

  const handleRejectPayment = async (id: string, userName: string) => {
    setRejectingId(id);
    try {
      const res = await fetch(`/api/user-memberships/${id}/reject`, { method: 'PATCH', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al rechazar');
      showPaymentToast(`Plan de ${userName} rechazado.`, false);
      await fetchPending();
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeletePayment = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/user-memberships/${id}`, { method: 'DELETE', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al eliminar');
      setPendingPayments(prev => prev.filter(p => p.id !== id));
      showPaymentToast('Registro eliminado.', true);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteActiveMembership = async (id: string, userName: string) => {
    if (!window.confirm(`¿Eliminar el plan activo de ${userName}? Esta acción no se puede deshacer.`)) return;
    setDeletingActiveId(id);
    try {
      const res = await fetch(`/api/user-memberships/${id}`, { method: 'DELETE', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al eliminar');
      setActiveMemberships(prev => prev.filter(m => m.id !== id));
      showPaymentToast(`Plan de ${userName} eliminado.`, true);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setDeletingActiveId(null);
    }
  };

  const handleRejectServicePayment = async (id: string, userName: string) => {
    setRejectingServiceId(id);
    try {
      const res = await fetch(`/api/services/requests/${id}/reject-payment`, { method: 'PATCH', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al rechazar');
      setPendingServices(prev => prev.filter(s => s.id !== id));
      showPaymentToast(`Pago de ${userName} rechazado.`, false);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setRejectingServiceId(null);
    }
  };

  const handleDeleteServicePayment = async (id: string) => {
    setDeletingServiceId(id);
    try {
      const res = await fetch(`/api/services/requests/${id}`, { method: 'DELETE', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al eliminar');
      setPendingServices(prev => prev.filter(s => s.id !== id));
      showPaymentToast('Registro eliminado.', true);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setDeletingServiceId(null);
    }
  };

  const handleConfirmServicePayment = async (id: string, _userName: string) => {
    setConfirmingServiceId(id);
    try {
      const res = await fetch(`/api/services/requests/${id}/confirm-payment`, {
        method: 'PATCH',
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al confirmar');
      setPendingServices(prev => prev.filter(s => s.id !== id));
      showPaymentToast(`Pago confirmado · Inscripción aprobada`, true);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setConfirmingServiceId(null);
    }
  };

  const handleConfirmPayment = async (id: string, userName: string) => {
    setConfirmingId(id);
    try {
      const res = await fetch(`/api/user-memberships/${id}/confirm`, {
        method: 'PATCH',
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al confirmar');
      showPaymentToast(`✓ Pago de ${userName} confirmado y plan activado.`, true);
      await Promise.all([fetchPending(), fetchActive()]);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setConfirmingId(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setKpis({ ingresos: 2580000, egresos: 1625000, balance: 955000, pendientes: 145000 });
    }, 400);
    fetchActive();
    fetchPending();
    fetchPendingServices();

  return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.classList.remove('sidebar-collapsed');
    return () => {
      document.body.classList.remove('sidebar-collapsed');
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

  return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (label: string) => {
    if (label === 'Dashboard') navigate('/admin/dashboard');
    else if (label === 'Calendario') navigate('/admin/classes');
    else if (label === 'Usuarios') navigate('/admin/users');
    else if (label === 'Inscripciones') navigate('/admin/inscripciones')
    if (label === 'Finanzas') navigate('/admin/finances');
    else if (label === 'Planes') navigate('/admin/memberships');
    else if (label === 'Servicios') setIsServicesExpanded(p => !p);
    if (label !== 'Servicios') setIsMobileMenuOpen(false);
  };

  return (
    <div className={`dashboard-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

      {/* ── SIDEBAR ── */}
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
          <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 10px', display: 'block', marginBottom: 10 }}>Menú Principal</span>
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isHovered = hoveredNav === i;
            const isActive = item.active;

  return (
              <div key={item.label} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => handleNavClick(item.label)}
                  onMouseEnter={() => setHoveredNav(i)}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10,
                    background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHovered ? 'rgba(139,92,246,0.07)' : 'transparent',
                    border: 'none', transition: 'all 0.2s ease', cursor: 'pointer', position: 'relative', overflow: 'hidden',
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
                      <div style={{ marginLeft: 'auto' }}>
                        {isServicesExpanded ? <ChevronDown size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} /> : <ChevronRight size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} />}
                      </div>
                    )}
                  </div>
                </button>
                <AnimatePresence>
                  {item.label === 'Servicios' && isServicesExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 38, marginTop: 8, marginBottom: 8, borderLeft: `2px solid ${C.goldLight}`, paddingLeft: 12 }}>
                        <span onClick={() => navigate('/admin/services/locations')} style={{ fontSize: 12, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.gold} onMouseLeave={e => e.currentTarget.style.color = C.textBrown}>Sedes</span>
                        <span onClick={() => navigate('/admin/services/rooms')} style={{ fontSize: 12, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.gold} onMouseLeave={e => e.currentTarget.style.color = C.textBrown}>Espacios</span>
                        <span onClick={() => navigate('/admin/services/create')} style={{ fontSize: 12, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.gold} onMouseLeave={e => e.currentTarget.style.color = C.textBrown}>Servicios</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>


        <div style={{ padding: '16px 20px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <button
            onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); navigate('/login'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium, transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F3F0FB'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={18} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">

        {/* TOPBAR */}
        <header style={{ height: 72, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="menu-toggle" onClick={() => {
              if (window.innerWidth <= 768) {
                setIsMobileMenuOpen(v => !v);
              } else {
                setIsSidebarCollapsed(v => !v);
              }
            }}>
              <Menu size={20} />
            </button>
            <h2 style={{ fontFamily: '"Bodoni Moda", Georgia, serif', fontSize: 24, fontWeight: 600, color: C.gold, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
              MEDIS <span className="overview-label" style={{ fontSize: 12, fontFamily: '"Hanken Grotesk", sans-serif', color: C.textMuted, fontWeight: 500, letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>/ Finanzas</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* ── NOTIFICATION BELL ── */}
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(p => !p)}
                style={{ width: 40, height: 40, borderRadius: 12, background: showNotifications ? C.white : C.bgPanel, border: `1px solid ${showNotifications ? C.gold : C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold, transition: 'all 0.2s', position: 'relative' }}
              >
                <Bell size={18} />
                {pendingPayments.length > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', fontFamily: '"Hanken Grotesk", sans-serif', lineHeight: 1 }}>
                    {pendingPayments.length > 9 ? '9+' : pendingPayments.length}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    style={{ position: 'absolute', top: 48, right: 0, width: 340, background: C.white, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.14)', border: `1px solid ${C.borderLight}`, zIndex: 99, overflow: 'hidden' }}
                  >
                    {/* Header */}
                    <div style={{ padding: '1rem 1.1rem 0.75rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bell size={15} color={C.gold} />
                        <span style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1rem', fontWeight: 600, color: C.text }}>Pagos pendientes</span>
                      </div>
                      {pendingPayments.length > 0 && (
                        <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                          {pendingPayments.length} nuevo{pendingPayments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {pendingPayments.length === 0 ? (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                          <CheckCircle2 size={28} color="#16A34A" style={{ margin: '0 auto 8px' }} />
                          <p style={{ fontSize: 13, color: C.textMuted, margin: 0, fontWeight: 600 }}>Sin pagos pendientes</p>
                          <p style={{ fontSize: 11, color: C.textMuted, margin: '4px 0 0' }}>Todo al día 🎉</p>
                        </div>
                      ) : (
                        pendingPayments.map((pm, i) => (
                          <div key={pm.id} style={{ padding: '0.85rem 1.1rem', borderBottom: i < pendingPayments.length - 1 ? `1px solid ${C.borderLight}` : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            {/* Icon */}
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: pm.paymentMethod === 'cash' ? 'rgba(139,92,246,0.08)' : 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                              {pm.paymentMethod === 'cash' ? <Banknote size={15} color={C.gold} /> : <Wallet size={15} color="#7C3AED" />}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pm.userName ?? 'Usuario'}
                              </p>
                              <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pm.membership.name} · {fmt(pm.membership.price)}
                              </p>
                              <button
                                onClick={() => { handleConfirmPayment(pm.id, pm.userName ?? 'usuario'); }}
                                disabled={confirmingId === pm.id}
                                style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: confirmingId === pm.id ? C.bgPanel : 'linear-gradient(135deg, #16A34A, #22C55E)', color: confirmingId === pm.id ? C.textMuted : C.white, fontSize: 11, fontWeight: 700, cursor: confirmingId === pm.id ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                              >
                                {confirmingId === pm.id ? 'Confirmando…' : '✓ Confirmar Pago'}
                              </button>
                            </div>

                            {/* Date */}
                            <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0, marginTop: 2 }}>
                              {new Date(pm.startedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {pendingPayments.length > 0 && (
                      <div style={{ padding: '0.6rem 1.1rem', borderTop: `1px solid ${C.borderLight}`, textAlign: 'center' }}>
                        <button
                          onClick={() => setShowNotifications(false)}
                          style={{ fontSize: 12, color: C.gold, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Ver todos en Finanzas ↓
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, border: `2px solid ${C.gold}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 10px rgba(139,92,246,0.2)' }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem', background: 'radial-gradient(circle at top right, rgba(139,92,246,0.03), transparent 400px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            {/* Page heading */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, borderRadius: 20, background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(59,130,246,0.04) 100%)', border: '1px solid rgba(139,92,246,0.12)', padding: '20px 28px' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: '"Hanken Grotesk", sans-serif' }}>Gestión Financiera</p>
                <h1 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '2.5rem', color: C.text, marginBottom: '0.4rem', lineHeight: 1.1 }}>Finanzas</h1>
                <p style={{ color: C.textMuted, fontSize: '1rem', margin: 0 }}>Resumen financiero de MEDIS Studio — Mayo 2026.</p>
              </div>

              {/* Pole dance coin/balance animation */}
              <div style={{ flexShrink: 0, opacity: 0.9 }}>
                <style>{`
                  @keyframes fn_float   { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-7px)} }
                  @keyframes fn_spin    { 0%{transform:rotate(0deg) scaleX(1)} 25%{transform:rotate(0deg) scaleX(0.15)} 50%{transform:rotate(0deg) scaleX(-1)} 75%{transform:rotate(0deg) scaleX(0.15)} 100%{transform:rotate(0deg) scaleX(1)} }
                  @keyframes fn_coinSpin{ 0%{transform:rotateY(0deg)}  100%{transform:rotateY(360deg)} }
                  @keyframes fn_glow    { 0%,100%{filter:drop-shadow(0 0 3px rgba(59,130,246,0.5))} 50%{filter:drop-shadow(0 0 10px rgba(59,130,246,0.9))} }
                  @keyframes fn_pulse   { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
                  @keyframes fn_bodyWave{ 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
                  @keyframes fn_legBack { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-28deg)} }
                  @keyframes fn_legFront{ 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(22deg)} }
                  @keyframes fn_arm     { 0%,100%{transform:rotate(-12deg)} 50%{transform:rotate(20deg)} }
                  @keyframes fn_coinBob { 0%,100%{transform:translateY(0) rotate(0deg)} 33%{transform:translateY(-10px) rotate(-8deg)} 66%{transform:translateY(-4px) rotate(5deg)} }
                `}</style>
                <svg width="170" height="130" viewBox="0 0 170 130" style={{ overflow: 'visible' }}>

                  {/* ── Gold coins raining ── */}
                  {[
                    { x: 130, y: 15, d: '0s',   s: 14 },
                    { x: 148, y: 38, d: '0.6s',  s: 11 },
                    { x: 118, y: 55, d: '1.1s',  s: 9  },
                    { x: 155, y: 70, d: '0.3s',  s: 12 },
                  ].map((c, i) => (
                    <g key={i} style={{ animation: `fn_coinBob 2.4s ease-in-out ${c.d} infinite` }}>
                      <ellipse cx={c.x} cy={c.y} rx={c.s/2} ry={c.s*0.35} fill="none" stroke={C.goldLight} strokeWidth="2" opacity="0.5" />
                      <ellipse cx={c.x} cy={c.y} rx={c.s/2 - 1} ry={c.s*0.3} fill={C.gold} opacity="0.35" />
                      <text x={c.x} y={c.y + 3.5} textAnchor="middle" fontSize={c.s * 0.55} fill={C.goldLight} fontWeight="800" opacity="0.8">$</text>
                    </g>
                  ))}

                  {/* ── Pole ── */}
                  <line x1="55" y1="5" x2="55" y2="122" stroke={C.goldLight} strokeWidth="3" strokeLinecap="round"
                    style={{ animation: 'fn_glow 2.5s ease-in-out infinite' }} />
                  <circle cx="55" cy="7" r="4.5" fill={C.gold} style={{ animation: 'fn_pulse 2s ease-in-out infinite' }} />
                  <circle cx="55" cy="120" r="3" fill={C.gold} opacity="0.4" />

                  {/* ── Figure: standing → extended pose ── */}
                  <g style={{ animation: 'fn_float 3s ease-in-out infinite' }}>
                    <g style={{ transformOrigin: '55px 65px', animation: 'fn_bodyWave 2.8s ease-in-out infinite' }}>
                      {/* Hair */}
                      <path d="M55 30 Q64 22 68 16" stroke={C.text} strokeWidth="2" fill="none" opacity="0.75" />
                      <path d="M55 30 Q60 20 66 13" stroke={C.text} strokeWidth="1.5" fill="none" opacity="0.5" />
                      {/* Head */}
                      <circle cx="55" cy="37" r="8" fill={C.text} opacity="0.85" />
                      {/* Neck + torso */}
                      <line x1="55" y1="45" x2="55" y2="52" stroke={C.text} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
                      <path d="M50 52 Q47 63 48 73 Q55 77 62 73 Q63 63 60 52Z" fill={C.text} opacity="0.85" />
                      {/* Left arm (holding pole up) */}
                      <line x1="50" y1="57" x2="55" y2="50" stroke={C.text} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                      {/* Right arm (extended with coin) */}
                      <g style={{ transformOrigin: '60px 58px', animation: 'fn_arm 2.5s ease-in-out infinite' }}>
                        <line x1="60" y1="58" x2="82" y2="53" stroke={C.text} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                        {/* Coin in hand */}
                        <g style={{ animation: 'fn_coinBob 1.8s ease-in-out 0.2s infinite' }}>
                          <circle cx="86" cy="52" r="7" fill={C.gold} opacity="0.9" />
                          <circle cx="86" cy="52" r="5" fill="none" stroke={C.goldLight} strokeWidth="1.5" opacity="0.8" />
                          <text x="86" y="55.5" textAnchor="middle" fontSize="7" fill={C.white} fontWeight="900" opacity="0.95">$</text>
                        </g>
                      </g>
                      {/* Left leg */}
                      <g style={{ transformOrigin: '50px 73px', animation: 'fn_legBack 3s ease-in-out infinite' }}>
                        <line x1="50" y1="73" x2="43" y2="93" stroke={C.text} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
                        <line x1="43" y1="93" x2="38" y2="112" stroke={C.text} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                        <circle cx="37" cy="114" r="2.5" fill={C.text} opacity="0.8" />
                      </g>
                      {/* Right leg */}
                      <g style={{ transformOrigin: '60px 73px', animation: 'fn_legFront 3s ease-in-out infinite' }}>
                        <line x1="60" y1="73" x2="67" y2="91" stroke={C.text} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
                        <line x1="67" y1="91" x2="72" y2="110" stroke={C.text} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                        <circle cx="73" cy="112" r="2.5" fill={C.text} opacity="0.8" />
                      </g>
                      {/* Skirt accent */}
                      <path d="M48 73 Q40 82 43 91" stroke={C.goldLight} strokeWidth="1.5" fill="none" opacity="0.5"
                        style={{ animation: 'fn_legBack 3s ease-in-out infinite' }} />
                      <path d="M62 73 Q70 80 67 89" stroke={C.goldLight} strokeWidth="1.5" fill="none" opacity="0.5"
                        style={{ animation: 'fn_legFront 3s ease-in-out infinite' }} />
                    </g>
                  </g>

                  {/* Sparkles */}
                  {[
                    { x: 20, y: 40, d: '0s'   },
                    { x: 100, y: 105, d: '0.8s' },
                    { x: 15, y: 90, d: '1.4s'  },
                  ].map((s, i) => (
                    <g key={i} style={{ animation: `fn_pulse 2s ease-in-out ${s.d} infinite` }}>
                      <line x1={s.x-4} y1={s.y} x2={s.x+4} y2={s.y} stroke={C.goldLight} strokeWidth="1.5" />
                      <line x1={s.x} y1={s.y-4} x2={s.x} y2={s.y+4} stroke={C.goldLight} strokeWidth="1.5" />
                    </g>
                  ))}
                </svg>
              </div>
            </motion.div>

            {/* ── KPI CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { label: 'Ingresos del mes', value: kpis.ingresos, icon: TrendingUp, color: '#16A34A', bg: 'rgba(34,197,94,0.06)', trend: '+18% vs. abril', up: true },
                { label: 'Egresos del mes', value: kpis.egresos, icon: TrendingDown, color: '#DC2626', bg: 'rgba(239,68,68,0.06)', trend: '+8% vs. abril', up: false },
                { label: 'Balance neto', value: kpis.balance, icon: DollarSign, color: C.gold, bg: 'rgba(139,92,246,0.06)', trend: '+34% vs. abril', up: true },
                { label: 'Cobros pendientes', value: kpis.pendientes, icon: Clock, color: '#B45309', bg: 'rgba(234,179,8,0.06)', trend: '2 transacciones', up: null },
              ].map((kpi, i) => {
                const Icon = kpi.icon;

  return (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    className="glass-card"
                    style={{ padding: '1.5rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={kpi.color} />
                      </div>
                      {kpi.up !== null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: kpi.up ? '#16A34A' : '#DC2626' }}>
                          {kpi.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {kpi.trend}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{kpi.label}</p>
                    <motion.p
                      className="stat-value"
                      style={{ fontSize: '1.6rem', margin: 0, lineHeight: 1 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.07 }}
                    >
                      {fmt(kpi.value)}
                    </motion.p>
                    {kpi.up === null && (
                      <span style={{ fontSize: 11, color: '#B45309', fontWeight: 600, marginTop: 4, display: 'block' }}>{kpi.trend}</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* ── TAB SELECTOR ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
              {([
                { key: 'planes',    label: 'Gestión de Planes',       count: activeMemberships.length + pendingPayments.length,  color: C.gold },
                { key: 'servicios', label: 'Servicios Adicionales',   count: pendingServices.length,  color: '#B45309' },
              ] as const).map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 20px', borderRadius: 99,
                      border: isActive ? 'none' : `1.5px solid ${C.borderLight}`,
                      background: isActive
                        ? `linear-gradient(90deg, ${tab.key === 'planes' ? `${C.gold}, ${C.goldLight}` : '#B45309, #D97706'})`
                        : C.white,
                      color: isActive ? C.white : C.textBrown,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 4px 14px rgba(139,92,246,0.2)' : 'none',
                    }}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.25)' : '#FEE2E2',
                        color: isActive ? C.white : '#DC2626',
                        fontSize: 11, fontWeight: 800,
                        padding: '1px 8px', borderRadius: 99,
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── GESTIÓN DE PLANES ── */}
            {activeTab === 'planes' && <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-card"
              style={{ padding: '1.5rem 1.75rem', marginBottom: '2rem', border: `1.5px solid rgba(139,92,246,0.2)` }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={20} color={C.gold} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1.3rem', color: C.text, margin: 0 }}>Gestión de Planes</h2>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                      {activeMemberships.length} activo{activeMemberships.length !== 1 ? 's' : ''}
                      {pendingPayments.length > 0 && ` · ${pendingPayments.length} pendiente${pendingPayments.length !== 1 ? 's' : ''} de aprobación`}
                    </p>
                  </div>
                </div>
                {pendingPayments.length > 0 && (
                  <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>
                    {pendingPayments.length} por aprobar
                  </span>
                )}
              </div>

              {/* ── Planes activos ── */}
              <div style={{ marginBottom: activeMemberships.length > 0 ? '1.5rem' : 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Planes Activos
                </p>
                {activeMemberships.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.25rem 1rem', background: 'rgba(139,92,246,0.03)', borderRadius: 10, border: `1px dashed ${C.borderLight}` }}>
                    <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Ningún alumno tiene un plan activo aún.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {activeMemberships.map(am => {
                      const initials = (am.userName ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                      const expires = am.expiresAt ? new Date(am.expiresAt) : null;
                      const daysLeft = expires ? Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000)) : null;
                      const isNearExpiry = daysLeft !== null && daysLeft <= 7;
                      return (
                        <div key={am.id} style={{ background: C.white, borderRadius: 12, padding: '0.9rem 1.1rem', border: `1px solid ${isNearExpiry ? 'rgba(234,179,8,0.4)' : C.borderLight}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: C.white }}>{initials}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{am.userName ?? 'Usuario'}</p>
                              <p style={{ fontSize: 11, color: C.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{am.userEmail}</p>
                            </div>
                            <span style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>Activo</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: `1px solid ${C.borderLight}` }}>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>{am.membership.name}</p>
                              <p style={{ fontSize: 11, color: C.textMuted, margin: '2px 0 0' }}>
                                Desde {new Date(am.startedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                {expires && <> · <span style={{ color: isNearExpiry ? '#B45309' : C.textMuted, fontWeight: isNearExpiry ? 700 : 400 }}>
                                  {isNearExpiry ? `⚠ Vence en ${daysLeft}d` : `Vence ${expires.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`}
                                </span></>}
                                {!expires && ' · Sin vencimiento'}
                              </p>
                            </div>
                            {am.classesRemaining !== null && (
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 15, fontWeight: 800, color: am.classesRemaining <= 2 ? '#DC2626' : C.gold, margin: 0 }}>{am.classesRemaining}</p>
                                <p style={{ fontSize: 10, color: C.textMuted, margin: 0 }}>sesiones</p>
                              </div>
                            )}
                            {am.classesRemaining === null && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, background: 'rgba(139,92,246,0.08)', padding: '3px 8px', borderRadius: 99 }}>∞ Ilimitado</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, borderTop: `1px solid ${C.borderLight}` }}>
                            <button
                              onClick={() => handleDeleteActiveMembership(am.id, am.userName ?? 'este usuario')}
                              disabled={deletingActiveId === am.id}
                              title="Eliminar plan activo"
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.borderLight}`, background: 'transparent', color: '#6B7280', fontSize: 11, fontWeight: 600, cursor: deletingActiveId === am.id ? 'not-allowed' : 'pointer', opacity: deletingActiveId === am.id ? 0.5 : 1, transition: 'all 0.2s' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#DC2626'; e.currentTarget.style.color = '#DC2626'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = '#6B7280'; }}
                            >
                              <Trash2 size={13} />
                              {deletingActiveId === am.id ? 'Eliminando…' : 'Eliminar plan'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Pendientes de aprobación ── */}
              {pendingPayments.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Pendientes de Aprobación
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <AnimatePresence>
                      {pendingPayments.map(pm => (
                        <motion.div
                          key={pm.id}
                          layout
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
                          style={{ background: C.white, borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 14, border: `1px solid rgba(220,38,38,0.2)`, flexWrap: 'wrap' }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: pm.paymentMethod === 'cash' ? 'rgba(139,92,246,0.08)' : 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {pm.paymentMethod === 'cash' ? <Banknote size={18} color={C.gold} /> : <Wallet size={18} color="#7C3AED" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{pm.userName ?? 'Usuario'}</p>
                            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{pm.userEmail}</p>
                          </div>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>{pm.membership.name}</p>
                            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                              {fmt(pm.membership.price)} ·{' '}
                              <span style={{ fontWeight: 600, color: pm.paymentMethod === 'cash' ? C.gold : '#7C3AED' }}>
                                {pm.paymentMethod === 'cash' ? 'Efectivo' : 'Wompi'}
                              </span>
                            </p>
                          </div>
                          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                              {new Date(pm.startedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                            </p>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleConfirmPayment(pm.id, pm.userName ?? 'usuario')} disabled={confirmingId === pm.id}
                                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16A34A,#22C55E)', color: C.white, fontSize: 11, fontWeight: 700, cursor: confirmingId === pm.id ? 'not-allowed' : 'pointer', opacity: confirmingId === pm.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                                {confirmingId === pm.id ? '…' : '✓ Aprobar'}
                              </button>
                              <button onClick={() => handleRejectPayment(pm.id, pm.userName ?? 'usuario')} disabled={rejectingId === pm.id}
                                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#B91C1C,#DC2626)', color: C.white, fontSize: 11, fontWeight: 700, cursor: rejectingId === pm.id ? 'not-allowed' : 'pointer', opacity: rejectingId === pm.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                                {rejectingId === pm.id ? '…' : '✗ Rechazar'}
                              </button>
                              <button onClick={() => handleDeletePayment(pm.id)} disabled={deletingId === pm.id} title="Eliminar registro"
                                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.white, color: '#6B7280', display: 'flex', alignItems: 'center', cursor: deletingId === pm.id ? 'not-allowed' : 'pointer', opacity: deletingId === pm.id ? 0.5 : 1, transition: 'all 0.2s' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {activeMemberships.length === 0 && pendingPayments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(139,92,246,0.03)', borderRadius: 12, border: `1px dashed ${C.borderLight}` }}>
                  <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.textMuted, margin: 0 }}>Sin planes registrados</p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>Cuando un alumno adquiera un plan aparecerá aquí.</p>
                </div>
              )}
            </motion.div>}

            {/* ── GESTIÓN DE SERVICIOS ADICIONALES ── */}
            {activeTab === 'servicios' && <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="glass-card"
              style={{ padding: '1.5rem 1.75rem', marginBottom: '2rem', border: '1.5px solid rgba(180,83,9,0.2)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(180,83,9,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Briefcase size={20} color="#B45309" />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1.3rem', color: C.text, margin: 0 }}>Servicios Adicionales</h2>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                      Sesiones extra fuera del plan — pendientes de confirmación de pago
                    </p>
                  </div>
                </div>
                {pendingServices.length > 0 && (
                  <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>
                    {pendingServices.length} pendiente{pendingServices.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {pendingServices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(180,83,9,0.03)', borderRadius: 12, border: `1px dashed ${C.borderLight}` }}>
                  <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.textMuted, margin: 0 }}>Sin servicios adicionales pendientes</p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>Cuando un alumno solicite sesiones extra con pago en efectivo, aparecerán aquí.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <AnimatePresence>
                    {pendingServices.map(sv => {
                      const name = `${sv.user.firstName} ${sv.user.lastName}`.trim();
                      const serviceTitle = (sv.offerTitle ?? '').split(' — ')[1] || sv.offerTitle;
                      return (
                        <motion.div
                          key={sv.id}
                          layout
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
                          style={{ background: C.white, borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${C.borderLight}`, flexWrap: 'wrap' }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: sv.paymentMethod === 'cash' ? 'rgba(139,92,246,0.08)' : 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {sv.paymentMethod === 'cash' ? <Banknote size={18} color={C.gold} /> : <Wallet size={18} color="#7C3AED" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{name}</p>
                            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{sv.user.email}</p>
                          </div>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>{serviceTitle}</p>
                            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                              {sv.sessionCount > 1 && <span style={{ fontWeight: 700, color: '#B45309' }}>{sv.sessionCount} sesiones · </span>}
                              {fmt(sv.expectedAmount)}
                              {sv.discountPct ? <span style={{ color: '#16A34A', fontWeight: 600 }}> (-{sv.discountPct}%)</span> : null}
                              {' · '}
                              <span style={{ fontWeight: 600, color: sv.paymentMethod === 'cash' ? C.gold : '#7C3AED' }}>
                                {sv.paymentMethod === 'cash' ? 'Efectivo' : 'Wompi'}
                              </span>
                            </p>
                            {sv.locationName && (
                              <p style={{ fontSize: 11, color: C.textMuted, margin: '2px 0 0' }}>📍 {sv.locationName}</p>
                            )}
                          </div>
                          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                              {new Date(sv.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                            </p>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleConfirmServicePayment(sv.id, name)} disabled={confirmingServiceId === sv.id}
                                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16A34A,#22C55E)', color: C.white, fontSize: 11, fontWeight: 700, cursor: confirmingServiceId === sv.id ? 'not-allowed' : 'pointer', opacity: confirmingServiceId === sv.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                                {confirmingServiceId === sv.id ? '…' : '✓ Aprobar'}
                              </button>
                              <button onClick={() => handleRejectServicePayment(sv.id, name)} disabled={rejectingServiceId === sv.id}
                                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#B91C1C,#DC2626)', color: C.white, fontSize: 11, fontWeight: 700, cursor: rejectingServiceId === sv.id ? 'not-allowed' : 'pointer', opacity: rejectingServiceId === sv.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                                {rejectingServiceId === sv.id ? '…' : '✗ Rechazar'}
                              </button>
                              <button onClick={() => handleDeleteServicePayment(sv.id)} disabled={deletingServiceId === sv.id} title="Eliminar registro"
                                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.white, color: '#6B7280', display: 'flex', alignItems: 'center', cursor: deletingServiceId === sv.id ? 'not-allowed' : 'pointer', opacity: deletingServiceId === sv.id ? 0.5 : 1, transition: 'all 0.2s' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>}

          </div>
        </main>
      </div>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {paymentToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 200,
              background: paymentToast.ok ? '#16A34A' : '#DC2626',
              color: C.white, padding: '12px 24px', borderRadius: 12,
              fontSize: 14, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            {paymentToast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
