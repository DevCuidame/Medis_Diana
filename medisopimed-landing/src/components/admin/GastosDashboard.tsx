import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wallet, Plus, Search, X, Trash2, Edit3, Menu, Calendar } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import './MainDashboard.css';
import { FormularioGasto } from './FormularioGasto';
import type { Gasto, ModalGastoState } from './GastoTypes';

const C = {
  gold: '#0D9488',
  goldLight: '#44CFCB',
  bg: '#FFFFFF',
  bgPanel: '#F0FDFA',
  white: '#FFFFFF',
  text: '#0F172A',
  textBrown: '#475569',
  textMedium: '#5E5E5E',
  textMuted: '#94A3B8',
  border: '#CCFBF1',
  borderLight: '#CCFBF1',
};

const FONT_DISPLAY = 'Manrope, Inter, sans-serif';
const FONT_INTER = '"Inter", Inter, system-ui, sans-serif';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const GastosWelcomeCard = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem 2rem', background: C.white, borderRadius: '1.25rem', border: `1px solid ${C.borderLight}`, marginBottom: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', color: C.gold, fontWeight: 700, marginBottom: '0.25rem' }}>
        Gastos del Consultorio 💸
      </div>
      <div style={{ fontSize: '1rem', color: C.textBrown }}>
        Registra y controla los egresos mensuales de la clínica.
      </div>
    </div>
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ flexShrink: 0, width: 90, height: 90, borderRadius: '1.4rem', background: 'rgba(13,148,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Wallet size={42} color={C.gold} strokeWidth={1.75} />
    </motion.div>
  </div>
);

