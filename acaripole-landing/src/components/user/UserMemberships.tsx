import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, User as UserIcon, LogOut, CreditCard,
  CheckCircle2, Clock, Infinity, Zap, X,
} from 'lucide-react';

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  bg: '#FFFFFF',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textMedium: '#5E5E5E',
  textMuted: '#94A3B8',
  border: '#DDD6FE',
  borderLight: '#DDD6FE',
};

const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif';

const TYPE_LABELS: Record<string, string> = {
  per_consultation: 'Por Consulta',
  monthly:          'Control Mensual',
  annual:           'Programa Anual',
  program:          'Programa Integral',
  pack:             'Paquete de Consultas',
  assessment:       'Valoración Inicial',
};

const TYPE_COLORS: Record<string, { bg: string; color: string; badge: string }> = {
  per_consultation: { bg: 'rgba(139,92,246,0.06)', color: '#8B5CF6', badge: 'rgba(139,92,246,0.12)' },
  monthly:          { bg: 'rgba(34,197,94,0.06)', color: '#16A34A', badge: 'rgba(34,197,94,0.12)' },
  annual:           { bg: 'rgba(59,130,246,0.06)', color: '#2563EB', badge: 'rgba(59,130,246,0.12)' },
  program:          { bg: 'rgba(168,85,247,0.06)', color: '#7C3AED', badge: 'rgba(168,85,247,0.12)' },
  pack:             { bg: 'rgba(234,179,8,0.06)', color: '#B45309', badge: 'rgba(234,179,8,0.12)' },
  assessment:       { bg: 'rgba(236,72,153,0.06)', color: '#EC4899', badge: 'rgba(236,72,153,0.12)' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface Plan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  type: string;
  price: number;
  currency: string;
  durationDays: number | null;
  maxClasses: number | null;
  benefits: string[];
  isActive: boolean;
}

interface ActiveMembership {
  id: string;
  membership: { id: string; name: string; type: string; price: number; benefits: string[]; durationDays: number | null };
  startedAt: string;
  expiresAt: string | null;
  classesRemaining: number | null;
  isActive: boolean;
  isExpired: boolean;
  coversFreeClasses: boolean;
  hasClassCredits: boolean;
}

// ── slide variants for step transitions ─────────────────────────────────────
const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 36 : -36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? -36 : 36, opacity: 0 }),
};

function howItWorks(plan: Plan): { icon: string; title: string; desc: string } {
  switch (plan.type) {
    case 'monthly':
      return { icon: '∞', title: 'Consultas mensuales', desc: `Durante ${plan.durationDays ?? 30} días tendrás cobertura en las consultas estipuladas.` };
    case 'annual':
      return { icon: '∞', title: 'Cobertura Anual', desc: `Durante ${plan.durationDays ?? 365} días tendrás acceso a las consultas y controles incluidos.` };
    case 'per_consultation':
      return { icon: '🩺', title: '1 Consulta', desc: 'Úsalo para agendar una consulta médica. Se descuenta automáticamente al asistir.' };
    case 'pack':
      return { icon: '🩺', title: `${plan.maxClasses ?? 10} consultas`, desc: 'Úsalas para agendar tus controles. Cada cita descuenta una consulta automáticamente.' };
    case 'program':
      return { icon: '📋', title: 'Programa Especializado', desc: 'Un plan de tratamiento integral, adaptado a tus necesidades específicas (promoción y prevención, enfermedades no transmisibles, etc.).' };
    case 'assessment':
      return { icon: '🎯', title: 'Valoración Inicial', desc: 'Evaluación médica completa de tu estado de salud para definir un plan de manejo.' };
    default:
      return { icon: '✓', title: 'Plan activado', desc: 'Al activar este plan, podrás acceder a todos sus beneficios inmediatamente.' };
  }
}

const CONFIRM_STEPS = ['Resumen', 'Beneficios', 'Pago'];

