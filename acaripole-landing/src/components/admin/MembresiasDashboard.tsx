import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CalendarDays, ShieldCheck, DollarSign, Plus, LogOut,
  Briefcase, ChevronDown, ChevronRight, LayoutDashboard, ClipboardList,
  CreditCard, Bell, Menu, X, CheckCircle2, XCircle,
  Clock, Tag, Infinity, Edit2, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, Gift, Percent, Info,
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

const FONT_BODONI = '"Bodoni Moda", Georgia, serif';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: false },
  { icon: Users, label: 'Usuarios', active: false },
  { icon: CalendarDays, label: 'Calendario', active: false },
  { icon: Briefcase, label: 'Servicios', active: false },
  { icon: ShieldCheck, label: 'Reglas', active: false },
  { icon: DollarSign, label: 'Finanzas', active: false },
  { icon: CreditCard, label: 'Planes', active: true },
];

const STEPS = [
  { label: 'Básico', desc: 'Nombre y descripción' },
  { label: 'Precio', desc: 'Tipo y valor' },
  { label: 'Beneficios', desc: 'Qué incluye' },
  { label: 'Confirmar', desc: 'Revisar y crear' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const formatPrice = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('es-CO');
};

type MembershipType = 'per_class' | 'monthly' | 'annual' | 'private' | 'pack' | 'inscription';

interface Membership {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: MembershipType;
  price: number;
  currency: string;
  durationDays: number | null;
  benefits: string[];
  isActive: boolean;
}

const TYPE_LABELS: Record<MembershipType, string> = {
  per_class:   'Por Clase',
  monthly:     'Mensual',
  annual:      'Anual',
  private:     'Clase Privada',
  pack:        'Pack de Clases',
  inscription: 'Inscripción',
};

const TYPE_COLORS: Record<MembershipType, { bg: string; color: string }> = {
  per_class:   { bg: 'rgba(139,92,246,0.1)',    color: '#8B5CF6' },
  monthly:     { bg: 'rgba(34,197,94,0.1)',   color: '#16A34A' },
  annual:      { bg: 'rgba(59,130,246,0.1)',  color: '#2563EB' },
  private:     { bg: 'rgba(168,85,247,0.1)',  color: '#7C3AED' },
  pack:        { bg: 'rgba(234,179,8,0.1)',   color: '#B45309' },
  inscription: { bg: 'rgba(236,72,153,0.1)',  color: '#8B5CF6' },
};

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  type: 'per_class' as MembershipType,
  price: '',
  duration_days: '',
  is_active: true,
  benefits: [] as string[],
};

