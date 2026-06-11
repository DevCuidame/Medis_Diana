import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { Control, UseFormRegister, UseFormWatch, FieldErrors, UseFieldArrayReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { SedeFormValues } from '../../lib/schemas/sedeSchema';
import { sedeSchema } from '../../lib/schemas/sedeSchema';
import { Save, ArrowLeft, Clock, MapPin, Building, Copy, Phone, Mail, Plus, Trash2 } from 'lucide-react';

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

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
] as const;

type DayKey = typeof DAYS[number]['key'];
type BlockFieldArray = UseFieldArrayReturn<SedeFormValues, 'operatingHours.monday.blocks', 'id'>;

interface DayScheduleRowProps {
  dayKey: DayKey;
  label: string;
  register: UseFormRegister<SedeFormValues>;
  watch: UseFormWatch<SedeFormValues>;
  errors: FieldErrors<SedeFormValues>;
  fieldArray: BlockFieldArray;
}

const DayScheduleRow: React.FC<DayScheduleRowProps> = ({ dayKey, label, register, watch, errors, fieldArray }) => {
  const { fields, append, remove } = fieldArray;
  const isOpen = watch(`operatingHours.${dayKey}.isOpen`);
  const dayErrors = (errors.operatingHours as any)?.[dayKey];
  const blocksRootError = dayErrors?.blocks?.root?.message ?? (typeof dayErrors?.blocks?.message === 'string' ? dayErrors.blocks.message : undefined);

  const handleToggleOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    register(`operatingHours.${dayKey}.isOpen`).onChange(e);
    if (e.target.checked && fields.length === 0) {
      append({ openTime: '08:00', closeTime: '21:00' });
    }
  };

  return (
    <div style={{ padding: '16px', borderRadius: 12, border: `1px solid ${C.borderLight}`, background: C.bg, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 130 }}>
          <input
            type="checkbox"
            {...register(`operatingHours.${dayKey}.isOpen`)}
            onChange={handleToggleOpen}
            style={{ width: 16, height: 16, accentColor: C.goldLight, cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 600, color: isOpen ? C.text : C.textMuted }}>{label}</span>
        </div>

        {isOpen ? (
          <button
            type="button"
            onClick={() => append({ openTime: '15:00', closeTime: '20:00' })}
            style={{ background: 'none', border: `1px dashed ${C.border}`, borderRadius: 8, color: C.goldLight, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px' }}
          >
            <Plus size={13} /> Agregar bloque
          </button>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', background: C.bgSecondary, padding: '4px 12px', borderRadius: 20 }}>Cerrado</span>
        )}
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 28 }}>
          {fields.map((field, idx) => {
            const blockError = dayErrors?.blocks?.[idx];
            return (
              <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <input
                    type="time"
                    {...register(`operatingHours.${dayKey}.blocks.${idx}.openTime`)}
                    style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text, outline: 'none' }}
                  />
                  <span style={{ color: C.textMuted, fontSize: 13 }}>hasta</span>
                  <input
                    type="time"
                    {...register(`operatingHours.${dayKey}.blocks.${idx}.closeTime`)}
                    style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text, outline: 'none' }}
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      title="Eliminar bloque"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {blockError?.closeTime?.message && <p style={{ color: '#ef4444', fontSize: 11, margin: 0 }}>{blockError.closeTime.message}</p>}
              </div>
            );
          })}
          {blocksRootError && <p style={{ color: '#ef4444', fontSize: 11, margin: 0 }}>{blocksRootError}</p>}
        </div>
      )}
    </div>
  );
};

interface FormularioSedeProps {
  initialData?: SedeFormValues;
  onCancel: () => void;
  onSuccess: (data: SedeFormValues) => void;
}

