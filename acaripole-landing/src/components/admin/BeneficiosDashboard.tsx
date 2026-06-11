import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, X, CheckCircle2, XCircle,
  Edit2, Trash2, ToggleLeft, ToggleRight, Gift,
  Loader2, Percent, CreditCard, Infinity, Info,
  Users, CalendarDays, ShieldCheck, DollarSign, LogOut,
  Briefcase, ChevronDown, ChevronRight, LayoutDashboard,
} from 'lucide-react';
import './MainDashboard.css';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: false },
  { icon: Users, label: 'Usuarios', active: false },
  { icon: CalendarDays, label: 'Calendario', active: false },
  { icon: Briefcase, label: 'Servicios', active: false },
  { icon: ShieldCheck, label: 'Reglas', active: false },
  { icon: DollarSign, label: 'Finanzas', active: false },
  { icon: CreditCard, label: 'Planes', active: true },
];

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bgPanel: '#F3F0FB', white: '#FFFFFF',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  borderLight: '#DDD6FE',
};
const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER  = '"Hanken Grotesk", Inter, sans-serif';

type BenefitType = 'informational' | 'free_classes' | 'discount_percent' | 'unlimited_classes';

type ServiceCategory = 'pole' | 'complementary' | 'general';

interface Benefit {
  id: string;
  name: string;
  description: string | null;
  benefitType: BenefitType;
  benefitValue: number | null;
  serviceCategory: ServiceCategory | null;
  isActive: boolean;
  sortOrder: number;
}

const CATEGORY_META: Record<ServiceCategory, { label: string; desc: string; color: string; bg: string }> = {
  pole: {
    label: 'Pole',
    desc: 'Clases de pole dance',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
  },
  complementary: {
    label: 'Fuerza / Flex',
    desc: 'Fuerza o flexibilidad',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
  },
  general: {
    label: 'General',
    desc: 'Cualquier tipo de clase',
    color: '#16A34A',
    bg: 'rgba(34,197,94,0.08)',
  },
};

const TYPE_META: Record<BenefitType, { label: string; icon: React.ReactNode; color: string; bg: string; hint: string; valuePlaceholder?: string; valueLabel?: string }> = {
  informational: {
    label: 'Informativo',
    icon: <Info size={16} />,
    color: '#5E5E5E',
    bg: 'rgba(94,94,94,0.08)',
    hint: 'Beneficio descriptivo sin valor numérico. Aplica a cualquier servicio del estudio (ej: acceso al vestuario, comunidad privada…)',
  },
  free_classes: {
    label: 'Sesiones incluidas',
    icon: <CreditCard size={16} />,
    color: '#16A34A',
    bg: 'rgba(34,197,94,0.1)',
    hint: 'Número de sesiones incluidas sin costo. Aplica a cualquier tipo de servicio: clases, práctica libre, talleres o eventos.',
    valueLabel: 'Número de sesiones',
    valuePlaceholder: 'Ej: 3',
  },
  discount_percent: {
    label: 'Descuento %',
    icon: <Percent size={16} />,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.1)',
    hint: 'Descuento sobre cualquier servicio adicional una vez agotadas las sesiones incluidas en el plan.',
    valueLabel: 'Porcentaje (%)',
    valuePlaceholder: 'Ej: 10',
  },
  unlimited_classes: {
    label: 'Acceso ilimitado',
    icon: <Infinity size={16} />,
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
    hint: 'Acceso ilimitado a todos los servicios del estudio durante la vigencia del plan.',
  },
};

function autoName(type: BenefitType, value: string): string {
  const v = Number(value);
  if (type === 'free_classes')      return value ? `${v} sesión${v !== 1 ? 'es' : ''} incluida${v !== 1 ? 's' : ''}` : '';
  if (type === 'discount_percent')  return value ? `${v}% de descuento en servicios adicionales` : '';
  if (type === 'unlimited_classes') return 'Acceso ilimitado a todos los servicios';
  return '';
}

