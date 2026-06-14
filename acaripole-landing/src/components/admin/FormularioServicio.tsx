import React, { useEffect, useState, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Box, Tag, Users, UserCheck, Clock, DollarSign,
  Calendar as CalendarIcon, CheckCircle, Activity, AlertTriangle,
  Loader2, XCircle, X, Plus,
} from 'lucide-react';
import type { ServicioFormValues } from './servicioSchema';
import {
  servicioSchema, categoriaEnum, modalidadEnum, tipoAtencionEnum,
  DIA_LABELS, DIA_NOMBRES, DIAS_ORDEN, generateOccurrences,
} from './servicioSchema';

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bg: '#FFFFFF', bgPanel: '#F3F0FB', bgSecondary: '#F3F0FB',
  white: '#FFFFFF', text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
  red: '#EF4444', redLight: '#FEE2E2', green: '#10B981',
};

const FONT_SERIF = '"Bodoni Moda", Georgia, serif';
const FONT_SANS  = '"Hanken Grotesk", Inter, system-ui, sans-serif';

const TIPOS_SERVICIO_POR_CATEGORIA: Record<string, string[]> = {
  'Promoción y Prevención en Salud': [
    'Vacunación',
    'Charlas educativas',
    'Tamizaje / Detección temprana',
    'Control de crecimiento y desarrollo',
  ],
  'Enfermedades No Transmisibles': [
    'Control de Hipertensión Arterial (HTA)',
    'Control de Diabetes (DM)',
    'Riesgo Cardiovascular (RCV)',
    'Control de Dislipidemia',
  ],
  'Sobrepeso y Obesidad': [
    'Valoración nutricional',
    'Plan de manejo de peso',
    'Seguimiento de obesidad',
  ],
  'Salud de la Mujer': [
    'Control prenatal',
    'Citología / Tamizaje ginecológico',
    'Planificación familiar',
    'Climaterio y menopausia',
  ],
  'Salud Mental': [
    'Valoración inicial de salud mental',
    'Manejo de ansiedad',
    'Manejo de depresión',
    'Acompañamiento psicológico',
  ],
};

