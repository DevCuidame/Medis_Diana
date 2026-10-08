// medisdiana-landing/src/components/admin/CupsMappingModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';

interface CupsCandidate {
  cupsCode: string;
  procedureName: string;
}

interface Props {
  serviceGroup: string;
  serviceSubgroup: string;
  serviceCategory: string;
  serviceSubcategory: string;
  onClose: () => void;
  onCreated: () => void;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export const CupsMappingModal: React.FC<Props> = ({ serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, onClose, onCreated }) => {
  const [catalog, setCatalog] = useState<CupsCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/services/cups-catalog', { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { if (j.success) setCatalog(j.data); })
      .catch(() => setError('No se pudo cargar el catálogo CUPS.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim().length < 2 ? [] : catalog.filter(c =>
    c.cupsCode.includes(search.trim()) || c.procedureName.toUpperCase().includes(search.trim().toUpperCase())
  ).slice(0, 50);

  const selectCandidate = async (candidate: CupsCandidate) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/services/cups-mappings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode: candidate.cupsCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al crear el mapeo');
      onCreated();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Crear mapeo CUPS</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
            <Loader2 size={16} className="animate-spin" /> Cargando catálogo CUPS...
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por código o nombre del procedimiento..."
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1.5px solid #DDD6FE', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {search.trim().length < 2 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Escribe al menos 2 caracteres para buscar.</p>
              ) : filtered.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin resultados.</p>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.cupsCode}
                    disabled={saving}
                    onClick={() => selectCandidate(c)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F3F0FB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <strong>{c.cupsCode}</strong> — {c.procedureName}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  );
};
