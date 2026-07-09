import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, MapPin, Box, Tag, Users, Clock, DollarSign,
  Calendar as CalendarIcon, AlertTriangle, FileText, Image as ImageIcon,
  Loader2, XCircle, FileWarning, CheckCircle, X, Plus } from 'lucide-react';
import type { ServicioFormValues } from './servicioSchema';
import {
  servicioSchema, RIPS_GRUPO_SERVICIO, RIPS_MODALIDAD, tipoAtencionEnum,
  DIA_LABELS, DIA_NOMBRES, DIAS_ORDEN
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

const InputField = ({ label, icon: Icon, error, children }: any) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 8 }}>
      {Icon && <Icon size={14} color={C.gold} />} {label}
    </div>
    {children}
    {error && (
      <span style={{ color: C.red, fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
        <AlertTriangle size={12} /> {error.message}
      </span>
    )}
  </div>
);

interface Props {
  initialData?: Partial<ServicioFormValues>;
  editingOfferId?: string;
  minCapacity?: number;
  onSuccess: (data: ServicioFormValues) => void;
  onCancel: () => void;
}

export const FormularioServicio: React.FC<Props> = ({ initialData, minCapacity = 1, onSuccess, onCancel }) => {
  const [sedes, setSedes]             = useState<{ id: string; name: string }[]>([]);
  const [espacios, setEspacios]       = useState<{ id: string; name: string; capacity: number; locationId: string }[]>([]);
  const [instructores, setInstructores] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customMod, setCustomMod] = useState('');

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const fourWeeksStr = () => {
    const d = new Date(); d.setDate(d.getDate() + 28);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const { register, handleSubmit, control, formState: { errors }, setValue, watch, setError } = useForm<ServicioFormValues>({
    resolver: zodResolver(servicioSchema) as any,
    defaultValues: initialData || {
      categoryGroup: '01 Consulta externa',
      basePrice: 0,
      diasSemana: [],
      fechaDesde: todayStr(),
      fechaHasta: fourWeeksStr(),
      modality: [],
      isActive: true,
    },
  });

  const locationId     = useWatch({ control, name: 'locationId' });
  const categoryGroup  = useWatch({ control, name: 'categoryGroup' });
  const subcategoryGroup = useWatch({ control, name: 'subcategoryGroup' });
  const category       = useWatch({ control, name: 'category' });
  const subcategory    = useWatch({ control, name: 'subcategory' });
  const diasSemana     = useWatch({ control, name: 'diasSemana' }) ?? [];
  const modality       = useWatch({ control, name: 'modality' }) ?? [];

  // 1. Load sedes and instructores
  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(j => {
      if (j.success) setSedes(j.data.locations);
    }).catch(() => {});

    fetch('/api/professionals').then(r => r.json()).then(j => {
      if (j.success && j.data.professionals) {
        setInstructores(j.data.professionals.map((p: any) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` })));
      }
    }).catch(() => {});
  }, []); // load once on mount

  // 2. Once sedes are loaded, restore locationId — fires AFTER React renders new <option> elements
  useEffect(() => {
    if (sedes.length > 0 && initialData?.locationId) {
      setValue('locationId', initialData.locationId, { shouldValidate: false });
    }
  }, [sedes, initialData?.locationId, setValue]);

  // 3. Once instructores are loaded, restore instructorId
  useEffect(() => {
    if (instructores.length > 0 && initialData?.instructorId) {
      setValue('instructorId', initialData.instructorId, { shouldValidate: false });
    }
  }, [instructores, initialData?.instructorId, setValue]);

  // 4. Load rooms when sede changes
  useEffect(() => {
    if (!locationId) { setEspacios([]); return; }
    fetch(`/api/rooms?locationId=${locationId}`).then(r => r.json()).then(j => {
      if (j.success) setEspacios(j.data.rooms);
    }).catch(() => {});
  }, [locationId]);

  // 5. Once rooms are loaded, restore roomId
  useEffect(() => {
    if (espacios.length > 0 && initialData?.roomId) {
      if (espacios.some(r => r.id === initialData.roomId)) {
        setValue('roomId', initialData.roomId, { shouldValidate: false });
      }
    }
  }, [espacios, initialData?.roomId, setValue]);

  // 6. Auto-calculate CUPS — but only when user changes the hierarchy fields manually
  //    Skip on mount if serviceCode is already set from initialData
  const isMounted = React.useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      // On first render, if editing and serviceCode exists, don't overwrite
      isMounted.current = true;
      if (initialData?.serviceCode) return;
    }
    if (categoryGroup) {
      const code = `${categoryGroup.substring(0, 2)}${subcategoryGroup ? subcategoryGroup.substring(0, 2) : ''}${category ? category.substring(0, 2) : ''}${subcategory ? subcategory.substring(0, 2) : ''}`.toUpperCase().replace(/\s/g, '');
      setValue('serviceCode', code, { shouldValidate: true });
    }
  }, [categoryGroup, subcategoryGroup, category, subcategory, setValue]);

  const isGroup345 = categoryGroup && ['03', '04', '05'].some(prefix => categoryGroup.startsWith(prefix));

  const handleFormSubmit = async (data: ServicioFormValues) => {
    setIsSubmitting(true);
    try {
      const cleaned: any = { ...data };
      const room = espacios.find(e => e.id === data.roomId);
      if (room) cleaned.roomCapacity = room.capacity;
      await onSuccess(cleaned);
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
  };

  const toggleDia = (dia: string) => {
    const current = (watch('diasSemana') ?? []) as string[];
    const next = current.includes(dia) ? current.filter(d => d !== dia) : [...current, dia];
    setValue('diasSemana', next, { shouldValidate: true });
  };

  const toggleModality = (mod: any) => {
    const current = (watch('modality') ?? []) as any[];
    const next = current.includes(mod) ? current.filter(d => d !== mod) : [...current, mod];
    setValue('modality', next, { shouldValidate: true });
  };

  const addCustomModality = () => {
    const val = customMod.trim();
    if (!val) return;
    const current = (watch('modality') ?? []) as string[];
    if (!current.includes(val)) {
      setValue('modality', [...current, val], { shouldValidate: true });
    }
    setCustomMod('');
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.borderLight}`,
    background: C.bgPanel, fontSize: 14, color: C.text, outline: 'none', transition: 'all 0.2s', fontFamily: FONT_SANS
  };

  return (
    <div style={{ background: C.white, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.08)', padding: '40px', maxWidth: 900, margin: '0 auto', fontFamily: FONT_SANS }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 700, color: C.gold, margin: '0 0 8px' }}>
            {initialData ? 'Editar Servicio' : 'Catálogo de Servicios'}
          </h2>
          <p style={{ margin: 0, color: C.textBrown, fontSize: 15 }}>
            Configura una nueva consulta o servicio para la agenda de la clínica siguiendo el estándar RIPS.
          </p>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: C.textMuted }}>
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {/* Paso 1: Ubicación */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.goldLight, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</div>
            <h3 style={{ margin: 0, fontSize: 18, color: C.text }}>Ubicación y Salón</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingLeft: 44 }}>
            <InputField label="Sede Principal" icon={Building2} error={errors.locationId}>
              <select {...register('locationId')} style={inputStyle}>
                <option value="">Selecciona una sede...</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </InputField>
            <InputField label="Espacio / Salón" icon={MapPin} error={errors.roomId}>
              <select {...register('roomId')} style={inputStyle} disabled={!locationId}>
                <option value="">{locationId ? 'Selecciona un espacio...' : 'Primero elige una sede'}</option>
                {espacios.map(e => <option key={e.id} value={e.id}>{e.name} (Cap: {e.capacity})</option>)}
              </select>
            </InputField>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: `1px solid ${C.borderLight}`, margin: '0 0 40px' }} />

        {/* Paso 2: Configuración del Servicio (RIPS) */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.goldLight, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</div>
            <h3 style={{ margin: 0, fontSize: 18, color: C.text }}>Configuración del Servicio (RIPS)</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingLeft: 44 }}>
            <InputField label="Nombre del Servicio" icon={Tag} error={errors.serviceName}>
              <input {...register('serviceName')} placeholder="Ej. Consulta Médica General" style={inputStyle} />
            </InputField>
            <InputField label="CUPS Generado" icon={Box} error={errors.serviceCode}>
              <input {...register('serviceCode')} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: C.textMuted, cursor: 'not-allowed' }} placeholder="Autocalculado..." />
            </InputField>

            <div style={{ gridColumn: '1 / -1' }}>
              <InputField label="Descripción" icon={FileText} error={errors.description}>
                <textarea {...register('description')} placeholder="Descripción detallada del servicio..." style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
              </InputField>
            </div>

            <InputField label="Grupo de Servicio" icon={Box} error={errors.categoryGroup}>
              <select {...register('categoryGroup')} style={inputStyle}>
                {RIPS_GRUPO_SERVICIO.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </InputField>

            {!isGroup345 && (
              <>
                <InputField label="Subgrupo de Servicio" icon={Box} error={errors.subcategoryGroup}>
                  <input {...register('subcategoryGroup')} placeholder="Ej. Consulta especializada" style={inputStyle} />
                </InputField>
                <InputField label="Categoría" icon={Tag} error={errors.category}>
                  <input {...register('category')} placeholder="Ej. Cardiología" style={inputStyle} />
                </InputField>
                <InputField label="Subcategoría" icon={Tag} error={errors.subcategory}>
                  <input {...register('subcategory')} placeholder="Ej. Control adulto" style={inputStyle} />
                </InputField>
              </>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <InputField label="Modalidad de Servicio" icon={Users} error={errors.modality}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {RIPS_MODALIDAD.map(mod => {
                    const active = modality?.includes(mod as any);
                    return (
                      <button type="button" key={mod} onClick={() => toggleModality(mod)}
                        style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${active ? C.gold : C.borderLight}`, background: active ? 'rgba(139,92,246,0.1)' : C.bgPanel, color: active ? C.gold : C.textBrown, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {mod} {active && <X size={14} />}
                      </button>
                    )
                  })}
                  {modality?.filter((m: string) => !RIPS_MODALIDAD.includes(m as any)).map((custom: string) => (
                    <button type="button" key={custom} onClick={() => toggleModality(custom)}
                      style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${C.gold}`, background: 'rgba(139,92,246,0.1)', color: C.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {custom} <X size={14} />
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 400 }}>
                  <input type="text" placeholder="Agregar otra modalidad..." value={customMod} onChange={e => setCustomMod(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomModality(); } }} style={{ ...inputStyle, flex: 1 }} />
                  <button type="button" onClick={addCustomModality} style={{ padding: '0 16px', borderRadius: 12, border: `1px solid ${C.gold}`, background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Plus size={18} />
                  </button>
                </div>
              </InputField>
            </div>

            <InputField label="Tipo de Atención" icon={CheckCircle} error={errors.tipoAtencion}>
              <select {...register('tipoAtencion')} style={inputStyle}>
                <option value="">Selecciona tipo...</option>
                {tipoAtencionEnum.options.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </InputField>
            
            <InputField label="Médico Responsable" icon={Users} error={errors.instructorId}>
              <select {...register('instructorId')} style={inputStyle}>
                <option value="">Asignar profesional (Opcional)...</option>
                {instructores.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </InputField>

            <InputField label="Instrucciones de Preparación" icon={FileText} error={errors.preparationInstructions}>
              <textarea {...register('preparationInstructions')} placeholder="Ej. Ayuno de 8 horas..." style={{ ...inputStyle, minHeight: 60 }} />
            </InputField>

            <InputField label="Restricciones de Género/Edad" icon={AlertTriangle} error={errors.genderRestriction}>
              <textarea {...register('genderRestriction')} placeholder="Ej. Solo mujeres mayores de 18..." style={{ ...inputStyle, minHeight: 60 }} />
            </InputField>

            <InputField label="Riesgos" icon={FileWarning} error={errors.risks}>
              <textarea {...register('risks')} placeholder="Posibles riesgos del procedimiento..." style={{ ...inputStyle, minHeight: 60 }} />
            </InputField>

            <InputField label="Contraindicaciones" icon={XCircle} error={errors.contraindications}>
              <textarea {...register('contraindications')} placeholder="Ej. No apto para embarazadas..." style={{ ...inputStyle, minHeight: 60 }} />
            </InputField>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: `1px solid ${C.borderLight}`, margin: '0 0 40px' }} />

        {/* Paso 3: Duración */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.goldLight, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</div>
            <h3 style={{ margin: 0, fontSize: 18, color: C.text }}>Duración del Servicio</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingLeft: 44 }}>
            <InputField label="Duración del servicio (minutos)" icon={Clock} error={errors.durationMinutes}>
              <input type="number" {...register('durationMinutes', { valueAsNumber: true })} style={inputStyle} min={5} step={5} />
            </InputField>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 40, paddingLeft: 44 }}>
          <button type="button" onClick={onCancel} style={{ padding: '14px 24px', borderRadius: 12, border: `1px solid ${C.borderLight}`, background: C.white, color: C.textBrown, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 15, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 16px rgba(139,92,246,0.2)' }}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {initialData ? 'Actualizar Servicio' : 'Guardar Servicio'}
          </button>
        </div>
      </form>
    </div>
  );
};
