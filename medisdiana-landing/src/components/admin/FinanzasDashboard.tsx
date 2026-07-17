import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Briefcase,
  TrendingUp, TrendingDown, CreditCard, Clock, Menu,
  Bell, CheckCircle2,
  Banknote, Wallet, Trash2, } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
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

// ── Animación: Stickman médica señalando el crecimiento financiero ─────────────
const FinanzasStickmanAnimation = () => (
  <div style={{ flexShrink: 0 }}>
    <svg width="150" height="120" viewBox="0 0 150 120" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 6px 12px rgba(139,92,246,0.12))' }}>
      <defs>
        <linearGradient id="finSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f3f0fb" />
        </linearGradient>
        <linearGradient id="finCoat" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0.15)" />
        </linearGradient>
      </defs>

      {/* Ejes del gráfico financiero */}
      <line x1="70" y1="14" x2="70" y2="106" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
      <line x1="70" y1="106" x2="144" y2="106" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />

      {/* Barras de ingresos creciendo */}
      {[
        { x: 78,  to: 18, delay: '0s' },
        { x: 94,  to: 34, delay: '0.25s' },
        { x: 110, to: 50, delay: '0.5s' },
        { x: 126, to: 68, delay: '0.75s' },
      ].map((bar, i) => (
        <rect key={i} x={bar.x} width="10" rx="2" fill={i % 2 === 0 ? C.gold : C.goldLight} opacity="0.85">
          <animate attributeName="height" values={`0;${bar.to};${bar.to};0;0`} keyTimes="0;0.3;0.7;0.95;1" dur="4s" begin={bar.delay} repeatCount="indefinite" />
          <animate attributeName="y" values={`106;${106 - bar.to};${106 - bar.to};106;106`} keyTimes="0;0.3;0.7;0.95;1" dur="4s" begin={bar.delay} repeatCount="indefinite" />
        </rect>
      ))}

      {/* Moneda "$" animada sobre la barra más alta */}
      <g>
        <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" keyTimes="0; 0.4; 0.5; 0.8; 0.9; 1" dur="4s" repeatCount="indefinite" />
        <circle cx="131" cy="20" r="9" fill="#10B981" />
        <text x="131" y="24" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="800">$</text>
      </g>

      {/* Stickman médica señalando el gráfico financiero */}
      <g transform="translate(28, 78)">

        {/* Cuerpo central */}
        <line x1="0" y1="-12" x2="0" y2="10" stroke={C.goldLight} strokeWidth="3" strokeLinecap="round" />

        {/* Bata médica */}
        <path d="M -3 -10 L -10 12 C -10 14 10 14 10 12 L 3 -10 Z" fill="url(#finCoat)" stroke={C.goldLight} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M -3 -10 L 0 0 L 3 -10" fill="none" stroke={C.goldLight} strokeWidth="1" />
        <line x1="-6" y1="5" x2="-4" y2="5" stroke={C.goldLight} strokeWidth="1.5" strokeLinecap="round" />

        {/* Piernas */}
        <path d="M 0 10 Q -2 20 -4 30" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="-2" cy="30" rx="3.5" ry="1.5" fill={C.goldLight} />
        <path d="M 0 10 Q 2 20 4 30" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="6" cy="30" rx="3.5" ry="1.5" fill={C.goldLight} />

        {/* Cabeza */}
        <circle cx="0" cy="-20" r="8.5" fill="url(#finSkin)" stroke={C.goldLight} strokeWidth="2" />
        {/* Cabello: cerquillo y coleta */}
        <path d="M -7 -25 Q 0 -32 8 -24" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M -7 -25 Q -12 -28 -14 -22" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />

        {/* Carita mirando hacia el gráfico */}
        <circle cx="1" cy="-21" r="1.2" fill={C.goldLight} />
        <circle cx="5.5" cy="-21" r="1.2" fill={C.goldLight} />
        <circle cx="-0.5" cy="-19" r="1.5" fill="#f43f5e" opacity="0.4" />
        <circle cx="7" cy="-19" r="1.5" fill="#f43f5e" opacity="0.4" />
        <path d="M 1 -17 Q 3.5 -14.5 6 -17" fill="none" stroke={C.goldLight} strokeWidth="1.2" strokeLinecap="round" />

        {/* Estetoscopio */}
        <path d="M -3 -10 C -5 6 7 6 5 -10" fill="none" stroke="#1B1C1C" strokeWidth="1.2" />
        <circle cx="5" cy="-10" r="1.8" fill="#1B1C1C" />
        <circle cx="5" cy="-10" r="0.8" fill="#fff" />

        {/* Brazo izquierdo (maletín) */}
        <g>
          <path d="M 0 -5 Q -6 0 -8 7" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="-13" y="7" width="10" height="7" rx="1.5" fill={C.white} stroke="#1B1C1C" strokeWidth="1.5" />
          <line x1="-10" y1="7" x2="-6" y2="7" stroke="#1B1C1C" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="-8" cy="10.5" r="1" fill="#1B1C1C" />
        </g>

        {/* Brazo derecho: señala el gráfico financiero (animado) */}
        <g>
          <animateTransform attributeName="transform" type="rotate" values="68 0 -5; 68 0 -5; 12 0 -5; 12 0 -5; 68 0 -5" keyTimes="0; 0.2; 0.4; 0.8; 1" dur="4s" repeatCount="indefinite" />
          <path d="M 0 -5 Q 16 -10 32 -15" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="-15" r="1.5" fill={C.goldLight} />
        </g>
      </g>
    </svg>
  </div>
);

