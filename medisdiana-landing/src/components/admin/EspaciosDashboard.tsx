import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Users, CalendarDays, DollarSign, CreditCard, Plus, Briefcase, ChevronDown, ChevronRight, Search, X, Trash2, Edit3, Eye, Layers, LayoutDashboard, Menu, LogOut, Percent } from 'lucide-react';
import './MainDashboard.css';
import { FormularioEspacio } from './FormularioEspacio';
import type { Espacio, ModalEspacioState } from './EspacioTypes';

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

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: false },
  { icon: Users, label: 'Usuarios', active: false },
  { icon: CalendarDays, label: 'Calendario', active: false },
  { icon: Building2, label: 'Infraestructura', active: true },
  { icon: Briefcase, label: 'Servicios', active: false },
  { icon: Percent, label: 'Descuentos', active: false },
  { icon: DollarSign,   label: 'Finanzas',      active: false },
  { icon: CreditCard,   label: 'Planes',    active: false },
];

// ── Animación: Stickman médico señalando un consultorio (espacio) ──────────────
const EspaciosStickmanAnimation = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem 2rem', background: C.white, borderRadius: '1.25rem', border: `1px solid ${C.borderLight}`, marginBottom: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT_BODONI, fontSize: '1.6rem', color: C.gold, fontWeight: 700, marginBottom: '0.25rem' }}>
        Consultorios y Espacios 🚪
      </div>
      <div style={{ fontSize: '1rem', color: C.textBrown }}>
        Organiza las salas y consultorios disponibles en cada sede.
      </div>
    </div>
    <div style={{ flexShrink: 0 }}>
      <svg width="150" height="120" viewBox="0 0 150 120" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 6px 12px rgba(139,92,246,0.12))' }}>
        <defs>
          <linearGradient id="espSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f3f0fb" />
          </linearGradient>
          <linearGradient id="espCoat" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0.15)" />
          </linearGradient>
          <linearGradient id="espRoom" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.12)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0.05)" />
          </linearGradient>
        </defs>

        {/* Planta del consultorio */}
        <rect x="76" y="14" width="60" height="92" rx="6" fill="url(#espRoom)" stroke={C.gold} strokeWidth="3" />

        {/* Cruz médica en la pared */}
        <rect x="116" y="22" width="14" height="14" rx="2" fill={C.white} stroke={C.gold} strokeWidth="2" />
        <line x1="123" y1="26" x2="123" y2="32" stroke={C.gold} strokeWidth="2" strokeLinecap="round" />
        <line x1="120" y1="29" x2="126" y2="29" stroke={C.gold} strokeWidth="2" strokeLinecap="round" />

        {/* Camilla / mesa de examen */}
        <rect x="86" y="58" width="40" height="18" rx="4" fill={C.white} stroke={C.goldLight} strokeWidth="2" />
        <rect x="86" y="58" width="11" height="18" rx="3" fill="rgba(139,92,246,0.15)" stroke={C.goldLight} strokeWidth="1.5" />

        {/* Puerta abierta (animada) */}
        <g transform="translate(134, 98)">
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0; -60; -60; 0; 0" keyTimes="0; 0.25; 0.6; 0.85; 1" dur="4s" repeatCount="indefinite" />
            <line x1="0" y1="0" x2="0" y2="-26" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
          </g>
          <circle cx="0" cy="0" r="1.6" fill={C.gold} />
        </g>

        {/* Indicador "disponible" parpadeante */}
        <g>
          <animate attributeName="opacity" values="0.3; 1; 0.3" keyTimes="0; 0.5; 1" dur="2.5s" repeatCount="indefinite" />
          <circle cx="123" cy="48" r="4" fill="#10B981" />
        </g>

        {/* Stickman médico señalando el consultorio */}
        <g transform="translate(28, 78)">

          {/* Cuerpo central */}
          <line x1="0" y1="-12" x2="0" y2="10" stroke={C.goldLight} strokeWidth="3" strokeLinecap="round" />

          {/* Bata médica */}
          <path d="M -3 -10 L -10 12 C -10 14 10 14 10 12 L 3 -10 Z" fill="url(#espCoat)" stroke={C.goldLight} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M -3 -10 L 0 0 L 3 -10" fill="none" stroke={C.goldLight} strokeWidth="1" />
          <line x1="-6" y1="5" x2="-4" y2="5" stroke={C.goldLight} strokeWidth="1.5" strokeLinecap="round" />

          {/* Piernas */}
          <path d="M 0 10 Q -2 20 -4 30" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="-2" cy="30" rx="3.5" ry="1.5" fill={C.goldLight} />
          <path d="M 0 10 Q 2 20 4 30" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="6" cy="30" rx="3.5" ry="1.5" fill={C.goldLight} />

          {/* Cabeza */}
          <circle cx="0" cy="-20" r="8.5" fill="url(#espSkin)" stroke={C.goldLight} strokeWidth="2" />
          {/* Cabello: cerquillo y coleta */}
          <path d="M -7 -25 Q 0 -32 8 -24" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M -7 -25 Q -12 -28 -14 -22" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />

          {/* Carita mirando hacia el consultorio */}
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

          {/* Brazo derecho: señala el consultorio (animado) */}
          <g>
            <animateTransform attributeName="transform" type="rotate" values="68 0 -5; 68 0 -5; 12 0 -5; 12 0 -5; 68 0 -5" keyTimes="0; 0.2; 0.4; 0.8; 1" dur="4s" repeatCount="indefinite" />
            <path d="M 0 -5 Q 16 -10 32 -15" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="-15" r="1.5" fill={C.goldLight} />
          </g>
        </g>
      </svg>
    </div>
  </div>
);

