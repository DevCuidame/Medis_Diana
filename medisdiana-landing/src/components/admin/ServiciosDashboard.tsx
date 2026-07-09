import React, { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Calendar, MapPin, User, Clock, ChevronRight, Edit2, Trash2, Repeat, Search, SlidersHorizontal, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormularioServicio } from './FormularioServicio';
import { generateOccurrences, DIA_NOMBRES } from './servicioSchema';

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bg: '#FFFFFF', bgPanel: '#F3F0FB', white: '#FFFFFF',
  text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
};
const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif';

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun display order

const OFFER_TYPE_LABEL: Record<string, string> = {
  appointment: 'Cita Individual', open_consultation: 'Consulta Abierta', workshop: 'Sesión Grupal', event: 'Evento',
};
const OFFER_TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  appointment:       { bg: 'rgba(37,99,235,0.1)',  color: '#2563EB' },
  open_consultation: { bg: 'rgba(14,165,233,0.1)', color: '#0EA5E9' },
  workshop:          { bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6' },
  event:             { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
};

interface ServiceGroup {
  key: string;
  title: string;
  offerType: string;
  status: string;
  description: string | null;
  location: { name: string } | null;
  room: { name: string } | null;
  professional: { firstName: string; lastName: string } | null;
  timeStart: string;
  timeEnd: string;
  durationMinutes: number;
  price: number;
  firstDate: Date;
  lastDate: Date;
  days: string[];
  sessionCount: number;
  ids: string[];
  representative: any;
}

function groupOffers(offers: any[]): ServiceGroup[] {
  const map = new Map<string, ServiceGroup>();

  for (const o of offers) {
    const d = new Date(o.scheduledAt);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const timeStart = `${hh}:${mm}`;
    const key = [o.title, o.professional?.id ?? '', o.location?.id ?? '', o.room?.id ?? '', timeStart, o.durationMinutes].join('|');

    if (!map.has(key)) {
      const endMs  = d.getTime() + o.durationMinutes * 60000;
      const endD   = new Date(endMs);
      const timeEnd = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
      // Use catalog data for display if available
      const cat = o.catalog || {};
      const displayTitle = cat.serviceName || o.title || '';
      // Build clean description from catalog fields
      const modalityLabel = Array.isArray(cat.modality) && cat.modality.length > 0
        ? cat.modality.map((m: string) => m.split(' ').slice(1).join(' ')).join(', ')
        : null;
      const catDesc = cat.serviceName
        ? [cat.categoryGroup, modalityLabel].filter(Boolean).join(' · ')
        : null;
      const displayDesc = catDesc || (o.description && !o.description.startsWith('Modalidad: undefined') ? o.description : null);

      map.set(key, {
        key, title: displayTitle, offerType: o.offerType, status: o.status,
        description: displayDesc,
        location: o.location ?? null,
        room: o.room ?? null,
        professional: o.professional ?? null,
        timeStart, timeEnd,
        durationMinutes: o.durationMinutes,
        price: cat.basePrice ?? o.price ?? 0,
        firstDate: d, lastDate: d,
        days: [], sessionCount: 0,
        ids: [], representative: o,
        maxEnrolledCount: 0,
      });
    }

    const g = map.get(key)!;
    g.ids.push(o.id);
    g.sessionCount++;
    if (d < g.firstDate) g.firstDate = d;
    if (d > g.lastDate)  g.lastDate  = d;
    if ((o.enrolledCount ?? 0) > g.maxEnrolledCount) g.maxEnrolledCount = (o.enrolledCount ?? 0);
  }

  // Compute unique days
  for (const g of map.values()) {
    const daySet = new Set<number>();
    for (const o of offers.filter(o => g.ids.includes(o.id))) {
      daySet.add(new Date(o.scheduledAt).getDay());
    }
    g.days = DAY_ORDER.filter(d => daySet.has(d)).map(d => DAY_NAMES_SHORT[d]);
  }

  return Array.from(map.values()).sort((a, b) => a.firstDate.getTime() - b.firstDate.getTime());
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Animación: Stickman médico señalando el catálogo de servicios ──────────────
const ServiciosStickmanAnimation = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem 2rem', background: C.white, borderRadius: '1.25rem', border: `1px solid ${C.borderLight}`, marginBottom: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT_BODONI, fontSize: '1.6rem', color: C.gold, fontWeight: 700, marginBottom: '0.25rem' }}>
        Catálogo de Servicios 🩺
      </div>
      <div style={{ fontSize: '1rem', color: C.textBrown }}>
        Crea y organiza las consultas, citas y servicios que ofrece la clínica.
      </div>
    </div>
    <div style={{ flexShrink: 0 }}>
      <svg width="150" height="120" viewBox="0 0 150 120" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 6px 12px rgba(139,92,246,0.12))' }}>
        <defs>
          <linearGradient id="svcSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f3f0fb" />
          </linearGradient>
          <linearGradient id="svcCoat" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0.15)" />
          </linearGradient>
        </defs>

        {/* Tablero del catálogo */}
        <rect x="68" y="14" width="58" height="92" rx="8" fill="rgba(139,92,246,0.05)" stroke={C.gold} strokeWidth="3" />
        <rect x="87" y="8" width="20" height="10" rx="3" fill={C.white} stroke={C.gold} strokeWidth="2" />

        {/* Filas del catálogo de servicios */}
        <rect x="78" y="28" width="38" height="6" rx="3" fill="rgba(139,92,246,0.15)" />
        <rect x="78" y="42" width="30" height="6" rx="3" fill="rgba(139,92,246,0.1)" />
        <rect x="78" y="56" width="38" height="6" rx="3" fill="rgba(139,92,246,0.15)" />
        <rect x="78" y="70" width="30" height="6" rx="3" fill="rgba(139,92,246,0.1)" />

        {/* Fila destacada hacia donde señala el stickman */}
        <rect x="78" y="84" width="38" height="6" rx="3" fill="rgba(139,92,246,0.25)" />

        {/* Badge "+" animado: nuevo servicio agregado */}
        <g>
          <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" keyTimes="0; 0.4; 0.5; 0.8; 0.9; 1" dur="4s" repeatCount="indefinite" />
          <circle cx="118" cy="22" r="8" fill="#10B981" />
          <line x1="114" y1="22" x2="122" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line x1="118" y1="18" x2="118" y2="26" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Stickman médico señalando el catálogo */}
        <g transform="translate(30, 78)">

          {/* Cuerpo central */}
          <line x1="0" y1="-12" x2="0" y2="10" stroke={C.goldLight} strokeWidth="3" strokeLinecap="round" />

          {/* Bata médica */}
          <path d="M -3 -10 L -10 12 C -10 14 10 14 10 12 L 3 -10 Z" fill="url(#svcCoat)" stroke={C.goldLight} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M -3 -10 L 0 0 L 3 -10" fill="none" stroke={C.goldLight} strokeWidth="1" />
          <line x1="-6" y1="5" x2="-4" y2="5" stroke={C.goldLight} strokeWidth="1.5" strokeLinecap="round" />

          {/* Piernas */}
          <path d="M 0 10 Q -2 20 -4 30" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="-2" cy="30" rx="3.5" ry="1.5" fill={C.goldLight} />
          <path d="M 0 10 Q 2 20 4 30" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="6" cy="30" rx="3.5" ry="1.5" fill={C.goldLight} />

          {/* Cabeza */}
          <circle cx="0" cy="-20" r="8.5" fill="url(#svcSkin)" stroke={C.goldLight} strokeWidth="2" />
          {/* Cabello: cerquillo y coleta */}
          <path d="M -7 -25 Q 0 -32 8 -24" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M -7 -25 Q -12 -28 -14 -22" fill="none" stroke={C.goldLight} strokeWidth="2.5" strokeLinecap="round" />

          {/* Carita mirando hacia el catálogo */}
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

          {/* Brazo derecho: señala el catálogo (animado) */}
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

