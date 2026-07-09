import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, CalendarDays, DollarSign, LogOut, Briefcase, ChevronDown, ChevronRight,
  LayoutDashboard, CreditCard, Menu, Percent, Plus, X, Pencil, Trash2, Tag, } from 'lucide-react';
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
  { icon: LayoutDashboard, label: 'Dashboard',  active: false },
  { icon: Users,           label: 'Usuarios',   active: false },
  { icon: CalendarDays,    label: 'Calendario', active: false },
  { icon: Building2, label: 'Infraestructura', active: false },
  { icon: Briefcase, label: 'Servicios', active: false },
  { icon: Percent,         label: 'Descuentos', active: true  },
  { icon: DollarSign,      label: 'Finanzas',   active: false },
  { icon: CreditCard,      label: 'Planes',     active: false },
];

type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y';

interface DiscountPublic {
  id: string;
  name: string;
  type: DiscountType;
  value: number | null;
  buyQty: number | null;
  payQty: number | null;
  code: string | null;
  specialtyId: string | null;
  specialtyName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  maxTotalUses: number | null;
  maxUsesPerPatient: number | null;
  totalUsesCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Specialty { id: string; name: string; }

interface FormState {
  name: string;
  type: DiscountType;
  value: string;
  buyQty: string;
  payQty: string;
  code: string;
  specialtyId: string;
  startsAt: string;
  endsAt: string;
  maxTotalUses: string;
  maxUsesPerPatient: string;
}

const EMPTY_FORM: FormState = {
  name: '', type: 'percentage', value: '', buyQty: '', payQty: '',
  code: '', specialtyId: '', startsAt: '', endsAt: '', maxTotalUses: '', maxUsesPerPatient: '',
};

function adminHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function typeBadge(d: DiscountPublic): { label: string; color: string } {
  if (d.type === 'percentage')  return { label: `${d.value}% de descuento`, color: '#7C3AED' };
  if (d.type === 'fixed_amount') return { label: `${fmtCOP(Number(d.value ?? 0))} de descuento`, color: '#0EA5E9' };
  return { label: `Agenda ${d.buyQty}, paga ${d.payQty}`, color: '#16A34A' };
}

export function DescuentosDashboard() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInfraExpanded, setIsInfraExpanded] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<number | null>(null);

  const [discounts, setDiscounts] = useState<DiscountPublic[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/discounts', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setDiscounts(data.data.discounts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscounts();
    fetch('/api/discounts/specialties').then(r => r.json()).then(d => {
      if (d.success) setSpecialties(d.data.specialties ?? []);
    }).catch(() => {});
  }, []);

  const handleNavClick = (label: string) => {
    if (label === 'Dashboard') navigate('/admin/dashboard');
    else if (label === 'Calendario') navigate('/admin/classes');
    else if (label === 'Usuarios') navigate('/admin/users');
    else if (label === 'Descuentos') navigate('/admin/discounts');
    else if (label === 'Finanzas') navigate('/admin/finances');
    else if (label === 'Planes') navigate('/admin/memberships');
    else if (label === 'Infraestructura') setIsInfraExpanded(v => !v)
    if (label === 'Servicios') { navigate('/admin/services/create'); if (typeof setIsMobileMenuOpen !== 'undefined') setIsMobileMenuOpen(false); };
    if (label !== 'Servicios') setIsMobileMenuOpen(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (d: DiscountPublic) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      type: d.type,
      value: d.value != null ? String(d.value) : '',
      buyQty: d.buyQty != null ? String(d.buyQty) : '',
      payQty: d.payQty != null ? String(d.payQty) : '',
      code: d.code ?? '',
      specialtyId: d.specialtyId ?? '',
      startsAt: d.startsAt ? d.startsAt.slice(0, 10) : '',
      endsAt: d.endsAt ? d.endsAt.slice(0, 10) : '',
      maxTotalUses: d.maxTotalUses != null ? String(d.maxTotalUses) : '',
      maxUsesPerPatient: d.maxUsesPerPatient != null ? String(d.maxUsesPerPatient) : '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) { setFormError('El nombre es obligatorio.'); return; }
    if (form.type === 'buy_x_get_y') {
      if (!form.buyQty || !form.payQty || Number(form.payQty) >= Number(form.buyQty)) {
        setFormError('Ingresa cuántas sesiones se agendan y cuántas se pagan (paga < agenda).');
        return;
      }
    } else if (!form.value) {
      setFormError('Ingresa el valor del descuento.');
      return;
    } else if (form.type === 'percentage' && (Number(form.value) <= 0 || Number(form.value) > 100)) {
      setFormError('El porcentaje debe estar entre 1 y 100.');
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      code: form.code.trim() || undefined,
      specialtyId: form.specialtyId || undefined,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined,
      maxTotalUses: form.maxTotalUses ? Number(form.maxTotalUses) : undefined,
      maxUsesPerPatient: form.maxUsesPerPatient ? Number(form.maxUsesPerPatient) : undefined,
    };
    if (form.type === 'buy_x_get_y') {
      payload.buyQty = Number(form.buyQty);
      payload.payQty = Number(form.payQty);
    } else {
      payload.value = Number(form.value);
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/discounts/${editingId}` : '/api/discounts';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: adminHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el descuento.');
      setShowForm(false);
      await loadDiscounts();
    } catch (err: any) {
      setFormError(err.message || 'No se pudo guardar el descuento.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d: DiscountPublic) => {
    await fetch(`/api/discounts/${d.id}`, {
      method: 'PATCH', headers: adminHeaders(), body: JSON.stringify({ isActive: !d.isActive }),
    });
    loadDiscounts();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/discounts/${id}`, { method: 'DELETE', headers: adminHeaders() });
      setConfirmDeleteId(null);
      await loadDiscounts();
    } finally {
      setDeletingId(null);
    }
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
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10,
                    background: isActive ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : isHovered ? 'rgba(139,92,246,0.07)' : 'transparent',
                    border: 'none', transition: 'all 0.2s ease', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Icon size={18} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', marginLeft: 12, color: isActive ? C.white : isHovered ? C.gold : C.textBrown }}>
                      {item.label}
                    </span>
                    {item.label === 'Infraestructura' && (
                      <div style={{ marginLeft: 'auto' }}>
                        {isInfraExpanded ? <ChevronDown size={14} color={C.textMedium} /> : <ChevronRight size={14} color={C.textMedium} />}
                      </div>
                    )}
                  </div>
                </button>
                <AnimatePresence>
                  {item.label === 'Infraestructura' && isInfraExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 38, marginTop: 8, marginBottom: 8, borderLeft: `2px solid ${C.goldLight}`, paddingLeft: 12 }}>
                        <span onClick={() => navigate('/admin/services/locations')} style={{ fontSize: 12, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Sedes</span>
                        <span onClick={() => navigate('/admin/services/rooms')} style={{ fontSize: 12, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Espacios</span>
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
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium }}
          >
            <LogOut size={18} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">
        <header style={{ height: 72, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="menu-toggle" onClick={() => {
              if (window.innerWidth <= 768) setIsMobileMenuOpen(v => !v);
              else setIsSidebarCollapsed(v => !v);
            }}>
              <Menu size={20} />
            </button>
            <h2 style={{ fontFamily: '"Bodoni Moda", Georgia, serif', fontSize: 24, fontWeight: 600, color: C.gold, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
              MEDIS <span style={{ fontSize: 12, fontFamily: '"Hanken Grotesk", sans-serif', color: C.textMuted, fontWeight: 500, letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>/ Descuentos</span>
            </h2>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem', background: 'radial-gradient(circle at top right, rgba(139,92,246,0.03), transparent 400px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: '"Hanken Grotesk", sans-serif' }}>Promociones</p>
                <h1 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '2.5rem', color: C.text, marginBottom: '0.3rem', lineHeight: 1.1 }}>Descuentos</h1>
                <p style={{ color: C.textMuted, fontSize: '1rem', margin: 0 }}>
                  Porcentajes, 2x1 y códigos de descuento para tus pacientes.
                </p>
              </div>
              <button
                onClick={openCreate}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 99, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,92,246,0.3)' }}
              >
                <Plus size={16} /> Nuevo Descuento
              </button>
            </motion.div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: C.textMuted }}>Cargando descuentos…</div>
            ) : discounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: C.white, borderRadius: 16, border: `1px dashed ${C.borderLight}` }}>
                <Percent size={28} color={C.gold} style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>Aún no has creado ningún descuento.</p>
                <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>Usa "Nuevo Descuento" para crear el primero.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {discounts.map(d => {
                  const badge = typeBadge(d);
                  return (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.borderLight}`, padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: 10, opacity: d.isActive ? 1 : 0.55 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>{d.name}</p>
                          <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: `${badge.color}14`, padding: '3px 9px', borderRadius: 99 }}>{badge.label}</span>
                        </div>
                        <button
                          onClick={() => toggleActive(d)}
                          title={d.isActive ? 'Desactivar' : 'Activar'}
                          style={{ width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', background: d.isActive ? '#16A34A' : '#CBD5E1', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}
                        >
                          <span style={{ position: 'absolute', top: 2, left: d.isActive ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: C.textMuted }}>
                        {d.code ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontWeight: 700, color: C.gold, background: C.bgPanel, padding: '2px 8px', borderRadius: 6 }}>
                            <Tag size={11} /> {d.code}
                          </span>
                        ) : (
                          <span style={{ background: '#F0FDF4', color: '#16A34A', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>Automático</span>
                        )}
                        <span>{d.specialtyName ?? 'Todos los servicios'}</span>
                      </div>

                      {(d.startsAt || d.endsAt) && (
                        <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                          Vigencia: {d.startsAt ? new Date(d.startsAt).toLocaleDateString('es-CO') : 'sin inicio'} — {d.endsAt ? new Date(d.endsAt).toLocaleDateString('es-CO') : 'sin fin'}
                        </p>
                      )}

                      <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                        {d.totalUsesCount} / {d.maxTotalUses ?? '∞'} usos
                        {d.maxUsesPerPatient != null && ` · máx. ${d.maxUsesPerPatient} por paciente`}
                      </p>

                      <div style={{ display: 'flex', gap: 8, marginTop: 4, paddingTop: 10, borderTop: `1px solid ${C.borderLight}` }}>
                        <button onClick={() => openEdit(d)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, border: `1px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          <Pencil size={13} /> Editar
                        </button>
                        {confirmDeleteId === d.id ? (
                          <button onClick={() => handleDelete(d.id)} disabled={deletingId === d.id}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {deletingId === d.id ? '…' : 'Confirmar'}
                          </button>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(d.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.borderLight}`, background: 'transparent', color: '#DC2626', cursor: 'pointer' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── FORM MODAL ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              style={{ background: C.white, borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1.4rem', color: C.text, margin: 0 }}>
                  {editingId ? 'Editar Descuento' : 'Nuevo Descuento'}
                </h2>
                <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, borderRadius: 99, border: 'none', background: C.bgPanel, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color={C.textMuted} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Nombre</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14 }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DiscountType }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14, background: '#fff' }}>
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed_amount">Monto Fijo</option>
                    <option value="buy_x_get_y">2x1 (agenda X, paga Y)</option>
                  </select>
                </div>

                {form.type === 'buy_x_get_y' ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Agenda</label>
                      <input type="number" min={2} value={form.buyQty} onChange={e => setForm(f => ({ ...f, buyQty: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Paga</label>
                      <input type="number" min={1} value={form.payQty} onChange={e => setForm(f => ({ ...f, payQty: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14 }} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                      Valor {form.type === 'percentage' ? '(%)' : '(COP)'}
                    </label>
                    <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14 }} />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Código (opcional)</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Déjalo vacío para que se aplique automáticamente"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14, fontFamily: 'monospace' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Especialidad</label>
                  <select value={form.specialtyId} onChange={e => setForm(f => ({ ...f, specialtyId: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14, background: '#fff' }}>
                    <option value="">Todos los servicios</option>
                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Fecha inicio</label>
                    <input type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Fecha fin</label>
                    <input type="date" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Límite usos totales</label>
                    <input type="number" min={1} value={form.maxTotalUses} onChange={e => setForm(f => ({ ...f, maxTotalUses: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Límite por paciente</label>
                    <input type="number" min={1} value={form.maxUsesPerPatient} onChange={e => setForm(f => ({ ...f, maxUsesPerPatient: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, fontSize: 14 }} />
                  </div>
                </div>

                {formError && <p style={{ color: '#DC2626', fontSize: 12, margin: 0 }}>{formError}</p>}

                <button type="submit" disabled={saving}
                  style={{ marginTop: 6, padding: '0.9rem', borderRadius: 99, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
                  {saving ? 'Guardando…' : editingId ? 'Guardar Cambios' : 'Crear Descuento'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