export const UserMemberships: React.FC = () => {
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [active, setActive] = useState<ActiveMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [confirmStep, setConfirmStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wompi' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, activeRes] = await Promise.all([
        fetch('/api/memberships/active'),
        fetch('/api/user-memberships/me', { headers: authHeaders() }),
      ]);
      const plansData = await plansRes.json();
      const activeData = await activeRes.json();
      if (plansData.success) setPlans(plansData.data.memberships);
      if (activeData.success) setActive(activeData.data.membership);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openConfirm = (plan: Plan) => {
    setConfirmPlan(plan);
    setConfirmStep(0);
    setDirection(1);
    setPaymentMethod(null);
  };

  const goNext = () => { setDirection(1); setConfirmStep(s => s + 1); };
  const goBack = () => { setDirection(-1); setConfirmStep(s => s - 1); };

  const handlePurchase = async (plan: Plan, method: 'cash' | 'wompi') => {
    setPurchasing(plan.id);
    setConfirmPlan(null);
    try {
      const res = await fetch('/api/user-memberships', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ membershipId: plan.id, paymentMethod: method }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al registrar');
      const msg = method === 'cash'
        ? `¡Solicitud registrada! Acércate al estudio para pagar "${plan.name}" en efectivo.`
        : `¡Solicitud enviada! Completa el pago de "${plan.name}" a través de Wompi.`;
      showToast(msg, 'success');
      await fetchData();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    } finally {
      setPurchasing(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  const activeBadge = () => {
    if (!active || !active.isActive || active.isExpired) return null;
    if (active.coversFreeClasses) return { label: 'Consultas ilimitadas activas', color: '#16A34A', bg: 'rgba(34,197,94,0.1)' };
    if (active.hasClassCredits) return { label: `${active.classesRemaining} consultas restantes`, color: '#2563EB', bg: 'rgba(59,130,246,0.1)' };
    return null;
  };

  const badge = activeBadge();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: FONT_INTER, color: C.text }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 260, background: C.white, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '32px 24px', borderBottom: `1px solid ${C.border}` }}>
          <h1 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, fontStyle: 'italic', color: C.gold, margin: 0, letterSpacing: '0.05em' }}>
            MEDIS <span style={{ fontSize: 12, fontStyle: 'normal', color: C.textMedium }}>USER</span>
          </h1>
        </div>
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => navigate('/user/dashboard')} style={{ ...navBtn, color: C.textMedium }}>
            <UserIcon size={18} /> Mi Panel
          </button>
          <button onClick={() => navigate('/user/classes')} style={{ ...navBtn, color: C.textMedium }}>
            <Calendar size={18} /> Agendar Consulta
          </button>
          <button style={{ ...navBtn, background: C.gold, color: C.white }}>
            <CreditCard size={18} /> Mis Planes
          </button>
        </nav>
        <div style={{ padding: '24px 16px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={handleLogout} style={{ ...navBtn, color: '#A00', fontWeight: 600 }}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        <header style={{ height: 80, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', flexShrink: 0 }}>
          <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, color: C.text, margin: 0, fontWeight: 600 }}>Mis Planes</h2>
          {badge && (
            <span style={{ padding: '6px 14px', borderRadius: 99, background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 700 }}>
              ✓ {badge.label}
            </span>
          )}
        </header>

        <div style={{ padding: '40px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>

          {/* Active membership card */}
          {!loading && active && active.isActive && !active.isExpired && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 16, padding: '1.5rem 2rem', marginBottom: '2.5rem', color: C.white, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}
            >
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8, margin: '0 0 6px' }}>Plan Activo</p>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.5rem', margin: '0 0 4px' }}>{active.membership.name}</h3>
                <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>
                  {active.coversFreeClasses
                    ? `Consultas ilimitadas${active.expiresAt ? ` · Vence ${new Date(active.expiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`
                    : active.hasClassCredits
                      ? `${active.classesRemaining} consulta${active.classesRemaining !== 1 ? 's' : ''} disponible${active.classesRemaining !== 1 ? 's' : ''}`
                      : 'Sin créditos disponibles'
                  }
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, opacity: 0.7, margin: '0 0 2px' }}>Desde</p>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{new Date(active.startedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {active.coversFreeClasses && (
                  <button onClick={() => navigate('/user/classes')} style={{ marginTop: 10, padding: '8px 18px', borderRadius: 8, border: `1.5px solid rgba(255,255,255,0.6)`, background: 'transparent', color: C.white, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Reservar consulta →
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Section title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.6rem', color: C.text, margin: '0 0 6px' }}>Planes Disponibles</h3>
            <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>Elige el plan que mejor se adapte a tu ritmo de práctica.</p>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ background: C.white, borderRadius: 16, padding: '1.5rem', height: 280, border: `1px solid ${C.borderLight}` }}>
                  {[60, 100, 80, 90, 60].map((w, i) => (
                    <div key={i} style={{ height: 12, width: `${w}%`, background: '#DDD6FE', borderRadius: 6, marginBottom: 12 }} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {plans.map((plan, i) => {
                const tc = TYPE_COLORS[plan.type] ?? TYPE_COLORS.per_consultation;
                const isCurrentPlan = active?.membership.id === plan.id && active.isActive && !active.isExpired;
                const isBuying = purchasing === plan.id;
                const isUnlimited = plan.type === 'monthly' || plan.type === 'annual';

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    style={{ background: C.white, border: `2px solid ${isCurrentPlan ? C.gold : C.borderLight}`, borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', boxShadow: isCurrentPlan ? `0 0 0 4px rgba(139,92,246,0.08)` : '0 2px 12px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}
                  >
                    {isCurrentPlan && (
                      <div style={{ position: 'absolute', top: 0, right: 0, background: C.gold, color: C.white, fontSize: 10, fontWeight: 700, padding: '4px 12px', borderBottomLeftRadius: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Plan Activo
                      </div>
                    )}

                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, background: tc.badge, color: tc.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', width: 'fit-content', marginBottom: 12 }}>
                      {TYPE_LABELS[plan.type] ?? plan.type}
                    </span>

                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.2rem', color: C.text, margin: '0 0 6px' }}>{plan.name}</h3>

                    {plan.description && (
                      <p style={{ fontSize: 13, color: C.textMedium, margin: '0 0 12px', lineHeight: 1.5 }}>{plan.description}</p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0 16px' }}>
                      <span style={{ fontFamily: FONT_BODONI, fontSize: '2rem', fontWeight: 700, color: C.gold, lineHeight: 1 }}>{fmt(plan.price)}</span>
                      <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>COP</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 14 }}>
                      {plan.durationDays
                        ? <><Clock size={13} color={C.goldLight} /> {plan.durationDays} días de vigencia</>
                        : <><Infinity size={13} color={C.goldLight} /> {isUnlimited ? 'Consultas ilimitadas' : 'Sin vencimiento'}</>
                      }
                    </div>

                    {plan.benefits.length > 0 && (
                      <div style={{ marginBottom: 18, flex: 1 }}>
                        {plan.benefits.map(b => (
                          <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <CheckCircle2 size={14} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
                            <span style={{ fontSize: 13, color: C.textMedium, lineHeight: 1.4 }}>{b}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => { if (!isCurrentPlan) openConfirm(plan); }}
                      disabled={isBuying || isCurrentPlan}
                      style={{
                        marginTop: 'auto',
                        width: '100%', padding: '13px',
                        borderRadius: 10, border: isCurrentPlan ? `1.5px solid ${C.gold}` : 'none',
                        background: isCurrentPlan ? 'transparent' : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                        color: isCurrentPlan ? C.gold : C.white,
                        fontSize: 13, fontWeight: 700, cursor: isCurrentPlan ? 'default' : 'pointer',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        opacity: isBuying ? 0.6 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {isBuying ? 'Activando…' : isCurrentPlan ? '✓ Plan Activo' : 'Adquirir Plan'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!loading && plans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: C.textMuted }}>
              <CreditCard size={48} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No hay planes disponibles en este momento.</p>
            </div>
          )}
        </div>
      </main>

      {/* ── CONFIRM WIZARD MODAL ── */}
      <AnimatePresence>
        {confirmPlan && (() => {
          const tc = TYPE_COLORS[confirmPlan.type] ?? TYPE_COLORS.per_consultation;
          const isUnlimited = confirmPlan.type === 'monthly' || confirmPlan.type === 'annual';
          const hw = howItWorks(confirmPlan);
          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setConfirmPlan(null)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(27,28,28,0.5)', backdropFilter: 'blur(6px)', zIndex: 100 }}
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 24 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', pointerEvents: 'none' }}
              >
                <div style={{ background: C.white, borderRadius: 22, width: '100%', maxWidth: 490, boxShadow: '0 32px 90px rgba(0,0,0,0.18)', pointerEvents: 'all', overflow: 'hidden' }}>

                  {/* ── Modal header ── */}
                  <div style={{ padding: '1.5rem 1.75rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textMuted, margin: '0 0 2px' }}>
                        Adquirir Plan · Paso {confirmStep + 1} de {CONFIRM_STEPS.length}
                      </p>
                      <h3 style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.text, margin: 0 }}>
                        {CONFIRM_STEPS[confirmStep]}
                      </h3>
                    </div>
                    <button
                      onClick={() => setConfirmPlan(null)}
                      style={{ background: C.bgPanel, border: 'none', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textMedium, flexShrink: 0 }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* ── Step indicator ── */}
                  <div style={{ padding: '1rem 1.75rem 0', display: 'flex', alignItems: 'flex-start' }}>
                    {CONFIRM_STEPS.map((label, i) => (
                      <React.Fragment key={i}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: i <= confirmStep ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : C.bgPanel,
                            color: i <= confirmStep ? C.white : C.textMuted,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700,
                            boxShadow: i === confirmStep ? `0 0 0 4px rgba(139,92,246,0.12)` : 'none',
                            transition: 'all 0.3s',
                          }}>
                            {i < confirmStep ? '✓' : i + 1}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: i === confirmStep ? C.gold : C.textMuted, transition: 'color 0.3s', whiteSpace: 'nowrap' }}>
                            {label}
                          </span>
                        </div>
                        {i < CONFIRM_STEPS.length - 1 && (
                          <div style={{ flex: 1, height: 2, background: i < confirmStep ? C.goldLight : C.borderLight, margin: '13px 6px 0', transition: 'background 0.35s', borderRadius: 2 }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* ── Step content ── */}
                  <div style={{ padding: '1.5rem 1.75rem 0', minHeight: 270, overflow: 'hidden' }}>
                    <AnimatePresence mode="wait" custom={direction}>
                      <motion.div
                        key={confirmStep}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                      >

                        {/* STEP 0: Resumen */}
                        {confirmStep === 0 && (
                          <div>
                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 99, background: tc.badge, color: tc.color, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
                              {TYPE_LABELS[confirmPlan.type] ?? confirmPlan.type}
                            </span>
                            <h2 style={{ fontFamily: FONT_BODONI, fontSize: '1.75rem', color: C.text, margin: '0 0 8px', lineHeight: 1.2 }}>
                              {confirmPlan.name}
                            </h2>
                            {confirmPlan.description && (
                              <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 1rem', lineHeight: 1.55 }}>
                                {confirmPlan.description}
                              </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '0.75rem 0 1.25rem' }}>
                              <span style={{ fontFamily: FONT_BODONI, fontSize: '2.4rem', fontWeight: 700, color: C.gold, lineHeight: 1 }}>
                                {fmt(confirmPlan.price)}
                              </span>
                              <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>COP</span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 120, background: C.bgPanel, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                                <Clock size={16} color={C.goldLight} style={{ flexShrink: 0 }} />
                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vigencia</p>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                                    {confirmPlan.durationDays ? `${confirmPlan.durationDays} días` : 'Sin vencimiento'}
                                  </p>
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: 120, background: C.bgPanel, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                                {isUnlimited
                                  ? <Infinity size={16} color={C.goldLight} style={{ flexShrink: 0 }} />
                                  : <CreditCard size={16} color={C.goldLight} style={{ flexShrink: 0 }} />
                                }
                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Consultas</p>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                                    {isUnlimited
                                      ? 'Ilimitadas'
                                      : `${confirmPlan.maxClasses ?? 1} crédito${(confirmPlan.maxClasses ?? 1) !== 1 ? 's' : ''}`
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 1: Beneficios */}
                        {confirmStep === 1 && (
                          <div>
                            <h4 style={{ fontFamily: FONT_BODONI, fontSize: '1.1rem', color: C.text, margin: '0 0 1rem' }}>
                              ¿Qué incluye este plan?
                            </h4>

                            {confirmPlan.benefits.length > 0 ? (
                              <div style={{ marginBottom: 18 }}>
                                {confirmPlan.benefits.map((b, bi) => (
                                  <div key={bi} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                                    <CheckCircle2 size={15} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span style={{ fontSize: 13, color: C.textMedium, lineHeight: 1.45 }}>{b}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 18 }}>
                                Sin beneficios adicionales listados.
                              </p>
                            )}

                            {/* How it works card */}
                            <div style={{ background: tc.bg, border: `1.5px solid ${tc.badge}`, borderRadius: 14, padding: '1rem 1.1rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: tc.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20, lineHeight: 1 }}>
                                {hw.icon}
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: tc.color, margin: '0 0 5px' }}>{hw.title}</p>
                                <p style={{ fontSize: 12, color: C.textMedium, margin: 0, lineHeight: 1.6 }}>{hw.desc}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 2: Pago */}
                        {confirmStep === 2 && (
                          <div>
                            {/* Compact plan summary */}
                            <div style={{ background: C.bgPanel, borderRadius: 14, padding: '0.9rem 1.1rem', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: `1.5px solid ${C.borderLight}` }}>
                              <div>
                                <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 99, background: tc.badge, color: tc.color, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                                  {TYPE_LABELS[confirmPlan.type]}
                                </span>
                                <p style={{ fontFamily: FONT_BODONI, fontSize: '1rem', color: C.text, margin: 0 }}>{confirmPlan.name}</p>
                              </div>
                              <p style={{ fontFamily: FONT_BODONI, fontSize: '1.3rem', color: C.gold, margin: 0, flexShrink: 0 }}>{fmt(confirmPlan.price)}</p>
                            </div>

                            <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>
                              Elige tu método de pago
                            </p>

                            {/* Payment method cards */}
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                              {/* Efectivo */}
                              <button
                                onClick={() => setPaymentMethod('cash')}
                                style={{
                                  flex: 1, padding: '1rem', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                                  border: `2px solid ${paymentMethod === 'cash' ? C.gold : C.borderLight}`,
                                  background: paymentMethod === 'cash' ? 'rgba(139,92,246,0.05)' : C.bgPanel,
                                  boxShadow: paymentMethod === 'cash' ? `0 0 0 3px rgba(139,92,246,0.1)` : 'none',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <div style={{ fontSize: 22, marginBottom: 6 }}>💵</div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: paymentMethod === 'cash' ? C.gold : C.text, margin: '0 0 3px' }}>Efectivo</p>
                                <p style={{ fontSize: 11, color: C.textMuted, margin: 0, lineHeight: 1.4 }}>Paga en el estudio. El admin confirma tu pago.</p>
                              </button>

                              {/* Wompi */}
                              <button
                                onClick={() => setPaymentMethod('wompi')}
                                style={{
                                  flex: 1, padding: '1rem', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                                  border: `2px solid ${paymentMethod === 'wompi' ? '#7C3AED' : C.borderLight}`,
                                  background: paymentMethod === 'wompi' ? 'rgba(124,58,237,0.05)' : C.bgPanel,
                                  boxShadow: paymentMethod === 'wompi' ? `0 0 0 3px rgba(124,58,237,0.1)` : 'none',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <div style={{ fontSize: 22, marginBottom: 6 }}>💳</div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: paymentMethod === 'wompi' ? '#7C3AED' : C.text, margin: '0 0 3px' }}>Wompi</p>
                                <p style={{ fontSize: 11, color: C.textMuted, margin: 0, lineHeight: 1.4 }}>Pago en línea seguro con tarjeta o PSE.</p>
                              </button>
                            </div>

                            {/* Contextual info per method */}
                            {paymentMethod === 'cash' && (
                              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(139,92,246,0.05)', border: `1px solid rgba(139,92,246,0.15)`, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <Zap size={14} color={C.goldLight} style={{ flexShrink: 0, marginTop: 1 }} />
                                <p style={{ fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
                                  Tu solicitud quedará <strong>pendiente</strong>. Acércate al estudio y el administrador activará tu plan una vez confirmado el pago.
                                </p>
                              </motion.div>
                            )}
                            {paymentMethod === 'wompi' && (
                              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(124,58,237,0.05)', border: `1px solid rgba(124,58,237,0.15)`, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <CheckCircle2 size={14} color="#7C3AED" style={{ flexShrink: 0, marginTop: 1 }} />
                                <p style={{ fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
                                  Serás redirigido a Wompi para completar el pago. El plan se activará al confirmar la transacción.
                                </p>
                              </motion.div>
                            )}
                          </div>
                        )}

                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* ── Navigation footer ── */}
                  <div style={{ padding: '1.25rem 1.75rem 1.75rem', display: 'flex', gap: 10 }}>
                    {confirmStep === 0 ? (
                      <button
                        onClick={() => setConfirmPlan(null)}
                        style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.textMedium, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}
                      >
                        Cancelar
                      </button>
                    ) : (
                      <button
                        onClick={goBack}
                        style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: 'transparent', color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_INTER }}
                      >
                        ← Atrás
                      </button>
                    )}

                    {confirmStep < CONFIRM_STEPS.length - 1 ? (
                      <button
                        onClick={goNext}
                        style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', fontFamily: FONT_INTER }}
                      >
                        Siguiente →
                      </button>
                    ) : (
                      <button
                        onClick={() => paymentMethod && handlePurchase(confirmPlan, paymentMethod)}
                        disabled={!!purchasing || !paymentMethod}
                        style={{
                          flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                          background: !paymentMethod
                            ? C.bgPanel
                            : paymentMethod === 'wompi'
                              ? 'linear-gradient(135deg, #7C3AED, #9F67FA)'
                              : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                          color: !paymentMethod ? C.textMuted : C.white,
                          fontSize: 13, fontWeight: 700,
                          cursor: !paymentMethod || purchasing ? 'not-allowed' : 'pointer',
                          letterSpacing: '0.06em', opacity: purchasing ? 0.6 : 1,
                          fontFamily: FONT_INTER, transition: 'all 0.25s',
                        }}
                      >
                        {purchasing
                          ? 'Registrando…'
                          : !paymentMethod
                            ? 'Selecciona un método'
                            : paymentMethod === 'cash'
                              ? '💵 Registrar Pago en Efectivo'
                              : '💳 Continuar con Wompi'
                        }
                      </button>
                    )}
                  </div>

                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.type === 'success' ? '#16A34A' : '#DC2626', color: C.white, padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}
          >
            {toast.type === 'success' ? '✓ ' : '✗ '}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const navBtn: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'left',
};