export const ServiciosDashboard: React.FC = () => {
  const [isFormOpen, setIsFormOpen]       = useState(false);
  const [editingGroup, setEditingGroup]   = useState<ServiceGroup | null>(null);
  const [servicios, setServicios]         = useState<any[]>([]);
  const [deletingKey, setDeletingKey]     = useState<string | null>(null);
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch]               = useState('');
  const [showFilters, setShowFilters]     = useState(false);
  const [filterStatus, setFilterStatus]   = useState<'all' | 'published' | 'draft'>('all');
  const [togglingKey, setTogglingKey]     = useState<string | null>(null);
  const [filterType, setFilterType]       = useState<string>('all');
  const filtersRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), ok ? 3000 : 6000);
  };

  const loadServicios = async () => {
    try {
      const res  = await fetch('/api/services/offers');
      const json = await res.json();
      if (json.success) setServicios(json.data.offers || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadServicios(); }, []);

  // Close filter panel on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const allGroups = groupOffers(servicios);

  const activeFilterCount = (filterStatus !== 'all' ? 1 : 0) + (filterType !== 'all' ? 1 : 0);

  const groups = allGroups.filter(g => {
    const q = search.trim().toLowerCase();
    if (q && !g.title.toLowerCase().includes(q)) return false;
    if (filterStatus !== 'all' && g.status !== filterStatus) return false;
    if (filterType   !== 'all' && g.offerType !== filterType) return false;
    return true;
  });

  // ── Toggle group active/inactive ─────────────────────────────────────────
  const handleToggleGroup = async (group: ServiceGroup) => {
    setTogglingKey(group.key);
    const newStatus = group.status === 'published' ? 'draft' : 'published';
    const headers = authH();
    try {
      await Promise.all(group.ids.map(id =>
        fetch(`/api/services/offers/${id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ status: newStatus }),
        })
      ));
      // Optimistic update
      setServicios(prev => prev.map(s =>
        group.ids.includes(s.id) ? { ...s, status: newStatus } : s
      ));
      showToast(newStatus === 'published' ? 'Servicio activado' : 'Servicio desactivado', true);
    } catch {
      showToast('Error al cambiar el estado', false);
    } finally {
      setTogglingKey(null);
    }
  };

  // ── Auth headers ──────────────────────────────────────────────────────────
  const authH = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  // ── Delete group (all sessions) ───────────────────────────────────────────
  const handleDeleteGroup = async (group: ServiceGroup) => {
    setDeletingKey(group.key);
    try {
      await Promise.all(group.ids.map(id =>
        fetch(`/api/services/offers/${id}`, { method: 'DELETE', headers: authH() })
      ));
      showToast(`${group.sessionCount} sesión${group.sessionCount !== 1 ? 'es' : ''} eliminada${group.sessionCount !== 1 ? 's' : ''}`, true);
      await loadServicios();
    } catch {
      showToast('Error al eliminar las sesiones', false);
    } finally {
      setDeletingKey(null);
    }
  };

  // ── Edit group: map representative + full range ───────────────────────────
  const mapGroupToFormValues = (g: ServiceGroup) => {
    const s = g.representative as any;
    const cat = s.catalog || {};

    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    // Reconstruct diasSemana codes from day names in group
    const dayCodeByName: Record<string, string> = { Dom: 'dom', Lun: 'lun', Mar: 'mar', Mié: 'mie', Jue: 'jue', Vie: 'vie', Sáb: 'sab' };
    const diasSemana = g.days.map(n => dayCodeByName[n]).filter(Boolean);

    // Parse tipoAtencion from old description format if no catalog data
    let tipoAtencion: string | undefined;
    if (s.description) {
      for (const part of s.description.split(' | ')) {
        const kv = part.split(': ');
        if (kv[0]?.trim() === 'Atención' && kv[1]) {
          const val = kv[1].trim();
          if (['Primera vez', 'Control o seguimiento', 'Urgencia'].includes(val)) {
            tipoAtencion = val;
          }
        }
      }
    }
    // tipoAtencion from catalog takes priority
    if (cat.tipoAtencion) tipoAtencion = cat.tipoAtencion;

    // Clean description: don't carry over old "Modalidad: undefined" format
    const rawDesc = cat.description || s.description || '';
    const cleanDesc = rawDesc.startsWith('Modalidad: undefined') || rawDesc.startsWith('Modalidad: Grupal') || rawDesc.startsWith('Modalidad: Individual')
      ? '' : rawDesc;

    return {
      locationId: s.location?.id || '',
      roomId: s.room?.id || '',
      // RIPS
      serviceName: cat.serviceName || s.title || '',
      description: cleanDesc,
      categoryGroup: (cat.categoryGroup || '01 Consulta externa') as typeof import('./servicioSchema').RIPS_GRUPO_SERVICIO[number],
      subcategoryGroup: cat.subcategoryGroup || '',
      category: cat.category || '',
      subcategory: cat.subcategory || '',
      serviceCode: cat.serviceCode || '',
      modality: Array.isArray(cat.modality) ? cat.modality : (cat.modality ? [cat.modality] : []) as any[],
      isActive: cat.isActive ?? true,
      basePrice: cat.basePrice ?? s.price ?? 0,
      imageUrl: cat.imageUrl || '',
      preparationInstructions: cat.preparationInstructions || '',
      genderRestriction: cat.genderRestriction || '',
      risks: cat.risks || '',
      contraindications: cat.contraindications || '',
      
      durationMinutes: s.durationMinutes || 30,
      instructorId: s.professional?.id || '',
      tipoAtencion: tipoAtencion as "Primera vez" | "Control o seguimiento" | "Urgencia" | undefined,
      capacidad: s.capacity,
    };
  };

  // ── Save (create or update group) ─────────────────────────────────────────
  const handleFormSuccess = async (data: any) => {
    const headers = authH();

    const durationMinutes = data.durationMinutes || 30;

    // Build a clean summary description for the offer record
    const modalityLabel = Array.isArray(data.modality) && data.modality.length > 0
      ? data.modality.map((m: string) => m.split(' ').slice(1).join(' ')).join(', ')
      : '';
    const offerDescription = data.description
      || [data.categoryGroup, modalityLabel ? `Modalidad: ${modalityLabel}` : '', data.tipoAtencion ? `Atención: ${data.tipoAtencion}` : ''].filter(Boolean).join(' | ');

    const basePayload = {
      locationId:      data.locationId,
      roomId:          data.roomId || undefined,
      offerType:       Array.isArray(data.modality) && data.modality.some((m: string) => m.includes('EXTRAMURAL')) ? 'appointment' : 'appointment',
      title:           data.serviceName,
      description:     offerDescription,
      professionalId:  data.instructorId || undefined,
      capacity:        data.capacidad ?? (data.roomCapacity ?? 1),
      durationMinutes,
      price:           0,
      currency:        'COP',
      
      // RIPS Fields
      serviceName: data.serviceName,
      categoryGroup: data.categoryGroup,
      subcategoryGroup: data.subcategoryGroup,
      category: data.category,
      subcategory: data.subcategory,
      serviceCode: data.serviceCode,
      modality: data.modality,
      isActive: data.isActive,
      basePrice: 0,
      imageUrl: '',
      preparationInstructions: data.preparationInstructions,
      genderRestriction: data.genderRestriction,
      risks: data.risks,
      contraindications: data.contraindications,
    };

    let errCount = 0;
    let lastError = '';
    let totalAttempts = 0;

    // If editing, we update the existing offers
    if (editingGroup) {
      totalAttempts = editingGroup.ids.length;
      for (const id of editingGroup.ids) {
        try {
          const res = await fetch(`/api/services/offers/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(basePayload)
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            errCount++;
            lastError = json.error ?? `Error ${res.status}`;
          }
        } catch (e: unknown) {
          errCount++;
          lastError = (e as Error).message ?? 'Error de red';
        }
      }
    } else {
      // Create a single default occurrence for the new service template
      const defaultDate = new Date();
      defaultDate.setHours(8, 0, 0, 0);
      const occurrences = [defaultDate.toISOString()];
      
      totalAttempts = occurrences.length;
      for (const occ of occurrences) {
        try {
          const res  = await fetch('/api/services/offers', { method: 'POST', headers, body: JSON.stringify({ ...basePayload, scheduledAt: occ.toISOString() }) });
          const json = await res.json();
          if (!res.ok || !json.success) {
            errCount++;
            lastError = json.error ?? `Error ${res.status}`;
          }
        } catch (e: unknown) {
          errCount++;
          lastError = (e as Error).message ?? 'Error de red';
        }
      }
    }

    if (errCount > 0) {
      const created = totalAttempts - errCount;
      showToast(
        created > 0
          ? `${created}/${totalAttempts} sesiones ${editingGroup ? 'actualizadas' : 'creadas'}. Error: ${lastError}`
          : `No se ${editingGroup ? 'actualizaron' : 'crearon'} sesiones. Error: ${lastError}`,
        false
      );
    } else {
      showToast(`${totalAttempts} sesión${totalAttempts !== 1 ? 'es' : ''} ${editingGroup ? 'actualizadas' : 'creadas'} ✓`, true);
    }

    await loadServicios();
    setIsFormOpen(false);
    setEditingGroup(null);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 28px', boxSizing: 'border-box' }}>
      <AnimatePresence mode="wait">
        {!isFormOpen ? (
          <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ maxWidth: 1140, margin: '0 auto' }}>

            {/* ── ANIMACIÓN DE BIENVENIDA ── */}
            <ServiciosStickmanAnimation />

            {/* ── HEADER ── */}
            <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontFamily: FONT_BODONI, fontSize: 42, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Gestión de Servicios</h1>
                  <p style={{ fontFamily: FONT_INTER, color: C.textMedium, marginTop: 8, fontWeight: 500 }}>
                    Administra el catálogo, horarios y disponibilidad de la academia.
                  </p>
                </div>
                <button
                  onClick={() => { setEditingGroup(null); setIsFormOpen(true); }}
                  style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, padding: '12px 24px', borderRadius: 12, border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: `0 4px 16px rgba(139,92,246,0.2)`, fontFamily: FONT_INTER, flexShrink: 0 }}
                >
                  <Plus size={18} strokeWidth={3} /> Nuevo Servicio
                </button>
              </div>

              {/* ── SEARCH + FILTERS ROW ── */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                  <Search size={15} color={C.textMuted} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre del servicio…"
                    style={{ width: '100%', padding: '10px 36px 10px 36px', borderRadius: 11, border: `1.5px solid ${C.borderLight}`, background: C.white, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: FONT_INTER, transition: 'border-color 0.18s' }}
                    onFocus={e => e.currentTarget.style.borderColor = C.gold}
                    onBlur={e => e.currentTarget.style.borderColor = C.borderLight}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', padding: 2 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Filters toggle */}
                <div ref={filtersRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowFilters(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '10px 16px', borderRadius: 11,
                      border: `1.5px solid ${showFilters || activeFilterCount > 0 ? C.gold : C.borderLight}`,
                      background: showFilters ? `rgba(139,92,246,0.06)` : C.white,
                      color: showFilters || activeFilterCount > 0 ? C.gold : C.textBrown,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      fontFamily: FONT_INTER, transition: 'all 0.18s', whiteSpace: 'nowrap',
                    }}
                  >
                    <SlidersHorizontal size={15} />
                    Filtros
                    {activeFilterCount > 0 && (
                      <span style={{ background: C.gold, color: C.white, borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Filter dropdown */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.16 }}
                        style={{ position: 'absolute', top: 46, right: 0, width: 320, background: C.white, borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.12)', border: `1.5px solid ${C.borderLight}`, zIndex: 50, padding: '18px 18px 14px', fontFamily: FONT_INTER }}
                      >
                        {/* Estado */}
                        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Estado</p>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
                          {([
                            { v: 'all',       label: 'Todos' },
                            { v: 'published', label: 'Activo' },
                            { v: 'draft',     label: 'Inactivo' },
                          ] as const).map(opt => (
                            <button key={opt.v} onClick={() => setFilterStatus(opt.v)}
                              style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filterStatus === opt.v ? C.gold : C.borderLight}`, background: filterStatus === opt.v ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : 'transparent', color: filterStatus === opt.v ? C.white : C.textBrown, cursor: 'pointer', transition: 'all 0.18s', fontFamily: FONT_INTER }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {/* Tipo */}
                        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Tipo de servicio</p>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                          {([
                            { v: 'all',               label: 'Todos' },
                            { v: 'appointment',       label: 'Citas Individuales' },
                            { v: 'open_consultation', label: 'Consultas Abiertas' },
                            { v: 'workshop',          label: 'Sesiones Grupales' },
                            { v: 'event',             label: 'Eventos' },
                          ] as const).map(opt => {
                            const tc = opt.v !== 'all' ? OFFER_TYPE_COLOR[opt.v] : null;
                            const sel = filterType === opt.v;
                            return (
                              <button key={opt.v} onClick={() => setFilterType(opt.v)}
                                style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1.5px solid ${sel ? (tc?.color ?? C.gold) : C.borderLight}`, background: sel ? (tc?.bg ?? `rgba(139,92,246,0.08)`) : 'transparent', color: sel ? (tc?.color ?? C.gold) : C.textBrown, cursor: 'pointer', transition: 'all 0.18s', fontFamily: FONT_INTER }}>
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Clear */}
                        {activeFilterCount > 0 && (
                          <button onClick={() => { setFilterStatus('all'); setFilterType('all'); }}
                            style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${C.borderLight}`, background: 'transparent', color: C.textMedium, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_INTER }}>
                            Limpiar filtros
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Active chips summary */}
                {(search || activeFilterCount > 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>
                      {groups.length} resultado{groups.length !== 1 ? 's' : ''}
                    </span>
                    {search && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(139,92,246,0.08)', color: C.gold, fontSize: 11, fontWeight: 700 }}>
                        "{search}" <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                      </span>
                    )}
                    {filterStatus !== 'all' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(139,92,246,0.08)', color: C.gold, fontSize: 11, fontWeight: 700 }}>
                        {filterStatus === 'published' ? 'Activo' : 'Inactivo'} <X size={10} style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('all')} />
                      </span>
                    )}
                    {filterType !== 'all' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(139,92,246,0.08)', color: C.gold, fontSize: 11, fontWeight: 700 }}>
                        {OFFER_TYPE_LABEL[filterType] ?? filterType} <X size={10} style={{ cursor: 'pointer' }} onClick={() => setFilterType('all')} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── EMPTY STATE ── */}
            {groups.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.white, borderRadius: 24, border: `1px solid ${C.borderLight}`, padding: '80px 32px' }}>
                <div style={{ width: 64, height: 64, background: 'rgba(139,92,246,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {search || activeFilterCount > 0 ? <Search size={28} color={C.gold} /> : <Calendar size={28} color={C.gold} />}
                </div>
                {search || activeFilterCount > 0 ? (
                  <>
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>Sin resultados</h3>
                    <p style={{ color: C.textMedium, textAlign: 'center', maxWidth: 360, marginBottom: 20, lineHeight: 1.5 }}>Ningún servicio coincide con los filtros aplicados.</p>
                    <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterType('all'); }} style={{ padding: '10px 22px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textBrown, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}>
                      Limpiar filtros
                    </button>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8 }}>No hay servicios programados</h3>
                    <p style={{ color: C.textMedium, textAlign: 'center', maxWidth: 400, marginBottom: 24, lineHeight: 1.5 }}>Comienza a construir el catálogo de consultas y servicios de la clínica.</p>
                    <button onClick={() => { setEditingGroup(null); setIsFormOpen(true); }} style={{ color: C.gold, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 15, fontFamily: FONT_INTER }}>
                      Crear primer servicio <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                <AnimatePresence>
                  {groups.map((g, i) => {
                    const tc = OFFER_TYPE_COLOR[g.offerType] ?? OFFER_TYPE_COLOR.appointment;
                    const isDeleting = deletingKey === g.key;
                    const profName = g.professional ? `${g.professional.firstName} ${g.professional.lastName}` : null;

                    return (
                      <motion.div
                        key={g.key}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.04 }}
                        style={{ background: C.white, border: `1.5px solid ${g.status === 'published' ? C.borderLight : '#EDE8E0'}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', opacity: g.status === 'published' ? 1 : 0.72, transition: 'opacity 0.25s, border-color 0.25s' }}
                      >
                        {/* ── Card top accent bar ── */}
                        <div style={{ height: 4, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`, opacity: g.status === 'published' ? 1 : 0.3 }} />

                        <div style={{ padding: '18px 20px', flex: 1 }}>
                          {/* Header row */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 9px', borderRadius: 6, background: tc.bg, color: tc.color }}>
                                {OFFER_TYPE_LABEL[g.offerType] ?? g.offerType}
                              </span>
                            </div>
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                              <button
                                onClick={() => { setEditingGroup(g); setIsFormOpen(true); }}
                                title="Editar todas las sesiones"
                                style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.14)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.07)'}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteGroup(g)}
                                disabled={isDeleting}
                                title="Eliminar todas las sesiones"
                                style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', transition: 'background 0.2s', opacity: isDeleting ? 0.5 : 1 }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Toggle Activo/Inactivo */}
                          <button
                            onClick={() => handleToggleGroup(g)}
                            disabled={togglingKey === g.key}
                            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: togglingKey === g.key ? 'not-allowed' : 'pointer', padding: '4px 0', marginBottom: 10, opacity: togglingKey === g.key ? 0.6 : 1, transition: 'opacity 0.2s' }}
                          >
                            {g.status === 'published'
                              ? <ToggleRight size={26} color="#16A34A" />
                              : <ToggleLeft size={26} color={C.textMuted} />
                            }
                            <span style={{ fontSize: 12, fontWeight: 700, color: g.status === 'published' ? '#16A34A' : C.textMuted }}>
                              {g.status === 'published' ? 'Activo' : 'Inactivo'}
                            </span>
                          </button>

                          {/* Title */}
                          <h3 style={{ fontFamily: FONT_BODONI, fontSize: 19, fontWeight: 700, color: C.text, margin: '0 0 4px', lineHeight: 1.2 }}>
                            {g.title}
                          </h3>
                          {g.description && (
                            <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 14px', fontWeight: 500 }}>{g.description}</p>
                          )}

                          {/* ── Divider ── */}
                          <div style={{ height: 1, background: C.borderLight, margin: '12px 0' }} />

                          {/* ── Info rows ── */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                            {/* Sessions count + date range */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Repeat size={13} color={C.gold} />
                              </div>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                                  {g.sessionCount} sesión{g.sessionCount !== 1 ? 'es' : ''}
                                </span>
                                <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 6 }}>
                                  {fmtDate(g.firstDate)} → {fmtDate(g.lastDate)}
                                </span>
                              </div>
                            </div>

                            {/* Days */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Calendar size={13} color={C.gold} />
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {g.days.map(d => (
                                  <span key={d} style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: 'rgba(139,92,246,0.08)', padding: '2px 7px', borderRadius: 6 }}>{d}</span>
                                ))}
                              </div>
                            </div>

                            {/* Time */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Clock size={13} color={C.gold} />
                              </div>
                              <span style={{ fontSize: 13, color: C.textBrown, fontWeight: 600 }}>
                                {g.timeStart} – {g.timeEnd}
                                <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginLeft: 6 }}>({g.durationMinutes} min)</span>
                              </span>
                            </div>

                            {/* Location + room */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <MapPin size={13} color={C.gold} />
                              </div>
                              <span style={{ fontSize: 13, color: C.textBrown, fontWeight: 600 }}>
                                {g.location?.name ?? 'Multi-sede'}
                                {g.room && <span style={{ fontWeight: 500, color: C.textMuted }}> — {g.room.name}</span>}
                              </span>
                            </div>

                            {/* Professional */}
                            {profName && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <User size={13} color={C.gold} />
                                </div>
                                <span style={{ fontSize: 13, color: C.textBrown, fontWeight: 600 }}>{profName}</span>
                              </div>
                            )}

                            {/* Price */}
                            {g.price > 0 && (
                              <div style={{ marginTop: 4, paddingTop: 10, borderTop: `1px dashed ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Precio por sesión</span>
                                <span style={{ fontSize: 15, fontWeight: 800, color: C.gold, fontFamily: FONT_BODONI }}>
                                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(g.price)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} style={{ maxWidth: 1140, margin: '0 auto' }}>
            <FormularioServicio
              key={editingGroup ? editingGroup.key : 'new'}
              initialData={editingGroup ? mapGroupToFormValues(editingGroup) : undefined}
              editingOfferId={editingGroup?.ids[0]}
              minCapacity={editingGroup?.maxEnrolledCount ?? 1}
              onCancel={() => { setIsFormOpen(false); setEditingGroup(null); }}
              onSuccess={handleFormSuccess}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#16A34A' : '#DC2626', color: '#fff', padding: '11px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', fontFamily: FONT_INTER }}
          >
            {toast.ok ? '✓ ' : '✗ '}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
