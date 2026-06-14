import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User as UserIcon, LogOut, Clock } from 'lucide-react';

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  goldPale: '#38BDF8',
  bg: '#FFFFFF',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textMedium: '#5E5E5E',
  border: '#DDD6FE',
};

const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif';

export const UserClasses: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/classes/upcoming', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setClasses(data.data.classes);
      }
    } catch (err) {
      console.error("Error fetching classes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: FONT_INTER, color: C.text }}>
      {/* ─── SIDEBAR ──────────────────────────────────────────────── */}
      <aside style={{ width: 260, background: C.white, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '32px 24px', borderBottom: `1px solid ${C.border}` }}>
          <h1 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, fontStyle: 'italic', color: C.gold, margin: 0, letterSpacing: '0.05em' }}>
            MEDIS <span style={{ fontSize: 12, fontStyle: 'normal', color: C.textMedium }}>USER</span>
          </h1>
        </div>
        
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button 
            onClick={() => navigate('/user/dashboard')}
            style={{ ...navBtnStyle, color: C.textMedium }}
          >
            <UserIcon size={18} />
            Mi Panel
          </button>
          <button style={{ ...navBtnStyle, background: C.gold, color: C.white }}>
            <Calendar size={18} />
            Agendar Consulta
          </button>
        </nav>

        <div style={{ padding: '24px 16px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={handleLogout} style={{ ...navBtnStyle, color: '#A00', fontWeight: 600 }}>
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {/* Top Header */}
        <header style={{ height: 80, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
          <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, color: C.text, margin: 0, fontWeight: 600 }}>Horarios Disponibles</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              U
            </div>
          </div>
        </header>

        <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            
            {loading ? (
              <p style={{ color: C.textMedium }}>Cargando consultas...</p>
            ) : classes.length === 0 ? (
              <p style={{ color: C.textMedium }}>No hay consultas disponibles en este momento.</p>
            ) : (
              classes.map((cls) => (
                <div key={cls.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', background: C.bgPanel, color: C.gold, borderRadius: 100, fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 12 }}>{cls.discipline.name}</span>
                    <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, margin: '0 0 8px 0', color: C.text }}>Nivel {cls.discipline.level}</h3>
                    <p style={{ color: C.textMedium, fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserIcon size={14} /> Instructora: {cls.instructor.firstName}
                    </p>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.bgPanel}`, borderBottom: `1px solid ${C.bgPanel}`, padding: '16px 0', margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text, fontSize: 14 }}>
                      <Calendar size={16} color={C.goldLight} />
                      {new Date(cls.scheduledAt).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text, fontSize: 14 }}>
                      <Clock size={16} color={C.goldLight} />
                      {new Date(cls.scheduledAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} ({cls.durationMinutes} min)
                    </div>
                    {cls.membership && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.gold, fontSize: 16, fontWeight: 600, marginTop: 8 }}>
                        ${Number(cls.membership.price).toLocaleString('es-CO')} {cls.membership.currency}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    <button 
                      style={{ width: '100%', padding: '12px', background: C.gold, color: C.white, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,92,246,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      Continuar al Pago
                    </button>
                  </div>
                </div>
              ))
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

const navBtnStyle = {
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
  textAlign: 'left' as const,
};