export const FinanzasDashboard: React.FC = () => {
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
    fetchActive();
    fetchPending();
    fetchPendingServices();
  }, []);

  useEffect(() => {
    const ingresosPlanes = activeMemberships.reduce((sum, m) => sum + (m.membership.price || 0), 0);
    const pendientesPlanes = pendingPayments.reduce((sum, p) => sum + (p.membership.price || 0), 0);
    const pendientesServicios = pendingServices.reduce((sum, s) => sum + (s.expectedAmount || 0), 0);
    
    setKpis({
      ingresos: ingresosPlanes,
      egresos: 0,
      balance: ingresosPlanes,
      pendientes: pendientesPlanes + pendientesServicios,
    });
  }, [activeMemberships, pendingPayments, pendingServices]);

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

  return (
    <div className={`dashboard-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── SIDEBAR ── */}
      {!isSidebarCollapsed && (
        <AdminSidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />
      )}

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
                <p style={{ color: C.textMuted, fontSize: '1rem', margin: 0 }}>
                  Resumen financiero de Medis — {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}.
                </p>
              </div>

              <FinanzasStickmanAnimation />
            </motion.div>

            {/* ── KPI CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { label: 'Ingresos del mes', value: kpis.ingresos, icon: TrendingUp, color: '#16A34A', bg: 'rgba(34,197,94,0.06)' },
                { label: 'Egresos del mes', value: kpis.egresos, icon: TrendingDown, color: '#DC2626', bg: 'rgba(239,68,68,0.06)' },
                { label: 'Balance neto', value: kpis.balance, icon: DollarSign, color: C.gold, bg: 'rgba(139,92,246,0.06)' },
                { label: 'Cobros pendientes', value: kpis.pendientes, icon: Clock, color: '#B45309', bg: 'rgba(234,179,8,0.06)' },
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
                        ? `linear-gradient(90deg, ${tab.key === 'planes' ? `${C.gold}, ${C.goldLight}` : `${C.goldLight}, #38BDF8`})`
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
                    <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Ningún paciente tiene un plan activo aún.</p>
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
                                <p style={{ fontSize: 10, color: C.textMuted, margin: 0 }}>consultas</p>
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
              style={{ padding: '1.5rem 1.75rem', marginBottom: '2rem', border: `1.5px solid rgba(59,130,246,0.2)` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Briefcase size={20} color={C.goldLight} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1.3rem', color: C.text, margin: 0 }}>Servicios Adicionales</h2>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                      Consultas o procedimientos fuera del plan — pendientes de confirmación de pago
                    </p>
                  </div>
                </div>
                {pendingServices.length > 0 && (
                  <span style={{ background: 'rgba(59,130,246,0.1)', color: C.goldLight, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>
                    {pendingServices.length} pendiente{pendingServices.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {pendingServices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(59,130,246,0.03)', borderRadius: 12, border: `1px dashed ${C.borderLight}` }}>
                  <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.textMuted, margin: 0 }}>Sin servicios adicionales pendientes</p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>Cuando un paciente solicite consultas o servicios adicionales con pago en efectivo, aparecerán aquí.</p>
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
                              {sv.sessionCount > 1 && <span style={{ fontWeight: 700, color: C.goldLight }}>{sv.sessionCount} servicios · </span>}
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
