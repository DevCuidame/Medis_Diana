import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft, Building2, Users, FileText, Package, Plus, Trash2 } from 'lucide-react';

import type { EspacioFormValues } from '../../lib/schemas/espacioSchema';
import { espacioSchema } from '../../lib/schemas/espacioSchema';

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

interface FormularioEspacioProps {
  initialData?: EspacioFormValues;
  onCancel: () => void;
  onSuccess: (data: EspacioFormValues) => void;
  availableSedes: { id: string; name: string }[];
}

export const FormularioEspacio: React.FC<FormularioEspacioProps> = ({ initialData, onCancel, onSuccess, availableSedes }) => {

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<EspacioFormValues>({
    resolver: zodResolver(espacioSchema),
    defaultValues: initialData || {
      locationId: '',
      name: '',
      capacity: 12,
      description: '',
      isActive: true,
      resources: [{ name: '', qty: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'resources'
  });

  const onSubmit = async (data: EspacioFormValues) => {
    await new Promise(r => setTimeout(r, 800)); // Simulando latencia
    onSuccess(data);
  };

  return (
    <div style={{ fontFamily: FONT_INTER }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.borderLight}` }}>
        <div>
          <h2 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>{initialData ? 'Editar Espacio' : 'Nuevo Espacio'}</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: '4px 0 0 0' }}>Configura los detalles y el equipamiento del salón</p>
        </div>
        <button 
          onClick={onCancel}
          style={{ background: 'none', border: 'none', color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        {/* INFO GENERAL */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.borderLight}` }}>
            <Building2 size={18} color={C.goldLight} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textBrown, margin: 0 }}>Información General</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Sede</label>
              <select 
                {...register('locationId')}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 14, color: C.text, outline: 'none' }}
              >
                <option value="">Selecciona una sede...</option>
                {availableSedes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.locationId && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.locationId.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Nombre del Espacio</label>
              <input 
                {...register('name')}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 14, color: C.text, outline: 'none' }}
                placeholder="Ej. Sala Aérea 1"
              />
              {errors.name && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.name.message}</p>}
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Capacidad Máxima</label>
              <div style={{ position: 'relative' }}>
                <Users size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="number"
                  {...register('capacity', { valueAsNumber: true })}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                  placeholder="Ej. 12"
                />
              </div>
              {errors.capacity && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.capacity.message}</p>}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Descripción (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: 16 }} />
                <textarea 
                  {...register('description')}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none', minHeight: 80, resize: 'vertical' }}
                  placeholder="Ej. Salón principal equipado con barras de latón de 45mm, piso de madera..."
                />
              </div>
              {errors.description && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.description.message}</p>}
            </div>
          </div>
        </section>

        {/* RECURSOS / EQUIPAMIENTO */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} color={C.goldLight} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textBrown, margin: 0 }}>Equipamiento / Recursos</h3>
            </div>
            <button 
              type="button" 
              onClick={() => append({ name: '', qty: 1 })}
              style={{ background: 'none', border: 'none', color: C.goldLight, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Plus size={14} /> Añadir Recurso
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fields.length === 0 && (
              <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', padding: '16px 0' }}>No hay recursos añadidos a este salón.</p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <input 
                    {...register(`resources.${index}.name`)}
                    placeholder="Ej. Barra 45mm Latón"
                    style={{ width: '100%', boxSizing: 'border-box', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px', fontSize: 13, color: C.text, outline: 'none' }}
                  />
                  {errors.resources?.[index]?.name && <p style={{ color: '#ef4444', fontSize: 10, margin: '4px 0 0 0' }}>{errors.resources[index]?.name?.message}</p>}
                </div>
                <div style={{ width: 100 }}>
                  <input 
                    type="number"
                    {...register(`resources.${index}.qty`, { valueAsNumber: true })}
                    placeholder="Cant."
                    style={{ width: '100%', boxSizing: 'border-box', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px', fontSize: 13, color: C.text, outline: 'none' }}
                  />
                  {errors.resources?.[index]?.qty && <p style={{ color: '#ef4444', fontSize: 10, margin: '4px 0 0 0' }}>{errors.resources[index]?.qty?.message}</p>}
                </div>
                <button 
                  type="button"
                  onClick={() => remove(index)}
                  style={{ width: 40, height: 40, flexShrink: 0, background: '#fef2f2', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ACCIONES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', padding: '12px 32px', borderRadius: 12, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 16px rgba(139,92,246,0.28)`, opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? (
              <span>Guardando...</span>
            ) : (
              <>
                <Save size={18} />
                {initialData ? 'Guardar Cambios' : 'Confirmar y Crear'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