function formatBenefitTag(b: Benefit): string {
  if (b.benefitType === 'free_classes' && b.benefitValue)
    return `${b.benefitValue} sesión${b.benefitValue !== 1 ? 'es' : ''} incluida${b.benefitValue !== 1 ? 's' : ''}`;
  if (b.benefitType === 'discount_percent' && b.benefitValue)
    return `${b.benefitValue}% descuento en servicios adicionales`;
  if (b.benefitType === 'unlimited_classes') return 'Acceso ilimitado a todos los servicios';
  return b.name;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const inputStyle = (err?: boolean): React.CSSProperties => ({
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: `1.5px solid ${err ? '#DC2626' : C.borderLight}`,
  background: '#FAFAF9', fontSize: 13, color: C.text, outline: 'none',
  boxSizing: 'border-box', fontFamily: FONT_INTER, transition: 'border-color 0.18s',
});

export const BeneficiosDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredNav, setHoveredNav]           = useState<number | null>(null);
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen]     = useState(false);

  const [benefits, setBenefits]       = useState<Benefit[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState<Benefit | null>(null);
  const [formType, setFormType]             = useState<BenefitType>('informational');
  const [formValue, setFormValue]           = useState('');
  const [formName, setFormName]             = useState('');
  const [formDesc, setFormDesc]             = useState('');
  const [formCategory, setFormCategory]     = useState<ServiceCategory>('general');
  const [nameEdited, setNameEdited]         = useState(false);
  const [formErr, setFormErr]               = useState('');

  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBenefits = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/benefits', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setBenefits(data.data.benefits);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchBenefits(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setFormType('informational');
    setFormValue('');
    setFormName('');
    setFormDesc('');
    setFormCategory('general');
    setNameEdited(false);
    setFormErr('');
    setShowForm(true);
  };

  const openEdit = (b: Benefit) => {
    setEditTarget(b);
    setFormType(b.benefitType);
    setFormValue(b.benefitValue !== null ? String(b.benefitValue) : '');
    setFormName(b.name);
    setFormDesc(b.description ?? '');
    setFormCategory(b.serviceCategory ?? 'general');
    setNameEdited(true);
    setFormErr('');
    setShowForm(true);
  };

  const handleTypeChange = (type: BenefitType) => {
    setFormType(type);
    setFormValue('');
    if (!nameEdited) setFormName(autoName(type, ''));
    setFormErr('');
  };

  const handleValueChange = (val: string) => {
    setFormValue(val);
    if (!nameEdited) setFormName(autoName(formType, val));
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormErr('El nombre es requerido'); return; }
    if ((formType === 'free_classes' || formType === 'discount_percent') && !formValue) {
      setFormErr('Ingresa el valor numérico');
      return;
    }
    if (formType === 'discount_percent') {
      const v = Number(formValue);
      if (isNaN(v) || v <= 0 || v > 100) { setFormErr('El porcentaje debe ser entre 1 y 100'); return; }
    }
    if (formType === 'free_classes') {
      const v = Number(formValue);
      if (!Number.isInteger(v) || v <= 0) { setFormErr('El número de sesiones debe ser un entero positivo'); return; }
    }

    setSaving(true);
    try {
      const url    = editTarget ? `/api/benefits/${editTarget.id}` : '/api/benefits';
      const method = editTarget ? 'PATCH' : 'POST';
      const needsValue = formType === 'free_classes' || formType === 'discount_percent';
      const res = await fetch(url, {
        method, headers: authHeaders(),
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || null,
          benefitType: formType,
          benefitValue: needsValue ? Number(formValue) : null,
          serviceCategory: formType === 'free_classes' ? formCategory : null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al guardar');
      showToast(editTarget ? 'Beneficio actualizado' : 'Beneficio creado', true);
      setShowForm(false);
      await fetchBenefits();
    } catch (e: unknown) {
      setFormErr((e as Error).message);
    } finally { setSaving(false); }
  };

  const handleToggle = async (b: Benefit) => {
    try {
      const res  = await fetch(`/api/benefits/${b.id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setBenefits(prev => prev.map(x => x.id === b.id ? { ...x, isActive: !x.isActive } : x));
    } catch (e: unknown) { showToast((e as Error).message, false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res  = await fetch(`/api/benefits/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setBenefits(prev => prev.filter(b => b.id !== id));
      showToast('Beneficio eliminado', true);
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setDeleteId(null); }
  };

  const meta = TYPE_META[formType];
  const needsValue = formType === 'free_classes' || formType === 'discount_percent';

  const handleNavClick = (label: string) => {
    if (label === 'Dashboard') navigate('/admin/dashboard');
    else if (label === 'Calendario') navigate('/admin/classes');
    else if (label === 'Usuarios') navigate('/admin/users');
    else if (label === 'Inscripciones') navigate('/admin/inscripciones');
    else if (label === 'Finanzas') navigate('/admin/finances');
    else if (label === 'Planes') navigate('/admin/memberships');
    else if (label === 'Servicios') setIsServicesExpanded(p => !p);
    if (label !== 'Servicios') setIsMobileMenuOpen(false);
  };

  const _toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileMenuOpen(p => !p);
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

        <div style={{ padding: '16px 20px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); navigate('/login'); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F3F0FB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={18} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">

      {/* ── TOP BAR ── */}
      <header style={{ height: 72, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/admin/memberships')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = C.textBrown; }}
          >
            <ArrowLeft size={15} /> Planes
          </button>
          <div style={{ width: 1, height: 24, background: C.borderLight }} />
          <h1 style={{ fontFamily: FONT_BODONI, fontSize: 22, color: C.gold, margin: 0, fontWeight: 600, fontStyle: 'italic' }}>
            Catálogo de Beneficios
          </h1>
        </div>
        <button
          onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
        >
          <Plus size={15} strokeWidth={3} /> Nuevo Beneficio
        </button>
      </header>

      {/* ── CONTENT ── */}
      <main style={{ flex: 1, overflowY: 'auto', maxWidth: 860, width: '100%', margin: '0 auto', padding: '40px 24px', boxSizing: 'border-box' }}>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `rgba(139,92,246,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gift size={22} color={C.gold} />
            </div>
            <div>
              <h2 style={{ fontFamily: FONT_BODONI, fontSize: '1.75rem', color: C.text, margin: 0 }}>Beneficios</h2>
              <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
                Gestiona los beneficios disponibles para asignar a los planes.
              </p>
            </div>
          </div>

          {/* type breakdown */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', value: benefits.length, color: C.gold, bg: 'rgba(139,92,246,0.08)' },
              { label: 'Activos', value: benefits.filter(b => b.isActive).length, color: '#16A34A', bg: 'rgba(34,197,94,0.08)' },
              { label: 'Inactivos', value: benefits.filter(b => !b.isActive).length, color: '#DC2626', bg: 'rgba(239,68,68,0.08)' },
            ].map(s => (
              <div key={s.label} style={{ padding: '8px 16px', borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: FONT_BODONI }}>{s.value}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '4rem', color: C.textMuted }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Cargando beneficios…</span>
          </div>
        ) : benefits.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '5rem 2rem', background: C.white, borderRadius: 20, border: `2px dashed ${C.borderLight}` }}>
            <Gift size={44} color={C.borderLight} style={{ marginBottom: 16 }} />
            <p style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.textMuted, margin: '0 0 6px' }}>Sin beneficios aún</p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 20px' }}>Agrega el primer beneficio para empezar a asignarlos a los planes.</p>
            <button onClick={openAdd} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Agregar beneficio
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {benefits.map((b, i) => {
                const tm = TYPE_META[b.benefitType];
                return (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, overflow: 'hidden' }}
                    transition={{ delay: i * 0.04 }}
                    style={{ background: C.white, borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 14, border: `1.5px solid ${b.isActive ? C.borderLight : '#F0EDE8'}`, opacity: b.isActive ? 1 : 0.6, transition: 'opacity 0.2s' }}
                  >
                    {/* Type icon */}
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: tm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: tm.color }}>
                      {tm.icon}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.name}
                        </p>
                        {/* type + value chip */}
                        <span style={{ fontSize: 11, fontWeight: 700, color: tm.color, background: tm.bg, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {tm.label}{b.benefitValue !== null ? ` · ${b.benefitType === 'discount_percent' ? b.benefitValue + '%' : b.benefitValue}` : ''}
                        </span>
                      </div>
                      {b.description && (
                        <p style={{ fontSize: 12, color: C.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.description}</p>
                      )}
                      {/* formatted tag */}
                      {b.benefitType !== 'informational' && (
                        <p style={{ fontSize: 11, color: tm.color, margin: '3px 0 0', fontWeight: 600 }}>
                          → {formatBenefitTag(b)}
                        </p>
                      )}
                    </div>

                    {/* Active status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {b.isActive
                        ? <CheckCircle2 size={15} color="#16A34A" />
                        : <XCircle size={15} color="#DC2626" />
                      }
                    </div>

                    {/* Toggle */}
                    <button onClick={() => handleToggle(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: b.isActive ? '#16A34A' : C.textMuted }}>
                        {b.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                      {b.isActive
                        ? <ToggleRight size={22} color="#16A34A" />
                        : <ToggleLeft size={22} color={C.textMuted} />
                      }
                    </button>

                    {/* Edit */}
                    <button onClick={() => openEdit(b)} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.14)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.07)'}>
                      <Edit2 size={14} />
                    </button>

                    {/* Delete */}
                    <button onClick={() => setDeleteId(b.id)} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}>
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ── ADD/EDIT MODAL ── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.45)', backdropFilter: 'blur(6px)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }} style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 20, width: '100%', maxWidth: 480, padding: '1.75rem', boxShadow: '0 24px 80px rgba(0,0,0,0.16)', pointerEvents: 'all' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.text, margin: 0 }}>
                    {editTarget ? 'Editar Beneficio' : 'Nuevo Beneficio'}
                  </h3>
                  <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, borderRadius: 8, background: C.bgPanel, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium }}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                  {/* TYPE SELECTOR */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Tipo de beneficio</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {(Object.entries(TYPE_META) as [BenefitType, typeof meta][]).map(([type, tm]) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleTypeChange(type)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px', borderRadius: 10,
                            border: `2px solid ${formType === type ? tm.color : C.borderLight}`,
                            background: formType === type ? tm.bg : 'transparent',
                            color: formType === type ? tm.color : C.textMedium,
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.18s', textAlign: 'left',
                          }}
                        >
                          {tm.icon}
                          {tm.label}
                        </button>
                      ))}
                    </div>
                    {/* hint */}
                    <p style={{ fontSize: 11.5, color: C.textMuted, margin: '8px 0 0', lineHeight: 1.5 }}>
                      {meta.hint}
                    </p>
                  </div>

                  {/* VALUE (conditional) */}
                  {needsValue && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        {meta.valueLabel} *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min={1}
                          max={formType === 'discount_percent' ? 100 : undefined}
                          value={formValue}
                          onChange={e => handleValueChange(e.target.value)}
                          placeholder={meta.valuePlaceholder}
                          style={{ ...inputStyle(!!formErr && !formName.trim()), paddingRight: formType === 'discount_percent' ? 36 : 14 }}
                        />
                        {formType === 'discount_percent' && (
                          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: C.textMuted }}>%</span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* CATEGORY (only for free_classes) */}
                  {formType === 'free_classes' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                        Tipo de clase que cubre *
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {(Object.entries(CATEGORY_META) as [ServiceCategory, typeof CATEGORY_META[ServiceCategory]][]).map(([cat, cm]) => (
                          <button
                            key={cat} type="button"
                            onClick={() => setFormCategory(cat)}
                            style={{
                              padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                              border: `2px solid ${formCategory === cat ? cm.color : C.borderLight}`,
                              background: formCategory === cat ? cm.bg : 'transparent',
                              color: formCategory === cat ? cm.color : C.textMedium,
                              fontSize: 12, fontWeight: 700, transition: 'all 0.18s',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            }}
                          >
                            <span>{cm.label}</span>
                            <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.75 }}>{cm.desc}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* NAME */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Nombre *
                      {!nameEdited && formType !== 'informational' && (
                        <span style={{ fontWeight: 400, textTransform: 'none', color: C.textMuted, marginLeft: 6 }}>(auto-generado, editable)</span>
                      )}
                    </label>
                    <input
                      value={formName}
                      onChange={e => { setFormName(e.target.value); setNameEdited(true); setFormErr(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleSave()}
                      placeholder={formType === 'informational' ? 'Ej: Acceso al vestuario premium' : autoName(formType, formValue) || 'Nombre del beneficio'}
                      style={inputStyle(!!formErr && !formName.trim())}
                    />
                    {formErr && <p style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, margin: '4px 0 0' }}>{formErr}</p>}
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Descripción <span style={{ fontWeight: 400, textTransform: 'none', color: C.textMuted }}>(opcional)</span>
                    </label>
                    <textarea
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      placeholder="Explica brevemente este beneficio…"
                      rows={2}
                      style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.55 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem' }}>
                  <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, letterSpacing: '0.06em' }}>
                    {saving ? 'Guardando…' : editTarget ? '✓ Guardar cambios' : '✓ Crear Beneficio'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ── */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.45)', backdropFilter: 'blur(6px)', zIndex: 110 }} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} style={{ position: 'fixed', inset: 0, zIndex: 111, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}>
              <div style={{ background: C.white, borderRadius: 18, padding: '2rem', maxWidth: 360, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.14)', pointerEvents: 'all', textAlign: 'center' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Trash2 size={20} color="#DC2626" />
                </div>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.text, margin: '0 0 8px' }}>¿Eliminar beneficio?</h3>
                <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 1.5rem' }}>Se eliminará del catálogo. Los planes que ya lo tengan asignado no se verán afectados.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#DC2626', color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#16A34A' : '#DC2626', color: C.white, padding: '11px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', whiteSpace: 'nowrap' }}
          >
            {toast.ok ? '✓ ' : '✗ '}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
      </div>{/* end .main-content */}
    </div>
  );
};
