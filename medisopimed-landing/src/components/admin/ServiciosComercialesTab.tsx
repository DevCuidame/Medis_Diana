import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { FormularioServicioComercial, type ServicioComercialFormValues } from './FormularioServicioComercial';

const C = {
  gold: '#0D9488', goldLight: '#44CFCB',
  bg: '#FFFFFF', bgPanel: '#F0FDFA', white: '#FFFFFF',
  text: '#0F172A', textBrown: '#475569', textMuted: '#94A3B8',
  border: '#CCFBF1', borderLight: '#CCFBF1',
  success: '#16A34A', danger: '#DC2626',
};
const FONT_DISPLAY = 'Manrope, Inter, sans-serif';
const FONT_INTER  = '"Inter", Inter, system-ui, sans-serif';

interface ComercialItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  operativoId: string;
  operativoName: string;
  isActive: boolean;
}

interface Props {
  onToast: (msg: string, ok: boolean) => void;
  initialFormOpen?: boolean;
  onConsumeInitialFormOpen?: () => void;
}

export const ServiciosComercialesTab: React.FC<Props> = ({ onToast, initialFormOpen, onConsumeInitialFormOpen }) => {
  const [items, setItems]           = useState<ComercialItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(initialFormOpen ?? false);

  useEffect(() => {
    if (initialFormOpen) onConsumeInitialFormOpen?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [editing, setEditing]       = useState<ComercialItem | null>(null);
  const [busyId, setBusyId]         = useState<string | null>(null);

  function authH(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }

  const load = async () => {
    try {
      const res = await fetch('/api/services/commercial', { headers: authH() });
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: ServicioComercialFormValues) => {
    // NOTE: '' → null (not `|| undefined`) so an intentional clear on edit
    // reaches the backend as an explicit null instead of being dropped from
    // the JSON body — the repository's dynamic UPDATE skips any key that is
    // `undefined`, which previously left the old value in place. On create,
    // the repository's `?? null` fallback treats an explicit null the same
    // as an absent field, so this doesn't change create behavior.
    const body = JSON.stringify({
      name: data.name,
      description: data.description === '' ? null : data.description,
      imageUrl: data.imageUrl === '' ? null : data.imageUrl,
      operativoId: data.operativoId,
      isActive: data.isActive,
    });
    try {
      const res = editing
        ? await fetch(`/api/services/commercial/${editing.id}`, { method: 'PATCH', headers: authH(), body })
        : await fetch('/api/services/commercial', { method: 'POST', headers: authH(), body });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast(json.error ?? `Error ${res.status}`, false);
        return;
      }
      onToast(editing ? 'Servicio comercial actualizado ✓' : 'Servicio comercial creado ✓', true);
      setIsFormOpen(false);
      setEditing(null);
      await load();
    } catch (e: unknown) {
      onToast((e as Error).message ?? 'Error de red', false);
    }
  };

  const handleToggle = async (item: ComercialItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/services/commercial/${item.id}`, {
        method: 'PATCH', headers: authH(), body: JSON.stringify({ isActive: !item.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { onToast(json.error ?? 'Error al cambiar el estado', false); return; }
      onToast(item.isActive ? 'Comercial desactivado' : 'Comercial activado', true);
      await load();
    } catch {
      onToast('Error al cambiar el estado', false);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: ComercialItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/services/commercial/${item.id}`, { method: 'DELETE', headers: authH() });
      const json = await res.json();
      if (!res.ok || !json.success) { onToast(json.error ?? 'Error al eliminar', false); return; }
      onToast('Servicio comercial eliminado ✓', true);
      await load();
    } catch {
      onToast('Error al eliminar', false);
    } finally {
      setBusyId(null);
    }
  };

  if (isFormOpen) {
    return (
      <FormularioServicioComercial
        key={editing ? editing.id : 'new'}
        initialData={editing ? {
          name: editing.name,
          description: editing.description ?? '',
          imageUrl: editing.imageUrl ?? '',
          operativoId: editing.operativoId,
          isActive: editing.isActive,
        } : undefined}
        onCancel={() => { setIsFormOpen(false); setEditing(null); }}
        onSuccess={handleSave}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          onClick={() => { setEditing(null); setIsFormOpen(true); }}
          style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, padding: '12px 24px', borderRadius: 12, border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 16px rgba(13,148,136,0.2)', fontFamily: FONT_INTER }}
        >
          <Plus size={18} strokeWidth={3} /> Nuevo Comercial
        </button>
      </div>

      {items.length === 0 ? (
        <p style={{ textAlign: 'center', color: C.textMuted, fontFamily: FONT_INTER, padding: '60px 0' }}>
          Todavía no hay servicios comerciales. Crea uno y asócialo a un operativo existente.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.borderLight}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}
              >
                <div style={{ height: 140, background: C.bgPanel, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={28} color={C.textMuted} />
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, margin: '0 0 4px', color: C.text }}>{item.name}</h4>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 12px', fontFamily: FONT_INTER }}>
                    Operativo: {item.operativoName}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.isActive ? C.success : C.textMuted, textTransform: 'uppercase' }}>
                      {item.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={busyId === item.id} onClick={() => handleToggle(item)} title={item.isActive ? 'Desactivar' : 'Activar'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textBrown }}>
                        {item.isActive ? <ToggleRight size={20} color={C.success} /> : <ToggleLeft size={20} />}
                      </button>
                      <button onClick={() => { setEditing(item); setIsFormOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textBrown }}>
                        <Edit2 size={16} />
                      </button>
                      <button disabled={busyId === item.id} onClick={() => handleDelete(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