export const GastosDashboard: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/expenses', { headers: authHeaders() });
      const json = await res.json();
      // Postgres NUMERIC llega como string vía pg (sin type parser registrado) —
      // se normaliza a number aquí para que las sumas (.reduce) no concatenen texto.
      if (json.success) setGastos(json.data.expenses.map((e: Gasto) => ({ ...e, amount: Number(e.amount) })));
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  useEffect(() => { loadData(); }, []);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [modalState, setModalState] = useState<ModalGastoState>({ type: 'none' });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const categoriasExistentes = useMemo(
    () => Array.from(new Set(gastos.map(g => g.category))).sort(),
    [gastos]
  );

  const filteredGastos = gastos
    .filter(g => g.description.toLowerCase().includes(search.toLowerCase()))
    .filter(g => filterCategory === 'all' ? true : g.category === filterCategory)
    .filter(g => !filterMonth || g.expenseDate.startsWith(filterMonth));

  const totalFiltrado = filteredGastos.reduce((sum, g) => sum + g.amount, 0);

  const handleDelete = async () => {
    if (modalState.type === 'delete') {
      try {
        const res = await fetch(`/api/expenses/${modalState.gasto.id}`, { method: 'DELETE', headers: authHeaders() });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setDeleteError(json.error || 'No se pudo eliminar el gasto.');
          return;
        }
        loadData();
        setModalState({ type: 'none' });
      } catch (error) {
        console.error('Error deleting expense', error);
        setDeleteError('No se pudo eliminar el gasto. Intenta de nuevo.');
      }
    }
  };

  const handleFormSuccess = async (data: any) => {
    try {
      if (modalState.type === 'create') {
        await fetch('/api/expenses', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      } else if (modalState.type === 'edit') {
        await fetch(`/api/expenses/${modalState.gasto.id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data) });
      }
      loadData();
      setModalState({ type: 'none' });
    } catch (error) {
      console.error('Error saving expense', error);
    }
  };

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <AdminSidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />

      <main className="main-content" style={{ background: C.bg }}>
        <header style={{ minHeight: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 10, padding: '12px 16px', flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Gestión de Gastos</h1>
          </div>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0, maxWidth: 320 }}>
            <Search size={16} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar gasto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: '8px 16px 8px 36px', fontSize: 13, color: C.text, width: '100%', outline: 'none' }}
            />
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: 1140, margin: '0 auto' }}>
            <GastosWelcomeCard />
          </div>

          <div style={{ maxWidth: 1140, margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, color: C.text, outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Todas las categorías</option>
                {categoriasExistentes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <Calendar size={14} color={C.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px 6px 30px', fontSize: 13, color: C.text, outline: 'none' }}
                />
              </div>
              {filterMonth && (
                <button onClick={() => setFilterMonth('')} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Quitar filtro de mes</button>
              )}
            </div>
            <div style={{ fontSize: 13, color: C.textBrown }}>
              Total filtrado: <strong style={{ color: C.gold }}>{fmt(totalFiltrado)}</strong>
            </div>
          </div>

          <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => { setDeleteError(null); setModalState({ type: 'create' }); }}
              style={{ background: 'transparent', borderRadius: 16, border: `2px dashed ${C.borderLight}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 180, transition: 'all 0.2s ease', gap: 12 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.goldLight; e.currentTarget.style.background = 'rgba(13,148,136,0.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '1rem', background: C.bgPanel, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.goldLight }}>
                <Plus size={24} strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.gold }}>Nuevo Gasto</span>
            </motion.div>

            {filteredGastos.map(gasto => (
              <motion.div
                key={gasto.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onMouseEnter={() => setHoveredCard(gasto.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.borderLight}`, boxShadow: hoveredCard === gasto.id ? '0 8px 24px rgba(0,0,0,0.04)' : '0 2px 12px rgba(0,0,0,0.02)', transition: 'box-shadow 0.3s ease', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.goldLight, background: 'rgba(68,207,203,0.1)', padding: '2px 8px', borderRadius: 12 }}>
                      {gasto.category}
                    </span>
                    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.text, margin: '8px 0 6px 0', lineHeight: 1.2, wordBreak: 'break-word' }}>{gasto.description}</h3>
                    <span style={{ fontSize: 13, color: C.textMuted }}>{fmtDate(gasto.expenseDate)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setModalState({ type: 'edit', gasto })} title="Editar Gasto" style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textBrown }}>
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => { setDeleteError(null); setModalState({ type: 'delete', gasto }); }} title="Eliminar Gasto" style={{ background: '#fef2f2', border: '1px solid #fca5a5', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div style={{ height: 1, background: C.bgPanel, margin: '20px 0 16px 0' }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, fontFamily: FONT_DISPLAY }}>{fmt(gasto.amount)}</div>
              </motion.div>
            ))}
            {filteredGastos.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: C.textMuted }}>
                <p>No hay gastos que coincidan con los filtros.</p>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {(modalState.type === 'create' || modalState.type === 'edit') && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.2)', backdropFilter: 'blur(2px)', zIndex: 40 }} onClick={() => setModalState({ type: 'none' })} />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: 640, background: C.white, boxShadow: '-8px 0 32px rgba(0,0,0,0.1)', zIndex: 50, overflowY: 'auto' }}>
                <div style={{ padding: 32 }}>
                  <FormularioGasto
                    initialData={modalState.type === 'edit' ? modalState.gasto : undefined}
                    onCancel={() => setModalState({ type: 'none' })}
                    onSuccess={handleFormSuccess}
                    categoriasSugeridas={categoriasExistentes}
                  />
                </div>
              </motion.div>
            </>
          )}

          {modalState.type === 'delete' && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.2)', backdropFilter: 'blur(2px)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setDeleteError(null); setModalState({ type: 'none' }); }}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 24, padding: 32, width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.1)' }}>
                  <div style={{ width: 64, height: 64, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
                    <Trash2 size={24} />
                  </div>
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px 0' }}>Eliminar Gasto</h3>
                  <p style={{ fontSize: 14, color: C.textMedium, margin: '0 0 16px 0' }}>¿Estás seguro de eliminar <strong>{modalState.gasto.description}</strong>? Esta acción no se puede deshacer.</p>
                  {deleteError && (
                    <p style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 12px', margin: '0 0 16px 0', textAlign: 'left' }}>{deleteError}</p>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => { setDeleteError(null); setModalState({ type: 'none' }); }} style={{ flex: 1, padding: '10px 0', background: C.bgPanel, border: 'none', borderRadius: 9999, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: C.textMedium, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={handleDelete} style={{ flex: 1, padding: '10px 0', background: '#ef4444', border: 'none', borderRadius: 9999, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: C.white, cursor: 'pointer' }}>Sí, Eliminar</button>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
