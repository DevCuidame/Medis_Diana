import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft, Receipt, DollarSign, Tag, Calendar } from 'lucide-react';

import type { GastoFormValues } from '../../lib/schemas/gastoSchema';
import { gastoSchema } from '../../lib/schemas/gastoSchema';

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  bg: '#FFFFFF',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textBrown: '#475569',
  textMuted: '#94A3B8',
  border: '#DDD6FE',
  borderLight: '#DDD6FE',
};

const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif';

interface FormularioGastoProps {
  initialData?: GastoFormValues;
  onCancel: () => void;
  onSuccess: (data: GastoFormValues) => void;
  categoriasSugeridas: string[];
}

export const FormularioGasto: React.FC<FormularioGastoProps> = ({ initialData, onCancel, onSuccess, categoriasSugeridas }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<GastoFormValues>({
    resolver: zodResolver(gastoSchema),
    defaultValues: initialData || {
      description: '',
      amount: 0,
      category: '',
      expenseDate: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (data: GastoFormValues) => {
    onSuccess(data);
  };

  return (
    <div style={{ fontFamily: FONT_INTER }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.borderLight}` }}>
        <div>
          <h2 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>{initialData ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: '4px 0 0 0' }}>Registra un gasto del consultorio</p>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.borderLight}` }}>
            <Receipt size={18} color={C.goldLight} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textBrown, margin: 0 }}>Detalle del gasto</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Descripción</label>
              <input
                {...register('description')}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 14, color: C.text, outline: 'none' }}
                placeholder="Ej. Pago de arriendo agosto"
              />
              {errors.description && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.description.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Monto (COP)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="number"
                  {...register('amount', { valueAsNumber: true })}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                  placeholder="0"
                  min={0}
                />
              </div>
              {errors.amount && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.amount.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Categoría</label>
              <div style={{ position: 'relative' }}>
                <Tag size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  {...register('category')}
                  list="gasto-categorias"
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                  placeholder="Ej. Arriendo"
                />
                <datalist id="gasto-categorias">
                  {categoriasSugeridas.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              {errors.category && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.category.message}</p>}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Fecha</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} color={C.textMuted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="date"
                  {...register('expenseDate')}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: C.text, outline: 'none' }}
                />
              </div>
              {errors.expenseDate && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.expenseDate.message}</p>}
            </div>
          </div>
        </section>

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