function slugify(str: string) {
  return str.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 40);
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const MembresiasDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredNav, setHoveredNav] = useState<number | null>(null);
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [catalogBenefits, setCatalogBenefits] = useState<{ id: string; name: string; isActive: boolean; benefitType: string; benefitValue: number | null }[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Membership | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [actionToast, setActionToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showActionToast = (msg: string, ok: boolean) => {
    setActionToast({ msg, ok });
    setTimeout(() => setActionToast(null), 4000);
  };

  // ── Fetch ────────────────────────────────────────────────────
  const fetchMemberships = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/memberships', { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al cargar planes');
      setMemberships(data.data.memberships);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogBenefits = async () => {
    try {
      const res  = await fetch('/api/benefits', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setCatalogBenefits(
        data.data.benefits.map((b: any) => ({
          id: b.id,
          name: b.name,
          isActive: b.isActive,
          benefitType: b.benefitType,
          benefitValue: b.benefitValue ?? null,
        }))
      );
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchMemberships(); fetchCatalogBenefits(); }, []);

  // ── Modal helpers ────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCurrentStep(0);
    setShowModal(true);
  };

  const openEdit = (m: Membership) => {
    setEditTarget(m);
    setForm({
      name: m.name,
      code: m.code,
      description: m.description ?? '',
      type: m.type,
      price: String(m.price),
      duration_days: m.durationDays != null ? String(m.durationDays) : '',
      is_active: m.isActive,
      benefits: [...m.benefits],
    });
    setFormErrors({});
    setCurrentStep(0);
    setShowModal(true);
  };

  const toggleBenefit = (name: string) => {
    setForm(f => ({
      ...f,
      benefits: f.benefits.includes(name)
        ? f.benefits.filter(b => b !== name)
        : [...f.benefits, name],
    }));
  };

  const validateStep = (step: number) => {
    const e: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (step === 0) {
      if (!form.name.trim()) e.name = 'Requerido';
      if (!form.code.trim()) e.code = 'Requerido';
    }
    if (step === 1) {
      if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Precio inválido';
      if ((form.type === 'monthly' || form.type === 'annual') && !form.duration_days)
        e.duration_days = 'Requerido para este tipo';
      // inscription never requires duration_days
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(currentStep);
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setFormErrors({});
    setCurrentStep(s => s + 1);
  };

  const validate = () => {
    const e: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.name.trim()) e.name = 'Requerido';
    if (!form.code.trim()) e.code = 'Requerido';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Precio inválido';
    if ((form.type === 'monthly' || form.type === 'annual') && !form.duration_days)
      e.duration_days = 'Requerido para este tipo';
    // inscription never requires duration_days
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setFormErrors(e); return; }

    setSaving(true);
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      price: Number(form.price),
      currency: 'COP',
      durationDays: form.duration_days ? Number(form.duration_days) : null,
      benefits: form.benefits,
      isActive: form.is_active,
    };

    try {
      const url = editTarget ? `/api/memberships/${editTarget.id}` : '/api/memberships';
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al guardar');
      await fetchMemberships();
      setShowModal(false);
    } catch (e: unknown) {
      setFormErrors({ name: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m: Membership) => {
    try {
      const res = await fetch(`/api/memberships/${m.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setMemberships(prev => prev.map(x => x.id === m.id ? { ...x, isActive: !x.isActive } : x));
    } catch {
      // revert silently
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/memberships/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'No se pudo eliminar el plan');
      setMemberships(prev => prev.filter(m => m.id !== id));
      showActionToast('Plan eliminado.', true);
    } catch (e) {
      showActionToast((e as Error).message, false);
    } finally {
      setDeleteConfirm(null);
    }
  };

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

  const hasDuration = form.type === 'monthly' || form.type === 'annual';
  const tPreview = TYPE_COLORS[form.type] ?? TYPE_COLORS.per_class;
  const isInscriptionType = form.type === 'inscription';

  
  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      // @ts-ignore
      if (typeof setIsMobileMenuOpen === 'function') setIsMobileMenuOpen((p: any) => !p);
    } else {
      document.body.classList.toggle('sidebar-collapsed');
    }
  };

  return (
    <div className="dashboard-container">
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
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
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHovered ? 'rgba(139,92,246,0.07)' : 'transparent', border: 'none', transition: 'all 0.2s ease', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                  {isActive && <motion.div layoutId="activeNav" style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`, zIndex: 0, borderRadius: 10 }} />}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Icon size={18} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0, transition: 'color 0.2s' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', marginLeft: 12, color: isActive ? C.white : isHovered ? C.gold : C.textBrown, transition: 'color 0.2s' }}>{item.label}</span>
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

        <div style={{ padding: '12px 20px' }}>
          <button className="gold-button" onClick={openCreate} style={{ width: '100%', padding: '12px 0', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={16} strokeWidth={3} />
            Nuevo Plan
          </button>
        </div>

        <div style={{ padding: '16px 20px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); navigate('/login'); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F3F0FB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
            <button className="menu-toggle" onClick={toggleSidebar}>
              <Menu size={20} />
            </button>
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 600, color: C.gold, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              MEDIS <span className="overview-label" style={{ fontSize: 12, fontFamily: '"Hanken Grotesk", sans-serif', color: C.textMuted, fontWeight: 500, letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>/ Planes</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={fetchMemberships} title="Recargar" style={{ width: 40, height: 40, borderRadius: 12, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }} onMouseEnter={e => e.currentTarget.style.background = C.white} onMouseLeave={e => e.currentTarget.style.background = C.bgPanel}>
              <RefreshCw size={16} />
            </button>
            <button style={{ width: 40, height: 40, borderRadius: 12, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }} onMouseEnter={e => e.currentTarget.style.background = C.white} onMouseLeave={e => e.currentTarget.style.background = C.bgPanel}>
              <Bell size={18} />
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 12, border: `2px solid ${C.gold}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 10px rgba(139,92,246,0.2)' }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem', background: 'radial-gradient(circle at top right, rgba(139,92,246,0.03), transparent 400px)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontFamily: FONT_BODONI, fontSize: '2.5rem', color: C.text, marginBottom: '0.5rem', lineHeight: 1.2 }}>Gestión de Planes</h1>
                <p style={{ color: C.textMuted, fontSize: '1.05rem' }}>Administra los planes y tarifas disponibles en Medis.</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => navigate('/admin/benefits')}
                  style={{ padding: '12px 20px', border: `1.5px solid ${C.borderLight}`, borderRadius: 12, fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: C.white, color: C.textBrown, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = C.textBrown; }}
                >
                  <Gift size={15} /> Gestionar Beneficios
                </button>
                <button onClick={openCreate} className="gold-button" style={{ padding: '12px 24px', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={16} strokeWidth={3} /> Nuevo Plan
                </button>
              </div>
            </motion.div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</span>
                <button onClick={fetchMemberships} style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Reintentar</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total planes', value: memberships.length, icon: Tag, color: C.gold, bg: 'rgba(139,92,246,0.08)' },
                { label: 'Planes activos', value: memberships.filter(m => m.isActive).length, icon: CheckCircle2, color: '#16A34A', bg: 'rgba(34,197,94,0.08)' },
                { label: 'Planes inactivos', value: memberships.filter(m => !m.isActive).length, icon: XCircle, color: '#DC2626', bg: 'rgba(239,68,68,0.08)' },
                { label: 'Precio promedio', value: memberships.length ? fmt(Math.round(memberships.reduce((a, m) => a + m.price, 0) / memberships.length)) : '—', icon: CreditCard, color: '#2563EB', bg: 'rgba(59,130,246,0.08)', isText: true },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="glass-card" style={{ padding: '1.4rem', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} color={s.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</p>
                      {s.isText
                        ? <p className="stat-value" style={{ fontSize: '1.2rem', margin: 0, lineHeight: 1 }}>{s.value as string}</p>
                        : <p className="stat-value" style={{ fontSize: '1.8rem', margin: 0, lineHeight: 1 }}>{s.value as number}</p>
                      }
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {[1, 2, 3].map(n => (
                  <div key={n} className="glass-card" style={{ padding: '1.5rem', minHeight: 220 }}>
                    {[80, 120, 60, 100].map((w, i) => (
                      <div key={i} style={{ height: 14, width: `${w}%`, background: 'linear-gradient(90deg, #DDD6FE 25%, #F3F0FB 50%, #DDD6FE 75%)', backgroundSize: '400% 100%', borderRadius: 6, marginBottom: 12, animation: 'shimmer 1.4s ease infinite' }} />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!loading && (() => {
              const inscriptions = memberships.filter(m => m.type === 'inscription');
              const plans = memberships.filter(m => m.type !== 'inscription');
              const renderCard = (m: Membership, i: number) => {
                    const tColor = TYPE_COLORS[m.type] ?? TYPE_COLORS.per_class;
                    return (
                      <motion.div key={m.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.06 }} className="glass-card" style={{ padding: '1.5rem', opacity: m.isActive ? 1 : 0.65 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ padding: '3px 10px', borderRadius: 99, background: tColor.bg, color: tColor.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', width: 'fit-content' }}>
                              {TYPE_LABELS[m.type] ?? m.type}
                            </span>
                            <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.25rem', color: C.text, margin: 0, lineHeight: 1.2 }}>{m.name}</h3>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => openEdit(m)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.14)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.07)'}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => setDeleteConfirm(m.id)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {m.description && (
                          <p style={{ fontSize: 13, color: C.textMedium, marginBottom: '1rem', lineHeight: 1.5 }}>{m.description}</p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '1rem' }}>
                          <span className="stat-value" style={{ fontSize: '1.8rem', lineHeight: 1 }}>{fmt(m.price)}</span>
                          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>/ {(TYPE_LABELS[m.type] ?? m.type).toLowerCase()}</span>
                        </div>

                        {m.benefits.length > 0 && (
                          <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Incluye</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {m.benefits.filter(b => {
                                const cb = catalogBenefits.find(x => x.name === b);
                                return !cb || cb.benefitType !== 'free_classes';
                              }).map(b => (
                                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <CheckCircle2 size={12} color="#16A34A" style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, color: C.textBrown }}>{b}</span>
                                </div>
                              ))}
                            </div>
                            {(() => {
                              const fcBenefits = catalogBenefits.filter(
                                cb => m.benefits.includes(cb.name) && cb.benefitType === 'free_classes' && cb.benefitValue != null
                              );
                              if (fcBenefits.length === 0) return null;
                              const total = fcBenefits.reduce((sum, cb) => sum + (cb.benefitValue ?? 0), 0);
                              return (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                  {fcBenefits.map(cb => (
                                    <span key={cb.id} style={{ fontSize: 11, fontWeight: 600, color: '#16A34A', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                                      {cb.name}: {cb.benefitValue}
                                    </span>
                                  ))}
                                  {fcBenefits.length > 1 && (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                                      Total: {total} ses.
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                            {m.durationDays ? <><Clock size={12} />{m.durationDays} días</> : <><Infinity size={12} />Sin vencimiento</>}
                          </span>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>·</span>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{m.code}</span>
                        </div>

                        <div style={{ height: 1, background: C.borderLight, margin: '0.75rem 0' }} />

                        <button onClick={() => toggleActive(m)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: m.isActive ? '#16A34A' : C.textMuted }}>
                            {m.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                          {m.isActive ? <ToggleRight size={22} color="#16A34A" /> : <ToggleLeft size={22} color={C.textMuted} />}
                        </button>
                      </motion.div>
                    );
              };

              return (
                <>
                  {/* ── Inscripciones ── */}
                  {inscriptions.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8B5CF6' }} />
                        <h2 style={{ fontFamily: FONT_BODONI, fontSize: '1.1rem', color: C.text, margin: 0 }}>Inscripción</h2>
                        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>— Pago único · habilita el acceso a planes y descuentos</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        <AnimatePresence>
                          {inscriptions.map((m, i) => renderCard(m, i))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* ── Planes ── */}
                  {plans.length > 0 && (
                    <div>
                      {inscriptions.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.gold }} />
                          <h2 style={{ fontFamily: FONT_BODONI, fontSize: '1.1rem', color: C.text, margin: 0 }}>Planes</h2>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>— Requieren inscripción activa</span>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        <AnimatePresence>
                          {plans.map((m, i) => renderCard(m, i))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* ── Empty state ── */}
                  {memberships.length === 0 && !error && (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: C.textMuted }}>
                      <CreditCard size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No hay planes creados aún.</p>
                      <button onClick={openCreate} className="gold-button" style={{ marginTop: '1rem', padding: '10px 24px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <Plus size={15} /> Crear primer plan
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </main>
      </div>

      {/* ── WIZARD MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.5)', backdropFilter: 'blur(8px)', zIndex: 100 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}
            >
              <div style={{ background: C.white, borderRadius: 24, width: '100%', maxWidth: 500, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', pointerEvents: 'all', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

                {/* Modal header */}
                <div style={{ padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 1.5rem) 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.borderLight}` }}>
                  <div>
                    <h2 style={{ fontFamily: FONT_BODONI, fontSize: '1.5rem', color: C.text, margin: 0 }}>
                      {editTarget ? 'Editar Plan' : 'Nuevo Plan'}
                    </h2>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: '2px 0 0', fontWeight: 500 }}>
                      {STEPS[currentStep].desc}
                    </p>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium, flexShrink: 0 }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '1.1rem 1.75rem 0.5rem' }}>
                  {STEPS.map((step, i) => (
                    <React.Fragment key={i}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <motion.div
                          animate={{
                            background: i < currentStep
                              ? C.gold
                              : i === currentStep
                                ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`
                                : 'transparent',
                            borderColor: i <= currentStep ? C.gold : C.borderLight,
                            scale: i === currentStep ? 1.1 : 1,
                          }}
                          transition={{ duration: 0.25 }}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            border: `2px solid ${i <= currentStep ? C.gold : C.borderLight}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700,
                            color: i <= currentStep ? C.white : C.textMuted,
                          }}
                        >
                          {i < currentStep ? '✓' : i + 1}
                        </motion.div>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: i === currentStep ? C.gold : i < currentStep ? C.goldLight : C.textMuted, transition: 'color 0.25s' }}>
                          {step.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <motion.div
                          animate={{ background: i < currentStep ? C.gold : C.borderLight }}
                          transition={{ duration: 0.25 }}
                          style={{ flex: 1, height: 2, margin: '0 6px', marginBottom: 16 }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Step content */}
                <div style={{ padding: '1rem clamp(1rem, 4vw, 1.5rem)', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <AnimatePresence mode="wait">

                    {/* ── Step 0: Básico ── */}
                    {currentStep === 0 && (
                      <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Field label="Nombre del plan *" error={formErrors.name}>
                          <input
                            autoFocus
                            value={form.name}
                            onChange={e => { const name = e.target.value; setForm(f => ({ ...f, name, code: editTarget ? f.code : slugify(name) })); setFormErrors(v => ({ ...v, name: undefined })); }}
                            placeholder="Ej: Plan Mensual"
                            style={inputStyle(!!formErrors.name)}
                          />
                        </Field>
                        <Field label="Código único *" error={formErrors.code}>
                          <input
                            value={form.code}
                            onChange={e => { setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '_') })); setFormErrors(v => ({ ...v, code: undefined })); }}
                            placeholder="MENSUAL"
                            style={{ ...inputStyle(!!formErrors.code), fontFamily: 'monospace', letterSpacing: '0.06em' }}
                          />
                        </Field>
                        <Field label="Descripción">
                          <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Descripción breve del plan..."
                            rows={2}
                            style={{ ...inputStyle(false), resize: 'vertical', lineHeight: 1.5 }}
                          />
                        </Field>
                      </motion.div>
                    )}

                    {/* ── Step 1: Precio ── */}
                    {currentStep === 1 && (
                      <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Field label="Tipo de plan *">
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {(Object.keys(TYPE_LABELS) as MembershipType[]).map(t => {
                              const sel = form.type === t;
                              const tc = TYPE_COLORS[t];
                              return (
                                <button
                                  key={t} type="button"
                                  onClick={() => setForm(f => ({ ...f, type: t, duration_days: (t === 'per_class' || t === 'private' || t === 'pack' || t === 'inscription') ? '' : f.duration_days }))}
                                  style={{ padding: '10px 6px', borderRadius: 10, border: `2px solid ${sel ? tc.color : C.borderLight}`, background: sel ? tc.bg : 'transparent', color: sel ? tc.color : C.textBrown, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s', letterSpacing: '0.04em' }}
                                >
                                  {TYPE_LABELS[t]}
                                </button>
                              );
                            })}
                          </div>
                        </Field>
                        <div style={{ display: 'grid', gridTemplateColumns: hasDuration ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                          <Field label="Precio (COP) *" error={formErrors.price}>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontWeight: 700, fontSize: 13 }}>$</span>
                              <input
                                autoFocus
                                type="text"
                                inputMode="numeric"
                                value={formatPrice(form.price)}
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  setForm(f => ({ ...f, price: digits }));
                                  setFormErrors(v => ({ ...v, price: undefined }));
                                }}
                                placeholder="45.000"
                                style={{ ...inputStyle(!!formErrors.price), paddingLeft: 28 }}
                              />
                            </div>
                          </Field>
                          {hasDuration && (
                            <Field label="Duración (días) *" error={formErrors.duration_days}>
                              <input
                                type="number" min="1"
                                value={form.duration_days}
                                onChange={e => { setForm(f => ({ ...f, duration_days: e.target.value })); setFormErrors(v => ({ ...v, duration_days: undefined })); }}
                                placeholder={form.type === 'annual' ? '365' : '30'}
                                style={inputStyle(!!formErrors.duration_days)}
                              />
                            </Field>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step 2: Beneficios ── */}
                    {currentStep === 2 && (
                      <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* Header + link to catalog */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                            Selecciona los beneficios incluidos en este plan. <span style={{ color: C.textMuted }}>Es opcional.</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => { setShowModal(false); navigate('/admin/benefits'); }}
                            style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: 'rgba(139,92,246,0.07)', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}
                          >
                            + Gestionar catálogo
                          </button>
                        </div>

                        {/* Benefit cards */}
                        {catalogBenefits.filter(b => b.isActive).length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem 1rem', background: C.bgPanel, borderRadius: 14, border: `2px dashed ${C.borderLight}` }}>
                            <Gift size={32} color={C.borderLight} style={{ margin: '0 auto 10px', display: 'block' }} />
                            <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 12px', fontWeight: 600 }}>El catálogo de beneficios está vacío.</p>
                            <button type="button" onClick={() => { setShowModal(false); navigate('/admin/benefits'); }}
                              style={{ fontSize: 12, fontWeight: 700, color: C.gold, background: 'rgba(139,92,246,0.1)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
                              Ir a agregar beneficios →
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 280, overflowY: 'auto', paddingRight: 2 }}>
                            {catalogBenefits.filter(b => b.isActive).map(b => {
                              const selected = form.benefits.includes(b.name);
                              const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
                                free_classes:     { icon: <CreditCard size={14} />, color: '#16A34A', bg: 'rgba(34,197,94,0.1)',    label: b.benefitValue ? `${b.benefitValue} sesiones` : 'Sesiones' },
                                unlimited_classes:{ icon: <Infinity   size={14} />, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Ilimitado' },
                                discount_percent: { icon: <Percent    size={14} />, color: '#B45309', bg: 'rgba(234,179,8,0.1)',   label: b.benefitValue ? `${b.benefitValue}% dto.` : 'Descuento' },
                                informational:    { icon: <Info       size={14} />, color: '#5E5E5E', bg: 'rgba(94,94,94,0.08)',   label: 'Info' },
                              };
                              const tc = typeConfig[b.benefitType] ?? typeConfig.informational;
                              return (
                                <motion.button key={b.id} type="button" onClick={() => toggleBenefit(b.name)} whileTap={{ scale: 0.97 }}
                                  style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                                    border: `2px solid ${selected ? tc.color : C.borderLight}`,
                                    background: selected ? tc.bg : C.bgPanel,
                                    boxShadow: selected ? `0 0 0 3px ${tc.bg}` : 'none',
                                    transition: 'all 0.18s', position: 'relative',
                                  }}
                                >
                                  {/* Selected checkmark */}
                                  {selected && (
                                    <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>✓</span>
                                    </div>
                                  )}
                                  {/* Type icon */}
                                  <div style={{ width: 32, height: 32, borderRadius: 8, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tc.color, flexShrink: 0 }}>
                                    {tc.icon}
                                  </div>
                                  {/* Name */}
                                  <span style={{ fontSize: 12, fontWeight: 700, color: selected ? tc.color : C.text, lineHeight: 1.3, paddingRight: 20 }}>
                                    {b.name}
                                  </span>
                                  {/* Value badge */}
                                  <span style={{ fontSize: 10, fontWeight: 700, color: tc.color, background: selected ? 'rgba(255,255,255,0.6)' : tc.bg, padding: '2px 8px', borderRadius: 20 }}>
                                    {tc.label}
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        )}

                        {/* Selected count */}
                        {form.benefits.length > 0 && (
                          <p style={{ fontSize: 12, color: C.gold, fontWeight: 700, margin: 0 }}>
                            ✓ {form.benefits.length} beneficio{form.benefits.length !== 1 ? 's' : ''} seleccionado{form.benefits.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </motion.div>
                    )}

                    {/* ── Step 3: Confirmar ── */}
                    {currentStep === 3 && (
                      <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                          Así quedará el plan. Confirma antes de {editTarget ? 'guardar' : 'crear'}.
                        </p>

                        {/* Preview card */}
                        <div style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.03), rgba(59,130,246,0.05))`, borderRadius: 16, padding: '1rem', border: `1.5px solid ${C.borderLight}`, overflow: 'hidden' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, background: tPreview.bg, color: tPreview.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', display: 'inline-block' }}>
                            {TYPE_LABELS[form.type]}
                          </span>
                          <h3 style={{ fontFamily: FONT_BODONI, fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', color: C.text, margin: '10px 0 4px', wordBreak: 'break-word' }}>
                            {form.name || <span style={{ opacity: 0.4 }}>Sin nombre</span>}
                          </h3>
                          {form.description && (
                            <p style={{ fontSize: 12, color: C.textMedium, margin: '0 0 10px', lineHeight: 1.5, wordBreak: 'break-word' }}>{form.description}</p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0', flexWrap: 'wrap' }}>
                            <span className="stat-value" style={{ fontSize: 'clamp(1.3rem, 5vw, 1.7rem)', lineHeight: 1 }}>{fmt(Number(form.price) || 0)}</span>
                            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>COP</span>
                          </div>
                          {form.duration_days && (
                            <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} style={{ flexShrink: 0 }} /> {form.duration_days} días de vigencia
                            </p>
                          )}
                          {form.benefits.length > 0 && (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.borderLight}` }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Incluye</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {form.benefits.filter(b => {
                                  const cb = catalogBenefits.find(x => x.name === b);
                                  return !cb || cb.benefitType !== 'free_classes';
                                }).map(b => (
                                  <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                    <CheckCircle2 size={12} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
                                    <span style={{ fontSize: 12, color: C.textBrown, wordBreak: 'break-word', minWidth: 0 }}>{b}</span>
                                  </div>
                                ))}
                              </div>
                              {(() => {
                                const fcBenefits = catalogBenefits.filter(
                                  cb => form.benefits.includes(cb.name) && cb.benefitType === 'free_classes' && cb.benefitValue != null
                                );
                                if (fcBenefits.length === 0) return null;
                                const total = fcBenefits.reduce((sum, cb) => sum + (cb.benefitValue ?? 0), 0);
                                return (
                                  <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                    {fcBenefits.map(cb => (
                                      <div key={cb.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                        <CheckCircle2 size={12} color="#16A34A" style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: 12, color: '#16A34A' }}>{cb.name}: <b>{cb.benefitValue}</b> sesiones</span>
                                      </div>
                                    ))}
                                    {fcBenefits.length > 1 && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(34,197,94,0.25)' }}>
                                        <CheckCircle2 size={13} color="#16A34A" style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>
                                          Total: {total} sesiones incluidas
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Active toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0.75rem 1rem', background: C.bgPanel, borderRadius: 10, border: `1px solid ${C.borderLight}`, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.textBrown }}>Estado del plan</span>
                            <p style={{ fontSize: 11, color: C.textMuted, margin: '1px 0 0' }}>{form.is_active ? 'Visible para los usuarios' : 'Oculto para los usuarios'}</p>
                          </div>
                          <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, color: form.is_active ? '#16A34A' : C.textMuted, fontWeight: 600 }}>{form.is_active ? 'Activo' : 'Inactivo'}</span>
                            {form.is_active ? <ToggleRight size={26} color="#16A34A" /> : <ToggleLeft size={26} color={C.textMuted} />}
                          </button>
                        </div>

                        {formErrors.name && (
                          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.75rem 1rem' }}>
                            <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{formErrors.name}</span>
                          </div>
                        )}
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* Navigation */}
                <div style={{ padding: '0.75rem clamp(1rem, 4vw, 1.5rem) 1.5rem', display: 'flex', gap: 10, borderTop: `1px solid ${C.borderLight}`, flexWrap: 'nowrap', flexShrink: 0, background: C.white }}>
                  {currentStep === 0 ? (
                    <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  ) : (
                    <button onClick={() => { setFormErrors({}); setCurrentStep(s => s - 1); }} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      ← Atrás
                    </button>
                  )}
                  {currentStep < STEPS.length - 1 ? (
                    <button onClick={handleNext} className="gold-button" style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, letterSpacing: '0.06em' }}>
                      Siguiente <span style={{ fontSize: 15 }}>→</span>
                    </button>
                  ) : (
                    <button onClick={handleSubmit} disabled={saving} className="gold-button" style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.06em', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {saving ? 'Guardando…' : editTarget ? '✓ Guardar Cambios' : '✓ Crear Plan'}
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.45)', backdropFilter: 'blur(6px)', zIndex: 110 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ position: 'fixed', inset: 0, zIndex: 111, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 16, padding: '2rem', maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', pointerEvents: 'all', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Trash2 size={22} color="#DC2626" />
                </div>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.text, marginBottom: 8 }}>¿Eliminar plan?</h3>
                <p style={{ color: C.textMuted, fontSize: 13, marginBottom: '1.5rem' }}>Esta acción eliminará el plan permanentemente de la base de datos.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#DC2626', color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 200,
              background: actionToast.ok ? '#16A34A' : '#DC2626',
              color: C.white, padding: '12px 24px', borderRadius: 12,
              fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              maxWidth: '90vw', textAlign: 'center',
            }}
          >
            {actionToast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: `1.5px solid ${hasError ? '#DC2626' : '#DDD6FE'}`,
  background: '#FAFAF9',
  fontSize: 13,
  color: '#1B1C1C',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: '"Hanken Grotesk", Inter, sans-serif',
  transition: 'border-color 0.18s',
});

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>
    {children}
    {error && <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>{error}</span>}
  </div>
);
