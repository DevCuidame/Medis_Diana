import React, { useEffect, useState, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, MapPin, Box, Tag, Users, Clock, DollarSign,
  AlertTriangle, FileText, Image as ImageIcon, CheckCircle,
  Loader2, XCircle, FileWarning, X, Plus } from 'lucide-react';
import type { ServicioFormValues } from './servicioSchema';
import {
  servicioSchema, RIPS_GRUPO_SERVICIO, RIPS_MODALIDAD, tipoAtencionEnum
} from './servicioSchema';

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bg: '#FFFFFF', bgPanel: '#F3F0FB', bgSecondary: '#F3F0FB',
  white: '#FFFFFF', text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
  red: '#EF4444', redLight: '#FEE2E2', green: '#10B981',
  success: '#16A34A',
};

const FONT_SERIF = '"Bodoni Moda", Georgia, serif';
const FONT_SANS  = '"Hanken Grotesk", Inter, system-ui, sans-serif';

const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent';

const InputField = ({ label, icon: Icon, error, children, required }: any) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 8 }}>
      {Icon && <Icon size={14} color={C.gold} />} {label} {required && <span style={{ color: C.red }}>*</span>}
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
  onSuccess: (data: ServicioFormValues) => void;
  onCancel: () => void;
}

export const FormularioServicio: React.FC<Props> = ({ initialData, onSuccess, onCancel }) => {
  const [sedes, setSedes]             = useState<{ id: string; name: string }[]>([]);
  const [espacios, setEspacios]       = useState<{ id: string; name: string; capacity: number; locationId: string }[]>([]);
  const [instructores, setInstructores] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customMod, setCustomMod] = useState('');
  
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<ServicioFormValues>({
    resolver: zodResolver(servicioSchema) as any,
    defaultValues: initialData || {
      categoryGroup: '01 Consulta externa',
      basePrice: 0,
      modality: [],
      isActive: true,
      durationMinutes: 30,
    },
  });

  const locationId     = useWatch({ control, name: 'locationId' });
  const categoryGroup  = useWatch({ control, name: 'categoryGroup' });
  const subcategoryGroup = useWatch({ control, name: 'subcategoryGroup' });
  const category       = useWatch({ control, name: 'category' });
  const subcategory    = useWatch({ control, name: 'subcategory' });
  const modality       = useWatch({ control, name: 'modality' }) ?? [];
  const isActive       = useWatch({ control, name: 'isActive' });

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
  }, []);

  // 2. Restore locationId
  useEffect(() => {
    if (sedes.length > 0 && initialData?.locationId) {
      setValue('locationId', initialData.locationId, { shouldValidate: false });
    }
  }, [sedes, initialData?.locationId, setValue]);

  // 3. Restore instructorId
  useEffect(() => {
    if (instructores.length > 0 && initialData?.instructorId) {
      setValue('instructorId', initialData.instructorId, { shouldValidate: false });
    }
  }, [instructores, initialData?.instructorId, setValue]);

  // 4. Load rooms
  useEffect(() => {
    if (!locationId) { setEspacios([]); return; }
    fetch(`/api/rooms?locationId=${locationId}`).then(r => r.json()).then(j => {
      if (j.success) setEspacios(j.data.rooms);
    }).catch(() => {});
  }, [locationId]);

  // 5. Restore roomId
  useEffect(() => {
    if (espacios.length > 0 && initialData?.roomId) {
      if (espacios.some(r => r.id === initialData.roomId)) {
        setValue('roomId', initialData.roomId, { shouldValidate: false });
      }
    }
  }, [espacios, initialData?.roomId, setValue]);

  // 6. Auto-calculate CUPS
  const isMounted = React.useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      if (initialData?.serviceCode) return;
    }
    if (categoryGroup) {
      const code = `${categoryGroup.substring(0, 2)}${subcategoryGroup ? subcategoryGroup.substring(0, 2) : ''}${category ? category.substring(0, 2) : ''}${subcategory ? subcategory.substring(0, 2) : ''}`.toUpperCase().replace(/\s/g, '');
      setValue('serviceCode', code, { shouldValidate: true });
    }
  }, [categoryGroup, subcategoryGroup, category, subcategory, setValue]);

  const isGroup345 = categoryGroup && ['03', '04', '05'].some(prefix => categoryGroup.startsWith(prefix));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setValue('imageUrl', result); // Using imageUrl to store base64 as requested
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setValue('imageUrl', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const inputStyle = `w-full p-3 rounded-xl border border-[${C.borderLight}] bg-[${C.bgPanel}] text-[14px] text-[${C.text}] transition-all duration-200 ${FOCUS_RING}`;
  const inlineInputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.borderLight}`,
    background: C.bgPanel, fontSize: 14, color: C.text, outline: 'none', transition: 'all 0.2s', fontFamily: FONT_SANS
  };

  return (
    <div style={{ background: C.white, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.08)', padding: '40px', maxWidth: 900, margin: '0 auto', fontFamily: FONT_SANS }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 700, color: C.gold, margin: '0 0 8px' }}>
            {initialData ? 'Editar Servicio' : 'Configura un Nuevo Servicio'}
          </h2>
          <p style={{ margin: 0, color: C.textBrown, fontSize: 15 }}>
            Completa los siguientes datos para crear un nuevo registro en el catálogo de servicios.
          </p>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: C.textMuted }}>
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {/* Paso 1: Ubicación y Salón */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.goldLight, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</div>
            <h3 style={{ margin: 0, fontSize: 18, color: C.text }}>Ubicación y Salón</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingLeft: 44 }}>
            <InputField label="Sede" required icon={Building2} error={errors.locationId}>
              <select {...register('locationId')} style={inlineInputStyle} className={FOCUS_RING}>
                <option value="">Selecciona una sede...</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </InputField>
            <InputField label="Espacio" icon={MapPin} error={errors.roomId}>
              <select {...register('roomId')} style={inlineInputStyle} disabled={!locationId} className={FOCUS_RING}>
                <option value="">{locationId ? 'Selecciona un espacio...' : 'Primero elige una sede'}</option>
                {espacios.map(e => <option key={e.id} value={e.id}>{e.name} (Cap: {e.capacity})</option>)}
              </select>
            </InputField>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: `1px solid ${C.borderLight}`, margin: '0 0 40px' }} />

        {/* Paso 2: Identificación del Servicio */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.goldLight, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</div>
            <h3 style={{ margin: 0, fontSize: 18, color: C.text }}>Identificación del Servicio</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingLeft: 44 }}>
            <InputField label="Consecutivo del servicio" icon={Box}>
              <input readOnly value="Se asigna al guardar" style={{ ...inlineInputStyle, background: '#F1F5F9', color: C.textMuted, cursor: 'not-allowed' }} />
            </InputField>
            <InputField label="Nombre del servicio" required icon={Tag} error={errors.serviceName}>
              <input {...register('serviceName')} placeholder="Ej. Consulta de Medicina Bioreguladora" style={inlineInputStyle} className={FOCUS_RING} />
            </InputField>
            <div style={{ gridColumn: '1 / -1' }}>
              <InputField label="Descripción del servicio" icon={FileText} error={errors.description}>
                <textarea {...register('description')} placeholder="Describe brevemente en qué consiste el servicio..." style={{ ...inlineInputStyle, minHeight: 80, resize: 'vertical' }} className={FOCUS_RING} />
              </InputField>
            </div>
            <InputField label="Categoría principal" icon={Tag} error={errors.tipoAtencion}>
              <select {...register('tipoAtencion')} style={inlineInputStyle} className={FOCUS_RING}>
                <option value="">Selecciona tipo...</option>
                {tipoAtencionEnum.options.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </InputField>
            <InputField label="Profesional a cargo" icon={Users} error={errors.instructorId}>
              <select {...register('instructorId')} style={inlineInputStyle} className={FOCUS_RING}>
                <option value="">Sin asignar (Opcional)...</option>
                {instructores.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </InputField>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: `1px solid ${C.borderLight}`, margin: '0 0 40px' }} />

        {/* Paso 3: Clasificación (habilitación) */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.goldLight, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</div>
            <h3 style={{ margin: 0, fontSize: 18, color: C.text }}>Clasificación (habilitación)</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingLeft: 44 }}>
            <InputField label="Grupo de servicio" required icon={Box} error={errors.categoryGroup}>
              <select {...register('categoryGroup')} style={inlineInputStyle} className={FOCUS_RING}>
                <option value="">Selecciona el grupo...</option>
                {RIPS_GRUPO_SERVICIO.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </InputField>
            <InputField label="Subgrupo" icon={Box} error={errors.subcategoryGroup}>
              <input {...register('subcategoryGroup')} placeholder="Elige un subgrupo" disabled={isGroup345} style={{ ...inlineInputStyle, background: isGroup345 ? '#F1F5F9' : C.bgPanel }} className={FOCUS_RING} />
            </InputField>
            <InputField label="Categoría" icon={Tag} error={errors.category}>
              <input {...register('category')} placeholder="Elige una categoría" disabled={isGroup345} style={{ ...inlineInputStyle, background: isGroup345 ? '#F1F5F9' : C.bgPanel }} className={FOCUS_RING} />
            </InputField>
            <InputField label="Subcategoría" icon={Tag} error={errors.subcategory}>
              <input {...register('subcategory')} placeholder="Elige una subcategoría" disabled={isGroup345} style={{ ...inlineInputStyle, background: isGroup345 ? '#F1F5F9' : C.bgPanel }} className={FOCUS_RING} />
            </InputField>
            <InputField label="Código CUPS" required icon={Box} error={errors.serviceCode}>
              <input {...register('serviceCode')} placeholder="Ej. 890201" style={inlineInputStyle} className={FOCUS_RING} />
            </InputField>
            <div style={{ gridColumn: '1 / -1' }}>
              <InputField label="Modalidad de servicio" required icon={Users} error={errors.modality}>
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
                  <input type="text" placeholder="Agregar otra modalidad..." value={customMod} onChange={e => setCustomMod(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomModality(); } }} style={inlineInputStyle} className={FOCUS_RING} />
                  <button type="button" onClick={addCustomModality} style={{ padding: '0 16px', borderRadius: 12, border: `1px solid ${C.gold}`, background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Plus size={18} />
                  </button>
                </div>
              </InputField>
            </div>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: `1px solid ${C.borderLight}`, margin: '0 0 40px' }} />

        {/* Paso 4: Condiciones */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.goldLight, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>4</div>
            <h3 style={{ margin: 0, fontSize: 18, color: C.text }}>Condiciones</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingLeft: 44 }}>
            <InputField label="Duración del servicio (minutos)" required icon={Clock} error={errors.durationMinutes}>
              <input type="number" {...register('durationMinutes', { valueAsNumber: true })} placeholder="Ej. 30" style={inlineInputStyle} min={5} step={5} className={FOCUS_RING} />
            </InputField>
            <InputField label="Precio por sesión (COP)" required icon={DollarSign} error={errors.basePrice}>
              <input type="number" {...register('basePrice', { valueAsNumber: true })} placeholder="0 para gratuito" style={inlineInputStyle} min={0} className={FOCUS_RING} />
            </InputField>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: C.bgPanel, borderRadius: 12, border: `1px solid ${C.borderLight}` }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text, display: 'block' }}>Estado del servicio</span>
                <span style={{ fontSize: 12, color: C.textMuted }}>{isActive ? 'El servicio estará visible y disponible.' : 'El servicio estará oculto.'}</span>
              </div>
              <button
                type="button"
                onClick={() => setValue('isActive', !isActive)}
                style={{
                  width: 50, height: 26, borderRadius: 13,
                  background: isActive ? C.success : '#CBD5E1',
                  position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s'
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: isActive ? 26 : 2, width: 22, height: 22,
                  background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }} />
              </button>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <InputField label="Imagen del servicio" icon={ImageIcon}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {imagePreview ? (
                    <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.borderLight}` }}>
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={removeImage} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: 12, border: `1px dashed ${C.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgPanel }}>
                      <ImageIcon size={24} color={C.textMuted} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.gold}`, background: 'transparent', color: C.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Subir Imagen
                    </button>
                    <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>JPG, PNG o GIF (Máx. 5MB)</p>
                  </div>
                </div>
              </InputField>
            </div>

            <InputField label="Instrucciones" icon={FileText} error={errors.preparationInstructions}>
              <textarea {...register('preparationInstructions')} placeholder="Indicaciones previas para el paciente..." style={{ ...inlineInputStyle, minHeight: 60 }} className={FOCUS_RING} />
            </InputField>
            <InputField label="Restricciones" icon={AlertTriangle} error={errors.genderRestriction}>
              <textarea {...register('genderRestriction')} placeholder="Restricciones aplicables..." style={{ ...inlineInputStyle, minHeight: 60 }} className={FOCUS_RING} />
            </InputField>
            <InputField label="Riesgos" icon={FileWarning} error={errors.risks}>
              <textarea {...register('risks')} placeholder="Riesgos asociados al procedimiento..." style={{ ...inlineInputStyle, minHeight: 60 }} className={FOCUS_RING} />
            </InputField>
            <InputField label="Contraindicaciones" icon={XCircle} error={errors.contraindications}>
              <textarea {...register('contraindications')} placeholder="Contraindicaciones del servicio..." style={{ ...inlineInputStyle, minHeight: 60 }} className={FOCUS_RING} />
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
