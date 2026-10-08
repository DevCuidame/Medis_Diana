import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, FileText, Image as ImageIcon, Loader2, Tag, X } from 'lucide-react';

const C = {
  gold: '#0D9488', goldLight: '#44CFCB',
  bg: '#FFFFFF', bgPanel: '#F0FDFA',
  white: '#FFFFFF', text: '#0F172A', textBrown: '#475569',
  textMuted: '#94A3B8', border: '#CCFBF1', borderLight: '#CCFBF1',
  red: '#EF4444', success: '#16A34A',
};
const FONT_SERIF = '"Manrope", Georgia, serif';
const FONT_SANS  = '"Inter", Inter, system-ui, sans-serif';
const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent';

export interface ServicioComercialFormValues {
  name: string;
  description: string;
  imageUrl: string;
  operativoId: string;
  isActive: boolean;
}

interface Props {
  initialData?: Partial<ServicioComercialFormValues>;
  onSuccess: (data: ServicioComercialFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const InputField = ({ label, icon: Icon, error, children, required }: any) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textBrown, marginBottom: 8 }}>
      {Icon && <Icon size={14} color={C.gold} />} {label} {required && <span style={{ color: C.red }}>*</span>}
    </div>
    {children}
    {error && (
      <span style={{ color: C.red, fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
        <AlertTriangle size={12} /> {error}
      </span>
    )}
  </div>
);

export const FormularioServicioComercial: React.FC<Props> = ({ initialData, onSuccess, onCancel }) => {
  const [name, setName]               = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [operativoId, setOperativoId] = useState(initialData?.operativoId ?? '');
  const [isActive, setIsActive]       = useState(initialData?.isActive ?? true);
  const [operativos, setOperativos]   = useState<{ id: string; serviceName: string }[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [imageError, setImageError]   = useState<string | null>(null);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function authHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    fetch('/api/services/operativos', { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { if (j.success) setOperativos(j.data); })
      .catch(() => {});
  }, []);

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('La imagen no debe superar los 5MB');
      e.currentTarget.value = '';
      return;
    }
    setImageError(null);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'El nombre es obligatorio';
    if (!operativoId) next.operativoId = 'Selecciona el servicio operativo asociado';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSuccess({
        name: name.trim(),
        description: description.trim(),
        imageUrl: imagePreview ?? '',
        operativoId,
        isActive,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inlineInputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.borderLight}`,
    background: C.bgPanel, fontSize: 14, color: C.text, outline: 'none', transition: 'all 0.2s', fontFamily: FONT_SANS,
  };

  return (
    <div style={{ background: C.white, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.08)', padding: '40px', maxWidth: 640, margin: '0 auto', fontFamily: FONT_SANS }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 700, color: C.gold, margin: '0 0 8px' }}>
            {initialData ? 'Editar Servicio Comercial' : 'Nuevo Servicio Comercial'}
          </h2>
          <p style={{ margin: 0, color: C.textBrown, fontSize: 15 }}>
            La ficha que verá el paciente. Se apoya en un servicio operativo para su duración y precio.
          </p>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: C.textMuted }}>
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <InputField label="Nombre del servicio" required icon={Tag} error={errors.name}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Rejuvenecimiento Facial Integral" style={inlineInputStyle} className={FOCUS_RING} />
        </InputField>

        <InputField label="Descripción" icon={FileText}>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe el servicio para el paciente..." style={{ ...inlineInputStyle, minHeight: 80, resize: 'vertical' }} className={FOCUS_RING} />
        </InputField>

        <InputField label="Servicio operativo asociado" required icon={Tag} error={errors.operativoId}>
          <select value={operativoId} onChange={e => setOperativoId(e.target.value)} style={inlineInputStyle} className={FOCUS_RING}>
            <option value="">Selecciona un operativo...</option>
            {operativos.map(o => <option key={o.id} value={o.id}>{o.serviceName}</option>)}
          </select>
        </InputField>

        <InputField label="Imagen del servicio" icon={ImageIcon} error={imageError ?? undefined}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: C.bgPanel, borderRadius: 12, border: `1px solid ${C.borderLight}`, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, display: 'block' }}>Estado del servicio</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>{isActive ? 'Visible en el panel de comerciales.' : 'Oculto.'}</span>
          </div>
          <button type="button" onClick={() => setIsActive(v => !v)} style={{ width: 50, height: 26, borderRadius: 13, background: isActive ? C.success : '#CBD5E1', position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, left: isActive ? 26 : 2, width: 22, height: 22, background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 20 }}>
          <button type="button" onClick={onCancel} style={{ padding: '14px 24px', borderRadius: 12, border: `1px solid ${C.borderLight}`, background: C.white, color: C.textBrown, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 15, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 16px rgba(13,148,136,0.2)' }}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {initialData ? 'Actualizar' : 'Guardar Comercial'}
          </button>
        </div>
      </form>
    </div>
  );
};