export const EspaciosDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredNav, setHoveredNav] = useState<number | null>(null);
  const [isInfraExpanded, setIsInfraExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [sedesDisponibles, setSedesDisponibles] = useState<{id: string, name: string}[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);

  const loadData = async () => {
    try {
      const [resSedes, resEspacios] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/rooms')
      ]);
      const jsonSedes = await resSedes.json();
      const jsonEspacios = await resEspacios.json();
      
      if (jsonSedes.success) setSedesDisponibles(jsonSedes.data.locations);
      if (jsonEspacios.success) setEspacios(jsonEspacios.data.rooms);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSede, setFilterSede] = useState<string>('all');
  
  const [modalState, setModalState] = useState<ModalEspacioState>({ type: 'none' });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const filteredEspacios = espacios
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    .filter(e => filterMode === 'all' ? true : filterMode === 'active' ? e.isActive : !e.isActive)
    .filter(e => filterSede === 'all' ? true : e.locationId === filterSede);

  const handleToggleStatus = async (id: string, newStatus: boolean) => {
    try {
      setEspacios(prev => prev.map(e => e.id === id ? { ...e, isActive: newStatus } : e));
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ isActive: newStatus })
      });
      if (!res.ok) loadData();
    } catch (e) { loadData(); }
  };

  const handleDelete = async () => {
    if (modalState.type === 'delete') {
      try {
        await fetch(`/api/rooms/${modalState.espacio.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        loadData();
        setModalState({ type: 'none' });
      } catch (error) {
        console.error('Error deleting', error);
      }
    }
  };

  const handleFormSuccess = async (data: any) => {
    try {
      if (modalState.type === 'create') {
        await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
          body: JSON.stringify(data)
        });
      } else if (modalState.type === 'edit') {
        await fetch(`/api/rooms/${modalState.espacio.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
          body: JSON.stringify(data)
        });
      }
      loadData();
      setModalState({ type: 'none' });
    } catch (error) {
      console.error('Error saving', error);
    }
  };

  const getSedeName = (id: string) => sedesDisponibles.find(s => s.id === id)?.name || 'Sede Desconocida';

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
              <div style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Panel Admin</div>
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
                if (item.label === 'Descuentos') navigate('/admin/discounts');
                if (item.label === 'Finanzas') navigate('/admin/finances');
                if (item.label === 'Planes') navigate('/admin/memberships');
                if (item.label === 'Infraestructura') setIsInfraExpanded(!isInfraExpanded);
    if (item.label === 'Servicios') { navigate('/admin/services/create'); if (typeof setIsMobileMenuOpen !== 'undefined') setIsMobileMenuOpen(false); }
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
                    {item.label === 'Infraestructura' && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                        {isInfraExpanded ? <ChevronDown size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} /> : <ChevronRight size={14} color={isActive ? C.white : isHovered ? C.gold : C.textMedium} />}
                      </div>
                    )}
                  </button>
                  {item.label === 'Infraestructura' && isInfraExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 34, marginTop: 4, marginBottom: 8, borderLeft: `2px solid ${C.goldLight}`, paddingLeft: 8 }}>
                      <span onClick={() => navigate('/admin/services/locations')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.textBrown, cursor: 'pointer', padding: '6px 4px' }}>Creación de Sedes</span>
                      <span onClick={() => navigate('/admin/services/rooms')} style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 600, color: C.gold, cursor: 'pointer', padding: '6px 4px' }}>Creación de Espacios</span>
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
            <h1 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Gestión de Espacios</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar espacio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: '8px 16px 8px 36px', fontSize: 13, color: C.text, width: 240, outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL SCROLL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>

          {/* ANIMACIÓN DE BIENVENIDA */}
          <div style={{ maxWidth: 1140, margin: '0 auto' }}>
            <EspaciosStickmanAnimation />
          </div>

          {/* CONTROLES SUPERIORES (Filtros de estado y Sede) */}
          <div style={{ maxWidth: 1140, margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setFilterMode('all')} style={{ background: filterMode === 'all' ? C.gold : C.bgPanel, color: filterMode === 'all' ? C.white : C.textBrown, border: filterMode === 'all' ? 'none' : `1px solid ${C.borderLight}`, padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Todas</button>
              <button onClick={() => setFilterMode('active')} style={{ background: filterMode === 'active' ? '#15803d' : C.bgPanel, color: filterMode === 'active' ? C.white : C.textBrown, border: filterMode === 'active' ? 'none' : `1px solid ${C.borderLight}`, padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activos</button>
              <button onClick={() => setFilterMode('inactive')} style={{ background: filterMode === 'inactive' ? '#64748b' : C.bgPanel, color: filterMode === 'inactive' ? C.white : C.textBrown, border: filterMode === 'inactive' ? 'none' : `1px solid ${C.borderLight}`, padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inactivos</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtrar por Sede:</span>
              <select 
                value={filterSede} 
                onChange={(e) => setFilterSede(e.target.value)}
                style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, color: C.text, outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Todas las Sedes</option>
                {sedesDisponibles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            
            {/* TARJETA CREAR NUEVO ESPACIO */}
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
              <span style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.gold }}>Nuevo Espacio</span>
            </motion.div>

            {filteredEspacios.map(espacio => (
              <motion.div 
                key={espacio.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onMouseEnter={() => setHoveredCard(espacio.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ 
                  background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.borderLight}`, 
                  boxShadow: hoveredCard === espacio.id ? '0 8px 24px rgba(0,0,0,0.04)' : '0 2px 12px rgba(0,0,0,0.02)',
                  transition: 'box-shadow 0.3s ease',
                  opacity: espacio.isActive ? 1 : 0.6,
                  display: 'flex', flexDirection: 'column'
                }}
              >
                {/* Cabecera de la Tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.goldLight, background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: 12 }}>
                        {getSedeName(espacio.locationId)}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 10px 0', lineHeight: 1.2, wordBreak: 'break-word' }}>{espacio.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 13, marginBottom: 6 }}>
                      <Users size={14} style={{ flexShrink: 0 }} /> <span>Capacidad: <strong>{espacio.capacity} personas</strong></span>
                    </div>
                    {espacio.resources.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 13 }}>
                        <Layers size={14} style={{ flexShrink: 0 }} /> <span>{espacio.resources.length} recursos asignados</span>
                      </div>
                    )}
                  </div>

                  {/* Botones de Acción Directa */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button 
                      onClick={() => setModalState({ type: 'view', espacio })}
                      title="Ver Detalles"
                      style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textBrown }}
                    >
                      <Eye size={15} />
                    </button>
                    <button 
                      onClick={() => setModalState({ type: 'edit', espacio })}
                      title="Editar Espacio"
                      style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textBrown }}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button 
                      onClick={() => setModalState({ type: 'delete', espacio })}
                      title="Eliminar Espacio"
                      style={{ background: '#fef2f2', border: '1px solid #fca5a5', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                
                <div style={{ flex: 1 }} /> 

                <div style={{ height: 1, background: C.bgPanel, margin: '20px 0 16px 0' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: espacio.isActive ? '#22c55e' : '#cbd5e1' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: espacio.isActive ? '#15803d' : C.textMuted }}>
                      {espacio.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  {/* Switch Toggle */}
                  <button 
                    onClick={() => handleToggleStatus(espacio.id, !espacio.isActive)}
                    style={{ width: 44, height: 24, borderRadius: 12, background: espacio.isActive ? C.gold : C.border, border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                  >
                    <motion.div 
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      style={{ width: 18, height: 18, borderRadius: '50%', background: C.white, position: 'absolute', top: 3, left: espacio.isActive ? 23 : 3, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    />
                  </button>
                </div>
              </motion.div>
            ))}
            {filteredEspacios.length === 0 && search !== '' && (
              <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: C.textMuted }}>
                <p>No se encontraron espacios con esos criterios.</p>
              </div>
            )}
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
                  <FormularioEspacio 
                    initialData={modalState.type === 'edit' ? modalState.espacio : undefined}
                    onCancel={() => setModalState({ type: 'none' })} 
                    onSuccess={handleFormSuccess} 
                    availableSedes={sedesDisponibles}
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
                  style={{ background: C.white, borderRadius: 24, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 24px 48px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.goldLight, marginBottom: 8, display: 'inline-block' }}>{getSedeName(modalState.espacio.locationId)}</span>
                      <h3 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>{modalState.espacio.name}</h3>
                    </div>
                    <button onClick={() => setModalState({ type: 'none' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}><X size={20} /></button>
                  </div>
                  
                  <div style={{ fontSize: 14, color: C.textMedium, lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 16px 0' }}><strong style={{ color: C.textBrown }}>Capacidad:</strong> {modalState.espacio.capacity} personas</p>
                    {modalState.espacio.description && (
                      <p style={{ margin: '0 0 16px 0', padding: '12px 16px', background: C.bgPanel, borderRadius: 8, fontStyle: 'italic' }}>"{modalState.espacio.description}"</p>
                    )}
                    
                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
                      <h4 style={{ fontWeight: 700, color: C.text, marginBottom: 12 }}>Recursos Asignados</h4>
                      {modalState.espacio.resources.length === 0 ? (
                        <p style={{ color: C.textMuted, fontSize: 13 }}>No hay recursos registrados.</p>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {modalState.espacio.resources.map((res, i) => (
                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: `1px dashed ${C.borderLight}`, paddingBottom: 4 }}>
                              <span style={{ color: C.textBrown }}>{res.name}</span>
                              <span style={{ fontWeight: 700, color: C.text }}>x{res.qty}</span>
                            </li>
                          ))}
                        </ul>
                      )}
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
                  <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px 0' }}>Eliminar Espacio</h3>
                  <p style={{ fontSize: 14, color: C.textMedium, margin: '0 0 32px 0' }}>¿Estás seguro de eliminar <strong>{modalState.espacio.name}</strong>? Esta acción no se puede deshacer.</p>
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