export const FormularioSede: React.FC<FormularioSedeProps> = ({ initialData, onCancel, onSuccess }) => {

  const { register, handleSubmit, watch, setValue, getValues, control, formState: { errors, isSubmitting } } = useForm<SedeFormValues>({
    resolver: zodResolver(sedeSchema),
    defaultValues: initialData || {
      name: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      isActive: true,
      operatingHours: {
        monday: { isOpen: true, blocks: [{ openTime: '08:00', closeTime: '21:00' }] },
        tuesday: { isOpen: true, blocks: [{ openTime: '08:00', closeTime: '21:00' }] },
        wednesday: { isOpen: true, blocks: [{ openTime: '08:00', closeTime: '21:00' }] },
        thursday: { isOpen: true, blocks: [{ openTime: '08:00', closeTime: '21:00' }] },
        friday: { isOpen: true, blocks: [{ openTime: '08:00', closeTime: '21:00' }] },
        saturday: { isOpen: true, blocks: [{ openTime: '09:00', closeTime: '14:00' }] },
        sunday: { isOpen: false, blocks: [] }
      }
    }
  });

  const mondayBlocks = useFieldArray({ control, name: 'operatingHours.monday.blocks' });
  const tuesdayBlocks = useFieldArray({ control, name: 'operatingHours.tuesday.blocks' });
  const wednesdayBlocks = useFieldArray({ control, name: 'operatingHours.wednesday.blocks' });
  const thursdayBlocks = useFieldArray({ control, name: 'operatingHours.thursday.blocks' });
  const fridayBlocks = useFieldArray({ control, name: 'operatingHours.friday.blocks' });
  const saturdayBlocks = useFieldArray({ control, name: 'operatingHours.saturday.blocks' });
  const sundayBlocks = useFieldArray({ control, name: 'operatingHours.sunday.blocks' });

  const blocksByDay: Record<DayKey, BlockFieldArray> = {
    monday: mondayBlocks,
    tuesday: tuesdayBlocks,
    wednesday: wednesdayBlocks,
    thursday: thursdayBlocks,
    friday: fridayBlocks,
    saturday: saturdayBlocks,
    sunday: sundayBlocks,
  };

  const onSubmit = async (data: SedeFormValues) => {
    // Aquí iría el POST real a /api/locations
    await new Promise(r => setTimeout(r, 800)); // Simulando latencia
    onSuccess(data);
  };

  const applyMondayToAll = () => {
    const monday = getValues('operatingHours.monday');
    DAYS.forEach(day => {
      if (day.key === 'monday') return;
      setValue(`operatingHours.${day.key}.isOpen`, monday.isOpen, { shouldValidate: true });
      blocksByDay[day.key].replace(monday.blocks.map(b => ({ ...b })));
    });
  };

  return (
    <div style={{ fontFamily: FONT_INTER }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.borderLight}` }}>
        <div>
          <h2 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>{initialData ? 'Editar Sede' : 'Nueva Sede'}</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: '4px 0 0 0' }}>Configura los detalles y horarios de operación</p>
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
            <Building size={18} color={C.goldLight} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textBrown, margin: 0 }}>Información General</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Nombre de la Sede</label>
              <input
                {...register('name')}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 14, color: C.text, outline: 'none' }}
                placeholder="Ej. Estudio Principal Norte"
              />
              {errors.name && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.name.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Ciudad</label>
              <input
                {...register('city')}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 14, color: C.text, outline: 'none' }}
                placeholder="Ej. Bogotá"
              />
              {errors.city && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.city.message}</p>}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Dirección Completa</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  {...register('address')}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                  placeholder="Calle 123 #45-67"
                />
              </div>
              {errors.address && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.address.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Teléfono</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  {...register('phone')}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                  placeholder="+57 300 000 0000"
                />
              </div>
              {errors.phone && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.phone.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  {...register('email')}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                  placeholder="contacto@sede.com"
                />
              </div>
              {errors.email && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.email.message}</p>}
            </div>
          </div>
        </section>

        {/* HORARIOS */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color={C.goldLight} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textBrown, margin: 0 }}>Horarios de Operación</h3>
            </div>
            <button
              type="button"
              onClick={applyMondayToAll}
              style={{ background: 'none', border: 'none', color: C.goldLight, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Copy size={14} /> Aplicar Lunes a todos
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DAYS.map((day) => (
              <DayScheduleRow
                key={day.key}
                dayKey={day.key}
                label={day.label}
                register={register}
                watch={watch}
                errors={errors}
                fieldArray={blocksByDay[day.key]}
              />
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