const InputField = ({ label, icon: Icon, error, children }: any) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 8 }}>
      <Icon size={14} color={C.gold} /> {label}
    </div>
    {children}
    {error && (
      <span style={{ color: C.red, fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
        <AlertTriangle size={12} /> {error.message}
      </span>
    )}
  </div>
);

type AvailStatus = 'idle' | 'checking' | 'available' | 'conflict';
interface ConflictInfo { title: string; scheduledAt: string; endsAt: string }

interface Props {
  initialData?: Partial<ServicioFormValues>;
  editingOfferId?: string;
  onSuccess: (data: ServicioFormValues) => void;
  onCancel: () => void;
}

export const FormularioServicio: React.FC<Props> = ({ initialData, editingOfferId, onSuccess, onCancel }) => {
  const [sedes, setSedes]             = useState<{ id: string; name: string }[]>([]);
  const [espacios, setEspacios]       = useState<{ id: string; name: string; capacity: number; locationId: string }[]>([]);
  const [instructores, setInstructores] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddTipo, setShowAddTipo] = useState(false);
  const [newTipoText, setNewTipoText] = useState('');
  const [customTipos, setCustomTipos] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem('MEDIS_custom_tipos') || '{}'); }
    catch { return {}; }
  });
  const [availStatus, setAvailStatus]   = useState<AvailStatus>('idle');
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [profSchedule, setProfSchedule] = useState<Array<{ day: string; startTime: string; endTime: string }>>([]);
  const availTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DIA_DISPLAY: Record<string, string> = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
    thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
  };

  // ── Default dates ──────────────────────────────────────────────────────────
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const fourWeeksStr = () => {
    const d = new Date(); d.setDate(d.getDate() + 28);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<ServicioFormValues>({
    resolver: zodResolver(servicioSchema) as any,
    defaultValues: initialData || {
      categoria: 'Promoción y Prevención en Salud',
      precio: 0,
      diasSemana: [],
      fechaDesde: todayStr(),
      fechaHasta: fourWeeksStr(),
    },
  });

  const locationId     = useWatch({ control, name: 'locationId' });
  const categoria      = useWatch({ control, name: 'categoria' });
  const modalidad      = useWatch({ control, name: 'modalidad' });
  const tipoAtencion   = useWatch({ control, name: 'tipoAtencion' });
  const tipoServicio   = useWatch({ control, name: 'tipoServicio' });
  const instructorId   = useWatch({ control, name: 'instructorId' });
  const fechaDesde     = useWatch({ control, name: 'fechaDesde' });
  const fechaHasta     = useWatch({ control, name: 'fechaHasta' });
  const horaInicio     = useWatch({ control, name: 'horaInicio' });
  const horaFin        = useWatch({ control, name: 'horaFin' });
  const diasSemana     = useWatch({ control, name: 'diasSemana' }) ?? [];

  const requiereInstructor = true; // aplica a las 5 categorías médicas

  // Availability check (debounced 400ms)
  useEffect(() => {
    const firstDay = diasSemana[0];
    const needsCheck = requiereInstructor && instructorId && firstDay && fechaDesde && horaInicio && horaFin;
    if (!needsCheck) { setAvailStatus('idle'); setConflictInfo(null); setProfSchedule([]); return; }

    if (availTimerRef.current) clearTimeout(availTimerRef.current);
    setAvailStatus('checking');

    availTimerRef.current = setTimeout(async () => {
      try {
        const occurrences = generateOccurrences([firstDay], fechaDesde, fechaHasta || fechaDesde, horaInicio);
        if (!occurrences.length) { setAvailStatus('idle'); return; }

        const start = occurrences[0];
        const [hF, mF] = horaFin.split(':').map(Number);
        const end = new Date(start);
        end.setHours(hF, mF, 0, 0);
        if (end <= start) { setAvailStatus('idle'); return; }

        const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
        if (editingOfferId) params.set('excludeOfferId', editingOfferId);
        const res  = await fetch(`/api/professionals/${instructorId}/availability?${params}`);
        const data = await res.json();
        if (data.success) {
          if (data.data.available) {
            setAvailStatus('available'); setConflictInfo(null); setProfSchedule([]);
          } else {
            setAvailStatus('conflict');
            setConflictInfo(data.data.conflict ?? null);
            // If independiente (no conflict info), load their registered schedule
            if (!data.data.conflict) {
              const token = localStorage.getItem('accessToken');
              const sRes = await fetch(`/api/professionals/${instructorId}/schedule`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              const sData = await sRes.json();
              if (sData.success) {
                setProfSchedule((sData.data.schedule || []).map((s: any) => ({
                  day: s.dayOfWeek ?? s.day_of_week,
                  startTime: s.startTime ?? s.start_time,
                  endTime: s.endTime ?? s.end_time,
                })));
              }
            }
          }
        } else { setAvailStatus('idle'); }
      } catch { setAvailStatus('idle'); }
    }, 400);

    return () => { if (availTimerRef.current) clearTimeout(availTimerRef.current); };
  }, [instructorId, diasSemana, fechaDesde, fechaHasta, horaInicio, horaFin, requiereInstructor, editingOfferId]);

  // Sync category change — reset tipo state
  const lastCategoria = useRef(categoria);
  useEffect(() => {
    if (lastCategoria.current !== categoria) {
      lastCategoria.current = categoria;
      setShowAddTipo(false);
      setNewTipoText('');
      setValue('tipoServicio', '');
    }
  }, [categoria, setValue]);

  const saveCustomTipos = (updated: Record<string, string[]>) => {
    setCustomTipos(updated);
    localStorage.setItem('MEDIS_custom_tipos', JSON.stringify(updated));
  };

  const handleAddTipo = () => {
    const trimmed = newTipoText.trim();
    if (!trimmed) return;
    const cat = categoria || '';
    const existing = customTipos[cat] || [];
    if (existing.includes(trimmed)) { setValue('tipoServicio', trimmed, { shouldValidate: true }); setShowAddTipo(false); setNewTipoText(''); return; }
    const updated = { ...customTipos, [cat]: [...existing, trimmed] };
    saveCustomTipos(updated);
    setValue('tipoServicio', trimmed, { shouldValidate: true });
    setShowAddTipo(false);
    setNewTipoText('');
  };

  const handleDeleteTipo = (tipo: string) => {
    const cat = categoria || '';
    const updated = { ...customTipos, [cat]: (customTipos[cat] || []).filter(t => t !== tipo) };
    saveCustomTipos(updated);
    if (tipoServicio === tipo) setValue('tipoServicio', '', { shouldValidate: false });
  };

  const presetOptions = TIPOS_SERVICIO_POR_CATEGORIA[categoria] || [];
  const extraOptions  = customTipos[categoria] || [];
  const optionsForCategory = [...presetOptions, ...extraOptions];

  // Load sedes & instructores
  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(j => {
      if (j.success) {
        setSedes(j.data.locations);
        if (initialData?.locationId) setValue('locationId', initialData.locationId);
      }
    }).catch(() => {});

    fetch('/api/professionals').then(r => r.json()).then(j => {
      if (j.success && j.data.professionals) {
        setInstructores(j.data.professionals.map((p: any) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` })));
        if (initialData?.instructorId) setValue('instructorId', initialData.instructorId);
      }
    }).catch(() => {});
  }, [initialData, setValue]);

  // Load espacios when sede changes
  useEffect(() => {
    if (!locationId) { setEspacios([]); return; }
    fetch(`/api/rooms?locationId=${locationId}`).then(r => r.json()).then(j => {
      if (j.success) {
        setEspacios(j.data.rooms);
        if (initialData?.roomId && j.data.rooms.some((r: any) => r.id === initialData.roomId)) {
          setValue('roomId', initialData.roomId);
        }
      }
    }).catch(() => {});
  }, [locationId, initialData, setValue]);

  const handleFormSubmit = async (data: ServicioFormValues) => {
    setIsSubmitting(true);
    try {
      const cleaned: any = { ...data };
      const room = espacios.find(e => e.id === data.roomId);
      if (room) cleaned.roomCapacity = room.capacity;
      if (cleaned.modalidad === 'Individual') {
        delete cleaned.capacidad;
      }
      await onSuccess(cleaned);
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
  };

  const toggleDia = (dia: string) => {
    const current = (watch('diasSemana') ?? []) as string[];
    const next = current.includes(dia) ? current.filter(d => d !== dia) : [...current, dia];
    setValue('diasSemana', next, { shouldValidate: true });
  };

  // Computed info: occurrences count
  const occurrenceCount = (() => {
    if (!diasSemana.length || !fechaDesde || !fechaHasta || !horaInicio) return 0;
    try {
      // generateOccurrences importado al top del archivo
      return generateOccurrences(diasSemana, fechaDesde, fechaHasta, horaInicio).length;
    } catch { return 0; }
  })();

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: C.white,
    border: `1.5px solid ${C.borderLight}`, borderRadius: 12,
    fontSize: 14, color: C.text, outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: FONT_SANS,
    transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(139,92,246,0.02)',
  };
  const activeInputStyle = (hasError: boolean) => ({
    ...inputStyle, borderColor: hasError ? C.red : C.border,
  });

  return (
    <div style={{ fontFamily: FONT_SANS, padding: '40px 20px', background: C.bg }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: C.white, borderRadius: 24, boxShadow: '0 16px 48px rgba(139,92,246,0.06)', overflow: 'hidden', border: `1px solid ${C.borderLight}` }}>

        <div style={{ padding: '32px 40px', background: `linear-gradient(90deg, rgba(139,92,246,0.04), ${C.white})`, borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 700, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
            {initialData ? 'Editar Servicio' : 'Catálogo de Servicios'}
          </h2>
          <p style={{ color: C.textMedium, fontSize: 14, marginTop: 6 }}>Configura una nueva consulta o servicio para la agenda de la clínica.</p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit as any)} style={{ padding: 40 }}>

          {/* VALIDATION BANNER */}
          <AnimatePresence>
            {Object.keys(errors).length > 0 && (
              <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                style={{ background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 16, padding: '16px 24px', marginBottom: 32, display: 'flex', gap: 12, alignItems: 'flex-start' }}
              >
                <AlertTriangle size={20} color={C.red} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.red }}>Faltan campos obligatorios o tienen errores</h4>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12, color: C.textBrown, lineHeight: '1.6' }}>
                    {Object.entries(errors).map(([key, err]: any) => <li key={key}>{err.message}</li>)}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── PASO 1: UBICACIÓN ── */}
          <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: `1px dashed ${C.borderLight}` }}>
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, color: C.gold, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: FONT_SANS }}>1</span>
              Ubicación y Salón
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <InputField label="Sede Principal" icon={MapPin} error={errors.locationId}>
                <select {...register('locationId', { onChange: () => setValue('roomId', '') })} style={activeInputStyle(!!errors.locationId)}>
                  <option value="">Selecciona una sede...</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </InputField>
              <InputField label="Espacio / Salón" icon={Box} error={errors.roomId}>
                <select {...register('roomId')} style={{ ...activeInputStyle(!!errors.roomId), background: !locationId ? C.bgSecondary : C.white }} disabled={!locationId}>
                  <option value="">{locationId ? 'Selecciona el espacio...' : 'Primero elige una sede'}</option>
                  {espacios.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </InputField>
            </div>
          </div>

          {/* ── PASO 2: CONFIGURACIÓN ── */}
          <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: `1px dashed ${C.borderLight}` }}>
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, color: C.gold, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: FONT_SANS }}>2</span>
              Configuración del Servicio
            </h3>

            <div style={{ marginBottom: 20 }}>
              <InputField label="Categoría Principal" icon={Tag} error={errors.categoria}>
                <select {...register('categoria')} style={{ ...activeInputStyle(!!errors.categoria), maxWidth: 320 }}>
                  {categoriaEnum.options.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </InputField>
            </div>
            <div style={{ marginBottom: requiereInstructor ? 20 : 0 }}>
              <InputField label="Tipo de Servicio Específico" icon={Activity} error={errors.tipoServicio}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 38 }}>
                    {optionsForCategory.length === 0 && !showAddTipo && (
                      <span style={{ fontSize: 12, color: C.textMuted, fontStyle: 'italic', alignSelf: 'center' }}>
                        Sin tipos aún — agrega el primero
                      </span>
                    )}
                    {optionsForCategory.map(opt => {
                      const selected = tipoServicio === opt;
                      return (
                        <div key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px 6px 14px', borderRadius: 99, border: `1.5px solid ${selected ? C.gold : C.borderLight}`, background: selected ? `linear-gradient(135deg,${C.gold},${C.goldLight})` : C.white, cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' }}
                          onClick={() => { setShowAddTipo(false); setValue('tipoServicio', opt, { shouldValidate: true }); }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: selected ? C.white : C.textBrown }}>{opt}</span>
                          <button type="button"
                            onClick={e => { e.stopPropagation(); handleDeleteTipo(opt); }}
                            title="Eliminar tipo"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', border: 'none', background: selected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)', color: selected ? C.white : C.textMuted, cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'all 0.15s' }}>
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                    {/* Add button chip */}
                    {!showAddTipo && (
                      <button type="button" onClick={() => setShowAddTipo(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 99, border: `1.5px dashed ${C.gold}`, background: 'rgba(139,92,246,0.04)', color: C.gold, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' }}>
                        <Plus size={13} /> Agregar tipo
                      </button>
                    )}
                  </div>
                  {/* Add input */}
                  <AnimatePresence>
                    {showAddTipo && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={newTipoText}
                            onChange={e => setNewTipoText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTipo())}
                            placeholder="Ej: Control de Hipertensión Arterial..."
                            style={{ ...inputStyle, flex: 1 }}
                            autoFocus
                          />
                          <button type="button" onClick={handleAddTipo}
                            style={{ padding: '0 16px', borderRadius: 12, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: C.white, border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                            Agregar
                          </button>
                          <button type="button" onClick={() => { setShowAddTipo(false); setNewTipoText(''); }}
                            style={{ padding: '0 12px', borderRadius: 12, background: 'transparent', color: C.textMuted, border: `1px solid ${C.borderLight}`, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <X size={14} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </InputField>
            </div>

            <AnimatePresence mode="wait">
              {requiereInstructor && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{ marginTop: 8, background: C.bgPanel, borderRadius: 16, padding: 24, border: `1px solid ${C.borderLight}` }}>
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 12 }}>
                        <Users size={14} color={C.gold} /> Modalidad
                      </label>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {modalidadEnum.options.map(mod => (
                          <label key={mod} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderRadius: 12, border: `1.5px solid ${modalidad === mod ? C.gold : C.borderLight}`, background: modalidad === mod ? 'rgba(139,92,246,0.06)' : C.white, color: modalidad === mod ? C.gold : C.textBrown, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                            <input type="radio" value={mod} {...register('modalidad')} style={{ display: 'none' }} />
                            {mod}
                          </label>
                        ))}
                      </div>
                      {errors.modalidad && <span style={{ color: C.red, fontSize: 11, marginTop: 6, display: 'block', fontWeight: 500 }}>{errors.modalidad.message}</span>}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 12 }}>
                        <Activity size={14} color={C.gold} /> Tipo de Atención
                      </label>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {tipoAtencionEnum.options.map(tipo => (
                          <label key={tipo} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderRadius: 12, border: `1.5px solid ${tipoAtencion === tipo ? C.gold : C.borderLight}`, background: tipoAtencion === tipo ? 'rgba(139,92,246,0.06)' : C.white, color: tipoAtencion === tipo ? C.gold : C.textBrown, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                            <input type="radio" value={tipo} {...register('tipoAtencion')} style={{ display: 'none' }} />
                            {tipo}
                          </label>
                        ))}
                      </div>
                      {errors.tipoAtencion && <span style={{ color: C.red, fontSize: 11, marginTop: 6, display: 'block', fontWeight: 500 }}>{errors.tipoAtencion.message}</span>}
                    </div>

                    <AnimatePresence mode="wait">
                      {modalidad === 'Grupal' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ marginBottom: 24 }}>
                          <InputField label="Capacidad (Pacientes)" icon={Users} error={errors.capacidad}>
                            <input type="number" {...register('capacidad', { setValueAs: (v) => v === '' ? undefined : Number(v) })} style={activeInputStyle(!!errors.capacidad)} placeholder="Entre 2 y 20 pacientes" />
                          </InputField>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <InputField label="Médico responsable" icon={UserCheck} error={errors.instructorId}>
                      <select {...register('instructorId')} style={activeInputStyle(!!errors.instructorId)}>
                        <option value="">Asignar profesional...</option>
                        {instructores.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </InputField>

                    {/* AVAILABILITY INDICATOR */}
                    <AnimatePresence>
                      {availStatus !== 'idle' && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, marginTop: -8,
                            background: availStatus === 'available' ? 'rgba(16,185,129,0.08)' : availStatus === 'conflict' ? 'rgba(239,68,68,0.07)' : 'rgba(139,92,246,0.05)',
                            border: `1.5px solid ${availStatus === 'available' ? 'rgba(16,185,129,0.3)' : availStatus === 'conflict' ? 'rgba(239,68,68,0.25)' : C.borderLight}`,
                          }}
                        >
                          {availStatus === 'checking' && <><Loader2 size={16} color={C.gold} style={{ flexShrink: 0, marginTop: 1, animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: 13, color: C.textBrown, fontWeight: 600 }}>Verificando disponibilidad…</span></>}
                          {availStatus === 'available' && <><CheckCircle size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} /><span style={{ fontSize: 13, color: '#065F46', fontWeight: 600 }}>Profesional disponible en ese horario</span></>}
                          {availStatus === 'conflict' && (
                            <><XCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                              <div>
                                {conflictInfo ? (
                                  <>
                                    <p style={{ fontSize: 13, color: '#991B1B', fontWeight: 700, margin: '0 0 2px' }}>Conflicto de horario</p>
                                    <p style={{ fontSize: 12, color: '#7F1D1D', margin: 0, lineHeight: 1.5 }}>
                                      Ya tiene <strong>{conflictInfo.title}</strong> de{' '}
                                      {new Date(conflictInfo.scheduledAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} a{' '}
                                      {new Date(conflictInfo.endsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p style={{ fontSize: 13, color: '#991B1B', fontWeight: 700, margin: '0 0 4px' }}>Profesional no disponible</p>
                                    <p style={{ fontSize: 12, color: '#7F1D1D', margin: '0 0 6px', lineHeight: 1.5 }}>
                                      Es <strong>independiente</strong> y ese horario no está en su agenda.
                                    </p>
                                    {profSchedule.length > 0 && (
                                      <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 8, padding: '8px 10px' }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                          Horario registrado:
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                          {profSchedule.map((s, idx) => (
                                            <p key={idx} style={{ fontSize: 12, color: '#7F1D1D', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                              <span style={{ fontWeight: 700, minWidth: 80 }}>{DIA_DISPLAY[s.day] ?? s.day}</span>
                                              <span>{s.startTime?.slice(0,5)} – {s.endTime?.slice(0,5)}</span>
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {profSchedule.length === 0 && (
                                      <p style={{ fontSize: 11, color: '#991B1B', margin: 0, fontStyle: 'italic' }}>
                                        No tiene ningún horario registrado aún.
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── PASO 3: HORARIO Y TARIFA ── */}
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, color: C.gold, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: FONT_SANS }}>3</span>
              Horario y Tarifa
            </h3>

            {/* DAYS OF WEEK */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 12 }}>
                <CalendarIcon size={14} color={C.gold} /> Días de la semana
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DIAS_ORDEN.map(dia => {
                  const sel = diasSemana.includes(dia);
                  return (
                    <motion.button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      whileTap={{ scale: 0.93 }}
                      title={DIA_NOMBRES[dia]}
                      style={{
                        width: 48, height: 52, borderRadius: 12,
                        border: `2px solid ${sel ? C.gold : C.borderLight}`,
                        background: sel ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : C.white,
                        color: sel ? C.white : C.textMuted,
                        fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                        transition: 'all 0.18s', boxShadow: sel ? `0 4px 12px rgba(139,92,246,0.25)` : 'none',
                        fontFamily: FONT_SANS,
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{DIA_LABELS[dia]}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{DIA_NOMBRES[dia].slice(0, 3)}</span>
                    </motion.button>
                  );
                })}
              </div>
              {(errors as any).diasSemana && (
                <span style={{ color: C.red, fontSize: 11, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                  <AlertTriangle size={12} /> {(errors as any).diasSemana.message}
                </span>
              )}
              {/* Hidden register for array */}
              <input type="hidden" {...register('diasSemana')} />
            </div>

            {/* DATE RANGE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <InputField label="Válido desde" icon={CalendarIcon} error={errors.fechaDesde}>
                <input type="date" {...register('fechaDesde')} style={activeInputStyle(!!errors.fechaDesde)} />
              </InputField>
              <InputField label="Válido hasta" icon={CalendarIcon} error={errors.fechaHasta}>
                <input type="date" {...register('fechaHasta')} min={fechaDesde} style={activeInputStyle(!!errors.fechaHasta)} />
              </InputField>
            </div>

            {/* TIME RANGE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <InputField label="Hora de inicio" icon={Clock} error={errors.horaInicio}>
                <input type="time" {...register('horaInicio')} style={activeInputStyle(!!errors.horaInicio)} />
              </InputField>
              <InputField label="Hora de fin" icon={Clock} error={errors.horaFin}>
                <input type="time" {...register('horaFin')} style={activeInputStyle(!!errors.horaFin)} />
              </InputField>
            </div>

            {/* Occurrences preview */}
            <AnimatePresence>
              {diasSemana.length > 0 && fechaDesde && fechaHasta && horaInicio && horaFin && occurrenceCount > 0 && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(139,92,246,0.06)', border: `1.5px solid rgba(139,92,246,0.15)`, marginBottom: 20 }}
                >
                  <CalendarIcon size={16} color={C.gold} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>
                      {occurrenceCount} sesión{occurrenceCount !== 1 ? 'es' : ''} programada{occurrenceCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>
                      {diasSemana.map(d => DIA_NOMBRES[d]).join(', ')} · {horaInicio} – {horaFin}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PRICE */}
            <InputField label="Precio por sesión (COP)" icon={DollarSign} error={errors.precio}>
              <input type="number" {...register('precio', { setValueAs: (v) => v === '' ? 0 : Number(v) })} style={activeInputStyle(!!errors.precio)} placeholder="0 para gratuito" />
            </InputField>
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
            <button type="button" onClick={onCancel} disabled={isSubmitting}
              style={{ flex: 1, padding: '14px 24px', background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, color: C.textMedium, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_SANS }}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || availStatus === 'conflict'}
              style={{
                flex: 2, padding: '14px 24px',
                background: availStatus === 'conflict' ? '#DC2626' : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                color: C.white, border: 'none', borderRadius: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: (isSubmitting || availStatus === 'conflict') ? 'not-allowed' : 'pointer',
                boxShadow: availStatus === 'conflict' ? 'none' : `0 8px 24px rgba(139,92,246,0.15)`,
                fontFamily: FONT_SANS, opacity: (isSubmitting || availStatus === 'conflict') ? 0.8 : 1,
                transition: 'all 0.2s',
              }}
            >
              {isSubmitting ? <>Guardando…</>
                : availStatus === 'conflict' ? <><XCircle size={18} /> Conflicto de horario</>
                : <><CheckCircle size={18} /> {occurrenceCount > 1 ? `Crear ${occurrenceCount} sesiones` : 'Guardar Servicio'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
