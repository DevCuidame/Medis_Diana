import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, MapPin, User, Clock, ChevronRight, Edit2, Trash2, Repeat, Search, SlidersHorizontal, X, ToggleLeft, ToggleRight } from 'lucide-react';
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
  class: 'Clase', open_pole: 'Práctica Libre', event: 'Evento', workshop: 'Taller',
};
const OFFER_TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  class:      { bg: 'rgba(139,92,246,0.1)',    color: '#8B5CF6' },
  open_pole:  { bg: 'rgba(124,58,237,0.1)',  color: '#7C3AED' },
  event:      { bg: 'rgba(59,130,246,0.1)',  color: '#2563EB' },
  workshop:   { bg: 'rgba(236,72,153,0.1)',  color: '#3B82F6' },
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
    const key = [o.title, o.professionalId ?? '', o.locationId ?? '', o.roomId ?? '', timeStart, o.durationMinutes].join('|');

    if (!map.has(key)) {
      const endMs  = d.getTime() + o.durationMinutes * 60000;
      const endD   = new Date(endMs);
      const timeEnd = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
      map.set(key, {
        key, title: o.title, offerType: o.offerType, status: o.status,
        description: o.description ?? null,
        location: o.location ?? null,
        room: o.room ?? null,
        professional: o.professional ?? null,
        timeStart, timeEnd,
        durationMinutes: o.durationMinutes,
        price: o.price ?? 0,
        firstDate: d, lastDate: d,
        days: [], sessionCount: 0,
        ids: [], representative: o,
      });
    }

    const g = map.get(key)!;
    g.ids.push(o.id);
    g.sessionCount++;
    if (d < g.firstDate) g.firstDate = d;
    if (d > g.lastDate)  g.lastDate  = d;
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
    const s = g.representative;
    let categoria = 'Clases de Pole'; let tipoServicio = '';
    if (s.title) { const p = s.title.split(' — '); categoria = p[0]; tipoServicio = p[1] || ''; }

    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    // Reconstruct diasSemana codes from day names in group
    const dayCodeByName: Record<string, string> = { Dom: 'dom', Lun: 'lun', Mar: 'mar', Mié: 'mie', Jue: 'jue', Vie: 'vie', Sáb: 'sab' };
    const diasSemana = g.days.map(n => dayCodeByName[n]).filter(Boolean);

    let modalidad: string | undefined;
    if (s.description?.includes('Modalidad:')) modalidad = s.description.replace('Modalidad:', '').trim();

    return {
      locationId: s.locationId || '', roomId: s.roomId || '',
      categoria: categoria as "Práctica Libre" | "Clases de Pole" | "Disciplinas Complementarias" | "Eventos" | "Otros",
      tipoServicio,
      diasSemana: diasSemana.length ? diasSemana : ['lun'],
      fechaDesde: toDateStr(g.firstDate),
      fechaHasta: toDateStr(g.lastDate),
      horaInicio: g.timeStart,
      horaFin: g.timeEnd,
      precio: g.price,
      modalidad: modalidad as "Grupal" | "Individual" | undefined,
      instructorId: s.professionalId || '',
      nivelDificultad: undefined,
      capacidad: s.capacity,
    };
  };

  // ── Save (create or update group) ─────────────────────────────────────────
  const handleFormSuccess = async (data: any) => {
    const offerTypeMap: Record<string, string> = {
      'Clases de Pole': 'class', 'Disciplinas Complementarias': 'class',
      'Práctica Libre': 'open_pole', 'Eventos': 'event', 'Otros': 'workshop',
    };
    const headers = authH();

    const tempStart = new Date(`${data.fechaDesde}T${data.horaInicio}`);
    const tempEnd   = new Date(`${data.fechaDesde}T${data.horaFin}`);
    const durationMinutes = Math.max(Math.round((tempEnd.getTime() - tempStart.getTime()) / 60000), 30);

    const basePayload = {
      locationId:      data.locationId,
      roomId:          data.roomId || undefined,
      offerType:       offerTypeMap[data.categoria] ?? 'class',
      title:           `${data.categoria}${data.tipoServicio ? ` — ${data.tipoServicio}` : ''}`,
      description:     data.modalidad ? `Modalidad: ${data.modalidad}` : undefined,
      professionalId:  data.instructorId || undefined,
      capacity:        data.capacidad ?? (data.roomCapacity ?? 10),
      durationMinutes,
      price:           data.precio ?? 0,
      currency:        'COP',
    };

    // If editing, delete old group first then recreate
    if (editingGroup) {
      await Promise.all(editingGroup.ids.map(id =>
        fetch(`/api/services/offers/${id}`, { method: 'DELETE', headers })
      ));
    }

    const occurrences = generateOccurrences(data.diasSemana, data.fechaDesde, data.fechaHasta, data.horaInicio);
    if (!occurrences.length) {
      const diasNombres = (data.diasSemana as string[]).map((d: string) => DIA_NOMBRES[d] ?? d).join(', ');
      showToast(
        `Ningún ${diasNombres || 'día seleccionado'} cae entre ${data.fechaDesde} y ${data.fechaHasta}. Amplía el rango de fechas.`,
        false
      );
      return;
    }

    let errCount = 0;
    let lastError = '';
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

    if (errCount > 0) {
      const created = occurrences.length - errCount;
      showToast(
        created > 0
          ? `${created}/${occurrences.length} sesiones creadas. Error: ${lastError}`
          : `No se crearon sesiones. Error: ${lastError}`,
        false
      );
    } else {
      showToast(`${occurrences.length} sesión${occurrences.length !== 1 ? 'es' : ''} ${editingGroup ? 'actualizadas' : 'creadas'} ✓`, true);
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
                            { v: 'all',      label: 'Todos' },
                            { v: 'class',     label: 'Clases' },
                            { v: 'open_pole', label: 'Práctica Libre' },
                            { v: 'event',     label: 'Eventos' },
                            { v: 'workshop',  label: 'Talleres' },
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
                    <p style={{ color: C.textMedium, textAlign: 'center', maxWidth: 400, marginBottom: 24, lineHeight: 1.5 }}>Comienza a construir el catálogo de clases, prácticas libres o talleres de tu estudio.</p>
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
                    const tc = OFFER_TYPE_COLOR[g.offerType] ?? OFFER_TYPE_COLOR.class;
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
                            {g.title.split(' — ')[0]}
                          </h3>
                          {g.title.includes(' — ') && (
                            <p style={{ fontFamily: FONT_INTER, fontSize: 13, color: C.gold, fontWeight: 600, margin: '0 0 4px' }}>
                              {g.title.split(' — ')[1]}
                            </p>
                          )}
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
              initialData={editingGroup ? mapGroupToFormValues(editingGroup) : undefined}
              editingOfferId={editingGroup?.ids[0]}
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
