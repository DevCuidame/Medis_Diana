import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, CalendarDays, DollarSign, CreditCard, Plus, Briefcase, ChevronDown, ChevronRight, Search, X, Trash2, MapPin, Phone, Eye, Edit3, LayoutDashboard, Menu, LogOut } from 'lucide-react';
import './MainDashboard.css';
import { FormularioSede } from './FormularioSede';
import type { Sede, ModalState } from './SedeTypes';

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
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
};

const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif';

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: false },
  { icon: Users, label: 'Usuarios', active: false },
  { icon: CalendarDays, label: 'Calendario', active: false },
  { icon: Briefcase, label: 'Servicios', active: true },
  { icon: DollarSign,   label: 'Finanzas',      active: false },
  { icon: CreditCard,   label: 'Planes',    active: false },
];

export const SedesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredNav, setHoveredNav] = useState<number | null>(null);
  const [isServicesExpanded, setIsServicesExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sedes, setSedes] = useState<Sede[]>([]);

  const loadSedes = async () => {
    try {
      const res = await fetch('/api/locations');
      const json = await res.json();
      if (json.success) setSedes(json.data.locations);
    } catch (error) {
      console.error('Error loading sedes:', error);
    }
  };

  useEffect(() => {
    loadSedes();
  }, []);

  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredSedes = sedes
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase()))
    .filter(s => filterMode === 'all' ? true : filterMode === 'active' ? s.isActive : !s.isActive);

  const handleToggleStatus = async (id: string, newStatus: boolean) => {
    try {
      // Optimistic update
      setSedes(prev => prev.map(s => s.id === id ? { ...s, isActive: newStatus } : s));
      const res = await fetch(`/api/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ isActive: newStatus })
      });
      if (!res.ok) loadSedes(); // revert if failed
    } catch (error) {
      loadSedes();
    }
  };

  const handleDelete = async () => {
    if (modalState.type === 'delete') {
      try {
        await fetch(`/api/locations/${modalState.sede.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        loadSedes();
        setModalState({ type: 'none' });
      } catch (error) {
        console.error('Error deleting sede', error);
      }
    }
  };

  const handleFormSuccess = async (data: any) => {
    try {
      if (modalState.type === 'create') {
        await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
          body: JSON.stringify(data)
        });
      } else if (modalState.type === 'edit') {
        await fetch(`/api/locations/${modalState.sede.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
          body: JSON.stringify(data)
        });
      }
      loadSedes();
      setModalState({ type: 'none' });
    } catch (error) {
      console.error('Error saving sede', error);
    }
  };

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      
      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={{ background: C.bgPanel, borderRight: `1px solid ${C.border}` }}>
        <div style={{ padding: '28px 20px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 46, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: FONT_BODONI, fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: C.white }}>A</span>
            </div>
            <div>
              <div style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 600, color: C.gold, lineHeight: 1.2 }}>MEDIS</div>
              <div style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Estudio Admin</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 10px' }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontFamily: FONT_INTER, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0 10px', display: 'block', marginBottom: 6 }}>Menú Principal</span>
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
                if (item.label === 'Servicios') setIsServicesExpanded(!isServicesExpanded);
              };
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
                      cursor: 'pointer',
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
                      <span onClick={() => navigate('/admin/services/locations')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.gold, cursor: 'pointer', padding: '6px 4px' }}>Creación de Sedes</span>
                      <span onClick={() => navigate('/admin/services/rooms')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Creación de Espacios</span>
                      <span onClick={() => navigate('/admin/services/create')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Creación de Servicios</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div style={{ padding: '12px 10px' }}>
        </div>

        <div style={{ padding: '10px 10px 20px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); navigate('/login') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: C.textMedium }}>
            <LogOut size={16} strokeWidth={2} />
            <span style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className="main-content" style={{ background: C.bg }}>

        {/* TOPBAR */}
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Gestión de Sedes</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar sede o ciudad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: '8px 16px 8px 36px', fontSize: 13, color: C.text, width: 240, outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL SCROLL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          
          {/* FILTROS TIPO PÍLDORA */}
          <div style={{ maxWidth: 1140, margin: '0 auto 24px', display: 'flex', gap: 12 }}>
            <button
              onClick={() => setFilterMode('all')}
              style={{ background: filterMode === 'all' ? C.gold : C.bgPanel, color: filterMode === 'all' ? C.white : C.textBrown, border: filterMode === 'all' ? 'none' : `1px solid ${C.borderLight}`, padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterMode('active')}
              style={{ background: filterMode === 'active' ? '#15803d' : C.bgPanel, color: filterMode === 'active' ? C.white : C.textBrown, border: filterMode === 'active' ? 'none' : `1px solid ${C.borderLight}`, padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Activas
            </button>
            <button
              onClick={() => setFilterMode('inactive')}
              style={{ background: filterMode === 'inactive' ? '#64748b' : C.bgPanel, color: filterMode === 'inactive' ? C.white : C.textBrown, border: filterMode === 'inactive' ? 'none' : `1px solid ${C.borderLight}`, padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Inactivas
            </button>
          </div>

          <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            
            {/* TARJETA CREAR NUEVA SEDE */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={() => setModalState({ type: 'create' })}
              style={{ 
                background: 'transparent', borderRadius: 16, border: `2px dashed ${C.borderLight}`, 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', minHeight: 220, transition: 'all 0.2s ease', gap: 12
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.goldLight; e.currentTarget.style.background = 'rgba(139,92,246,0.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.bgPanel, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.goldLight }}>
                <Plus size={24} strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.gold }}>Nueva Sede</span>
            </motion.div>
            {filteredSedes.map(sede => (
              <motion.div 
                key={sede.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onMouseEnter={() => setHoveredCard(sede.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ 
                  background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.borderLight}`, 
                  boxShadow: hoveredCard === sede.id ? '0 8px 24px rgba(0,0,0,0.04)' : '0 2px 12px rgba(0,0,0,0.02)',
                  transition: 'box-shadow 0.3s ease',
                  opacity: sede.isActive ? 1 : 0.6,
                  display: 'flex', flexDirection: 'column'
                }}
              >
                {/* Cabecera de la Tarjeta (Flexible, sin superposición) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 10px 0', lineHeight: 1.2, wordBreak: 'break-word' }}>{sede.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: C.textMuted, fontSize: 13, marginBottom: 6 }}>
                      <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} /> <span style={{ lineHeight: 1.4 }}>{sede.address}, {sede.city}</span>
                    </div>
                    {sede.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 13 }}>
                        <Phone size={14} style={{ flexShrink: 0 }} /> <span>{sede.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Botones de Acción Directa */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button 
                    onClick={() => setModalState({ type: 'view', sede })}
                    title="Ver Detalles"
                    style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textBrown }}
                  >
                    <Eye size={15} />
                  </button>
                  <button 
                    onClick={() => setModalState({ type: 'edit', sede })}
                    title="Editar Sede"
                    style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textBrown }}
                  >
                    <Edit3 size={15} />
                  </button>
                  <button 
                    onClick={() => setModalState({ type: 'delete', sede })}
                    title="Eliminar Sede"
                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                </div>
                
                <div style={{ flex: 1 }} /> {/* Espaciador flexible para empujar el footer hacia abajo si las tarjetas tienen diferentes alturas */}

                <div style={{ height: 1, background: C.bgPanel, margin: '20px 0 16px 0' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sede.isActive ? '#22c55e' : '#cbd5e1' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: sede.isActive ? '#15803d' : C.textMuted }}>
                      {sede.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  
                  {/* Switch Toggle */}
                  <button 
                    onClick={() => handleToggleStatus(sede.id, !sede.isActive)}
                    style={{ width: 44, height: 24, borderRadius: 12, background: sede.isActive ? C.gold : C.border, border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                  >
                    <motion.div 
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      style={{ width: 18, height: 18, borderRadius: '50%', background: C.white, position: 'absolute', top: 3, left: sede.isActive ? 23 : 3, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    />
                  </button>
                </div>
              </motion.div>
            ))}
            {filteredSedes.length === 0 && search !== '' && (
              <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: C.textMuted }}>
                <p>No se encontraron sedes con ese nombre.</p>
              </div>
            )}
          </div>

          {/* GALERÍA DE POLE DANCE */}
          <div style={{ maxWidth: 1140, margin: '64px auto 32px', paddingTop: 32, borderTop: `1px solid ${C.borderLight}` }}>
            <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 700, color: C.textBrown, margin: '0 0 20px 0' }}>Inspiración de Espacios</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ borderRadius: 16, overflow: 'hidden', height: 200, position: 'relative' }}>
                <img src="/pole_studio_1.png" alt="Pole Dance Studio" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
              </div>
              <div style={{ borderRadius: 16, overflow: 'hidden', height: 200, position: 'relative' }}>
                <img src="/pole_studio_2.png" alt="Pole Dance Details" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
              </div>
              <div style={{ borderRadius: 16, overflow: 'hidden', height: 200, position: 'relative' }}>
                <img src="/pole_studio_3.png" alt="Aerial Inspiration" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
              </div>
            </div>
          </div>

        </div>

        {/* ── MODALES Y SLIDE-OVERS ── */}
        <AnimatePresence>
          {/* SLIDE-OVER PARA CREAR / EDITAR */}
          {(modalState.type === 'create' || modalState.type === 'edit') && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.2)', backdropFilter: 'blur(2px)', zIndex: 40 }}
                onClick={() => setModalState({ type: 'none' })}
              />
              <motion.div 
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: 700, background: C.white, boxShadow: '-8px 0 32px rgba(0,0,0,0.1)', zIndex: 50, overflowY: 'auto' }}
              >
                <div style={{ padding: 32 }}>
                  <FormularioSede 
                    initialData={modalState.type === 'edit' ? modalState.sede : undefined}
                    onCancel={() => setModalState({ type: 'none' })} 
                    onSuccess={handleFormSuccess} 
                  />
                </div>
              </motion.div>
            </>
          )}

          {/* MODAL PARA VER DETALLES */}
          {modalState.type === 'view' && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.2)', backdropFilter: 'blur(2px)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setModalState({ type: 'none' })}
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  style={{ background: C.white, borderRadius: 24, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 24px 48px rgba(0,0,0,0.1)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>{modalState.sede.name}</h3>
                    <button onClick={() => setModalState({ type: 'none' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}><X size={20} /></button>
                  </div>
                  <div style={{ fontSize: 14, color: C.textMedium, lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong style={{ color: C.textBrown }}>Dirección:</strong> {modalState.sede.address}, {modalState.sede.city}</p>
                    <p style={{ margin: '0 0 8px 0' }}><strong style={{ color: C.textBrown }}>Teléfono:</strong> {modalState.sede.phone || 'N/A'}</p>
                    <p style={{ margin: '0 0 8px 0' }}><strong style={{ color: C.textBrown }}>Email:</strong> {modalState.sede.email || 'N/A'}</p>
                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
                      <h4 style={{ fontWeight: 700, color: C.text, marginBottom: 12 }}>Horarios y Apertura</h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {Object.entries(modalState.sede.operatingHours).map(([day, hrs]) => {
                          const h = hrs as { isOpen: boolean; blocks?: { openTime: string; closeTime: string }[] };
                          const hasBlocks = h.isOpen && h.blocks && h.blocks.length > 0;
                          return (
                          <li key={day} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: `1px dashed ${C.borderLight}`, paddingBottom: 4, gap: 12 }}>
                            <span style={{ fontWeight: 600, color: C.textBrown }}>{DAY_LABELS[day] || day}</span>
                            <span style={{ fontWeight: hasBlocks ? 700 : 600, color: hasBlocks ? C.text : C.textMuted, textAlign: 'right' }}>
                              {hasBlocks ? h.blocks!.map(b => `${b.openTime} - ${b.closeTime}`).join(' · ') : 'Cerrado'}
                            </span>
                          </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}

          {/* MODAL DE ELIMINAR */}
          {modalState.type === 'delete' && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.2)', backdropFilter: 'blur(2px)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setModalState({ type: 'none' })}
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  style={{ background: C.white, borderRadius: 24, padding: 32, width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.1)' }}
                >
                  <div style={{ width: 64, height: 64, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
                    <Trash2 size={24} />
                  </div>
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px 0' }}>Eliminar Sede</h3>
                  <p style={{ fontSize: 14, color: C.textMedium, margin: '0 0 32px 0' }}>¿Estás seguro de eliminar <strong>{modalState.sede.name}</strong>? Esta acción no se puede deshacer.</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setModalState({ type: 'none' })} style={{ flex: 1, padding: '10px 0', background: C.bgPanel, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: C.textMedium, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={handleDelete} style={{ flex: 1, padding: '10px 0', background: '#ef4444', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: C.white, cursor: 'pointer' }}>Sí, Eliminar</button>
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
