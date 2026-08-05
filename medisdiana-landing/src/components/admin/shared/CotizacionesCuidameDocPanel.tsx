import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle2 } from 'lucide-react';

const C = {
  text: '#1B1C1C',
  textBrown: '#475569',
  textMuted: '#94A3B8',
  borderLight: '#DDD6FE',
  white: '#FFFFFF',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function adminHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface ExternalQuoteItem {
  type: 'inventory' | 'plan';
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface ExternalQuote {
  id: string;
  externalReference: string | null;
  patientName: string;
  patientEmail: string | null;
  professionalName: string | null;
  items: ExternalQuoteItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

export function CotizacionesCuidameDocPanel({
  onQuoteConfirmed,
  onPendingCountChange,
  showToast,
}: {
  onQuoteConfirmed?: (amount: number) => void;
  onPendingCountChange?: (count: number) => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [externalQuotes, setExternalQuotes] = useState<ExternalQuote[]>([]);
  const [confirmingQuoteId, setConfirmingQuoteId] = useState<string | null>(null);
  const [rejectingQuoteId, setRejectingQuoteId] = useState<string | null>(null);

  const fetchExternalQuotes = async () => {
    try {
      const res = await fetch('/api/external-quotes?status=pending', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setExternalQuotes(data.data.quotes);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchExternalQuotes();
  }, []);

  // Avisa al padre cada vez que cambia el tamaño de la lista pendiente, para
  // que pantallas con su propio contador (ej. el badge de la pestaña de
  // Finanzas) puedan reflejarlo sin tener que dueñar la lista.
  useEffect(() => {
    onPendingCountChange?.(externalQuotes.length);
  }, [externalQuotes]);

  const handleConfirmQuote = async (id: string, patientName: string) => {
    setConfirmingQuoteId(id);
    try {
      const res = await fetch(`/api/external-quotes/${id}/confirm`, { method: 'PATCH', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al confirmar');
      onQuoteConfirmed?.(externalQuotes.find(q => q.id === id)?.totalAmount ?? 0);
      setExternalQuotes(prev => prev.filter(q => q.id !== id));
      showToast(`Cotización de ${patientName} confirmada como ingreso.`, true);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally {
      setConfirmingQuoteId(null);
    }
  };

  const handleRejectQuote = async (id: string, patientName: string) => {
    setRejectingQuoteId(id);
    try {
      const res = await fetch(`/api/external-quotes/${id}/reject`, { method: 'PATCH', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al rechazar');
      setExternalQuotes(prev => prev.filter(q => q.id !== id));
      showToast(`Cotización de ${patientName} rechazada.`, false);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally {
      setRejectingQuoteId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42 }}
      className="glass-card"
      style={{ padding: '1.5rem 1.75rem', marginBottom: '2rem', border: `1.5px solid rgba(124,58,237,0.2)` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={20} color="#7C3AED" />
          </div>
          <div>
            <h2 style={{ fontFamily: '"Bodoni Moda", serif', fontSize: '1.3rem', color: C.text, margin: 0 }}>Cotizaciones CuidameDoc</h2>
            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
              Planes de tratamiento cerrados en CuidameDoc con medicamentos/procedimientos/seguimiento cotizados
            </p>
          </div>
        </div>
        {externalQuotes.length > 0 && (
          <span style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>
            {externalQuotes.length} pendiente{externalQuotes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {externalQuotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(124,58,237,0.03)', borderRadius: 12, border: `1px dashed ${C.borderLight}` }}>
          <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 10px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: C.textMuted, margin: 0 }}>Sin cotizaciones pendientes</p>
          <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>Cuando la Dra. Diana cierre una historia clínica con plan de tratamiento en CuidameDoc, la cotización aparecerá aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {externalQuotes.map(q => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
                style={{ background: C.white, borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 10, border: `1px solid rgba(124,58,237,0.2)` }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{q.patientName}</p>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                      {q.patientEmail}
                      {q.externalReference && ` · ${q.externalReference}`}
                      {q.professionalName && ` · ${q.professionalName}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#7C3AED', margin: 0 }}>{fmt(q.totalAmount)}</p>
                    <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                      {new Date(q.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {q.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textBrown }}>
                      <span>{item.name} {item.quantity > 1 ? `× ${item.quantity}` : ''}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button onClick={() => handleConfirmQuote(q.id, q.patientName)} disabled={confirmingQuoteId === q.id}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16A34A,#22C55E)', color: C.white, fontSize: 11, fontWeight: 700, cursor: confirmingQuoteId === q.id ? 'not-allowed' : 'pointer', opacity: confirmingQuoteId === q.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                    {confirmingQuoteId === q.id ? '…' : '✓ Confirmar pago'}
                  </button>
                  <button onClick={() => handleRejectQuote(q.id, q.patientName)} disabled={rejectingQuoteId === q.id}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#B91C1C,#DC2626)', color: C.white, fontSize: 11, fontWeight: 700, cursor: rejectingQuoteId === q.id ? 'not-allowed' : 'pointer', opacity: rejectingQuoteId === q.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                    {rejectingQuoteId === q.id ? '…' : '✗ Rechazar'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
